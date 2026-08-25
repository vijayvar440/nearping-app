import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { LocationContext } from './context/LocationContext';
import MapView from "./components/MapView";
import CreatePingModal from './components/CreatePingModal';

const socket = io('http://localhost:5000');

function App() {
  const { coords, error } = useContext(LocationContext);
  const [pings, setPings] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (coords) {
      // 1. Initial Nearby Pings Fetch
      axios.get(`http://localhost:5000/api/pings/nearby?longitude=${coords.lng}&latitude=${coords.lat}&radius=500`)
        .then(res => setPings(res.data.data))
        .catch(err => console.error("Error fetching pings:", err));

      // 2. Real-time Socket Listener
      socket.on("NEW_PING_CREATED", (newPing) => {
        setPings((prev) => [newPing, ...prev]);
      });

      return () => socket.off("NEW_PING_CREATED");
    }
  }, [coords]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="mb-4 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold text-indigo-600">🔴 NearPing</h1>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
          >
            + Post Alert
          </button>
          
          {coords ? (
            <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              📍 GPS Active
            </span>
          ) : (
            <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
              Fetching GPS...
            </span>
          )}
        </div>
      </header>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

      <main>
        <MapView pings={pings} />
      </main>

      <CreatePingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}

export default App;