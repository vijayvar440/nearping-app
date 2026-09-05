import React, { useContext, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { LocationContext } from "../context/LocationContext";

const createCustomIcon = (type = "") => {
  const alertType = String(type).toUpperCase();

  let bgColor = "#EF4444";
  let emoji = "🔍";

  if (alertType === "FOUND") {
    bgColor = "#10B981";
    emoji = "🎁";
  } else if (alertType === "URGENT_HELP") {
    bgColor = "#F59E0B";
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
      ">
        ${emoji}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
};

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
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const MapRecenter = ({ coords }) => {
  const map = useMap();

  useEffect(() => {
    if (coords) {
      map.setView([coords.lat, coords.lng], 13);
    }
  }, [coords, map]);

  return null;
};

const MapView = ({ pings = [] }) => {
  const { coords } = useContext(LocationContext);
  const [mapPings, setMapPings] = useState(pings);

  useEffect(() => {
    if (pings.length > 0) {
      setMapPings(pings);
    }
  }, [pings]);

  useEffect(() => {
    if (!coords) return;

    const fetchPings = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/pings/nearby?longitude=${coords.lng}&latitude=${coords.lat}&radius=50000`
        );

        console.log("📍 Fetched Pings:", res.data);

        setMapPings(res.data.data || res.data || []);
      } catch (err) {
        console.error("Fetch Pings Error:", err);
      }
    };

    fetchPings();
  }, [coords]);

  if (!coords) {
    return (
      <div className="h-[450px] w-full bg-gray-900 flex flex-col items-center justify-center rounded-2xl text-white">
        <div className="text-3xl mb-2">📍</div>
        <p className="font-medium">Fetching GPS Location...</p>
      </div>
    );
  }

  return (
    <div className="h-[450px] w-full rounded-2xl overflow-hidden shadow-xl border border-gray-700 relative">
      <style>{`
        .custom-leaflet-marker,
        .user-leaflet-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      <MapContainer
        center={[coords.lat, coords.lng]}
        zoom={13}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter coords={coords} />

        {/* Current User Location */}
        <Marker
          position={[coords.lat, coords.lng]}
          icon={userIcon}
        >
          <Popup>
            <strong>📍you are here</strong>
          </Popup>
        </Marker>

        {/* Nearby Alerts */}
        {mapPings.map((ping) => {
          const lat = ping.location?.coordinates?.[1];
          const lng = ping.location?.coordinates?.[0];

          if (lat == null || lng == null) return null;

          return (
            <Marker
              key={ping._id}
              position={[lat, lng]}
              icon={createCustomIcon(ping.type)}
            >
              <Popup>
                <div className="p-1 min-w-[150px]">
                  <strong>{ping.title || "Alert"}</strong>

                  <p className="text-xs">
                    📍 {ping.landmark || "Nearby location"}
                  </p>

                  <p className="text-xs">
                    {ping.description || ""}
                  </p>
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