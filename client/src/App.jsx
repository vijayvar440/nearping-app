import React, { useState, useEffect, useContext } from "react";
import Header from "./components/Header/Header";
import MapView from "./components/MapView/MapView";
import PingFeed from "./components/PingFeed/PingFeed"; // Tabs wala code isi component mein integrated hai
import CreatePingModal from "./components/CreatePingModal/CreatePingModal";
import AuthModal from "./components/AuthModal/AuthModal";
import ClaimModal from "./components/ClaimModel/ClaimModal";
import ClaimsListModal from "./components/ClaimModel/ClaimsListModal";
import RadarAlertToast from "./components/RadarAlertToast/RadarAlertToast";
import { LocationContext } from "./context/LocationContext";
import axios from "axios";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000");

function App() {
  const { coords } = useContext(LocationContext);
  const [pings, setPings] = useState([]);
  const [radius, setRadius] = useState(5);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // 📍 Finder Claim Modal State
  const [selectedPingForClaim, setSelectedPingForClaim] = useState(null);

  // 📍 Owner Check Claims Modal State
  const [selectedPingForViewClaims, setSelectedPingForViewClaims] = useState(null);

  // 📍 Selected Location state for Map Clicks
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    if (!coords) return;
    const fetchPings = async () => {
      try {
        const radiusInMeters = radius * 1000;
        const res = await axios.get(
          `http://localhost:5000/api/pings/near?latitude=${coords.lat}&longitude=${coords.lng}&radius=${radiusInMeters}`
        );
        // Sirf active pings dikhayein
        setPings(res.data.filter(ping => ping.status !== "RESOLVED"));
      } catch (err) {
        console.error("App fetch error:", err);
      }
    };
    fetchPings();
  }, [coords, radius]);

  useEffect(() => {
    socket.on("new-ping", (newPing) => {
      setPings((prev) => [newPing, ...prev]);
    });

    // Live Hide Ping on Resolve
    socket.on("ping-resolved", ({ pingId }) => {
      setPings((prev) => prev.filter((p) => p._id !== pingId));
    });

    return () => {
      socket.off("new-ping");
      socket.off("ping-resolved");
    };
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLocation(null);
  };

  return (
    <div className="app-root">
      {/* 🚨 Live Geo-Fenced Radar Toast Notifications */}
      <RadarAlertToast />

      <Header
        onOpenModal={() => setIsModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <main className="main-layout">
        <div className="map-section">
          <MapView
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            setIsModalOpen={setIsModalOpen}
          />
        </div>

        {/* 📡 ALERTS SIDEBAR SECTION */}
        <div className="feed-section">
          <PingFeed 
            pings={pings} 
            radius={radius} 
            setRadius={setRadius}
            onClaimClick={(ping) => setSelectedPingForClaim(ping)}
            onViewClaimsClick={(ping) => setSelectedPingForViewClaims(ping)}
          />
        </div>
      </main>

      {/* Alert Create Modal */}
      <CreatePingModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        selectedLocation={selectedLocation}
      />

      {/* Login / Register Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Finder Claim Modal */}
      {selectedPingForClaim && (
        <ClaimModal
          ping={selectedPingForClaim}
          onClose={() => setSelectedPingForClaim(null)}
        />
      )}

      {/* Owner Claims List Modal */}
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