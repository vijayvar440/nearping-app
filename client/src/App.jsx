import React, {
  useState,
  useEffect,
  useContext,
} from "react";

import Header from "./components/Header/Header";
import MapView from "./components/MapView/MapView";
import PingFeed from "./components/PingFeed/PingFeed";
import CreatePingModal from "./components/CreatePingModal/CreatePingModal";
import AuthModal from "./components/AuthModal/AuthModal";
import ClaimModal from "./components/ClaimModel/ClaimModal";
import ClaimsListModal from "./components/ClaimModel/ClaimsListModal";
import RadarAlertToast from "./components/RadarAlertToast/RadarAlertToast";
import Profile from "./components/Profile/Profile";

import { LocationContext } from "./context/LocationContext";

import axios from "axios";
import { io } from "socket.io-client";

import "./App.css";

// =====================================================
// SOCKET CONNECTION
// =====================================================

const socket = io(
  "https://nearping-app.onrender.com"
);

// =====================================================
// 🔊 NOTIFICATION SOUND
// =====================================================

const playAlertSound = (isEmergency) => {
  const soundUrl = isEmergency
    ? "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
    : "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3";

  const audio = new Audio(soundUrl);

  audio.play().catch((err) =>
    console.log(
      "Audio play blocked by browser policy:",
      err
    )
  );
};

// =====================================================
// APP
// =====================================================

function App() {
  const { coords } =
    useContext(LocationContext);

  // ===================================================
  // STATES
  // ===================================================

  const [pings, setPings] = useState([]);

  const [resolvedPings, setResolvedPings] =
    useState([]);

  const [radius, setRadius] =
    useState(5);

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] =
    useState(false);

  const [isProfileOpen, setIsProfileOpen] =
    useState(false);

  const [
    selectedPingForClaim,
    setSelectedPingForClaim,
  ] = useState(null);

  const [
    selectedPingForViewClaims,
    setSelectedPingForViewClaims,
  ] = useState(null);

  const [selectedLocation, setSelectedLocation] =
    useState(null);

  // ===================================================
  // 👤 GET LOGGED-IN USER ID
  // ===================================================

  const getLoggedInUserId = () => {
    try {
      const savedUserData =
        localStorage.getItem("user") ||
        localStorage.getItem("userInfo") ||
        localStorage.getItem("authUser");

      if (!savedUserData) {
        return localStorage.getItem("userId");
      }

      const parsed =
        JSON.parse(savedUserData);

      return (
        parsed?._id ||
        parsed?.id ||
        parsed?.user?._id ||
        parsed?.user?.id ||
        parsed?.data?._id
      );
    } catch (err) {
      console.error(
        "Get logged user error:",
        err
      );

      return null;
    }
  };

  // ===================================================
  // 🗑️ DELETE PING
  // ===================================================

  const handleDeletePing = (
    deletedPingId
  ) => {
    setPings((prevPings) =>
      prevPings.filter(
        (ping) =>
          String(ping._id) !==
          String(deletedPingId)
      )
    );

    setResolvedPings(
      (prevResolved) =>
        prevResolved.filter(
          (ping) =>
            String(ping._id) !==
            String(deletedPingId)
        )
    );
  };

  // ===================================================
  // 🔔 BROWSER NOTIFICATION PERMISSION
  // ===================================================

  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission !== "granted"
    ) {
      Notification.requestPermission();
    }
  }, []);

  // ===================================================
  // 📍 FETCH NEARBY PINGS
  // ===================================================

  useEffect(() => {
    if (!coords) return;

    const fetchPings = async () => {
      try {
        // Backend radius KM mein expect karta hai.
        // Isliye yahan *1000 nahi karna.

        const res = await axios.get(
          `https://nearping-app.onrender.com/api/pings/near?latitude=${coords.lat}&longitude=${coords.lng}&radius=${radius}`
        );

        const allPings =
          Array.isArray(res.data)
            ? res.data
            : [];

        // =================================================
        // ⏰ FRONTEND EXPIRY PROTECTION
        // =================================================

        const now = Date.now();

        const activePings =
          allPings.filter((ping) => {
            const isActive =
              ping.status !== "RESOLVED";

            const isNotExpired =
              !ping.expiresAt ||
              new Date(
                ping.expiresAt
              ).getTime() > now;

            return (
              isActive &&
              isNotExpired
            );
          });

        // =================================================
        // 📚 RESOLVED HISTORY
        // =================================================

        const historyPings =
          allPings.filter(
            (ping) =>
              ping.status === "RESOLVED"
          );

        setPings(activePings);

        setResolvedPings(
          historyPings
        );
      } catch (err) {
        console.error(
          "App fetch error:",
          err
        );
      }
    };

    fetchPings();
  }, [coords, radius]);

  // ===================================================
  // ⏰ AUTOMATICALLY REMOVE EXPIRED ALERTS
  // ===================================================

  useEffect(() => {
    const removeExpiredPings =
      () => {
        const now = Date.now();

        setPings((prevPings) =>
          prevPings.filter(
            (ping) => {
              // Agar expiry time nahi hai
              // to ping ko rakho

              if (!ping.expiresAt) {
                return true;
              }

              return (
                new Date(
                  ping.expiresAt
                ).getTime() > now
              );
            }
          )
        );
      };

    // Immediately check
    removeExpiredPings();

    // Har 30 seconds check
    const interval =
      setInterval(
        removeExpiredPings,
        30000
      );

    return () =>
      clearInterval(interval);
  }, []);

  // ===================================================
  // 📡 SOCKET.IO EVENTS
  // ===================================================

  useEffect(() => {
    // =================================================
    // 🆕 NEW PING
    // =================================================

    const handleNewPing =
      (newPing) => {
        // Expired ping ko add mat karo

        if (
          newPing.expiresAt &&
          new Date(
            newPing.expiresAt
          ).getTime() <= Date.now()
        ) {
          return;
        }

        setPings((prev) => {
          // Duplicate ping avoid karo

          const alreadyExists =
            prev.some(
              (ping) =>
                String(
                  ping._id
                ) ===
                String(
                  newPing._id
                )
            );

          if (alreadyExists) {
            return prev;
          }

          return [
            newPing,
            ...prev,
          ];
        });

        // 🚨 Sound

        const isEmergency =
          newPing.alertType ===
          "EMERGENCY";

        playAlertSound(
          isEmergency
        );

        // 🔔 Browser notification

        if (
          "Notification" in window &&
          Notification.permission ===
            "granted"
        ) {
          new Notification(
            isEmergency
              ? "🚨 EMERGENCY ALERT!"
              : "📡 Naya Radar Alert",
            {
              body: `${
                newPing.title
              } - ${
                newPing.landmark ||
                "Location check karein"
              }`,
              icon: "/favicon.ico",
            }
          );
        }
      };

    // =================================================
    // ✅ PING RESOLVED
    // =================================================

    const handlePingResolved = ({
      pingId,
    }) => {
      setPings((prev) => {
        const found =
          prev.find(
            (p) =>
              String(
                p._id
              ) ===
              String(
                pingId
              )
          );

        if (found) {
          setResolvedPings(
            (res) => [
              {
                ...found,
                status:
                  "RESOLVED",
              },
              ...res,
            ]
          );
        }

        return prev.filter(
          (p) =>
            String(
              p._id
            ) !==
            String(
              pingId
            )
        );
      });
    };

    // =================================================
    // 🗑️ PING DELETED
    // =================================================

    const handlePingDeleted = ({
      pingId,
    }) => {
      setPings((prev) =>
        prev.filter(
          (p) =>
            String(
              p._id
            ) !==
            String(
              pingId
            )
        )
      );

      setResolvedPings(
        (prev) =>
          prev.filter(
            (p) =>
              String(
                p._id
              ) !==
              String(
                pingId
              )
          )
      );
    };

    // =================================================
    // 🔔 EXISTING NEW CLAIM
    // =================================================

    const handleNewClaim =
      (claimData) => {
        const currentUserId =
          getLoggedInUserId();

        const targetPingId =
          claimData.ping ||
          claimData.pingId;

        setPings(
          (currentPings) => {
            const matchedPing =
              currentPings.find(
                (p) =>
                  String(
                    p._id
                  ) ===
                  String(
                    targetPingId
                  )
              );

            if (matchedPing) {
              const ownerId =
                typeof matchedPing.user ===
                "object"
                  ? matchedPing
                      .user?._id ||
                    matchedPing
                      .user?.id
                  : matchedPing.user;

              const isLoggedInOwner =
                Boolean(
                  currentUserId &&
                    ownerId &&
                    String(
                      currentUserId
                    ).trim() ===
                      String(
                        ownerId
                      ).trim()
                );

              let myCreated = [];

              try {
                myCreated =
                  JSON.parse(
                    localStorage.getItem(
                      "myCreatedPings"
                    ) || "[]"
                  );
              } catch (error) {
                myCreated = [];
              }

              const isBrowserOwner =
                myCreated.includes(
                  matchedPing._id
                );

              if (
                isLoggedInOwner ||
                isBrowserOwner
              ) {
                alert(
                  `🔔 Naya Claim aaya hai aapke alert "${matchedPing.title}" par!`
                );
              }
            }

            return currentPings;
          }
        );
      };

    // =================================================
    // 🔔 OWNER-SPECIFIC NEW CLAIM
    // =================================================

    const currentUserId =
      getLoggedInUserId();

    const handleOwnerNewClaim =
      (claimData) => {
        console.log(
          "🔔 Owner New Claim:",
          claimData
        );

        if (!claimData) {
          return;
        }

        // Sound
        playAlertSound(false);

        // Browser notification
        if (
          "Notification" in window &&
          Notification.permission ===
            "granted"
        ) {
          new Notification(
            "🔔 NearPing - New Claim",
            {
              body:
                claimData.message ||
                "Kisi ne aapka lost item found kiya hai.",
              icon: "/favicon.ico",
            }
          );
        }

        // Screen alert
        alert(
          `🔔 ${
            claimData.message ||
            "Kisi ne aapka lost item found kiya hai."
          }`
        );
      };

    // =================================================
    // SOCKET LISTENERS
    // =================================================

    socket.on(
      "new-ping",
      handleNewPing
    );

    socket.on(
      "ping-resolved",
      handlePingResolved
    );

    socket.on(
      "ping-deleted",
      handlePingDeleted
    );

    socket.on(
      "new-claim",
      handleNewClaim
    );

    // Owner-specific listener

    if (currentUserId) {
      socket.on(
        `new-claim-owner-${currentUserId}`,
        handleOwnerNewClaim
      );
    }

    // =================================================
    // 🧹 CLEANUP
    // =================================================

    return () => {
      socket.off(
        "new-ping",
        handleNewPing
      );

      socket.off(
        "ping-resolved",
        handlePingResolved
      );

      socket.off(
        "ping-deleted",
        handlePingDeleted
      );

      socket.off(
        "new-claim",
        handleNewClaim
      );

      if (currentUserId) {
        socket.off(
          `new-claim-owner-${currentUserId}`,
          handleOwnerNewClaim
        );
      }
    };
  }, []);

  // ===================================================
  // ❌ CLOSE CREATE PING MODAL
  // ===================================================

  const handleCloseModal = () => {
    setIsModalOpen(false);

    setSelectedLocation(null);
  };

  // ===================================================
  // RETURN
  // ===================================================

  return (
    <div className="app-root">

      {/* Radar Toast */}

      <RadarAlertToast />

      {/* =================================================
          HEADER
      ================================================= */}

      <Header
        onOpenModal={() =>
          setIsModalOpen(true)
        }

        onOpenAuthModal={() =>
          setIsAuthModalOpen(true)
        }

        onOpenProfile={() =>
          setIsProfileOpen(true)
        }
      />

      {/* =================================================
          MAIN LAYOUT
      ================================================= */}

      <main className="main-layout">

        {/* =================================================
            MAP
        ================================================= */}

        <div className="map-section">

          <MapView
            selectedLocation={
              selectedLocation
            }

            setSelectedLocation={
              setSelectedLocation
            }

            setIsModalOpen={
              setIsModalOpen
            }
          />

        </div>

        {/* =================================================
            ALERTS
        ================================================= */}

        <div className="feed-section">

          <PingFeed
            pings={pings}

            resolvedPings={
              resolvedPings
            }

            radius={radius}

            setRadius={
              setRadius
            }

            onClaimClick={(ping) =>
              setSelectedPingForClaim(
                ping
              )
            }

            onViewClaimsClick={(ping) =>
              setSelectedPingForViewClaims(
                ping
              )
            }

            onDeletePing={
              handleDeletePing
            }
          />

        </div>

      </main>

      {/* =================================================
          CREATE PING
      ================================================= */}

      <CreatePingModal
        isOpen={
          isModalOpen
        }

        onClose={
          handleCloseModal
        }

        selectedLocation={
          selectedLocation
        }
      />

      {/* =================================================
          AUTH
      ================================================= */}

      <AuthModal
        isOpen={
          isAuthModalOpen
        }

        onClose={() =>
          setIsAuthModalOpen(
            false
          )
        }
      />

      {/* =================================================
          PROFILE
      ================================================= */}

      <Profile
        isOpen={
          isProfileOpen
        }

        onClose={() =>
          setIsProfileOpen(
            false
          )
        }
      />

      {/* =================================================
          CLAIM
      ================================================= */}

      {selectedPingForClaim && (
        <ClaimModal
          ping={
            selectedPingForClaim
          }

          onClose={() =>
            setSelectedPingForClaim(
              null
            )
          }
        />
      )}

      
 {/* =================================================
    CLAIMS LIST
================================================= */}

{selectedPingForViewClaims && (
  <ClaimsListModal
    ping={selectedPingForViewClaims}

    onClose={() =>
      setSelectedPingForViewClaims(null)
    }

    onClaimAccepted={() => {
      // Claim accept hone ke baad modal open rahega
      // Chat button dikhne ke liye
    }}
  />
)}
           </div>
         );
       }

export default App;