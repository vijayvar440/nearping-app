import React, { useState, useContext } from "react";
import axios from "axios";
import { LocationContext } from "../../context/LocationContext";
import "./CreatePingModal.css";

const CreatePingModal = ({ isOpen, onClose, selectedLocation }) => {
  const { coords } = useContext(LocationContext);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("LOST");
  const [landmark, setLandmark] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Priority: Map Click Location -> Current GPS Location
    const lat = selectedLocation?.lat || coords?.lat;
    const lng = selectedLocation?.lng || coords?.lng;

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
          category: type,
          latitude: lat,
          longitude: lng,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("🚀 Alert successfully broadcast ho gaya!");
      setLoading(false);
      onClose();
    } catch (err) {
      setLoading(false);
      console.error("Alert Create Error:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Alert create nahi ho paya. Server logs dekhein.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>📢 Create Radar Alert</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Alert Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="LOST">🔍 Lost Item / Pet</option>
              <option value="FOUND">🎁 Found Item</option>
              <option value="URGENT_HELP">🚨 Urgent Help Required</option>
            </select>
          </div>

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              placeholder="e.g., Black Leather Wallet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Landmark / Location Detail</label>
            <input
              type="text"
              placeholder="e.g., Near Bus Stand, Sector 4"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows="3"
              placeholder="Provide relevant details..."
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
              {loading ? "Posting..." : "Post Alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePingModal;