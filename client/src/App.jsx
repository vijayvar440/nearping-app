import React, { useState, useEffect, useContext } from "react";
import Header from "./components/Header/Header";
import MapView from "./components/MapView/MapView";
import PingFeed from "./components/PingFeed/PingFeed";
import { LocationContext } from "./context/LocationContext";
import axios from "axios";
import { io } from "socket.io-client";
import CreatePing from "./components/CreatePing/CreatePing";
import "./App.css";

const socket = io("http://localhost:5000");

function App() {
  const { coords } = useContext(LocationContext);
  const [pings, setPings] = useState([]);

  useEffect(() => {
    if (!coords) return;
    const fetchPings = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/pings/near?latitude=${coords.lat}&longitude=${coords.lng}&radius=50000`
        );
        setPings(res.data);
      } catch (err) {
        console.error("App fetch error:", err);
      }
    };
    fetchPings();
  }, [coords]);

  useEffect(() => {
    socket.on("new-ping", (newPing) => {
      setPings((prev) => [newPing, ...prev]);
    });
    return () => socket.off("new-ping");
  }, []);

  return (
    <div className="app-root">
      <Header />
     
     <div className="create-ping-area">
  <CreatePing />
</div>

      <main className="main-layout">
        <div className="map-section">
          <MapView />
        </div>
        <div className="feed-section">
          <PingFeed pings={pings} />
        </div>
      </main>
    </div>
  );
}

export default App;