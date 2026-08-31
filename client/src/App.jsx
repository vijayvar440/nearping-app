import React, { useState, useEffect, useContext } from "react";
import Header from "./components/Header/Header";
import MapView from "./components/MapView/MapView";
import PingFeed from "./components/PingFeed/PingFeed";
import CreatePingModal from "./components/CreatePingModal/CreatePingModal";
import AuthModal from "./components/AuthModal/AuthModal";
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

  useEffect(() => {
    if (!coords) return;
    const fetchPings = async () => {
      try {
        const radiusInMeters = radius * 1000;
        const res = await axios.get(
          `http://localhost:5000/api/pings/near?latitude=${coords.lat}&longitude=${coords.lng}&radius=${radiusInMeters}`
        );
        setPings(res.data);
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
    return () => socket.off("new-ping");
  }, []);

  return (
    <div className="app-root">
      <Header
        onOpenModal={() => setIsModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <main className="main-layout">
        <div className="map-section">
          <MapView />
        </div>
        <div className="feed-section">
          <PingFeed pings={pings} radius={radius} setRadius={setRadius} />
        </div>
      </main>

      {/* Alert Create Modal */}
      <CreatePingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Login / Register Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default App;