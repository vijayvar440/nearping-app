import React, { useState, useContext } from "react";
import axios from "axios";
import { AuthContext } from "../../context/AuthContext";
import { LocationContext } from "../../context/LocationContext";
import "./AuthModal.css";

const AuthModal = ({ isOpen, onClose }) => {
  const { login } = useContext(AuthContext);
  const { getCurrentLocation } = useContext(LocationContext);

  const [isLoginView, setIsLoginView] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMsg("");
    setLoading(true);

    const endpoint = isLoginView
      ? "/api/auth/login"
      : "/api/auth/register";

    try {
      // 📍 Get current location safely
      let currentLocation = null;

      try {
        currentLocation = await getCurrentLocation();

        console.log("📍 Current Location:", currentLocation);
      } catch (locationError) {
        console.log(
          "📍 Location not available:",
          locationError
        );
      }

      // Base payload
      let payload;

      if (isLoginView) {
        payload = {
          email: formData.email,
          password: formData.password,
        };
      } else {
        payload = {
          ...formData,
        };
      }

      // 📍 Add location only when available
      if (
        currentLocation &&
        currentLocation.lat !== undefined &&
        currentLocation.lng !== undefined
      ) {
        payload.lat = currentLocation.lat;
        payload.lng = currentLocation.lng;
      }

      console.log("📤 Auth Payload:", payload);

      // 🚀 Send request to Render backend
      const res = await axios.post(
        `https://nearping-app.onrender.com${endpoint}`,
        payload
      );

      console.log("✅ Auth Response:", res.data);

      // Extract token and user data
      const token =
        res.data.token || res.data.accessToken;

      const userObj =
        res.data.user ||
        res.data.data ||
        res.data;

      // Save token
      if (token) {
        localStorage.setItem("token", token);
      }

      // Save user
      if (userObj) {
        localStorage.setItem(
          "user",
          JSON.stringify(userObj)
        );

        localStorage.setItem(
          "userInfo",
          JSON.stringify(userObj)
        );
      }

      // Update AuthContext
      login(userObj, token);

      // Close modal
      onClose();

    } catch (err) {
      console.error("❌ Auth Error:", err);

      setErrorMsg(
        err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="auth-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-header">
          <h2>
            {isLoginView
              ? "🔐 Account Sign In"
              : "📝 Create Account"}
          </h2>

          <button
            className="close-btn"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="auth-error">
            {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="auth-form"
        >
          {!isLoginView && (
            <>
              <div className="form-group">
                <label>Full Name</label>

                <input
                  type="text"
                  name="name"
                  required
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>
                  Phone Number (WhatsApp)
                </label>

                <input
                  type="text"
                  name="phone"
                  required
                  placeholder="+1234567890"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Email Address</label>

            <input
              type="email"
              name="email"
              required
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : isLoginView
              ? "Sign In"
              : "Sign Up"}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLoginView
              ? "New user?"
              : "Already have an account?"}{" "}

            <span
              className="toggle-link"
              onClick={() => {
                setErrorMsg("");
                setIsLoginView(!isLoginView);
              }}
            >
              {isLoginView
                ? "Register here"
                : "Sign In"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;