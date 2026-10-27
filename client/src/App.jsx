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
// API URL
// =====================================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://nearping-app.onrender.com";

// =====================================================
// SOCKET
// =====================================================

const socket = io(API_URL, {
  transports: ["websocket", "polling"],
});

// =====================================================
// NOTIFICATION SOUND
// =====================================================

const playAlertSound = (isEmergency = false) => {
  const soundUrl = isEmergency
    ? "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
    : "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3";

  const audio = new Audio(soundUrl);

  audio.play().catch((err) => {
    console.log(
      "Audio play blocked:",
      err
    );
  });
};

// =====================================================
// APP
// =====================================================

function App() {
  // ===================================================
  // AUTH + LOCATION
  // ===================================================

  const {
    coords,
    startLocationTracking,
    stopLocationTracking,
  } = useContext(LocationContext);

  const {
    user,
    loading: authLoading,
  } = useContext(AuthContext);

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

  const [isMessagesOpen, setIsMessagesOpen] =
    useState(false);

  const [
    selectedPingForClaim,
    setSelectedPingForClaim,
  ] = useState(null);

  const [
    selectedPingForViewClaims,
    setSelectedPingForViewClaims,
  ] = useState(null);

  const [
    selectedLocation,
    setSelectedLocation,
  ] = useState(null);

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
        /^[a-f\d]{24}$/i.test(
          savedUserData
        )
      ) {
        return savedUserData;
      }

      const parsed =
        JSON.parse(savedUserData);

      return (
        parsed?._id ||
        parsed?.id ||
        parsed?.user?._id ||
        parsed?.user?.id ||
        parsed?.data?._id ||
        localStorage.getItem(
          "userId"
        ) ||
        null
      );
    } catch (error) {
      console.error(
        "Get logged user error:",
        error
      );

      return (
        localStorage.getItem(
          "userId"
        ) || null
      );
    }
  };

  // ===================================================
  // AUTH → GPS CONTROL
  // ===================================================

  useEffect(() => {
    if (authLoading) {
      return;
    }

    // ===============================================
    // NOT LOGGED IN
    // ===============================================

    if (!user) {
      console.log(
        "🔒 User not logged in → GPS OFF"
      );

      stopLocationTracking();

      setPings([]);
      setResolvedPings([]);

      setIsModalOpen(false);
      setIsProfileOpen(false);
      setIsMessagesOpen(false);

      setIsAuthModalOpen(true);

      return;
    }

    // ===============================================
    // LOGGED IN
    // ===============================================

    console.log(
      "🔓 User logged in → Starting GPS"
    );

    startLocationTracking();

    setIsAuthModalOpen(false);
  }, [
    user,
    authLoading,
    startLocationTracking,
    stopLocationTracking,
  ]);

  // ===================================================
  // NOTIFICATION PERMISSION
  // ===================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    if (
      "Notification" in window &&
      Notification.permission ===
        "default"
    ) {
      Notification.requestPermission()
        .then((permission) => {
          console.log(
            "🔔 Notification permission:",
            permission
          );
        })
        .catch((error) => {
          console.warn(
            "⚠️ Notification permission error:",
            error
          );
        });
    }
  }, [user]);

  // ===================================================
  // JOIN USER SOCKET ROOM
  // ===================================================

  useEffect(() => {
    let interval = null;

    const joinUserRoom = () => {
      if (!user) {
        return;
      }

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

    if (user) {
      interval = setInterval(
        joinUserRoom,
        1000
      );
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [user]);

  // ===================================================
  // DELETE PING FROM UI
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
  // FETCH NEARBY PINGS
  // IMPORTANT:
  // FETCH DATA IS MERGED.
  // IT DOES NOT ERASE SOCKET PINGS.
  // ===================================================

  useEffect(() => {
    if (!user) {
      setPings([]);
      setResolvedPings([]);
      return;
    }

    if (!coords) {
      return;
    }

    const latitude =
      Number(coords.lat);

    const longitude =
      Number(coords.lng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      console.error(
        "❌ Invalid user coordinates:",
        coords
      );

      return;
    }

    let cancelled = false;

    const fetchPings = async () => {
      try {
        console.log(
          "📍 Fetching nearby pings:",
          {
            latitude,
            longitude,
            radius,
          }
        );

        const response =
          await axios.get(
            `${API_URL}/api/pings/near`,
            {
              params: {
                latitude,
                longitude,
                radius,
              },
            }
          );

        if (cancelled) {
          return;
        }

        const allPings =
          Array.isArray(response.data)
            ? response.data
            : [];

        console.log(
          "🗺️ Nearby Pings:",
          allPings
        );

        const now = Date.now();

        // ==========================================
        // ACTIVE PINGS
        // ==========================================

        const activePings =
          allPings.filter((ping) => {
            const isActive =
              String(
                ping.status
              ).toUpperCase() !==
              "RESOLVED";

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

        // ==========================================
        // RESOLVED / HISTORY
        // ==========================================

        const historyPings =
          allPings.filter(
            (ping) =>
              String(
                ping.status
              ).toUpperCase() ===
              "RESOLVED"
          );

        // ==========================================
        // IMPORTANT MERGE
        // ==========================================

        setPings((previousPings) => {
          const pingMap =
            new Map();

          // Existing socket pings
          previousPings.forEach(
            (ping) => {
              if (ping?._id) {
                pingMap.set(
                  String(ping._id),
                  ping
                );
              }
            }
          );

          // API pings
          activePings.forEach(
            (ping) => {
              if (ping?._id) {
                pingMap.set(
                  String(ping._id),
                  ping
                );
              }
            }
          );

          return Array.from(
            pingMap.values()
          );
        });

        setResolvedPings(
          historyPings
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "❌ App fetch error:",
          error.response?.data ||
            error.message
        );
      }
    };

    fetchPings();

    return () => {
      cancelled = true;
    };
  }, [
    user,
    coords,
    radius,
  ]);

  // ===================================================
  // REMOVE EXPIRED PINGS
  // ===================================================

  useEffect(() => {
    const removeExpiredPings =
      () => {
        const now = Date.now();

        setPings((prevPings) =>
          prevPings.filter(
            (ping) => {
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

    removeExpiredPings();

    const interval =
      setInterval(
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
    // ===============================================
    // NEW PING
    // ===============================================

    const handleNewPing = (
      newPing
    ) => {
      if (!user) {
        return;
      }

      console.log(
        "🔔 New Ping Received:",
        newPing
      );

      if (!newPing?._id) {
        return;
      }

      // Resolved alert ignore
      if (
        String(
          newPing.status
        ).toUpperCase() ===
        "RESOLVED"
      ) {
        return;
      }

      // Expired alert ignore
      if (
        newPing.expiresAt &&
        new Date(
          newPing.expiresAt
        ).getTime() <=
          Date.now()
      ) {
        return;
      }

      // ==========================================
      // MERGE NEW PING
      // ==========================================

      setPings((prevPings) => {
        const pingId =
          String(newPing._id);

        const exists =
          prevPings.some(
            (ping) =>
              String(
                ping._id
              ) === pingId
          );

        if (exists) {
          return prevPings.map(
            (ping) =>
              String(
                ping._id
              ) === pingId
                ? newPing
                : ping
          );
        }

        return [
          newPing,
          ...prevPings,
        ];
      });

      // ==========================================
      // SOUND
      // ==========================================

      const isEmergency =
        String(
          newPing.type
        ).toUpperCase() ===
          "URGENT_HELP" ||
        String(
          newPing.alertType
        ).toUpperCase() ===
          "EMERGENCY";

      playAlertSound(
        isEmergency
      );

      // ==========================================
      // BROWSER NOTIFICATION
      // ==========================================

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
              newPing.title ||
              "New alert"
            }${
              newPing.landmark
                ? ` - ${newPing.landmark}`
                : ""
            }`,
            icon:
              "/favicon.ico",
          }
        );
      }
    };

    // ===============================================
    // PING RESOLVED
    // ===============================================

    const handlePingResolved = ({
      pingId,
    }) => {
      if (!user) {
        return;
      }

      console.log(
        "✅ Ping Resolved:",
        pingId
      );

      setPings((prevPings) => {
        const foundPing =
          prevPings.find(
            (ping) =>
              String(
                ping._id
              ) ===
              String(pingId)
          );

        if (foundPing) {
          setResolvedPings(
            (prevResolved) => [
              {
                ...foundPing,
                status:
                  "RESOLVED",
              },
              ...prevResolved,
            ]
          );
        }

        return prevPings.filter(
          (ping) =>
            String(
              ping._id
            ) !==
            String(pingId)
        );
      });
    };

    // ===============================================
    // PING DELETED
    // ===============================================

    const handlePingDeleted = ({
      pingId,
    }) => {
      if (!user) {
        return;
      }

      console.log(
        "🗑️ Ping Deleted:",
        pingId
      );

      setPings((prevPings) =>
        prevPings.filter(
          (ping) =>
            String(
              ping._id
            ) !==
            String(pingId)
        )
      );

      setResolvedPings(
        (prevResolved) =>
          prevResolved.filter(
            (ping) =>
              String(
                ping._id
              ) !==
              String(pingId)
          )
      );
    };

    // ===============================================
    // NEW CLAIM
    // ===============================================

    const handleNewClaim = (
      claimData
    ) => {
      if (!user) {
        return;
      }

      const currentUserId =
        user?._id ||
        user?.id ||
        getLoggedInUserId();

      const targetPingId =
        claimData?.ping ||
        claimData?.pingId;

      setPings((currentPings) => {
        const matchedPing =
          currentPings.find(
            (ping) =>
              String(
                ping._id
              ) ===
              String(
                targetPingId
              )
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

    // ===============================================
    // OWNER-SPECIFIC NEW CLAIM
    // ===============================================

    const currentUserId =
      user?._id ||
      user?.id ||
      getLoggedInUserId();

    const handleOwnerNewClaim = (
      claimData
    ) => {
      if (!user) {
        return;
      }

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
            icon:
              "/favicon.ico",
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

    // ===============================================
    // REGISTER SOCKET EVENTS
    // ===============================================

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

    if (
      currentUserId &&
      user
    ) {
      console.log(
        "🔔 Listening for owner claims:",
        `new-claim-owner-${currentUserId}`
      );

      socket.on(
        `new-claim-owner-${currentUserId}`,
        handleOwnerNewClaim
      );
    }

    // ===============================================
    // CLEANUP
    // ===============================================

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
  // OPEN ALERT
  // ===================================================

  const handleOpenAlert = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsModalOpen(true);
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
  // OPEN PROFILE
  // ===================================================

  const handleOpenProfile = () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsProfileOpen(true);
  };

  // ===================================================
  // AUTH MODAL CLOSE
  // ===================================================

  const handleAuthModalClose = () => {
    setIsAuthModalOpen(false);
  };

  // ===================================================
  // RETURN
  // ===================================================

  return (
    <div className="app-root">

      {/* RADAR ALERT */}

      {user && (
        <RadarAlertToast />
      )}

      {/* HEADER */}

      <Header
        onOpenModal={
          handleOpenAlert
        }

        onOpenAuthModal={() => {
          setIsAuthModalOpen(true);
        }}

        onOpenProfile={
          handleOpenProfile
        }

        onOpenMessages={
          handleOpenMessages
        }
      />

      {/* MAIN */}

      <main className="main-layout">

        {/* MAP */}

        <div className="map-section">

          <MapView
            pings={pings}
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

            setRadius={
              setRadius
            }

            onClaimClick={(ping) => {
              if (!user) {
                setIsAuthModalOpen(
                  true
                );
                return;
              }

              setSelectedPingForClaim(
                ping
              );
            }}

            onViewClaimsClick={(
              ping
            ) => {
              if (!user) {
                setIsAuthModalOpen(
                  true
                );
                return;
              }

              setSelectedPingForViewClaims(
                ping
              );
            }}

            onDeletePing={
              handleDeletePing
            }
          />

        </div>

      </main>

      {/* CREATE PING MODAL */}

      <CreatePingModal
        isOpen={
          isModalOpen &&
          Boolean(user)
        }

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

        onClose={
          handleAuthModalClose
        }
      />

      {/* PROFILE */}

      {user && (
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
      )}

      {/* CLAIM MODAL */}

      {selectedPingForClaim &&
        user && (
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

      {selectedPingForViewClaims &&
        user && (
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

      {isMessagesOpen &&
        user && (
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