import React, { useState, useContext } from "react";
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

const PingFeed = ({ pings = [], radius, setRadius, onClaimClick, onViewClaimsClick }) => {
  const { coords } = useContext(LocationContext);
  const [activeTab, setActiveTab] = useState("nearby"); // 'nearby' | 'my_alerts'

  // 🔐 1. Current Logged-in User ID extract
  const savedUserData = localStorage.getItem("user") || localStorage.getItem("userInfo");
  let currentUser = null;
  try {
    currentUser = savedUserData ? JSON.parse(savedUserData) : null;
  } catch (err) {
    console.error("User parsing error:", err);
  }

  const currentUserId = 
    currentUser?._id || 
    currentUser?.id || 
    currentUser?.user?._id || 
    currentUser?.user?.id;

  // Helper: Ping Owner ID extract karna
  const getPingOwnerId = (ping) => {
    if (typeof ping.user === "object") {
      return ping.user?._id || ping.user?.id;
    }
    return ping.user || ping.userId || ping.createdBy;
  };

  // 🔀 2. TABS FILTERING LOGIC
  const myAlerts = pings.filter((ping) => {
    const ownerId = getPingOwnerId(ping);
    return currentUserId && ownerId && String(currentUserId) === String(ownerId);
  });

  const nearbyAlerts = pings.filter((ping) => {
    const ownerId = getPingOwnerId(ping);
    return !currentUserId || !ownerId || String(currentUserId) !== String(ownerId);
  });

  const displayedPings = activeTab === "nearby" ? nearbyAlerts : myAlerts;

  return (
    <div className="feed-container">
      {/* 📡 HEADER & RANGE SELECTOR */}
      <div className="feed-header">
        <h2 className="feed-title">
          📡 Alerts
          <span className="badge-count">{pings.length} Total</span>
        </h2>

        <div className="radius-selector-box">
          <span className="radius-label">Range:</span>
          <select 
            className="radius-dropdown" 
            value={radius} 
            onChange={(e) => setRadius(Number(e.target.value))}
          >
            <option value={1}>1 KM</option>
            <option value={2}>2 KM</option>
            <option value={3}>3 KM</option>
            <option value={5}>5 KM</option>
            <option value={10}>10 KM</option>
            <option value={25}>25 KM</option>
            <option value={50}>50 KM</option>
          </select>
        </div>
      </div>

      {/* 🔘 NEARBY vs MY ALERTS TAB SWITCHER */}
      <div 
        className="feed-tabs" 
        style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '12px', 
          background: '#111827', 
          padding: '4px', 
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <button
          onClick={() => setActiveTab("nearby")}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.85rem',
            backgroundColor: activeTab === "nearby" ? '#3b82f6' : 'transparent',
            color: activeTab === "nearby" ? '#ffffff' : '#9ca3af',
            transition: 'all 0.2s ease'
          }}
        >
          📡 Nearby ({nearbyAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab("my_alerts")}
          style={{
            flex: 1,
            padding: '8px 12px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.85rem',
            backgroundColor: activeTab === "my_alerts" ? '#3b82f6' : 'transparent',
            color: activeTab === "my_alerts" ? '#ffffff' : '#9ca3af',
            transition: 'all 0.2s ease'
          }}
        >
          👤 My Alerts ({myAlerts.length})
        </button>
      </div>

      {/* 📜 FEED LIST DISPLAY */}
      {displayedPings.length === 0 ? (
        <div className="feed-empty-box">
          <p>
            {activeTab === "nearby"
              ? `📍 ${radius} KM ke andar dusron ka koi active alert nahi hai.`
              : "👤 Aapne abhi tak koi alert post nahi kiya hai."}
          </p>
        </div>
      ) : (
        <div className="feed-scroll-list">
          {displayedPings.map((ping) => {
            const pingLat = ping.location?.coordinates?.[1];
            const pingLng = ping.location?.coordinates?.[0];

            const distanceText = coords
              ? calculateDistance(coords.lat, coords.lng, pingLat, pingLng)
              : "Calculating...";

            let badgeClass = "badge-lost";
            let badgeIcon = "🔍";
            let badgeLabel = ping.type || "LOST";

            const typeUpper = String(ping.type || "LOST").toUpperCase();
            if (typeUpper === "FOUND") {
              badgeClass = "badge-found";
              badgeIcon = "🎁";
            } else if (typeUpper === "URGENT_HELP" || typeUpper.includes("HELP")) {
              badgeClass = "badge-help";
              badgeIcon = "🚨";
            }

            const cleanPhone = ping.contactInfo ? ping.contactInfo.replace(/[^0-9]/g, "") : "";
            const pingOwnerId = getPingOwnerId(ping);

            const isOwner = Boolean(
              currentUserId && 
              pingOwnerId && 
              String(currentUserId) === String(pingOwnerId)
            );

            return (
              <div 
                key={ping._id || Math.random()} 
                className={`ping-card ${isOwner ? "my-ping-card" : ""}`}
                style={isOwner ? { border: '1px solid rgba(99, 102, 241, 0.4)' } : {}}
              >
                <div className="card-top">
                  <span className={`badge ${badgeClass}`}>
                    <span>{badgeIcon}</span>
                    <span>{badgeLabel}</span>
                  </span>

                  <div className="card-top-right" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {isOwner && (
                      <span style={{ fontSize: '0.7rem', background: '#6366f1', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        MY POST
                      </span>
                    )}
                    {ping.broadcastRadius && (
                      <span className="broadcast-badge" style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                        📡 {ping.broadcastRadius}km
                      </span>
                    )}
                    <span className="distance-tag">📍 {distanceText}</span>
                  </div>
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

                  {/* 🔐 DYNAMIC WORKFLOW BUTTON LOGIC */}
                  {isOwner ? (
                    <button
                      onClick={() => onViewClaimsClick && onViewClaimsClick(ping)}
                      style={{
                        backgroundColor: "#3b82f6",
                        color: "#ffffff",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        cursor: "pointer"
                      }}
                    >
                      📥 Check Claims ({ping.claims?.length || 0})
                    </button>
                  ) : typeUpper === "LOST" ? (
                    <button
                      className="connect-btn claim-btn"
                      onClick={() => onClaimClick && onClaimClick(ping)}
                      style={{
                        backgroundColor: "#f59e0b",
                        color: "#ffffff",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600",
                        padding: "6px 14px",
                        borderRadius: "8px"
                      }}
                    >
                      ✋ I Found This
                    </button>
                  ) : typeUpper === "FOUND" ? (
                    <button
                      className="connect-btn claim-btn"
                      onClick={() => onClaimClick && onClaimClick(ping)}
                      style={{
                        backgroundColor: "#8b5cf6",
                        color: "#ffffff",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: "600",
                        padding: "6px 14px",
                        borderRadius: "8px"
                      }}
                    >
                      🙋 This Is Mine
                    </button>
                  ) : cleanPhone ? (
                    <a
                      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi, saw your alert on NearPing: "${ping.title}"`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="connect-btn"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      💬 Connect
                    </a>
                  ) : (
                    <button
                      className="connect-btn"
                      onClick={() => alert(`Contact details not provided for: ${ping.title}`)}
                    >
                      💬 Connect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PingFeed;