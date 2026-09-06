const Ping = require("../models/Ping");

// 1. Create Ping with Auto-Matching Radar
exports.createPing = async (req, res) => {
  try {
    const { title, type, description, landmark, contactInfo, secretQuestion, location, broadcastRadius, user } = req.body;

    const newPing = new Ping({
      title,
      type, // "LOST" ya "FOUND"
      description,
      landmark,
      contactInfo,
      secretQuestion: secretQuestion || "",
      location,
      broadcastRadius: broadcastRadius || 5,
      user: req.user?._id || user,
    });

    await newPing.save();

    const io = req.app.get("io");

    // 🎯 AUTO-MATCH RADAR LOGIC
    // Agar LOST post hua to nearby FOUND dhoondo, aur vice-versa
    const targetType = type === "LOST" ? "FOUND" : "LOST";
    
    const nearbyMatches = await Ping.find({
      type: targetType,
      status: "ACTIVE",
      location: {
        $near: {
          $geometry: location,
          $maxDistance: (broadcastRadius || 5) * 1000, // kilometers to meters
        },
      },
    }).populate("user", "name email");

    // 📡 BroadCast Events
    if (io) {
      // Normal new ping broadcast for everyone
      io.emit("new-ping", newPing);

      // Agar potential match mila toh live match event bhejo
      if (nearbyMatches.length > 0) {
        io.emit("potential-match-found", {
          newPing,
          matchedPings: nearbyMatches,
        });
      }
    }

    return res.status(201).json({ success: true, ping: newPing, matchesFound: nearbyMatches.length });
  } catch (error) {
    console.error("Create Ping Error:", error);
    return res.status(500).json({ error: "Failed to create ping", details: error.message });
  }
};

// Get Nearby Active Pings
exports.getPingsNear = async (req, res) => {
  try {
    // 🎯 Dono query parameter styles extract kar liye
    const lng = req.query.lng || req.query.longitude;
    const lat = req.query.lat || req.query.latitude;
    const radius = req.query.radius || req.query.rad || 5;

    if (!lng || !lat) {
      return res.status(400).json({ error: "Latitude and Longitude are required" });
    }

    const pings = await Ping.find({
      status: "ACTIVE",
      location: {
        $near: {
          $geometry: { 
            type: "Point", 
            coordinates: [parseFloat(lng), parseFloat(lat)] 
          },
          $maxDistance: parseFloat(radius) * 1000,
        },
      },
    })
      .populate("user", "_id name email")
      .sort({ createdAt: -1 });

    return res.json(pings);
  } catch (error) {
    console.error("getPingsNear Error:", error);
    return res.status(500).json({ error: error.message });
  }
};