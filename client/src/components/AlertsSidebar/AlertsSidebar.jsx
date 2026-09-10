import React, { useState } from "react";
import "./AlertsSidebar.css"; // Iski CSS alag rakhein

const AlertsSidebar = ({ pings, currentUserId }) => {
  const [activeTab, setActiveTab] = useState("nearby");

  const nearbyAlerts = pings.filter((ping) => ping.userId !== currentUserId);
  const myAlerts = pings.filter((ping) => ping.userId === currentUserId);

  return (
    <div className="alerts-sidebar">
      {/* Tab Buttons */}
      <div className="tab-container">
        <button
          className={`tab-btn ${activeTab === "nearby" ? "active" : ""}`}
          onClick={() => setActiveTab("nearby")}
        >
          📡 Nearby ({nearbyAlerts.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "my_alerts" ? "active" : ""}`}
          onClick={() => setActiveTab("my_alerts")}
        >
          👤 My Alerts ({myAlerts.length})
        </button>
      </div>

      {/* Cards List */}
      <div className="alerts-list">
        {activeTab === "nearby" ? (
          nearbyAlerts.map((ping) => (
            <div key={ping._id} className="ping-card">
              <h3>{ping.title}</h3>
              <p>{ping.description}</p>
              <button className="btn-found">✋ I Found This</button>
            </div>
          ))
        ) : (
          myAlerts.map((ping) => (
            <div key={ping._id} className="ping-card my-card">
              <h3>{ping.title}</h3>
              <p>{ping.description}</p>
              <button className="btn-delete">🗑️ Delete Alert</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertsSidebar;