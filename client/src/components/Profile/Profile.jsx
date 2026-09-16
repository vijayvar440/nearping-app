import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Profile.css";

const API_URL = "https://nearping-app.onrender.com";

const Profile = ({ isOpen, onClose }) => {
  const [userData, setUserData] = useState(null);
  const [userPings, setUserPings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [passwordMode, setPasswordMode] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // 👤 Fetch Profile + User Pings
  useEffect(() => {
    if (!isOpen) return;

    const fetchUserDataAndPings = async () => {
      setLoading(true);
      setMessage("");
      setErrorMessage("");

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setErrorMessage("Please login first.");
          setLoading(false);
          return;
        }

        let currentUserId = null;

        // ==========================================
        // 👤 GET PROFILE
        // ==========================================

        try {
          const res = await axios.get(
            `${API_URL}/api/auth/profile`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (res.data) {
            const freshUser =
              res.data.user ||
              res.data.data ||
              res.data;

            setUserData(freshUser);

            currentUserId =
              freshUser?._id ||
              freshUser?.id ||
              freshUser?.userId;

            setEditName(
              freshUser?.name ||
                freshUser?.username ||
                freshUser?.fullName ||
                ""
            );

            setEditPhone(freshUser?.phone || "");

            // Save latest user
            localStorage.setItem(
              "user",
              JSON.stringify(freshUser)
            );
          }
        } catch (profileError) {
          console.log(
            "Profile API Error:",
            profileError.response?.data ||
              profileError.message
          );

          // 🔄 Fallback to localStorage
          const savedUser =
            localStorage.getItem("user") ||
            localStorage.getItem("userInfo");

          if (savedUser) {
            try {
              const parsed = JSON.parse(savedUser);

              const localUser =
                parsed.user ||
                parsed.data ||
                parsed;

              setUserData(localUser);

              currentUserId =
                localUser?._id ||
                localUser?.id ||
                localUser?.userId;

              setEditName(
                localUser?.name ||
                  localUser?.username ||
                  localUser?.fullName ||
                  ""
              );

              setEditPhone(localUser?.phone || "");
            } catch (e) {
              console.error(
                "Local user parse error:",
                e
              );
            }
          }
        }

        // ==========================================
        // 📡 GET ALL PINGS
        // ==========================================

        const pingsRes = await axios.get(
          `${API_URL}/api/pings/near?latitude=0&longitude=0&radius=1000000`
        );

        const allPings = Array.isArray(pingsRes.data)
          ? pingsRes.data
          : [];

        let myCreatedIds = [];

        try {
          myCreatedIds = JSON.parse(
            localStorage.getItem(
              "myCreatedPings"
            ) || "[]"
          );
        } catch (e) {
          myCreatedIds = [];
        }

        const myPings = allPings.filter((ping) => {
          const ownerId =
            typeof ping.user === "object"
              ? ping.user?._id ||
                ping.user?.id
              : ping.user;

          const belongsToUser =
            currentUserId &&
            ownerId &&
            String(ownerId) ===
              String(currentUserId);

          const createdLocally =
            myCreatedIds.includes(ping._id);

          return (
            belongsToUser ||
            createdLocally
          );
        });

        setUserPings(myPings);
      } catch (err) {
        console.error(
          "Profile fetch error:",
          err
        );

        setErrorMessage(
          "Profile details load nahi ho paaye."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndPings();
  }, [isOpen]);

  if (!isOpen) return null;

  // ==========================================
  // ⏰ EXPIRY CHECK
  // ==========================================

  const now = Date.now();

  const activePings = userPings.filter((ping) => {
    const notResolved =
      ping.status !== "RESOLVED";

    const notExpired =
      !ping.expiresAt ||
      new Date(ping.expiresAt).getTime() >
        now;

    return notResolved && notExpired;
  });

  const resolvedPings = userPings.filter(
    (ping) =>
      ping.status === "RESOLVED"
  );

  // ==========================================
  // 👤 DISPLAY USER
  // ==========================================

  const fallbackName = userData?.email
    ? userData.email.split("@")[0]
    : "User";

  const displayName =
    userData?.name ||
    userData?.username ||
    userData?.fullName ||
    fallbackName;

  const displayEmail =
    userData?.email ||
    "No email provided";

  const displayPhone =
    userData?.phone ||
    "No phone number";

  // ==========================================
  // ✏️ EDIT PROFILE
  // ==========================================

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (!editName.trim()) {
      setErrorMessage(
        "Name cannot be empty."
      );
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      setErrorMessage(
        "Please login first."
      );
      return;
    }

    try {
      setSaving(true);

      const res = await axios.put(
        `${API_URL}/api/auth/profile`,
        {
          name: editName.trim(),
          phone: editPhone.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const updatedUser =
        res.data.user ||
        res.data.data ||
        res.data;

      setUserData(updatedUser);

      localStorage.setItem(
        "user",
        JSON.stringify(updatedUser)
      );

      setEditName(
        updatedUser?.name || ""
      );

      setEditPhone(
        updatedUser?.phone || ""
      );

      setEditMode(false);

      setMessage(
        "✅ Profile updated successfully."
      );
    } catch (err) {
      console.error(
        "Update profile error:",
        err
      );

      setErrorMessage(
        err.response?.data?.message ||
          "Profile update failed."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // 🔐 CHANGE PASSWORD
  // ==========================================

  const handleChangePassword = async (
    e
  ) => {
    e.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setErrorMessage(
        "Please fill all password fields."
      );
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage(
        "New password must be at least 6 characters."
      );
      return;
    }

    if (
      newPassword !== confirmPassword
    ) {
      setErrorMessage(
        "New passwords do not match."
      );
      return;
    }

    const token =
      localStorage.getItem("token");

    if (!token) {
      setErrorMessage(
        "Please login first."
      );
      return;
    }

    try {
      setChangingPassword(true);

      await axios.put(
        `${API_URL}/api/auth/change-password`,
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setPasswordMode(false);

      setMessage(
        "✅ Password changed successfully."
      );
    } catch (err) {
      console.error(
        "Change password error:",
        err
      );

      setErrorMessage(
        err.response?.data?.message ||
          "Password change failed."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // ==========================================
  // 🚪 LOGOUT
  // ==========================================

  const handleLogout = () => {
    const confirmLogout = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmLogout) return;

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userInfo");
    localStorage.removeItem("authUser");

    setUserData(null);
    setUserPings([]);

    onClose();

    // 🔄 Reload app so Header/Auth state updates
    window.location.reload();
  };

  // ==========================================
  // ❌ CLOSE
  // ==========================================

  const handleClose = () => {
    setEditMode(false);
    setPasswordMode(false);

    setMessage("");
    setErrorMessage("");

    onClose();
  };

  return (
    <div
      className="profile-modal-overlay"
      onClick={handleClose}
    >
      <div
        className="profile-modal-content"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        {/* ❌ Close */}
        <button
          className="profile-close-btn"
          onClick={handleClose}
        >
          ×
        </button>

        {/* ================================= */}
        {/* 👤 PROFILE HEADER */}
        {/* ================================= */}

        <div className="profile-header">
          <div className="profile-avatar">
            {displayName
              .charAt(0)
              .toUpperCase()}
          </div>

          <h2>{displayName}</h2>

          <p className="profile-email">
            {displayEmail}
          </p>

          <p className="profile-phone">
            📱 {displayPhone}
          </p>

          <div className="profile-actions">
            <button
              className="profile-edit-btn"
              onClick={() => {
                setEditMode(true);
                setPasswordMode(false);
                setMessage("");
                setErrorMessage("");
              }}
            >
              ✏️ Edit Profile
            </button>

            <button
              className="profile-password-btn"
              onClick={() => {
                setPasswordMode(true);
                setEditMode(false);
                setMessage("");
                setErrorMessage("");
              }}
            >
              🔐 Password
            </button>
          </div>
        </div>

        {/* ================================= */}
        {/* 💬 MESSAGES */}
        {/* ================================= */}

        {message && (
          <div className="profile-success-message">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="profile-error-message">
            {errorMessage}
          </div>
        )}

        {/* ================================= */}
        {/* ✏️ EDIT PROFILE FORM */}
        {/* ================================= */}

        {editMode && (
          <div className="profile-form-section">
            <h3>✏️ Edit Profile</h3>

            <form
              onSubmit={
                handleUpdateProfile
              }
            >
              <label>
                Name
              </label>

              <input
                type="text"
                value={editName}
                onChange={(e) =>
                  setEditName(
                    e.target.value
                  )
                }
                placeholder="Enter your name"
              />

              <label>
                Email
              </label>

              <input
                type="email"
                value={displayEmail}
                disabled
              />

              <label>
                Phone
              </label>

              <input
                type="tel"
                value={editPhone}
                onChange={(e) =>
                  setEditPhone(
                    e.target.value
                  )
                }
                placeholder="Enter phone number"
              />

              <div className="form-buttons">
                <button
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setEditMode(false)
                  }
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================= */}
        {/* 🔐 CHANGE PASSWORD FORM */}
        {/* ================================= */}

        {passwordMode && (
          <div className="profile-form-section">
            <h3>🔐 Change Password</h3>

            <form
              onSubmit={
                handleChangePassword
              }
            >
              <label>
                Current Password
              </label>

              <input
                type="password"
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(
                    e.target.value
                  )
                }
                placeholder="Current password"
              />

              <label>
                New Password
              </label>

              <input
                type="password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(
                    e.target.value
                  )
                }
                placeholder="Minimum 6 characters"
              />

              <label>
                Confirm New Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(
                    e.target.value
                  )
                }
                placeholder="Confirm new password"
              />

              <div className="form-buttons">
                <button
                  type="submit"
                  disabled={
                    changingPassword
                  }
                >
                  {changingPassword
                    ? "Changing..."
                    : "Change Password"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPasswordMode(false)
                  }
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================================= */}
        {/* 📊 PROFILE STATS */}
        {/* ================================= */}

        {loading ? (
          <div className="profile-loading">
            Loading profile details...
          </div>
        ) : (
          <div className="profile-stats-section">
            <div className="stat-card">
              <h3>
                {activePings.length}
              </h3>
              <p>Active Alerts</p>
            </div>

            <div className="stat-card">
              <h3>
                {resolvedPings.length}
              </h3>
              <p>Resolved / Found</p>
            </div>

            <div className="stat-card">
              <h3>
                {userPings.length}
              </h3>
              <p>Total Created</p>
            </div>

            {/* ================================= */}
            {/* 📋 USER POSTS */}
            {/* ================================= */}

            <div className="profile-pings-list">
              <h3>
                📋 Aapke Posts
              </h3>

              {userPings.length === 0 ? (
                <p className="no-pings-text">
                  Aapne abhi tak koi
                  alert post nahi kiya
                  hai.
                </p>
              ) : (
                userPings.map((ping) => {
                  const isExpired =
                    ping.expiresAt &&
                    new Date(
                      ping.expiresAt
                    ).getTime() <=
                      Date.now();

                  const isResolved =
                    ping.status ===
                    "RESOLVED";

                  return (
                    <div
                      key={ping._id}
                      className={`profile-ping-item ${
                        isResolved
                          ? "resolved"
                          : isExpired
                          ? "expired"
                          : ""
                      }`}
                    >
                      <div className="ping-info">
                        <strong>
                          {ping.title}
                        </strong>

                        <span className="ping-type-badge">
                          {ping.type}
                        </span>
                      </div>

                      <span
                        className={`status-tag ${
                          isResolved
                            ? "green"
                            : isExpired
                            ? "red"
                            : "blue"
                        }`}
                      >
                        {isResolved
                          ? "RESOLVED"
                          : isExpired
                          ? "EXPIRED"
                          : "ACTIVE"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* 🚪 Logout */}
            <button
              className="profile-logout-btn"
              onClick={handleLogout}
            >
              🚪 Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;