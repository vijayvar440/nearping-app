import React, { useState, useContext } from "react";
import axios from "axios";
import { LocationContext } from "../../context/LocationContext";
import "./CreatePingModal.css";

const CreatePingModal = ({ isOpen, onClose, selectedLocation }) => {
  const { coords } = useContext(LocationContext);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("LOST");
  const [landmark, setLandmark] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [broadcastRadius, setBroadcastRadius] = useState(5);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const lat = selectedLocation?.lat || coords?.lat;
  const lng = selectedLocation?.lng || coords?.lng;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!lat || !lng) {
      alert("❌ Location coordinates missing hain! Map par click karke location select karein.");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      await axios.post(
        "http://localhost:5000/api/pings",
        {
          title,
          description,
          landmark,
          contactInfo,
          broadcastRadius,
          category: type,
          latitude: lat,
          longitude: lng,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert(`🚀 Alert broadcasted within ${broadcastRadius} KM radius!`);
      setLoading(false);
      onClose();
    } catch (err) {
      setLoading(false);
      console.error("Alert Create Error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Alert create nahi ho paya.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>📡 Broadcast Radar Alert</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Target Location Preview Tag */}
          <div className="location-badge">
            📍 Target Location: <span>{lat?.toFixed(4)}, {lng?.toFixed(4)}</span>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Alert Category</label>
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="LOST">🔍 Lost Item / Pet</option>
                <option value="FOUND">🎁 Found Something</option>
                <option value="URGENT_HELP">🚨 Urgent Help Required</option>
              </select>
            </div>

            <div className="form-group flex-1">
              <label>Broadcast Range (Range)</label>
              <select value={broadcastRadius} onChange={(e) => setBroadcastRadius(e.target.value)}>
                <option value="2">📡 2 KM (Local)</option>
                <option value="5">📡 5 KM (City Suburb)</option>
                <option value="10">📡 10 KM (Wide Area)</option>
                <option value="25">📡 25 KM (Max Coverage)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              placeholder="e.g., Black Wallet / Golden Retriever Dog"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>Landmark / Spot</label>
              <input
                type="text"
                placeholder="e.g., Near Bus Stand"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
              />
            </div>

            <div className="form-group flex-1">
              <label>Contact Number / WhatsApp</label>
              <input
                type="text"
                placeholder="+91 9876543210"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description & Identification Marks</label>
            <textarea
              rows="3"
              placeholder="Describe color, special marks, time lost, etc..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            ></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? "Broadcasting..." : "📡 Broadcast Alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePingModal;