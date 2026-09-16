import React, { useState, useEffect, useContext } from "react";
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

const socket = io("https://nearping-app.onrender.com");

// 🔊 Notification Sound
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

function App() {
  const { coords } = useContext(LocationContext);

  const [pings, setPings] = useState([]);
  const [resolvedPings, setResolvedPings] = useState([]);
  const [radius, setRadius] = useState(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [selectedPingForClaim, setSelectedPingForClaim] =
    useState(null);

  const [selectedPingForViewClaims, setSelectedPingForViewClaims] =
    useState(null);

  const [selectedLocation, setSelectedLocation] =
    useState(null);


  // 👤 Get logged-in user ID
  const getLoggedInUserId = () => {
    try {
      const savedUserData =
        localStorage.getItem("user") ||
        localStorage.getItem("userInfo") ||
        localStorage.getItem("authUser");

      if (!savedUserData) {
        return localStorage.getItem("userId");
      }

      const parsed = JSON.parse(savedUserData);

      return (
        parsed?._id ||
        parsed?.id ||
        parsed?.user?._id ||
        parsed?.user?.id ||
        parsed?.data?._id
      );
    } catch (err) {
      return null;
    }
  };


  // 🗑️ Delete ping from frontend
  const handleDeletePing = (deletedPingId) => {
    setPings((prevPings) =>
      prevPings.filter(
        (ping) =>
          String(ping._id) !== String(deletedPingId)
      )
    );

    setResolvedPings((prevResolved) =>
      prevResolved.filter(
        (ping) =>
          String(ping._id) !== String(deletedPingId)
      )
    );
  };


  // 🔔 Browser notification permission
  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission !== "granted"
    ) {
      Notification.requestPermission();
    }
  }, []);


  // 📍 Fetch nearby pings
  useEffect(() => {
    if (!coords) return;

    const fetchPings = async () => {
      try {

        // =====================================================
        // 📡 IMPORTANT:
        // Backend radius KM me expect karta hai.
        // Isliye yahan *1000 nahi karna.
        // =====================================================

        const res = await axios.get(
          `https://nearping-app.onrender.com/api/pings/near?latitude=${coords.lat}&longitude=${coords.lng}&radius=${radius}`
        );

        const allPings = Array.isArray(res.data)
          ? res.data
          : [];

        // ⏰ Frontend expiry protection
        const now = Date.now();

        const activePings = allPings.filter((ping) => {

          const isActive =
            ping.status !== "RESOLVED";

          const isNotExpired =
            !ping.expiresAt ||
            new Date(ping.expiresAt).getTime() > now;

          return (
            isActive &&
            isNotExpired
          );
        });


        const historyPings = allPings.filter(
          (ping) =>
            ping.status === "RESOLVED"
        );


        setPings(activePings);
        setResolvedPings(historyPings);

      } catch (err) {

        console.error(
          "App fetch error:",
          err
        );

      }
    };

    fetchPings();

  }, [coords, radius]);


  // ⏰ Automatically remove expired alerts
  useEffect(() => {

    const removeExpiredPings = () => {

      const now = Date.now();

      setPings((prevPings) =>
        prevPings.filter((ping) => {

          // Agar expiry time nahi hai
          // to ping ko rakho
          if (!ping.expiresAt) {
            return true;
          }

          // Sirf future expiry wale alerts rakho
          return (
            new Date(
              ping.expiresAt
            ).getTime() > now
          );
        })
      );

    };


    // Immediately check
    removeExpiredPings();


    // Har 30 seconds check
    const interval = setInterval(
      removeExpiredPings,
      30000
    );


    return () =>
      clearInterval(interval);

  }, []);


  // 📡 Socket.io events
  useEffect(() => {

    // 🆕 New Ping
    const handleNewPing = (newPing) => {

      // ⏰ Expired ping ko add mat karo
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
              String(ping._id) ===
              String(newPing._id)
          );

        if (alreadyExists) {
          return prev;
        }

        return [
          newPing,
          ...prev
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
            body: `${newPing.title} - ${
              newPing.landmark ||
              "Location check karein"
            }`,
            icon: "/favicon.ico"
          }
        );

      }

    };


    // =====================================================
    // 🆕 New Ping
    // =====================================================
    socket.on(
      "new-ping",
      handleNewPing
    );


    // =====================================================
    // ✅ Ping Resolved
    // =====================================================
    const handlePingResolved = ({
      pingId
    }) => {

      setPings((prev) => {

        const found =
          prev.find(
            (p) =>
              String(p._id) ===
              String(pingId)
          );


        if (found) {

          setResolvedPings(
            (res) => [
              {
                ...found,
                status:
                  "RESOLVED"
              },
              ...res
            ]
          );

        }


        return prev.filter(
          (p) =>
            String(p._id) !==
            String(pingId)
        );

      });

    };


    socket.on(
      "ping-resolved",
      handlePingResolved
    );


    // =====================================================
    // 🗑️ Ping Deleted
    // =====================================================
    const handlePingDeleted = ({
      pingId
    }) => {

      setPings((prev) =>
        prev.filter(
          (p) =>
            String(p._id) !==
            String(pingId)
        )
      );


      setResolvedPings((prev) =>
        prev.filter(
          (p) =>
            String(p._id) !==
            String(pingId)
        )
      );

    };


    socket.on(
      "ping-deleted",
      handlePingDeleted
    );


    // =====================================================
    // 🔔 New Claim
    // =====================================================
    const handleNewClaim = (
      claimData
    ) => {

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
                String(p._id) ===
                String(targetPingId)
            );


          if (matchedPing) {

            const ownerId =
              typeof matchedPing.user ===
              "object"
                ? matchedPing.user?._id ||
                  matchedPing.user?.id
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


    socket.on(
      "new-claim",
      handleNewClaim
    );


    // 🧹 Cleanup
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

    };

  }, []);


  // ❌ Close create ping modal
  const handleCloseModal = () => {

    setIsModalOpen(false);
    setSelectedLocation(null);

  };


  return (

    <div className="app-root">

      <RadarAlertToast />


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


      <main className="main-layout">

        {/* 🗺️ Map */}
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


        {/* 📡 Alerts */}
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


      {/* ➕ Create Ping */}
      <CreatePingModal
        isOpen={isModalOpen}

        onClose={
          handleCloseModal
        }

        selectedLocation={
          selectedLocation
        }

      />


      {/* 🔐 Auth */}
      <AuthModal
        isOpen={
          isAuthModalOpen
        }

        onClose={() =>
          setIsAuthModalOpen(false)
        }

      />


      {/* 👤 Profile */}
      <Profile
        isOpen={
          isProfileOpen
        }

        onClose={() =>
          setIsProfileOpen(false)
        }

      />


      {/* ✋ Claim */}
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


      {/* 📥 Claims List */}
      {selectedPingForViewClaims && (

        <ClaimsListModal
          ping={
            selectedPingForViewClaims
          }

          onClose={() =>
            setSelectedPingForViewClaims(
              null
            )
          }

          onClaimAccepted={() =>
            setSelectedPingForViewClaims(
              null
            )
          }

        />

      )}

    </div>

  );
}

export default App;