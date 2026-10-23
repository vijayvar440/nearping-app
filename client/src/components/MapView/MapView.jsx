import React, {
  useContext,
  useEffect,
  useRef,
} from "react";

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

import { LocationContext } from "../../context/LocationContext";
import "./MapView.css";

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
// CURRENT USER LOCATION ICON
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
// SELECTED LOCATION ICON
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
// =====================================================

const MapRecenter = ({ coords }) => {
  const map = useMap();

  const firstCenterDone = useRef(false);

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
  pings = [],
  selectedLocation,
  setSelectedLocation,
  setIsModalOpen,
}) => {
  const { coords } =
    useContext(LocationContext);

  // ===================================================
  // MAP CLICK
  // ===================================================

  const handleMapClick = (latlng) => {
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
          📍 GPS Location fetch ho rahi hai...
        </p>
      </div>
    );
  }

  // ===================================================
  // USER LOCATION
  // ===================================================

  const userLat = Number(coords.lat);
  const userLng = Number(coords.lng);

  if (
    !Number.isFinite(userLat) ||
    !Number.isFinite(userLng)
  ) {
    return (
      <div className="map-loading-box">
        <p>
          ❌ Location coordinates invalid hain.
        </p>
      </div>
    );
  }

  return (
    <div className="map-container-wrapper">

      {/* CURRENT LOCATION LABEL */}

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

      {/* MAP */}

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

        {/* OPEN STREET MAP */}

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* FIRST GPS LOCATION CENTER */}

        <MapRecenter
          coords={coords}
        />

        {/* MAP CLICK */}

        <MapClickHandler
          onMapClick={handleMapClick}
        />

        {/* =================================================
            CURRENT USER LOCATION
        ================================================= */}

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
                {userLat.toFixed(5)},{" "}
                {userLng.toFixed(5)}
              </div>
            </div>
          </Popup>
        </Marker>

        {/* =================================================
            SELECTED NEW ALERT LOCATION
        ================================================= */}

        {selectedLocation &&
          Number.isFinite(
            Number(selectedLocation.lat)
          ) &&
          Number.isFinite(
            Number(selectedLocation.lng)
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
              icon={tempSelectedIcon}
            >
              <Popup>
                🎯 New Alert Location
              </Popup>
            </Marker>
          )}

        {/* =================================================
            ALL PINGS
        ================================================= */}

        {Array.isArray(pings) &&
          pings.map((ping) => {

            if (!ping?._id) {
              return null;
            }

            // GeoJSON:
            // [longitude, latitude]

            const coordinates =
              ping?.location?.coordinates;

            if (
              !Array.isArray(coordinates) ||
              coordinates.length < 2
            ) {
              console.warn(
                "⚠️ Ping has invalid location:",
                ping
              );

              return null;
            }

            const lng =
              Number(coordinates[0]);

            const lat =
              Number(coordinates[1]);

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

            // RESOLVED ALERT HIDE

            if (
              String(ping.status).toUpperCase() ===
              "RESOLVED"
            ) {
              return null;
            }

            // EXPIRED ALERT HIDE

            if (
              ping.expiresAt &&
              new Date(
                ping.expiresAt
              ).getTime() <= Date.now()
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
              broadcastRadiusKm * 1000;

            return (
              <React.Fragment
                key={String(ping._id)}
              >

                {/* =========================================
                    COVERAGE CIRCLE
                ========================================= */}

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

                {/* =========================================
                    ALERT MARKER
                ========================================= */}

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

                      {ping.landmark && (
                        <div
                          style={{
                            marginTop:
                              "6px",
                            fontSize:
                              "11px",
                          }}
                        >
                          📍{" "}
                          {ping.landmark}
                        </div>
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
                        } KM
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
                        {lat.toFixed(5)}
                        {" , "}
                        {lng.toFixed(5)}
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