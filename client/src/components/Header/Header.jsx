import React, { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import "./Header.css";

const Header = ({ onOpenModal, onOpenAuthModal }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Brand Logo */}
        <div className="brand-logo">
          <span className="logo-icon">📍</span>
          <div className="brand-text-group">
            <span className="logo-text">NearPing</span>
            <span className="logo-tagline">Hyperlocal Radar Alert</span>
          </div>
        </div>

        {/* Actions & Login */}
        <div className="header-actions">
          <button className="post-alert-cta" onClick={onOpenModal}>
            <span className="cta-icon">📢</span>
            <span className="cta-text">+ Post New Alert</span>
          </button>

          {/* User Logged In hai ya nahi check karein */}
          {user ? (
            <div className="user-profile-box">
              <span className="user-name">👤 {user.name}</span>
              <button className="logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="login-btn" onClick={onOpenAuthModal}>
              🔑 Login / Register
            </button>
          )}

          <div className="status-badge">
            <span className="pulse-dot"></span>
            <span className="status-text">Live Radar</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;