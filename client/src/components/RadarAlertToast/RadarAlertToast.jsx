import React, { useEffect, useState, useContext } from "react";
import { io } from "socket.io-client";
import { LocationContext } from "../../context/LocationContext";
import "./RadarAlertToast.css"; // Simple Toast Styling

const socket = io("http://localhost:5000");

// 📐 Haversine Formula: Distance calculate karne ke liye (in KM)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth Radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
};

const RadarAlertToast = () => {
  const { coords } = useContext(LocationContext);
  const [activeAlert, setActiveAlert] = useState(null);

  useEffect(() => {
    socket.on("new-ping", (newPing) => {
      if (!coords?.lat || !coords?.lng) return;

      const alertLat = newPing.location?.coordinates?.[1] || newPing.latitude;
      const alertLng = newPing.location?.coordinates?.[0] || newPing.longitude;

      if (!alertLat || !alertLng) return;

      // 📏 User aur Incident Spot ke beech ki exact doori
      const distance = calculateDistance(
        coords.lat,
        coords.lng,
        alertLat,
        alertLng
      );

      const maxRadius = newPing.broadcastRadius || 5;

      // 🎯 Geo-Fence Check: Agar User Radius ke andar hai
      if (distance <= maxRadius) {
        setActiveAlert({
          ...newPing,
          distanceFromUser: distance.toFixed(2),
        });

        // 🔔 Browser Sound Notification (Optional)
        try {
          const audio = new Audio("/alert-sound.mp3");
          audio.play().catch(() => {});
        } catch (e) {}
      }
    });

    return () => socket.off("new-ping");
  }, [coords]);

  if (!activeAlert) return null;

  return (
    <div className="radar-toast-banner">
      <div className="toast-content">
        <div className="toast-header">
          <span className="pulse-icon">🚨</span>
          <strong>EMERGENCY RADAR ALERT</strong>
        </div>
        <p className="toast-body">
          <strong>{activeAlert.title}</strong> reported just{" "}
          <span className="highlight-dist">{activeAlert.distanceFromUser} KM</span> away from you!
        </p>
        <p className="toast-landmark">📍 Spot: {activeAlert.landmark || "Nearby Location"}</p>
        
        <div className="toast-actions">
          <button
            className="btn-view"
            onClick={() => {
              // Action: Focus map on alert spot
              setActiveAlert(null);
            }}
          >
            🎯 View Spot
          </button>
          <button className="btn-close" onClick={() => setActiveAlert(null)}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
// File ke bilkul aakhri line mein ye hona chahiye:
export default RadarAlertToast;