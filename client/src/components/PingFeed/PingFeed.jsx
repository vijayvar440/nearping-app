import React, { useContext } from "react";
import { LocationContext } from "../../context/LocationContext";
import "./PingFeed.css";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return "N/A";
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  if (distance < 1) {
    return `${Math.round(distance * 1000)}m away`;
  }
  return `${distance.toFixed(1)}km away`;
};

const PingFeed = ({ pings = [] }) => {
  const { coords } = useContext(LocationContext);

  if (!pings || pings.length === 0) {
    return (
      <div className="feed-empty-box">
        <p>No nearby alerts found.</p>
      </div>
    );
  }

  return (
    <div className="feed-container">
      <div className="feed-header">
        <h2 className="feed-title">
          📡 Nearby Alerts
          <span className="badge-count">{pings.length} Active</span>
        </h2>
      </div>

      <div className="feed-scroll-list">
        {pings.map((ping) => {
          const pingLat = ping.location?.coordinates?.[1];
          const pingLng = ping.location?.coordinates?.[0];

          const distanceText = coords
            ? calculateDistance(coords.lat, coords.lng, pingLat, pingLng)
            : "Calculating...";

          let badgeClass = "badge-lost";
          let badgeIcon = "🔍";
          let badgeLabel = ping.type || "LOST";

          const typeUpper = String(ping.type).toUpperCase();
          if (typeUpper === "FOUND") {
            badgeClass = "badge-found";
            badgeIcon = "🎁";
          } else if (typeUpper === "URGENT_HELP" || typeUpper.includes("HELP")) {
            badgeClass = "badge-help";
            badgeIcon = "🚨";
          }

          return (
            <div key={ping._id || Math.random()} className="ping-card">
              <div className="card-top">
                <span className={`badge ${badgeClass}`}>
                  <span>{badgeIcon}</span>
                  <span>{badgeLabel}</span>
                </span>

                <span className="distance-tag">📍 {distanceText}</span>
              </div>

              <h3 className="card-title">{ping.title}</h3>

              {ping.landmark && (
                <p className="card-landmark">
                  <span>Near:</span> {ping.landmark}
                </p>
              )}

              {ping.description && (
                <p className="card-desc">{ping.description}</p>
              )}

              <div className="card-footer">
                <span className="card-time">
                  {ping.createdAt
                    ? new Date(ping.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Just now"}
                </span>

                <button
                  className="connect-btn"
                  onClick={() => alert(`Connect for: ${ping.title}`)}
                >
                  💬 Connect
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PingFeed;