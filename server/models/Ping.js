const mongoose = require("mongoose");

const pingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["LOST", "FOUND", "URGENT_HELP"], 
    default: "LOST" 
  },
  landmark: { type: String, required: true },
  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  radius: { type: Number, default: 500 },
  status: { type: String, enum: ["ACTIVE", "RESOLVED"], default: "ACTIVE" },
  createdAt: { type: Date, default: Date.now }
});

// 🔴 CRITICAL: Geospatial index for nearby queries
pingSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Ping", pingSchema);