const mongoose = require("mongoose");

const PingSchema = new mongoose.Schema({

  title: 
        { type: String,
           required: true },

  type: 
       { type: String, 
        enum: ["LOST", "FOUND", "URGENT_HELP"], required: true },
  description: { type: String },


  landmark: 
  { type: String },

  contactInfo: 
  { type: String },
  
  // 🔐 Security & Status Fields
  secretQuestion:
   { type: String,
     default: "" }, 


  status:
   { type: String, 
    enum: ["ACTIVE", "RESOLVED"],
     default: "ACTIVE" },

  location: {
    type: { type: String,
       enum: ["Point"],
        default: "Point" },

    coordinates:
     { type: [Number],
       required: true } 
  },

  broadcastRadius:
   { type: Number, 
    default: 5 },

  createdAt:
   { type: Date,
    
     default: Date.now }
});

PingSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Ping", PingSchema);