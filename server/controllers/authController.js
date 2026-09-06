const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "nearping_secret_key_2026";

// 📍 Helper: Safely parse GeoJSON point [lng, lat]
const parseLocation = (lat, lng, latitude, longitude) => {
  const userLat = lat ?? latitude;
  const userLng = lng ?? longitude;

  if (userLat !== undefined && userLng !== undefined && !isNaN(userLat) && !isNaN(userLng)) {
    return {
      type: "Point",
      coordinates: [parseFloat(userLng), parseFloat(userLat)] // Always [longitude, latitude]
    };
  }
  return null;
};

// Register Controller
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, lat, lng, latitude, longitude } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const locationData = parseLocation(lat, lng, latitude, longitude);

    user = new User({ 
      name, 
      email, 
      password: hashedPassword, 
      phone,
      ...(locationData && { lastKnownLocation: locationData })
    });
    
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone,
        lastKnownLocation: user.lastKnownLocation 
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error occurred.", error: err.message });
  }
};

// Login Controller
exports.loginUser = async (req, res) => {
  try {
    const { email, password, lat, lng, latitude, longitude } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    // 📍 Sync location during login if provided
    const locationData = parseLocation(lat, lng, latitude, longitude);
    if (locationData) {
      user.lastKnownLocation = locationData;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone,
        lastKnownLocation: user.lastKnownLocation 
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error occurred.", error: err.message });
  }
};