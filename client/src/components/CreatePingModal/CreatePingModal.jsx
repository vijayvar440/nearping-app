import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { LocationContext } from "../../context/LocationContext";
import "./CreatePingModal.css";

// Leaflet Default Marker Icon Fix
import markerIconAuto from "leaflet/dist/images/marker-icon.png";
import markerShadowAuto from "leaflet/dist/images/marker-shadow.png";

const customIcon = L.icon({
  iconUrl: markerIconAuto,
  shadowUrl: markerShadowAuto,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// 📍 Sub-component: Handles map click inside modal
function LocationPicker({ pin, setPin }) {
  useMapEvents({
    click(e) {
      setPin({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });

  return pin?.lat && pin?.lng ? (
    <Marker position={[pin.lat, pin.lng]} icon={customIcon} />
  ) : null;
}

// 🎯 Sub-component: Recenter map when pin position updates via Search
function MapRecenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords?.lat && coords?.lng) {
      map.setView([coords.lat, coords.lng], 15);
    }
  }, [coords, map]);
  return null;
}

const CreatePingModal = ({ isOpen, onClose, selectedLocation }) => {
  const { coords } = useContext(LocationContext);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("LOST");
  const [landmark, setLandmark] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [broadcastRadius, setBroadcastRadius] = useState(5);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // 📍 Pin coordinates state
  const [pinCoords, setPinCoords] = useState({ lat: null, lng: null });

  // 🔍 Rapido-style Location Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sync coords from props or Context
  useEffect(() => {
    const lat = selectedLocation?.lat || coords?.lat;
    const lng = selectedLocation?.lng || coords?.lng;
    if (lat && lng) {
      setPinCoords({ lat, lng });
    }
  }, [selectedLocation, coords]);

  // 🔍 Location Autocomplete Search (Nominatim API)
  const handleSearchChange = async (e) => {
    const text = e.target.value;
    setSearchQuery(text);

    if (text.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const res = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}`
      );
      setSearchResults(res.data);
    } catch (err) {
      console.error("Location search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // 📍 Select Location from Search Results
  const selectPlace = (item) => {
    const newLat = parseFloat(item.lat);
    const newLng = parseFloat(item.lon);

    setPinCoords({ lat: newLat, lng: newLng });
    setSearchQuery(item.display_name.split(",")[0]); // Show concise place name
    setLandmark(item.display_name); // Auto-fill landmark field
    setSearchResults([]); // Hide dropdown
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pinCoords.lat || !pinCoords.lng) {
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
          broadcastRadius: Number(broadcastRadius),
          type: type,
          category: type,
          latitude: pinCoords.lat,
          longitude: pinCoords.lng,
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
      alert(err.response?.data?.message || err.response?.data?.error || "Alert create nahi ho paya.");
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
          {/* 🔍 Rapido-Style Search Input */}
          <div className="form-group" style={{ position: "relative" }}>
            <label>🔍 Search Incident Location (Rapido Style)</label>
            <input
              type="text"
              placeholder="e.g., Bhopal Junction, MP Nagar, GT Road..."
              value={searchQuery}
              onChange={handleSearchChange}
            />

            {/* Dropdown Suggestions */}
            {searchResults.length > 0 && (
              <ul style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                borderRadius: "6px",
                maxHeight: "150px",
                overflowY: "auto",
                zIndex: 1000,
                listStyle: "none",
                padding: 0,
                margin: "4px 0 0 0",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
              }}>
                {searchResults.map((item, idx) => (
                  <li
                    key={idx}
                    onClick={() => selectPlace(item)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontSize: "12px",
                      borderBottom: "1px solid #eee",
                      color: "#333"
                    }}
                  >
                    📍 {item.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Target Location Badge */}
          <div className="location-badge mb-2">
            📍 Incident Spot: <span>{pinCoords.lat?.toFixed(4)}, {pinCoords.lng?.toFixed(4)}</span>
          </div>

          {/* Mini Interactive Map Picker */}
          {pinCoords.lat && pinCoords.lng && (
            <div style={{ height: "180px", width: "100%", marginBottom: "12px", borderRadius: "8px", overflow: "hidden" }}>
              <MapContainer
                center={[pinCoords.lat, pinCoords.lng]}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker pin={pinCoords} setPin={setPinCoords} />
                <MapRecenter coords={pinCoords} />
              </MapContainer>
            </div>
          )}

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
              <label>Broadcast Range</label>
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
                placeholder="e.g., Near Bus Stand Chai Stall"
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