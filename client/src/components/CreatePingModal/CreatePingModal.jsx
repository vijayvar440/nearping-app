import React, { useState, useContext } from "react";
import axios from "axios";
import { LocationContext } from "../../context/LocationContext";

const CreatePingModal = ({ isOpen, onClose }) => {
  const { coords } = useContext(LocationContext);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "LOST",
    landmark: "",
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coords) return alert("GPS Location missing!");

    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/pings/create", {
        ...formData,
        latitude: coords.lat,
        longitude: coords.lng,
      });
      
      setFormData({ title: "", description: "", type: "LOST", landmark: "" });
      onClose();
    } catch (err) {
      console.error("Create Ping Error:", err);
      alert("Failed to create alert!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">📢 Create Radar Alert</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alert Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="LOST">🔍 Lost Item / Pet</option>
              <option value="FOUND">🟢 Found Item</option>
              <option value="URGENT_HELP">🚨 Urgent Local Help</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Black Wallet Lost"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Landmark / Location Detail</label>
            <input
              type="text"
              required
              placeholder="e.g. Near Tea Stall, Main Gate"
              value={formData.landmark}
              onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              required
              rows="3"
              placeholder="Provide details so locals can help..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 border rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !coords}
              className="w-1/2 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Posting..." : "Post Alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePingModal;