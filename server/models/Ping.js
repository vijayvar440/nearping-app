const mongoose = require("mongoose");

const pingSchema = new mongoose.Schema(
  {
    title: { 
        type: String,
         required: true },

    description: { 
        type: String,
         required: true },

    type: {
         type: String,
          enum: ["LOST", "FOUND", "URGENT_HELP"],
           required: true },

    landmark: { 
        type: String,
         required: true },

    location: {

      type: { type: String,
         enum: ["Point"], 
         default: "Point" },

      coordinates: { type: [Number],
         required: true } 
    },

    radius: { type: Number, 
        default: 500 },

    status: { type: String, 
        enum: ["ACTIVE", "RESOLVED"], 
        default: "ACTIVE" }
  },
  { timestamps: true }
);


pingSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Ping", pingSchema);