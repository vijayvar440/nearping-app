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

const socket = io("http://localhost:5000");

// 🔊 Notification Sound Play Function
const playAlertSound = (isEmergency) => {
  const soundUrl = isEmergency 
    ? "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" // Emergency Loud Alert Sound
    : "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3"; // Normal Notification Sound
    
  const audio = new Audio(soundUrl);
  audio.play().catch(err => console.log("Audio play blocked by browser policy:", err));
};

function App() {
  const { coords } = useContext(LocationContext);
  const [pings, setPings] = useState([]);
  const [resolvedPings, setResolvedPings] = useState([]);
  const [radius, setRadius] = useState(5);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  const [selectedPingForClaim, setSelectedPingForClaim] = useState(null);
  const [selectedPingForViewClaims, setSelectedPingForViewClaims] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const getLoggedInUserId = () => {
    try {
      const savedUserData = localStorage.getItem("user") || localStorage.getItem("userInfo") || localStorage.getItem("authUser");
      if (!savedUserData) return localStorage.getItem("userId");
      
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

  const handleDeletePing = (deletedPingId) => {
    setPings((prevPings) => prevPings.filter((ping) => ping._id !== deletedPingId));
    setResolvedPings((prevResolved) => prevResolved.filter((ping) => ping._id !== deletedPingId));
  };

  useEffect(() => {
    // Browser Notification Permission request
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!coords) return;
    const fetchPings = async () => {
      try {
        const radiusInMeters = radius * 1000;
        const res = await axios.get(
          `http://localhost:5000/api/pings/near?latitude=${coords.lat}&longitude=${coords.lng}&radius=${radiusInMeters}`
        );
        const allPings = res.data;
        setPings(allPings.filter(ping => ping.status !== "RESOLVED"));
        setResolvedPings(allPings.filter(ping => ping.status === "RESOLVED"));
      } catch (err) {
        console.error("App fetch error:", err);
      }
    };
    fetchPings();
  }, [coords, radius]);

  useEffect(() => {
    socket.on("new-ping", (newPing) => {
      setPings((prev) => [newPing, ...prev]);

      // 🚨 Trigger Sound and Push Notification for other devices/users
      const isEmergency = newPing.alertType === "EMERGENCY";
      playAlertSound(isEmergency);

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(isEmergency ? "🚨 EMERGENCY ALERT!" : "📡 Naya Radar Alert", {
          body: `${newPing.title} - ${newPing.landmark || "Location check karein"}`,
          icon: "/favicon.ico"
        });
      }
    });

    socket.on("ping-resolved", ({ pingId }) => {
      setPings((prev) => {
        const found = prev.find(p => p._id === pingId);
        if (found) {
          setResolvedPings(res => [{ ...found, status: "RESOLVED" }, ...res]);
        }
        return prev.filter((p) => p._id !== pingId);
      });
    });

    socket.on("ping-deleted", ({ pingId }) => {
      setPings((prev) => prev.filter((p) => p._id !== pingId));
      setResolvedPings((prev) => prev.filter((p) => p._id !== pingId));
    });

    socket.on("new-claim", (claimData) => {
      const currentUserId = getLoggedInUserId();
      const targetPingId = claimData.ping || claimData.pingId;

      const matchedPing = pings.find(p => String(p._id) === String(targetPingId));
      if (matchedPing) {
        const ownerId = typeof matchedPing.user === "object" ? matchedPing.user?._id || matchedPing.user?.id : matchedPing.user;
        const isLoggedInOwner = Boolean(currentUserId && ownerId && String(currentUserId).trim() === String(ownerId).trim());
        
        const myCreated = JSON.parse(localStorage.getItem("myCreatedPings") || "[]");
        const isBrowserOwner = myCreated.includes(matchedPing._id);

        if (isLoggedInOwner || isBrowserOwner) {
          alert(`🔔 Naya Claim aaya hai aapke alert "${matchedPing.title}" par!`);
        }
      }
    });

    return () => {
      socket.off("new-ping");
      socket.off("ping-resolved");
      socket.off("ping-deleted");
      socket.off("new-claim");
    };
  }, [pings]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLocation(null);
  };

  return (
    <div className="app-root">
      <RadarAlertToast />

      <Header
        onOpenModal={() => setIsModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <main className="main-layout">
        <div className="map-section">
          <MapView
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            setIsModalOpen={setIsModalOpen}
          />
        </div>

        <div className="feed-section">
          <PingFeed 
            pings={pings} 
            resolvedPings={resolvedPings}
            radius={radius} 
            setRadius={setRadius}
            onClaimClick={(ping) => setSelectedPingForClaim(ping)}
            onViewClaimsClick={(ping) => setSelectedPingForViewClaims(ping)}
            onDeletePing={handleDeletePing}
          />
        </div>
      </main>

      <CreatePingModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedLocation={selectedLocation}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <Profile
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      {selectedPingForClaim && (
        <ClaimModal
          ping={selectedPingForClaim}
          onClose={() => setSelectedPingForClaim(null)}
        />
      )}

      {selectedPingForViewClaims && (
        <ClaimsListModal
          ping={selectedPingForViewClaims}
          onClose={() => setSelectedPingForViewClaims(null)}
          onClaimAccepted={() => setSelectedPingForViewClaims(null)}
        />
      )}
    </div>
  );
}

export default App;