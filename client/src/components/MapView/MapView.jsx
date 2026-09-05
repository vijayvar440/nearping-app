import React, { useContext, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { io } from "socket.io-client";
import { LocationContext } from "../../context/LocationContext";
import "./MapView.css";

const socket = io("http://localhost:5000");

const createCustomIcon = (type = "") => {
  const alertType = String(type).toUpperCase();
  let bgColor = "#EF4444";
  let emoji = "🔍";

  if (alertType === "FOUND") {
    bgColor = "#10B981";
    emoji = "🎁";
  } else if (alertType === "URGENT_HELP" || alertType.includes("HELP")) {
    bgColor = "#F59E0B";
    emoji = "🚨";
  }

  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div class="marker-pin" style="background-color: ${bgColor}">
        <span>${emoji}</span>
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

  if (!coords) {
    return (
      <div className="map-loading-box">
        <p>📍 GPS Location is fetching...</p>
      </div>
    );
  }

  return (
    <div className="map-container-wrapper">
      <MapContainer center={[coords.lat, coords.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
  <TileLayer
  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  attribution="&copy; OpenStreetMap contributors"
/>
        <MapRecenter coords={coords} />
        <Marker position={[coords.lat, coords.lng]} icon={userIcon}>
          <Popup>📍you are here</Popup>
        </Marker>

        {pings.map((ping) => {
          const lat = ping.location?.coordinates?.[1];
          const lng = ping.location?.coordinates?.[0];
          if (!lat || !lng) return null;

          return (
            <Marker key={ping._id || Math.random()} position={[lat, lng]} icon={createCustomIcon(ping.type)}>
              <Popup>
                <div className="popup-content">
                  <strong>{ping.title}</strong>
                  <p>{ping.description}</p>
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