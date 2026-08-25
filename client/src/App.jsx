import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { LocationContext } from './context/LocationContext';
import MapView from './components/MapView';

const socket = io('http://localhost:5000');

function App() {
  const { coords, error } = useContext(LocationContext);
  const [pings, setPings] = useState([]);

  useEffect(() => {
    if (coords) {
      // 1. Fetch Initial Nearby Pings (500m)
      axios.get(`http://localhost:5000/api/pings/nearby?longitude=${coords.lng}&latitude=${coords.lat}&radius=500`)
        .then(res => setPings(res.data.data))
        .catch(err => console.error("Error fetching pings:", err));
    }
  }, [coords]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="mb-4 flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold text-indigo-600">🔴 NearPing</h1>
        {coords ? (
          <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            📍 GPS Active
          </span>
        ) : (
          <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
            Fetching GPS...
          </span>
        )}
      </header>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

      <main>
        <MapView pings={pings} />
      </main>
    </div>
  );
}

export default App;