const mongoose = require("mongoose");

const claimSchema = new mongoose.Schema(
  {
    ping: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ping",
    },
    pingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ping",
    },
    // 🔐 YEH FIELD MISSING THA - ISSE ADD KARO
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    finderAnswer: { 
      type: String, 
      default: "" 
    },
    finderContact: { 
      type: String, 
      default: "" 
    },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Claim", claimSchema);