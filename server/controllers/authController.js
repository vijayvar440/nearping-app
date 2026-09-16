const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || "nearping_secret_key_2026";

// 📍 Helper: Safely parse GeoJSON point [lng, lat]
const parseLocation = (
  lat,
  lng,
  latitude,
  longitude
) => {
  const userLat = lat ?? latitude;
  const userLng = lng ?? longitude;

  if (
    userLat !== undefined &&
    userLng !== undefined &&
    !isNaN(userLat) &&
    !isNaN(userLng)
  ) {
    return {
      type: "Point",
      coordinates: [
        parseFloat(userLng),
        parseFloat(userLat)
      ]
    };
  }

  return null;
};


// ==========================================
// 📝 REGISTER
// ==========================================

exports.registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      lat,
      lng,
      latitude,
      longitude
    } = req.body;

    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({
        message: "Email is already registered."
      });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(password, salt);

    const locationData = parseLocation(
      lat,
      lng,
      latitude,
      longitude
    );

    user = new User({
      name,
      email,
      password: hashedPassword,
      phone,

      ...(locationData && {
        lastKnownLocation: locationData
      })
    });

    await user.save();

    const token = jwt.sign(
      {
        userId: user._id
      },
      JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.status(201).json({
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        lastKnownLocation:
          user.lastKnownLocation
      }
    });

  } catch (err) {
    console.error(
      "Register Error:",
      err
    );

    res.status(500).json({
      message: "Server error occurred.",
      error: err.message
    });
  }
};


// ==========================================
// 🔐 LOGIN
// ==========================================

exports.loginUser = async (req, res) => {
  try {
    const {
      email,
      password,
      lat,
      lng,
      latitude,
      longitude
    } = req.body;

    const user = await User.findOne({
      email
    });

    if (!user) {
      return res.status(400).json({
        message:
          "Invalid email or password."
      });
    }

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {
      return res.status(400).json({
        message:
          "Invalid email or password."
      });
    }

    // 📍 Update location during login
    const locationData = parseLocation(
      lat,
      lng,
      latitude,
      longitude
    );

    if (locationData) {
      user.lastKnownLocation =
        locationData;

      await user.save();
    }

    const token = jwt.sign(
      {
        userId: user._id
      },
      JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.json({
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        lastKnownLocation:
          user.lastKnownLocation
      }
    });

  } catch (err) {
    console.error(
      "Login Error:",
      err
    );

    res.status(500).json({
      message: "Server error occurred.",
      error: err.message
    });
  }
};


// ==========================================
// 👤 GET PROFILE
// ==========================================

exports.getProfile = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    const user =
      await User.findById(userId)
        .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (err) {
    console.error(
      "Get Profile Error:",
      err
    );

    res.status(500).json({
      message:
        "Failed to fetch profile.",
      error: err.message
    });
  }
};


// ==========================================
// ✏️ UPDATE PROFILE
// ==========================================

exports.updateProfile = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    const {
      name,
      phone
    } = req.body;

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    if (
      name !== undefined
    ) {
      user.name =
        name.trim();
    }

    if (
      phone !== undefined
    ) {
      user.phone =
        phone.trim();
    }

    await user.save();

    res.json({
      success: true,

      message:
        "Profile updated successfully.",

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        lastKnownLocation:
          user.lastKnownLocation
      }
    });

  } catch (err) {
    console.error(
      "Update Profile Error:",
      err
    );

    res.status(500).json({
      message:
        "Failed to update profile.",
      error: err.message
    });
  }
};


// ==========================================
// 🔑 CHANGE PASSWORD
// ==========================================

exports.changePassword = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    const {
      currentPassword,
      newPassword
    } = req.body;

    if (
      !currentPassword ||
      !newPassword
    ) {
      return res.status(400).json({
        message:
          "Current password and new password are required."
      });
    }

    if (
      newPassword.length < 6
    ) {
      return res.status(400).json({
        message:
          "New password must be at least 6 characters."
      });
    }

    const user =
      await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    const isMatch =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!isMatch) {
      return res.status(400).json({
        message:
          "Current password is incorrect."
      });
    }

    const salt =
      await bcrypt.genSalt(10);

    user.password =
      await bcrypt.hash(
        newPassword,
        salt
      );

    await user.save();

    res.json({
      success: true,
      message:
        "Password changed successfully."
    });

  } catch (err) {
    console.error(
      "Change Password Error:",
      err
    );

    res.status(500).json({
      message:
        "Failed to change password.",
      error: err.message
    });
  }
};