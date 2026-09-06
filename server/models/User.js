const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  // 📍 GeoJSON Location tracking field
  lastKnownLocation: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 📡 Indexing for location-based distance calculations
userSchema.index({ lastKnownLocation: "2dsphere" });

module.exports = mongoose.model("User", userSchema);