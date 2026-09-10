import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Profile.css";

const Profile = ({ isOpen, onClose }) => {
  const [user, setUser] = useState(null);
  const [userPings, setUserPings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUserDataAndPings = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user") || localStorage.getItem("userInfo");
        
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        if (token) {
          // Agar backend me user profile route hai
          const res = await axios.get("http://localhost:5000/api/users/profile", {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(res.data);
        }

        // Fetch all pings to filter user's posts
        const pingsRes = await axios.get("http://localhost:5000/api/pings/near?latitude=0&longitude=0&radius=1000000");
        const myCreatedIds = JSON.parse(localStorage.getItem("myCreatedPings") || "[]");
        
        const myPings = pingsRes.data.filter(ping => {
          const ownerId = typeof ping.user === "object" ? ping.user?._id : ping.user;
          const currentUserId = user?._id || user?.id;
          return (currentUserId && ownerId === currentUserId) || myCreatedIds.includes(ping._id);
        });

        setUserPings(myPings);
      } catch (err) {
        console.error("Profile fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndPings();
  }, [isOpen]);

  if (!isOpen) return null;

  const activePings = userPings.filter(p => p.status !== "RESOLVED");
  const resolvedPings = userPings.filter(p => p.status === "RESOLVED");

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal-content">
        <button className="profile-close-btn" onClick={onClose}>×</button>
        
        <div className="profile-header">
          <div className="profile-avatar">👤</div>
          <h2>{user?.name || user?.username || "Guest User"}</h2>
          <p className="profile-email">{user?.email || "Local / Anonymous Session"}</p>
        </div>

        {loading ? (
          <div className="profile-loading">Loading profile details...</div>
        ) : (
          <div className="profile-stats-section">
            <div className="stat-card">
              <h3>{activePings.length}</h3>
              <p>Active Alerts</p>
            </div>
            <div className="stat-card">
              <h3>{resolvedPings.length}</h3>
              <p>Resolved / Found</p>
            </div>
            <div className="stat-card">
              <h3>{userPings.length}</h3>
              <p>Total Created</p>
            </div>

            <div className="profile-pings-list">
              <h3>Aapke Posts</h3>
              {userPings.length === 0 ? (
                <p className="no-pings-text">Aapne abhi tak koi alert post nahi kiya hai.</p>
              ) : (
                userPings.map(ping => (
                  <div key={ping._id} className={`profile-ping-item ${ping.status === "RESOLVED" ? "resolved" : ""}`}>
                    <div>
                      <strong>{ping.title}</strong>
                      <span className="ping-type-badge">{ping.type}</span>
                    </div>
                    <span className={`status-tag ${ping.status === "RESOLVED" ? "green" : "blue"}`}>
                      {ping.status || "ACTIVE"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;