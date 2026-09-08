const Ping = require("../models/Ping");

// 1. Create Ping with Auto-Matching Radar
exports.createPing = async (req, res) => {
  try {
    const { 
      title, 
      type, // "LOST" ya "FOUND"
      description, 
      landmark, 
      contactInfo, 
      secretQuestion, 
      location, 
      lat, 
      lng, 
      latitude, 
      longitude, 
      broadcastRadius, 
      user 
    } = req.body;

    // 📍 1. Extract and format location into GeoJSON safely
    let rawLat = lat ?? latitude ?? location?.lat ?? location?.latitude ?? location?.coordinates?.[1];
    let rawLng = lng ?? longitude ?? location?.lng ?? location?.longitude ?? location?.coordinates?.[0];

    if (rawLat === undefined || rawLng === undefined || isNaN(rawLat) || isNaN(rawLng)) {
      return res.status(400).json({ 
        error: "Invalid Location", 
        message: "Latitude and Longitude are required to create a ping." 
      });
    }

    const formattedLocation = {
      type: "Point",
      coordinates: [parseFloat(rawLng), parseFloat(rawLat)] // GeoJSON is always [Longitude, Latitude]
    };

    // 2. Save Ping with formatted GeoJSON
    const newPing = new Ping({
      title,
      type: type || "LOST",
      description,
      landmark,
      contactInfo,
      secretQuestion: secretQuestion || "",
      location: formattedLocation,
      broadcastRadius: broadcastRadius || 5,
      user: req.user?._id || user,
    });

    await newPing.save();

    const io = req.app.get("io");

    // 🎯 3. AUTO-MATCH RADAR LOGIC
    const targetType = (type === "LOST" || type === "lost") ? "FOUND" : "LOST";
    
    const nearbyMatches = await Ping.find({
      type: targetType,
      status: "ACTIVE",
      location: {
        $near: {
          $geometry: formattedLocation,
          $maxDistance: (broadcastRadius || 5) * 1000, // KM to meters
        },
      },
    }).populate("user", "name email");

    // 📡 4. Socket Events
    if (io) {
      io.emit("new-ping", newPing);

      if (nearbyMatches.length > 0) {
        io.emit("potential-match-found", {
          newPing,
          matchedPings: nearbyMatches,
        });
      }
    }

    return res.status(201).json({ 
      success: true, 
      ping: newPing, 
      matchesFound: nearbyMatches.length 
    });

  } catch (error) {
    console.error("Create Ping Error:", error);
    return res.status(500).json({ error: "Failed to create ping", details: error.message });
  }
};

// 2. Get Nearby Active Pings
exports.getPingsNear = async (req, res) => {
  try {
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