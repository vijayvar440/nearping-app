import React, { useContext, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { io } from "socket.io-client";
import { LocationContext } from "../context/LocationContext";

// Socket connection
const socket = io("http://localhost:5000");

// 🎨 FINALIZED Color-Coded Marker Generator
const createCustomIcon = (type = "") => {
  const alertType = String(type).toUpperCase();

  let bgColor = "#EF4444"; // Default Red (LOST)
  let emoji = "🔍";

  if (alertType === "FOUND") {
    bgColor = "#10B981"; // Green
    emoji = "🎁";
  } else if (alertType === "URGENT_HELP") {
    bgColor = "#F59E0B"; // Yellow/Orange
    emoji = "🚨";
  }

  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div style="
        background-color: ${bgColor};
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        font-size: 18px;
        cursor: pointer;
      ">
        ${emoji}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
};

// 📍 User Blue Pulsing Icon
const userIcon = L.divIcon({
  className: "user-leaflet-marker",
  html: `
    <div style="
      background-color: #3B82F6;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 0 12px #3B82F6;
      animation: pulse 1.5s infinite;
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const MapRecenter = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView([coords.lat, coords.lng], 13);
  }, [coords, map]);
  return null;
};

const MapView = () => {
  const { coords } = useContext(LocationContext);
  const [pings, setPings] = useState([]);

  useEffect(() => {
    if (!coords) return;
    const fetchPings = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/pings/near?latitude=${coords.lat}&longitude=${coords.lng}&radius=50000`
        );
        console.log("📍 Fetched Pings Data:", res.data); // Confirmed working in console
        setPings(res.data);
      } catch (err) {
        console.error("Fetch Pings Error:", err);
      }
    };
    fetchPings();
  }, [coords]);

  useEffect(() => {
    socket.on("new-ping", (newPing) => {
      console.log("⚡ Live Socket Ping:", newPing); // Confirmed working in console
      setPings((prev) => [newPing, ...prev]);
    });
    return () => socket.off("new-ping");
  }, []);
  
  function LocationPicker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      console.log("📍 Selected Custom Location:", lat, lng);
      if (onLocationSelect) {
        onLocationSelect({ lat, lng });
      }
    },
  });
  return null;

  if (!coords) {
    return (
      <div className="h-[450px] w-full bg-gray-900 flex flex-col items-center justify-center rounded-2xl text-white">
        <div className="animate-spin text-3xl mb-2">📍</div>
        <p className="font-medium">Fetching GPS Location...</p>
      </div>
    );
  }

  return (
    <div className="h-[450px] w-full rounded-2xl overflow-hidden shadow-xl border border-gray-700 relative">
      {/* Visual Flair for Map and Markers */}
      <style>{`
        .custom-leaflet-marker, .user-leaflet-marker {
          background: transparent !important;
          border: none !important;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0px rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 12px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0px rgba(59, 130, 246, 0); }
        }
      `}</style>

      <MapContainer center={[coords.lat, coords.lng]} zoom={13} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapRecenter coords={coords} />

        {/* User Location */}
        <Marker position={[coords.lat, coords.lng]} icon={userIcon}>
          <Popup>
            <span className="font-bold">📍 Aap Yahan Hain</span>
          </Popup>
        </Marker>

        {/* Dynamic Ping Markers */}
        {pings.map((ping) => {
          const lat = ping.location?.coordinates?.[1];
          const lng = ping.location?.coordinates?.[0];

          if (!lat || !lng) return null;

          return (
            <Marker
              key={ping._id || Math.random()}
              position={[lat, lng]}
              icon={createCustomIcon(ping.type)}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                      ping.type === "FOUND"
                        ? "bg-green-600"
                        : ping.type === "URGENT_HELP"
                        ? "bg-amber-500"
                        : "bg-red-600"
                    }`}
                  >
                    {ping.type || "Alert"}
                  </span>
                  <h3 className="font-bold text-gray-900 text-sm mt-1">{ping.title}</h3>
                  <p className="text-xs text-gray-600">📍 {ping.landmark}</p>
                  <p className="text-xs text-gray-500 mt-1">{ping.description}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;