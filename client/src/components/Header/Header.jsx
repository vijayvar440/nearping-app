import React from "react";
import "./Header.css";

const Header = () => {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="brand-logo">
          <span className="logo-icon">📍</span>
          <span className="logo-text">NearPing</span>
        </div>
        
        <div className="status-badge">
          <span className="pulse-dot"></span>
          <span className="status-text">Live Alerts</span>
        </div>
      </div>
    </header>
  );
};

export default Header;