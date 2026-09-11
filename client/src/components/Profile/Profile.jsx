import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Profile.css";

const Profile = ({ isOpen, onClose }) => {
  const [userData, setUserData] = useState(null);
  const [userPings, setUserPings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUserDataAndPings = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const savedUser = localStorage.getItem("user") || localStorage.getItem("userInfo");
        
        console.log("Saved User from LocalStorage:", savedUser); // F12 console me check karne ke liye

        let currentUserId = null;
        let parsedUserObj = null;

        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            parsedUserObj = parsed.user || parsed.data || parsed;
            setUserData(parsedUserObj);
            currentUserId = parsedUserObj?._id || parsedUserObj?.id || parsedUserObj?.userId;
          } catch (e) {
            console.error("JSON parse error", e);
          }
        }

        if (token) {
          try {
            const res = await axios.get("http://localhost:5000/api/users/profile", {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log("Profile API Response:", res.data); // F12 console me check karne ke liye
            if (res.data) {
              const freshUser = res.data.user || res.data.data || res.data;
              setUserData(freshUser);
              currentUserId = freshUser?._id || freshUser?.id || freshUser?.userId || currentUserId;
              localStorage.setItem("user", JSON.stringify(freshUser));
            }
          } catch (profileErr) {
            console.log("Backend profile route error:", profileErr.response?.data || profileErr.message);
          }
        }

        const pingsRes = await axios.get("http://localhost:5000/api/pings/near?latitude=0&longitude=0&radius=1000000");
        const myCreatedIds = JSON.parse(localStorage.getItem("myCreatedPings") || "[]");
        
        const myPings = pingsRes.data.filter(ping => {
          const ownerId = typeof ping.user === "object" ? ping.user?._id || ping.user?.id : ping.user;
          return (currentUserId && ownerId && String(ownerId) === String(currentUserId)) || myCreatedIds.includes(ping._id);
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

  // Agar name nahi hai toh email ke pehle part ko naam bana dega taaki "Guest User" na aaye
  const fallbackName = userData?.email ? userData.email.split('@')[0] : "Authenticated User";
  const displayName = userData?.name || userData?.username || userData?.fullName || fallbackName;
  const displayEmail = userData?.email || "No email provided";

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal-content">
        <button className="profile-close-btn" onClick={onClose}>×</button>
        
        <div className="profile-header">
          <div className="profile-avatar">👤</div>
          <h2>{displayName}</h2>
          <p className="profile-email">{displayEmail}</p>
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