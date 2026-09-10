import React, { useContext, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { io } from "socket.io-client";
import { LocationContext } from "../../context/LocationContext";
import "./MapView.css";

const socket = io("http://localhost:5000");

// Helper: Alert Type ke hisab se Color choose karne ke liye
const getAlertTheme = (type = "") => {
  const alertType = String(type).toUpperCase();
  if (alertType === "FOUND") {
    return { color: "#10B981", fillColor: "#34D399", emoji: "🎁" };
  } else if (alertType === "URGENT_HELP" || alertType.includes("HELP")) {
    return { color: "#F59E0B", fillColor: "#FBBF24", emoji: "🚨" };
  }
  return { color: "#EF4444", fillColor: "#F87171", emoji: "🔍" };
};

const createCustomIcon = (type = "") => {
  const theme = getAlertTheme(type);

  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div class="marker-pin" style="background-color: ${theme.color}; box-shadow: 0 0 12px ${theme.color};">
        <span>${theme.emoji}</span>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

const userIcon = L.divIcon({
  className: "user-leaflet-marker",
  html: `<div class="user-pulse-dot"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const tempSelectedIcon = L.divIcon({
  className: "selected-leaflet-marker",
  html: `<div style="font-size: 26px; filter: drop-shadow(0 0 6px #ef4444);">📍</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const MapRecenter = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView([coords.lat, coords.lng], 13);
  }, [coords, map]);
  return null;
};

const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
};

const MapView = ({ selectedLocation, setSelectedLocation, setIsModalOpen }) => {
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
        console.error("Map fetch error:", err);
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

  const handleMapClick = (latlng) => {
    setSelectedLocation(latlng);
    if (setIsModalOpen) setIsModalOpen(true);
  };

  if (!coords) {
    return (
      <div className="map-loading-box">
        <p>📍 GPS Location fetch ho rahi hai...</p>
      </div>
    );
  }

  return (
    <div className="map-container-wrapper">
      <MapContainer center={[coords.lat, coords.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
        {/* Guaranteed Reliable Tile Layer */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapRecenter coords={coords} />
        
        <MapClickHandler onMapClick={handleMapClick} />

        {/* Current User Location */}
        <Marker position={[coords.lat, coords.lng]} icon={userIcon}>
          <Popup>📍 Aap Yahan Hain</Popup>
        </Marker>

        {/* Temporary Selected Location Marker */}
        {selectedLocation && (
          <Marker position={[selectedLocation.lat, selectedLocation.lng]} icon={tempSelectedIcon}>
            <Popup>🎯 New Alert Location</Popup>
          </Marker>
        )}

        {/* Active Broadcast Pings + Radar Circles */}
        {pings.map((ping) => {
          const lat = ping.location?.coordinates?.[1];
          const lng = ping.location?.coordinates?.[0];
          if (!lat || !lng) return null;

          const theme = getAlertTheme(ping.type);
          const radiusInMeters = (ping.broadcastRadius || 5) * 1000;

          return (
            <React.Fragment key={ping._id || Math.random()}>
              <Circle
                center={[lat, lng]}
                radius={radiusInMeters}
                pathOptions={{
                  color: theme.color,
                  fillColor: theme.fillColor,
                  fillOpacity: 0.18,
                  dashArray: "8, 8",
                  weight: 2,
                }}
              />

              <Marker position={[lat, lng]} icon={createCustomIcon(ping.type)}>
                <Popup>
                  <div className="popup-content">
                    <strong>{ping.title}</strong>
                    <p>{ping.description}</p>
                    <div style={{ marginTop: "6px", fontSize: "11px", fontWeight: "bold", color: theme.color }}>
                      📡 Coverage: {ping.broadcastRadius || 5} KM
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;