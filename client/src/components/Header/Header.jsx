import React, { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import "./Header.css";

const Header = ({ onOpenModal, onOpenAuthModal, onOpenProfile }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="app-header">
      <div className="header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
        {/* Brand Logo */}
        <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="logo-icon" style={{ fontSize: '1.1rem' }}>📍</span>
          <div className="brand-text-group">
            <span className="logo-text" style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>NearPing</span>
          </div>
        </div>

        {/* Compact Actions & Icons */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Post Alert Button */}
          <button 
            className="post-alert-cta" 
            onClick={onOpenModal}
            title="Post New Alert"
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '20px',
              padding: '5px 10px',
              fontSize: '0.75rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <span>🚨</span>
            <span>Alert</span>
          </button>

          {/* Profile Button (Hamesha dikhega) */}
          <button 
            onClick={onOpenProfile}
            title="My Profile & Posts"
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            👤
          </button>

          {/* Login / Logout Toggle */}
          {user ? (
            <button 
              onClick={logout}
              title="Logout"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
            >
              🚪
            </button>
          ) : (
            <button 
              onClick={onOpenAuthModal}
              title="Login / Register"
              style={{
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              🔑
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;