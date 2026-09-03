const mongoose = require("mongoose");

const pingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, default: "LOST" },
    landmark: { type: String },
    contactInfo: { type: String, required: true }, // 📞 Contact number / WhatsApp
    broadcastRadius: { type: Number, default: 5 }, // 📡 Alert Radius in KM
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

pingSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Ping", pingSchema);