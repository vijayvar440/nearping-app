const mongoose = require("mongoose");

const PingSchema = new mongoose.Schema({

  title: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ["LOST", "FOUND", "URGENT_HELP"],
    required: true
  },

  description: {
    type: String
  },

  landmark: {
    type: String
  },

  contactInfo: {
    type: String
  },

  // 🔐 User Relation
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  // 🔐 Security & Status
  secretQuestion: {
    type: String,
    default: ""
  },

  status: {
    type: String,
    enum: ["ACTIVE", "RESOLVED"],
    default: "ACTIVE"
  },

  // 📍 Location
  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },

    coordinates: {
      type: [Number],
      required: true
    }
  },

  // 📡 Broadcast Radius (KM)
  broadcastRadius: {
    type: Number,
    default: 5
  },

  // 🕐 Ping Creation Time
  createdAt: {
    type: Date,
    default: Date.now
  },
expiresAt: {
  type: Date,
  default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
}

});

// 🌍 GeoSpatial Index
PingSchema.index({
  location: "2dsphere"
});

// 🗑️ MongoDB automatically deletes the Ping
// when expiresAt time is reached
PingSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model("Ping", PingSchema);