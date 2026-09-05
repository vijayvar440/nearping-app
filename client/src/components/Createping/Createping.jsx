import React, { useContext, useState } from "react";
import axios from "axios";
import { LocationContext } from "../../context/LocationContext";
import "./CreatePing.css";

const CreatePing = () => {
  const { coords } = useContext(LocationContext);

  const [isOpen, setIsOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "LOST",
    landmark: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!coords) {
      alert("📍 Location abhi available nahi hai.");
      return;
    }

    if (!formData.title.trim()) {
      alert("Please alert ka title enter karo.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "http://localhost:5000/api/pings/create",
        {
          ...formData,
          latitude: coords.lat,
          longitude: coords.lng,
        }
      );

      console.log("Ping created:", response.data);

      alert("✅ Alert successfully created!");

      setFormData({
        title: "",
        description: "",
        type: "LOST",
        landmark: "",
      });

      setIsOpen(false);
    } catch (error) {
      console.error("Create Ping Error:", error);

      alert(
        error.response?.data?.error ||
          "❌ Alert create nahi ho paya."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-ping-wrapper">

      {/* Create Alert Button */}

      <button
        className="create-ping-btn"
        onClick={() => setIsOpen(true)}
      >
        <span className="create-icon">＋</span>
        Create Alert
      </button>

      {/* Form Modal */}

      {isOpen && (
        <div
          className="ping-modal-overlay"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="ping-modal"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Modal Header */}

            <div className="ping-modal-header">
              <div>
                <span className="modal-label">
                  NEARPING
                </span>

                <h2>Create Alert</h2>

                <p>
                  Nearby people ko alert ke baare me inform karo.
                </p>
              </div>

              <button
                className="close-modal-btn"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>

            {/* Form */}

            <form
              className="create-ping-form"
              onSubmit={handleSubmit}
            >

              {/* Type */}

              <div className="form-group">
                <label htmlFor="type">
                  Alert Type
                </label>

                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="LOST">
                    🔍 Lost
                  </option>

                  <option value="FOUND">
                    🎁 Found
                  </option>

                  <option value="URGENT_HELP">
                    🚨 Urgent Help
                  </option>
                </select>
              </div>

              {/* Title */}

              <div className="form-group">
                <label htmlFor="title">
                  Title
                </label>

                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="e.g. Lost Wallet"
                  value={formData.title}
                  onChange={handleChange}
                  maxLength={80}
                />
              </div>

              {/* Description */}

              <div className="form-group">
                <label htmlFor="description">
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  placeholder="Alert ke baare me thoda detail me batao..."
                  value={formData.description}
                  onChange={handleChange}
                  rows="4"
                  maxLength={300}
                />
              </div>

              {/* Landmark */}

              <div className="form-group">
                <label htmlFor="landmark">
                  Nearby Landmark
                </label>

                <input
                  id="landmark"
                  name="landmark"
                  type="text"
                  placeholder="e.g. Near Main Gate"
                  value={formData.landmark}
                  onChange={handleChange}
                  maxLength={100}
                />
              </div>

              {/* Location */}

              <div className="location-status">
                <span className="location-icon">
                  📍
                </span>

                <div>
                  <strong>
                    Current Location
                  </strong>

                  <p>
                    {coords
                      ? "Your current GPS location will be attached automatically."
                      : "Getting your location..."}
                  </p>
                </div>
              </div>

              {/* Submit */}

              <button
                type="submit"
                className="submit-ping-btn"
                disabled={loading || !coords}
              >
                {loading
                  ? "Creating Alert..."
                  : "🚀 Create Alert"}
              </button>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePing;