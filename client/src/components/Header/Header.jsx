import React, { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import "./Header.css";

const Header = ({
  onOpenModal,
  onOpenAuthModal,
  onOpenProfile,
  onOpenMessages,
}) => {
  const { user } = useContext(AuthContext);

  // 👤 PROFILE
  const handleProfileClick = () => {
    if (user) {
      onOpenProfile();
    } else {
      onOpenAuthModal();
    }
  };

  // 💬 MESSAGES
  const handleMessagesClick = () => {
    if (user) {
      onOpenMessages();
    } else {
      onOpenAuthModal();
    }
  };

  return (
    <header className="app-header">
      <div className="header-container">

        {/* 📍 LOGO */}
        <div className="brand-logo">
          <span className="logo-icon">📍</span>

          <span className="logo-text">
            NearPing
          </span>
        </div>

        {/* ACTIONS */}
        <div className="header-actions">

          {/* 🚨 ALERT */}
          <button
            className="post-alert-cta"
            onClick={onOpenModal}
            title="Post New Alert"
          >
            <span>🚨</span>
            <span>Alert</span>
          </button>

          {/* 💬 MESSAGES */}
          <button
            className="header-icon-btn messages-btn"
            onClick={handleMessagesClick}
            title={user ? "Messages" : "Login to view Messages"}
          >
            💬
          </button>

          {/* 👤 PROFILE */}
          <button
            className="header-icon-btn profile-btn"
            onClick={handleProfileClick}
            title={user ? "My Profile" : "Login / Register"}
          >
            👤
          </button>

        </div>
      </div>
    </header>
  );
};

export default Header;