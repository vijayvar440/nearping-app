import React, { useState, useContext } from "react";
import axios from "axios";
import { LocationContext } from "../../context/LocationContext";
import "./CreatePingModal.css";

const CreatePingModal = ({ isOpen, onClose }) => {
  const { coords } = useContext(LocationContext);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [landmark, setLandmark] = useState("");
  const [type, setType] = useState("LOST");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!coords) {
      alert("GPS location nahi mili. Please location enable karein.");
      return;
    }

    setLoading(true);

    try {
      const newPingData = {
        title,
        description,
        landmark,
        type,
        latitude: coords.lat,
        longitude: coords.lng,
      };

      await axios.post("http://localhost:5000/api/pings", newPingData);

      setTitle("");
      setDescription("");
      setLandmark("");
      setType("LOST");
      onClose();
    } catch (error) {
      console.error("Alert create karne me error aaya:", error);
      alert("Alert create nahi ho paya. Dobara try karein.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">📢 Create Radar Alert</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Alert Type</label>
            <select
              className="modal-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="LOST">🔍 Lost Item / Pet</option>
              <option value="FOUND">🎁 Found Item</option>
              <option value="URGENT_HELP">🚨 Emergency / Help Needed</option>
            </select>
          </div>

          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Black Wallet Lost"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Landmark / Location Detail</label>
            <input
              type="text"
              placeholder="e.g. Near Tea Stall, Main Gate"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              rows="3"
              placeholder="Provide details so locals can help..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Posting..." : "Post Alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePingModal;