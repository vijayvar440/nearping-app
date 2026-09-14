import React, { useState, useContext } from "react";
import axios from "axios";
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

const PingFeed = ({ 
  pings = [], 
  resolvedPings = [], 
  radius, 
  setRadius, 
  onClaimClick, 
  onViewClaimsClick, 
  onDeletePing 
}) => {
  const { coords } = useContext(LocationContext);
  const [activeTab, setActiveTab] = useState("nearby");

  const getLoggedInUserId = () => {
    try {
      const savedUserData = localStorage.getItem("user") || localStorage.getItem("userInfo") || localStorage.getItem("authUser");
      if (!savedUserData) return localStorage.getItem("userId");
      
      const parsed = JSON.parse(savedUserData);
      return (
        parsed?._id || 
        parsed?.id || 
        parsed?.user?._id || 
        parsed?.user?.id || 
        parsed?.data?._id
      );
    } catch (err) {
      console.error("User ID parse error:", err);
      return null;
    }
  };

  const currentUserId = getLoggedInUserId();

  const getMyCreatedPings = () => {
    try {
      return JSON.parse(localStorage.getItem("myCreatedPings") || "[]");
    } catch (err) {
      return [];
    }
  };
  const myCreatedPingIds = getMyCreatedPings();

  const getPingOwnerId = (ping) => {
    if (!ping) return null;
    if (typeof ping.user === "object" && ping.user !== null) {
      return ping.user._id || ping.user.id;
    }
    return ping.user || ping.userId || ping.createdBy || ping.ownerId || ping.owner;
  };

  const checkIsOwner = (ping) => {
    if (!ping) return false;
    const ownerId = getPingOwnerId(ping);
    
    const isLoggedInOwner = Boolean(
      currentUserId && ownerId && String(currentUserId).trim() === String(ownerId).trim()
    );

    const isBrowserOwner = ping._id && myCreatedPingIds.includes(ping._id);

    return isLoggedInOwner || isBrowserOwner;
  };

  const handleDelete = async (pingId) => {
    if (!pingId) return;

    const confirmDelete = window.confirm("Kya aap sach me is alert ko delete karna chahte hain?");
    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await axios.delete(`https://nearping-app.onrender.com/api/pings/${pingId}`, { headers });
      alert("🗑️ Alert successfully delete ho gaya!");
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      const updatedLocalPings = myCreatedPingIds.filter((id) => id !== pingId);
      localStorage.setItem("myCreatedPings", JSON.stringify(updatedLocalPings));

      if (onDeletePing) {
        onDeletePing(pingId);
      }
    }
  };

  const myAlerts = pings.filter((ping) => checkIsOwner(ping));
  const nearbyAlerts = pings.filter((ping) => !checkIsOwner(ping));

  let displayedPings = nearbyAlerts;
  if (activeTab === "my_alerts") displayedPings = myAlerts;
  if (activeTab === "resolved") displayedPings = resolvedPings;

  return (
    <div className="feed-container">
      <div className="feed-header">
        <h2 className="feed-title">
          📡 Alerts
          <span className="badge-count">{pings.length + resolvedPings.length} Total</span>
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

      <div 
        className="feed-tabs" 
        style={{ 
          display: 'flex', 
          gap: '6px', 
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
            padding: '8px 6px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.8rem',
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
            padding: '8px 6px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.8rem',
            backgroundColor: activeTab === "my_alerts" ? '#3b82f6' : 'transparent',
            color: activeTab === "my_alerts" ? '#ffffff' : '#9ca3af',
            transition: 'all 0.2s ease'
          }}
        >
          👤 Mine ({myAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab("resolved")}
          style={{
            flex: 1,
            padding: '8px 6px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.8rem',
            backgroundColor: activeTab === "resolved" ? '#10b981' : 'transparent',
            color: activeTab === "resolved" ? '#ffffff' : '#9ca3af',
            transition: 'all 0.2s ease'
          }}
        >
          🗂️ History ({resolvedPings.length})
        </button>
      </div>

      {displayedPings.length === 0 ? (
        <div className="feed-empty-box">
          <p>
            {activeTab === "nearby"
              ? `📍 ${radius} KM ke andar dusron ka koi active alert nahi hai.`
              : activeTab === "my_alerts"
              ? "👤 Aapne abhi tak koi active alert post nahi kiya hai."
              : "🗂️ Koi resolved history available nahi hai."}
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

            const isOwner = checkIsOwner(ping);
            const isResolved = ping.status === "RESOLVED";

            return (
              <div 
                key={ping._id || Math.random()} 
                className={`ping-card ${isOwner ? "my-ping-card" : ""}`}
                style={isResolved ? { opacity: 0.85, border: '1px solid rgba(16, 185, 129, 0.4)' } : {}}
              >
                <div className="card-top">
                  <span className={`badge ${badgeClass}`}>
                    <span>{badgeIcon}</span>
                    <span>{badgeLabel}</span>
                  </span>

                  <div className="card-top-right" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {isResolved && (
                      <span style={{ fontSize: '0.7rem', background: '#10b981', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        RESOLVED
                      </span>
                    )}
                    {isOwner && !isResolved && (
                      <span style={{ fontSize: '0.7rem', background: '#6366f1', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        MY POST
                      </span>
                    )}
                    <span className="distance-tag">📍 {distanceText}</span>
                  </div>
                </div>

                <h3 className="card-title">{ping.title}</h3>

                {/* 🔍 Item Specifications / Matching Attributes Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', margin: '8px 0', fontSize: '0.8rem' }}>
                  {ping.brand && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', color: '#d1d5db' }}>
                      🏷️ <strong>Brand:</strong> {ping.brand}
                    </div>
                  )}
                  {ping.color && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', color: '#d1d5db' }}>
                      🎨 <strong>Color:</strong> {ping.color}
                    </div>
                  )}
                  {ping.category && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', color: '#d1d5db' }}>
                      📂 <strong>Category:</strong> {ping.category}
                    </div>
                  )}
                  {ping.serialNumber && (
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', color: '#d1d5db' }}>
                      🔢 <strong>ID/Serial:</strong> {ping.serialNumber}
                    </div>
                  )}
                </div>

                {/* 🖼️ Optional Image Preview */}
                {ping.image && (
                  <div style={{ margin: '8px 0', borderRadius: '8px', overflow: 'hidden', maxHeight: '160px', background: '#000' }}>
                    <img 
                      src={ping.image} 
                      alt="Item preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                )}

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

                  {isResolved ? (
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600' }}>
                      ✅ Successfully Closed
                    </span>
                  ) : isOwner ? (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        onClick={() => onViewClaimsClick && onViewClaimsClick(ping)}
                        style={{
                          backgroundColor: "#3b82f6",
                          color: "#ffffff",
                          border: "none",
                          padding: "6px 12px",
                          borderRadius: "8px",
                          fontWeight: "600",
                          fontSize: "0.82rem",
                          cursor: "pointer"
                        }}
                      >
                        📥 Claims ({ping.claims?.length || 0})
                      </button>

                      <button
                        onClick={() => handleDelete(ping._id)}
                        title="Delete Alert"
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.15)",
                          color: "#f87171",
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          fontWeight: "600",
                          fontSize: "0.82rem",
                          cursor: "pointer"
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  ) : typeUpper === "LOST" ? (
                    <button
                      className="connect-btn claim-btn"
                      onClick={() => onClaimClick && onClaimClick(ping)}
                      style={{ backgroundColor: "#f59e0b", color: "#ffffff", border: "none", cursor: "pointer", fontWeight: "600", padding: "6px 14px", borderRadius: "8px" }}
                    >
                      ✋ I Found This
                    </button>
                  ) : (
                    <button
                      className="connect-btn claim-btn"
                      onClick={() => onClaimClick && onClaimClick(ping)}
                      style={{ backgroundColor: "#8b5cf6", color: "#ffffff", border: "none", cursor: "pointer", fontWeight: "600", padding: "6px 14px", borderRadius: "8px" }}
                    >
                      🙋 This Is Mine
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