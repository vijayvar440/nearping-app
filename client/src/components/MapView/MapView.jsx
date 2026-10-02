import React, { useContext, useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import { io } from "socket.io-client";

import { LocationContext } from "../../context/LocationContext";
import "./MapView.css";

// =====================================================
// API CONFIG
// =====================================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://nearping-app.onrender.com";

const socket = io(API_URL, {
  transports: ["websocket", "polling"],
});

// =====================================================
// ALERT THEME
// =====================================================

const getAlertTheme = (type = "") => {
  const alertType = String(type).toUpperCase();

  if (alertType === "FOUND") {
    return {
      color: "#10B981",
      fillColor: "#34D399",
      emoji: "🎁",
    };
  }

  if (
    alertType === "URGENT_HELP" ||
    alertType.includes("HELP")
  ) {
    return {
      color: "#F59E0B",
      fillColor: "#FBBF24",
      emoji: "🚨",
    };
  }

  return {
    color: "#EF4444",
    fillColor: "#F87171",
    emoji: "🔍",
  };
};

// =====================================================
// ALERT MARKER
// =====================================================

const createCustomIcon = (type = "") => {
  const theme = getAlertTheme(type);

  return L.divIcon({
    className: "custom-leaflet-marker",

    html: `
      <div
        class="marker-pin"
        style="
          background-color: ${theme.color};
          box-shadow: 0 0 12px ${theme.color};
        "
      >
        <span>${theme.emoji}</span>
      </div>
    `,

    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
};

// =====================================================
// 📍 CURRENT USER LOCATION ICON
// CSS PAR DEPEND NAHI
// =====================================================

const userIcon = L.divIcon({
  className: "near-ping-current-location",

  html: `
    <div
      style="
        width: 22px;
        height: 22px;
        background: #2563eb;
        border: 4px solid white;
        border-radius: 50%;
        box-shadow:
          0 0 0 6px rgba(37, 99, 235, 0.25),
          0 0 18px rgba(37, 99, 235, 0.9);
        position: relative;
      "
    >
      <div
        style="
          width: 6px;
          height: 6px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        "
      ></div>
    </div>
  `,

  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -18],
});

// =====================================================
// TEMP SELECTED LOCATION ICON
// =====================================================

const tempSelectedIcon = L.divIcon({
  className: "selected-leaflet-marker",

  html: `
    <div
      style="
        font-size: 26px;
        filter: drop-shadow(0 0 6px #ef4444);
      "
    >
      📍
    </div>
  `,

  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// =====================================================
// MAP RECENTER
// First GPS location par center hoga
// Har GPS update par map ko force nahi karega
// =====================================================

const MapRecenter = ({ coords }) => {
  const map = useMap();

  const firstCenterDone =
    useRef(false);

  useEffect(() => {
    if (!coords) return;

    const lat = Number(coords.lat);
    const lng = Number(coords.lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    if (!firstCenterDone.current) {
      map.setView(
        [lat, lng],
        16,
        {
          animate: true,
        }
      );

      firstCenterDone.current = true;
    }
  }, [coords, map]);

  return null;
};

// =====================================================
// MAP CLICK
// =====================================================

const MapClickHandler = ({
  onMapClick,
}) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });

  return null;
};

// =====================================================
// MAIN MAP
// =====================================================

const MapView = ({
  selectedLocation,
  setSelectedLocation,
  setIsModalOpen,
}) => {
  const { coords } =
    useContext(LocationContext);

  const [pings, setPings] =
    useState([]);

  const [mapError, setMapError] =
    useState("");

  // ===================================================
  // FETCH NEARBY PINGS
  // ===================================================

  useEffect(() => {
    if (!coords) return;

    const latitude =
      Number(coords.lat);

    const longitude =
      Number(coords.lng);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      console.error(
        "❌ Invalid user coordinates:",
        coords
      );

      return;
    }

    const fetchPings = async () => {
      try {
        setMapError("");

        console.log(
          "📍 User Location:",
          {
            latitude,
            longitude,
          }
        );

        const response =
          await axios.get(
            `${API_URL}/api/pings/near`,
            {
              params: {
                latitude,
                longitude,
                radius: 50,
              },
            }
          );

        console.log(
          "🗺️ Nearby Pings:",
          response.data
        );

        const receivedPings =
          Array.isArray(
            response.data
          )
            ? response.data
            : [];

        const activePings =
          receivedPings.filter(
            (ping) =>
              ping.status !==
              "RESOLVED"
          );

        setPings(activePings);
      } catch (error) {
        console.error(
          "❌ Map fetch error:",
          error.response?.data ||
            error.message
        );

        setMapError(
          "Alerts load nahi ho pa rahe hain."
        );
      }
    };

    fetchPings();
  }, [coords]);

  // ===================================================
  // SOCKET REAL-TIME PINGS
  // ===================================================

  useEffect(() => {
    const handleNewPing = (
      newPing
    ) => {
      console.log(
        "🔔 New Ping Received:",
        newPing
      );

      if (!newPing?._id) {
        return;
      }

      if (
        newPing.status ===
        "RESOLVED"
      ) {
        return;
      }

      setPings(
        (previousPings) => {
          const alreadyExists =
            previousPings.some(
              (ping) =>
                String(ping._id) ===
                String(newPing._id)
            );

          if (alreadyExists) {
            return previousPings;
          }

          return [
            newPing,
            ...previousPings,
          ];
        }
      );
    };

    const handlePingResolved = ({
      pingId,
    }) => {
      console.log(
        "✅ Ping Resolved:",
        pingId
      );

      setPings(
        (previousPings) =>
          previousPings.filter(
            (ping) =>
              String(ping._id) !==
              String(pingId)
          )
      );
    };

    const handlePingDeleted = ({
      pingId,
    }) => {
      console.log(
        "🗑️ Ping Deleted:",
        pingId
      );

      setPings(
        (previousPings) =>
          previousPings.filter(
            (ping) =>
              String(ping._id) !==
              String(pingId)
          )
      );
    };

    socket.on(
      "new-ping",
      handleNewPing
    );

    socket.on(
      "ping-resolved",
      handlePingResolved
    );

    socket.on(
      "ping-deleted",
      handlePingDeleted
    );

    return () => {
      socket.off(
        "new-ping",
        handleNewPing
      );

      socket.off(
        "ping-resolved",
        handlePingResolved
      );

      socket.off(
        "ping-deleted",
        handlePingDeleted
      );
    };
  }, []);

  // ===================================================
  // MAP CLICK
  // ===================================================

  const handleMapClick = (
    latlng
  ) => {
    setSelectedLocation(latlng);

    if (setIsModalOpen) {
      setIsModalOpen(true);
    }
  };

  // ===================================================
  // GPS LOADING
  // ===================================================

  if (!coords) {
    return (
      <div className="map-loading-box">
        <p>
          📍 GPS Location fetch ho
          rahi hai...
        </p>
      </div>
    );
  }

  const userLat =
    Number(coords.lat);

  const userLng =
    Number(coords.lng);

  if (
    !Number.isFinite(userLat) ||
    !Number.isFinite(userLng)
  ) {
    return (
      <div className="map-loading-box">
        <p>
          ❌ Location coordinates
          invalid hain.
        </p>
      </div>
    );
  }

  // ===================================================
  // MAP UI
  // ===================================================

  return (
    <div className="map-container-wrapper">

      {/* =============================================
          ERROR
      ============================================= */}

      {mapError && (
        <div
          style={{
            position: "absolute",
            zIndex: 1000,
            top: "10px",
            left: "50%",
            transform:
              "translateX(-50%)",
            background: "#7f1d1d",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: "8px",
            fontSize: "13px",
          }}
        >
          {mapError}
        </div>
      )}

      {/* =============================================
          CURRENT LOCATION LABEL
      ============================================= */}

      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          top: "10px",
          left: "10px",
          background:
            "rgba(15, 23, 42, 0.9)",
          color: "#fff",
          padding: "7px 10px",
          borderRadius: "8px",
          fontSize: "12px",
          pointerEvents: "none",
        }}
      >
        📍 Current Location
      </div>

      {/* =============================================
          MAP
      ============================================= */}

      <MapContainer
        center={[
          userLat,
          userLng,
        ]}
        zoom={16}
        style={{
          width: "100%",
          height: "100%",
        }}
      >

        {/* ===========================================
            OPEN STREET MAP
        =========================================== */}

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* ===========================================
            RECENTER FIRST LOCATION
        =========================================== */}

        <MapRecenter
          coords={coords}
        />

        {/* ===========================================
            MAP CLICK
        =========================================== */}

        <MapClickHandler
          onMapClick={
            handleMapClick
          }
        />

        {/* ===========================================
            🔵 CURRENT USER LOCATION
        =========================================== */}

        <Circle
          center={[
            userLat,
            userLng,
          ]}
          radius={35}
          pathOptions={{
            color: "#2563eb",
            fillColor: "#3b82f6",
            fillOpacity: 0.12,
            weight: 2,
          }}
        />

        <Marker
          position={[
            userLat,
            userLng,
          ]}
          icon={userIcon}
          zIndexOffset={1000}
        >
          <Popup>
            <div
              style={{
                textAlign: "center",
              }}
            >
              <strong>
                📍 Aap yahan hain
              </strong>

              <div
                style={{
                  marginTop: "5px",
                  fontSize: "10px",
                  color: "#666",
                }}
              >
                {userLat.toFixed(5)},
                {" "}
                {userLng.toFixed(5)}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* ===========================================
            SELECTED NEW ALERT LOCATION
        =========================================== */}

        {selectedLocation &&
          Number.isFinite(
            Number(
              selectedLocation.lat
            )
          ) &&
          Number.isFinite(
            Number(
              selectedLocation.lng
            )
          ) && (
            <Marker
              position={[
                Number(
                  selectedLocation.lat
                ),
                Number(
                  selectedLocation.lng
                ),
              ]}
              icon={
                tempSelectedIcon
              }
            >
              <Popup>
                🎯 New Alert Location
              </Popup>
            </Marker>
          )}

        {/* ===========================================
            ALL PINGS
        =========================================== */}

        {pings.map((ping) => {
          const coordinates =
            ping?.location
              ?.coordinates;

          if (
            !Array.isArray(
              coordinates
            ) ||
            coordinates.length < 2
          ) {
            console.warn(
              "⚠️ Ping has invalid location:",
              ping
            );

            return null;
          }

          // GeoJSON:
          // [longitude, latitude]

          const lng =
            Number(
              coordinates[0]
            );

          const lat =
            Number(
              coordinates[1]
            );

          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng)
          ) {
            return null;
          }

          if (
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
          ) {
            return null;
          }

          const theme =
            getAlertTheme(
              ping.type
            );

          const broadcastRadiusKm =
            Number(
              ping.broadcastRadius
            ) || 5;

          const radiusInMeters =
            broadcastRadiusKm *
            1000;

          return (
            <React.Fragment
              key={ping._id}
            >

              {/* =================================
                  COVERAGE CIRCLE
              ================================= */}

              <Circle
                center={[
                  lat,
                  lng,
                ]}
                radius={
                  radiusInMeters
                }
                pathOptions={{
                  color:
                    theme.color,
                  fillColor:
                    theme.fillColor,
                  fillOpacity: 0.18,
                  dashArray:
                    "8, 8",
                  weight: 2,
                }}
              />

              {/* =================================
                  ALERT MARKER
              ================================= */}

              <Marker
                position={[
                  lat,
                  lng,
                ]}
                icon={createCustomIcon(
                  ping.type
                )}
              >
                <Popup>
                  <div className="popup-content">

                    <strong>
                      {ping.title ||
                        "NearPing Alert"}
                    </strong>

                    {ping.description && (
                      <p>
                        {
                          ping.description
                        }
                      </p>
                    )}

                    <div
                      style={{
                        marginTop:
                          "6px",
                        fontSize:
                          "11px",
                        fontWeight:
                          "bold",
                        color:
                          theme.color,
                      }}
                    >
                      📡 Coverage:{" "}
                      {
                        broadcastRadiusKm
                      }{" "}
                      KM
                    </div>

                    <div
                      style={{
                        marginTop:
                          "4px",
                        fontSize:
                          "10px",
                        color:
                          "#666",
                      }}
                    >
                      📍{" "}
                      {lat.toFixed(
                        5
                      )}
                      ,{" "}
                      {lng.toFixed(
                        5
                      )}
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