const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // 👤 Basic Profile
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    // 📧 Email
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // 🔐 Password
    // Password yahan plain text me nahi aana chahiye.
    // Register controller me bcrypt se hash hoga.
    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    // 📱 Phone
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // ✉️ Email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // 📲 Phone verification
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    // 🟢 Account status
    isActive: {
      type: Boolean,
      default: true,
    },

    // 📍 Last known GPS location
    // [longitude, latitude]
    lastKnownLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },

      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },

    // 📅 Account creation
    createdAt: {
      type: Date,
      default: Date.now,
    },

    // 🔄 Last profile/account update
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 📍 GeoJSON index
userSchema.index({
  lastKnownLocation: "2dsphere",
});

module.exports = mongoose.model("User", userSchema);