import React, { useState, useContext, useEffect } from "react";
import axios from "axios";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocationContext } from "../../context/LocationContext";
import "./CreatePingModal.css";

import markerIconAuto from "leaflet/dist/images/marker-icon.png";
import markerShadowAuto from "leaflet/dist/images/marker-shadow.png";

const customIcon = L.icon({
  iconUrl: markerIconAuto,
  shadowUrl: markerShadowAuto,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});


// 📍 Map Location Picker
function LocationPicker({ pin, setPin }) {
  useMapEvents({
    click(e) {
      setPin({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
    },
  });

  return pin?.lat && pin?.lng ? (
    <Marker
      position={[pin.lat, pin.lng]}
      icon={customIcon}
    />
  ) : null;
}


// 📍 Map Recenter
function MapRecenter({ coords }) {
  const map = useMap();

  useEffect(() => {
    if (coords?.lat && coords?.lng) {
      map.setView(
        [coords.lat, coords.lng],
        15
      );
    }
  }, [coords, map]);

  return null;
}


// 🎯 Current Location Button
function ResetMapButton({ userCoords, setPin }) {
  const map = useMap();

  const handleReset = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (userCoords?.lat && userCoords?.lng) {
      setPin({
        lat: userCoords.lat,
        lng: userCoords.lng
      });

      map.flyTo(
        [userCoords.lat, userCoords.lng],
        15,
        { animate: true }
      );
    } else {
      alert("⚠️ Live GPS location nahi mili!");
    }
  };

  return (
    <button
      type="button"
      className="map-reset-btn"
      onClick={handleReset}
      title="Reset to My Location"
    >
      🎯 Current Location
    </button>
  );
}


// 🔊 Notification Sound
const playAlertSound = (isEmergency) => {
  const soundUrl = isEmergency
    ? "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
    : "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3";

  const audio = new Audio(soundUrl);

  audio
    .play()
    .catch((err) =>
      console.log(
        "Audio play blocked by browser policy:",
        err
      )
    );
};


const CreatePingModal = ({
  isOpen,
  onClose,
  selectedLocation
}) => {

  const { coords } = useContext(LocationContext);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("LOST");

  // 🚨 Alert Priority
  const [alertType, setAlertType] = useState("NORMAL");

  const [landmark, setLandmark] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  // 📡 Broadcast Radius
  const [broadcastRadius, setBroadcastRadius] = useState(5);

  // ⏰ Alert Duration
  const [expiryHours, setExpiryHours] = useState(24);

  const [description, setDescription] = useState("");

  // 🔍 Matchable Attributes
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [image, setImage] = useState("");

  const [loading, setLoading] = useState(false);

  const [pinCoords, setPinCoords] = useState({
    lat: null,
    lng: null
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);


  // 📍 Set initial location
  useEffect(() => {
    const lat =
      selectedLocation?.lat || coords?.lat;

    const lng =
      selectedLocation?.lng || coords?.lng;

    if (lat && lng) {
      setPinCoords({
        lat,
        lng
      });
    }
  }, [selectedLocation, coords]);


  // 🔄 Reset Form
  const resetForm = () => {

    setTitle("");
    setType("LOST");
    setAlertType("NORMAL");

    setLandmark("");
    setContactInfo("");

    setBroadcastRadius(5);

    // ⏰ Default duration
    setExpiryHours(24);

    setDescription("");

    setBrand("");
    setColor("");
    setSerialNumber("");
    setImage("");

    setSearchQuery("");
    setSearchResults([]);
  };


  // ❌ Close Modal
  const handleClose = () => {
    resetForm();
    onClose();
  };


  // 🖼️ Image Change
  const handleImageChange = (e) => {

    const file = e.target.files[0];

    if (file) {

      const reader = new FileReader();

      reader.onloadend = () => {
        setImage(reader.result);
      };

      reader.readAsDataURL(file);
    }
  };


  // 🔍 Location Search
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
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          text
        )}`
      );

      setSearchResults(res.data);

    } catch (err) {

      console.error(
        "Location search error:",
        err
      );

    } finally {

      setIsSearching(false);
    }
  };


  // 📍 Select Search Location
  const selectPlace = (item) => {

    const newLat = parseFloat(item.lat);
    const newLng = parseFloat(item.lon);

    setPinCoords({
      lat: newLat,
      lng: newLng
    });

    setSearchQuery(
      item.display_name.split(",")[0]
    );

    setLandmark(
      item.display_name
    );

    setSearchResults([]);
  };


  if (!isOpen) return null;


  // 🚀 Submit Ping
  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!pinCoords.lat || !pinCoords.lng) {

      alert(
        "❌ Location coordinates missing hain! Map par click karke location select karein."
      );

      return;
    }


    // 🔊 Play Sound
    playAlertSound(
      alertType === "EMERGENCY"
    );


    try {

      setLoading(true);

      const token =
        localStorage.getItem("token");


      const res = await axios.post(

        "https://nearping-app.onrender.com/api/pings",

        {
          title,

          description,

          landmark,

          contactInfo,

          // 📡 Broadcast Radius
          broadcastRadius:
            Number(broadcastRadius),

          // ⏰ Alert Duration
          expiryHours:
            Number(expiryHours),

          type,

          category: type,

          // 🚨 Priority
          alertType,

          // 🔍 Matchable Attributes
          brand,

          color,

          serialNumber,

          image,

          // 📍 Location
          latitude: pinCoords.lat,

          longitude: pinCoords.lng,
        },

        {
          headers: {
            Authorization:
              `Bearer ${token}`
          },
        }
      );


      // ✅ Created Ping
      const createdPing =
        res.data;

      const createdPingId =
        createdPing?._id ||
        createdPing?.id ||
        createdPing?.ping?._id;


      // 💾 Save My Created Pings
      if (createdPingId) {

        const myCreatedPings =
          JSON.parse(
            localStorage.getItem(
              "myCreatedPings"
            ) || "[]"
          );

        if (
          !myCreatedPings.includes(
            createdPingId
          )
        ) {

          myCreatedPings.push(
            createdPingId
          );

          localStorage.setItem(
            "myCreatedPings",
            JSON.stringify(
              myCreatedPings
            )
          );
        }
      }


      alert(
        `🚀 ${
          alertType === "EMERGENCY"
            ? "🚨 EMERGENCY"
            : "📡"
        } Alert broadcasted within ${
          broadcastRadius
        } KM radius for ${
          expiryHours
        } hours!`
      );


      setLoading(false);

      resetForm();

      onClose();

    } catch (err) {

      setLoading(false);

      console.error(
        "Alert Create Error:",
        err.response?.data ||
        err.message
      );

      alert(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Alert create nahi ho paya."
      );
    }
  };


  return (

    <div className="modal-overlay">

      <div className="modal-card">


        {/* Header */}
        <div className="modal-header">

          <h2>
            📡 Broadcast Radar Alert
          </h2>

          <button
            className="close-btn"
            onClick={handleClose}
          >
            &times;
          </button>

        </div>


        <form
          onSubmit={handleSubmit}
          className="modal-form"
        >


          {/* 🔍 Search Location */}
          <div className="form-group search-input-wrapper">

            <label>
              🔍 Search Location
            </label>

            <input
              type="text"
              placeholder="e.g., Bhopal Junction, MP Nagar..."
              value={searchQuery}
              onChange={handleSearchChange}
            />


            {searchResults.length > 0 && (

              <ul className="suggestions-list">

                {searchResults.map(
                  (item, idx) => (

                    <li
                      key={idx}
                      onClick={() =>
                        selectPlace(item)
                      }
                    >
                      📍 {item.display_name}
                    </li>

                  )
                )}

              </ul>

            )}

          </div>


          {/* 📍 Selected Location */}
          <div className="location-badge">

            📍 Spot:

            <span>
              {pinCoords.lat?.toFixed(4)},
              {" "}
              {pinCoords.lng?.toFixed(4)}
            </span>

          </div>


          {/* 🗺️ Mini Map */}
          {pinCoords.lat &&
            pinCoords.lng && (

              <div className="mini-map-box">

                <MapContainer
                  center={[
                    pinCoords.lat,
                    pinCoords.lng
                  ]}
                  zoom={14}
                  style={{
                    height: "100%",
                    width: "100%"
                  }}
                >

                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <LocationPicker
                    pin={pinCoords}
                    setPin={setPinCoords}
                  />

                  <MapRecenter
                    coords={pinCoords}
                  />

                  <ResetMapButton
                    userCoords={coords}
                    setPin={setPinCoords}
                  />

                </MapContainer>

              </div>

            )}


          {/* Category + Priority */}
          <div className="form-row">

            <div className="form-group flex-1">

              <label>
                Category
              </label>

              <select
                className="modal-select"
                value={type}
                onChange={(e) =>
                  setType(e.target.value)
                }
              >

                <option value="LOST">
                  🔍 Lost Item / Pet
                </option>

                <option value="FOUND">
                  🎁 Found Something
                </option>

                <option value="URGENT_HELP">
                  🚨 Urgent Help Required
                </option>

              </select>

            </div>


            <div className="form-group flex-1">

              <label>
                Alert Priority
              </label>

              <select
                className="modal-select"
                value={alertType}
                onChange={(e) =>
                  setAlertType(e.target.value)
                }
              >

                <option value="NORMAL">
                  🟢 Normal Alert
                </option>

                <option value="EMERGENCY">
                  🚨 Emergency (High Sound)
                </option>

              </select>

            </div>

          </div>


          {/* Range + Alert Duration */}
          <div className="form-row">


            {/* 📡 Range */}
            <div className="form-group flex-1">

              <label>
                Range
              </label>

              <select
                className="modal-select"
                value={broadcastRadius}
                onChange={(e) =>
                  setBroadcastRadius(
                    e.target.value
                  )
                }
              >

                <option value="2">
                  📡 2 KM
                </option>

                <option value="5">
                  📡 5 KM
                </option>

                <option value="10">
                  📡 10 KM
                </option>

                <option value="25">
                  📡 25 KM
                </option>

              </select>

            </div>


            {/* ⏰ Alert Duration */}
            <div className="form-group flex-1">

              <label>
                Alert Duration
              </label>

              <select
                className="modal-select"
                value={expiryHours}
                onChange={(e) =>
                  setExpiryHours(
                    Number(e.target.value)
                  )
                }
              >

                <option value={6}>
                  ⏰ 6 Hours
                </option>

                <option value={12}>
                  ⏰ 12 Hours
                </option>

                <option value={24}>
                  ⏰ 24 Hours
                </option>

                <option value={48}>
                  ⏰ 48 Hours
                </option>

                <option value={72}>
                  ⏰ 3 Days
                </option>

              </select>

            </div>

          </div>


          {/* Title */}
          <div className="form-group">

            <label>
              Title
            </label>

            <input
              type="text"
              placeholder="e.g., Black Wallet / Golden Retriever"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              required
            />

          </div>


          {/* 🏷️ Matchable Specification */}
          <div className="form-row">


            <div className="form-group flex-1">

              <label>
                Brand / Company
              </label>

              <input
                type="text"
                placeholder="e.g., Apple, Samsung, Nike"
                value={brand}
                onChange={(e) =>
                  setBrand(e.target.value)
                }
              />

            </div>


            <div className="form-group flex-1">

              <label>
                Color
              </label>

              <input
                type="text"
                placeholder="e.g., Matte Black, Red"
                value={color}
                onChange={(e) =>
                  setColor(e.target.value)
                }
              />

            </div>

          </div>


          {/* Serial + Photo */}
          <div className="form-row">


            <div className="form-group flex-1">

              <label>
                Serial Number / ID (Optional)
              </label>

              <input
                type="text"
                placeholder="e.g., IMEI or unique mark"
                value={serialNumber}
                onChange={(e) =>
                  setSerialNumber(
                    e.target.value
                  )
                }
              />

            </div>


            <div className="form-group flex-1">

              <label>
                🖼️ Upload Photo
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{
                  fontSize: "0.8rem",
                  padding: "6px"
                }}
              />

            </div>

          </div>


          {/* Landmark + Contact */}
          <div className="form-row">


            <div className="form-group flex-1">

              <label>
                Landmark
              </label>

              <input
                type="text"
                placeholder="e.g., Near Bus Stand"
                value={landmark}
                onChange={(e) =>
                  setLandmark(e.target.value)
                }
              />

            </div>


            <div className="form-group flex-1">

              <label>
                Contact / WhatsApp
              </label>

              <input
                type="text"
                placeholder="+91 9876543210"
                value={contactInfo}
                onChange={(e) =>
                  setContactInfo(
                    e.target.value
                  )
                }
                required
              />

            </div>

          </div>


          {/* Description */}
          <div className="form-group">

            <label>
              Description
            </label>

            <textarea
              rows="2"
              placeholder="Describe marks, time lost, etc..."
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              required
            ></textarea>

          </div>


          {/* Actions */}
          <div className="modal-actions">

            <button
              type="button"
              className="cancel-btn"
              onClick={handleClose}
            >
              Cancel
            </button>


            <button
              type="submit"
              className="submit-btn"
              disabled={loading}
            >

              {loading
                ? "Broadcasting..."
                : "📡 Broadcast Alert"}

            </button>

          </div>

        </form>

      </div>

    </div>
  );
};


export default CreatePingModal;