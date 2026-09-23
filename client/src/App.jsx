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
import MessagesModal from "./components/MessagesModal/MessagesModal";

import { LocationContext } from "./context/LocationContext";
import { AuthContext } from "./context/AuthContext";

import axios from "axios";
import { io } from "socket.io-client";

import "./App.css";

// =====================================================
// SOCKET
// =====================================================

const socket = io("https://nearping-app.onrender.com");

// =====================================================
// NOTIFICATION SOUND
// =====================================================

const playAlertSound = (isEmergency = false) => {
  const soundUrl = isEmergency
    ? "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
    : "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3";

  const audio = new Audio(soundUrl);

  audio.play().catch((err) => {
    console.log("Audio play blocked:", err);
  });
};

// =====================================================
// APP
// =====================================================

function App() {
  const { coords } = useContext(LocationContext);
  const { user } = useContext(AuthContext);

  // ===================================================
  // STATES
  // ===================================================

  const [pings, setPings] = useState([]);
  const [resolvedPings, setResolvedPings] = useState([]);

  const [radius, setRadius] = useState(5);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [isMessagesOpen, setIsMessagesOpen] = useState(false);

  const [selectedPingForClaim, setSelectedPingForClaim] =
    useState(null);

  const [
    selectedPingForViewClaims,
    setSelectedPingForViewClaims,
  ] = useState(null);

  const [selectedLocation, setSelectedLocation] =
    useState(null);

  // ===================================================
  // GET LOGGED-IN USER ID
  // ===================================================

  const getLoggedInUserId = () => {
    try {
      const savedUserData =
        localStorage.getItem("user") ||
        localStorage.getItem("userInfo") ||
        localStorage.getItem("authUser");

      if (!savedUserData) {
        return (
          localStorage.getItem("userId") ||
          null
        );
      }

      if (
        typeof savedUserData === "string" &&
        /^[a-f\d]{24}$/i.test(savedUserData)
      ) {
        return savedUserData;
      }

      const parsed = JSON.parse(savedUserData);

      return (
        parsed?._id ||
        parsed?.id ||
        parsed?.user?._id ||
        parsed?.user?.id ||
        parsed?.data?._id ||
        localStorage.getItem("userId") ||
        null
      );
    } catch (error) {
      console.error(
        "Get logged user error:",
        error
      );

      return (
        localStorage.getItem("userId") ||
        null
      );
    }
  };

  // ===================================================
  // JOIN USER SOCKET ROOM
  // ===================================================

  useEffect(() => {
    let interval = null;

    const joinUserRoom = () => {
      const userId =
        user?._id ||
        user?.id ||
        getLoggedInUserId();

      if (!userId) {
        return;
      }

      console.log(
        "👤 Joining NearPing user room:",
        userId
      );

      socket.emit(
        "join-user",
        String(userId)
      );

      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    joinUserRoom();

    interval = setInterval(
      joinUserRoom,
      1000
    );

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [user]);

  // ===================================================
  // DELETE PING FROM UI
  // ===================================================

  const handleDeletePing = (deletedPingId) => {
    setPings((prevPings) =>
      prevPings.filter(
        (ping) =>
          String(ping._id) !==
          String(deletedPingId)
      )
    );

    setResolvedPings((prevResolved) =>
      prevResolved.filter(
        (ping) =>
          String(ping._id) !==
          String(deletedPingId)
      )
    );
  };

  // ===================================================
  // NOTIFICATION PERMISSION
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
  // FETCH NEARBY PINGS
  // ===================================================

  useEffect(() => {
    if (!coords) {
      return;
    }

    const fetchPings = async () => {
      try {
        const response = await axios.get(
          `https://nearping-app.onrender.com/api/pings/near?latitude=${coords.lat}&longitude=${coords.lng}&radius=${radius}`
        );

        const allPings =
          Array.isArray(response.data)
            ? response.data
            : [];

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

        const historyPings =
          allPings.filter(
            (ping) =>
              ping.status === "RESOLVED"
          );

        setPings(activePings);
        setResolvedPings(historyPings);
      } catch (error) {
        console.error(
          "App fetch error:",
          error
        );
      }
    };

    fetchPings();
  }, [coords, radius]);

  // ===================================================
  // REMOVE EXPIRED PINGS
  // ===================================================

  useEffect(() => {
    const removeExpiredPings = () => {
      const now = Date.now();

      setPings((prevPings) =>
        prevPings.filter((ping) => {
          if (!ping.expiresAt) {
            return true;
          }

          return (
            new Date(
              ping.expiresAt
            ).getTime() > now
          );
        })
      );
    };

    removeExpiredPings();

    const interval = setInterval(
      removeExpiredPings,
      30000
    );

    return () =>
      clearInterval(interval);
  }, []);

  // ===================================================
  // SOCKET EVENTS
  // ===================================================

  useEffect(() => {
    // -------------------------------------------------
    // NEW PING
    // -------------------------------------------------

    const handleNewPing = (newPing) => {
      if (
        newPing.expiresAt &&
        new Date(
          newPing.expiresAt
        ).getTime() <= Date.now()
      ) {
        return;
      }

      setPings((prevPings) => {
        const alreadyExists =
          prevPings.some(
            (ping) =>
              String(ping._id) ===
              String(newPing._id)
          );

        if (alreadyExists) {
          return prevPings;
        }

        return [
          newPing,
          ...prevPings,
        ];
      });

      const isEmergency =
        newPing.alertType ===
        "EMERGENCY";

      playAlertSound(isEmergency);

      if (
        "Notification" in window &&
        Notification.permission === "granted"
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
            icon: "/favicon.ico",
          }
        );
      }
    };

    // -------------------------------------------------
    // PING RESOLVED
    // -------------------------------------------------

    const handlePingResolved = ({
      pingId,
    }) => {
      setPings((prevPings) => {
        const foundPing =
          prevPings.find(
            (ping) =>
              String(ping._id) ===
              String(pingId)
          );

        if (foundPing) {
          setResolvedPings(
            (prevResolved) => [
              {
                ...foundPing,
                status: "RESOLVED",
              },
              ...prevResolved,
            ]
          );
        }

        return prevPings.filter(
          (ping) =>
            String(ping._id) !==
            String(pingId)
        );
      });
    };

    // -------------------------------------------------
    // PING DELETED
    // -------------------------------------------------

    const handlePingDeleted = ({
      pingId,
    }) => {
      setPings((prevPings) =>
        prevPings.filter(
          (ping) =>
            String(ping._id) !==
            String(pingId)
        )
      );

      setResolvedPings(
        (prevResolved) =>
          prevResolved.filter(
            (ping) =>
              String(ping._id) !==
              String(pingId)
          )
      );
    };

    // -------------------------------------------------
    // NEW CLAIM
    // -------------------------------------------------

    const handleNewClaim = (
      claimData
    ) => {
      const currentUserId =
        user?._id ||
        user?.id ||
        getLoggedInUserId();

      const targetPingId =
        claimData.ping ||
        claimData.pingId;

      setPings((currentPings) => {
        const matchedPing =
          currentPings.find(
            (ping) =>
              String(ping._id) ===
              String(targetPingId)
          );

        if (!matchedPing) {
          return currentPings;
        }

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
              String(currentUserId).trim() ===
                String(ownerId).trim()
          );

        let myCreated = [];

        try {
          myCreated = JSON.parse(
            localStorage.getItem(
              "myCreatedPings"
            ) || "[]"
          );
        } catch {
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

        return currentPings;
      });
    };

    // -------------------------------------------------
    // OWNER-SPECIFIC NEW CLAIM
    // -------------------------------------------------

    const currentUserId =
      user?._id ||
      user?.id ||
      getLoggedInUserId();

    const handleOwnerNewClaim = (
      claimData
    ) => {
      if (!claimData) {
        return;
      }

      console.log(
        "🔔 Owner New Claim:",
        claimData
      );

      playAlertSound(false);

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

      alert(
        `🔔 ${
          claimData.message ||
          "Kisi ne aapka lost item found kiya hai."
        }`
      );
    };

    // -------------------------------------------------
    // REGISTER SOCKET EVENTS
    // -------------------------------------------------

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

    if (currentUserId) {
      console.log(
        "🔔 Listening for owner claims:",
        `new-claim-owner-${currentUserId}`
      );

      socket.on(
        `new-claim-owner-${currentUserId}`,
        handleOwnerNewClaim
      );
    }

    // -------------------------------------------------
    // CLEANUP
    // -------------------------------------------------

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
  }, [user]);

  // ===================================================
  // CLOSE CREATE PING MODAL
  // ===================================================

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLocation(null);
  };

  // ===================================================
  // OPEN MESSAGES
  // ===================================================

  const handleOpenMessages = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsMessagesOpen(true);
  };

  // ===================================================
  // CLOSE MESSAGES
  // ===================================================

  const handleCloseMessages = () => {
    setIsMessagesOpen(false);
  };

  // ===================================================
  // RETURN
  // ===================================================

  return (
    <div className="app-root">

      {/* RADAR ALERT */}
      <RadarAlertToast />

      {/* HEADER */}
      <Header
        onOpenModal={() => {
          setIsModalOpen(true);
        }}

        onOpenAuthModal={() => {
          setIsAuthModalOpen(true);
        }}

        onOpenProfile={() => {
          setIsProfileOpen(true);
        }}

        onOpenMessages={
          handleOpenMessages
        }
      />

      {/* MAIN */}
      <main className="main-layout">

        {/* MAP */}
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

        {/* PING FEED */}
        <div className="feed-section">
          <PingFeed
            pings={pings}
            resolvedPings={
              resolvedPings
            }
            radius={radius}
            setRadius={setRadius}

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

      {/* CREATE PING MODAL */}
      <CreatePingModal
        isOpen={isModalOpen}
        onClose={
          handleCloseModal
        }
        selectedLocation={
          selectedLocation
        }
      />

      {/* AUTH MODAL */}
      <AuthModal
        isOpen={
          isAuthModalOpen
        }
        onClose={() =>
          setIsAuthModalOpen(false)
        }
      />

      {/* PROFILE */}
      <Profile
        isOpen={isProfileOpen}
        onClose={() =>
          setIsProfileOpen(false)
        }
      />

      {/* CLAIM MODAL */}
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

      {/* CLAIMS LIST */}
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
          onClaimAccepted={() => {
            // Claim accept ke baad
            // modal open rahega
          }}
        />
      )}

      {/* MESSAGES */}
      {isMessagesOpen && (
        <MessagesModal
          onClose={
            handleCloseMessages
          }
        />
      )}

    </div>
  );
}

export default App;