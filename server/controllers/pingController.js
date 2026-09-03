const Ping = require("../models/Ping");

// 1. Create Ping
exports.createPing = async (req, res) => {
  try {
    const { title, description, category, landmark, contactInfo, broadcastRadius, latitude, longitude } = req.body;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: "Valid coordinates are required." });
    }

    const newPing = new Ping({
      title,
      description,
      landmark,
      contactInfo,
      broadcastRadius: parseFloat(broadcastRadius) || 5,
      type: category || "LOST",
      location: {
        type: "Point",
        coordinates: [lng, lat],
      },
    });

    await newPing.save();

    const io = req.app.get("io");
    if (io) io.emit("new-ping", newPing);

    return res.status(201).json(newPing);
  } catch (err) {
    console.error("Create Ping Error:", err);
    return res.status(500).json({ message: "Server error creating ping", error: err.message });
  }
};

// 2. Get Nearby Pings
exports.getPingsNear = async (req, res) => {
  try {
    const { latitude, longitude, radius } = req.query;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const rad = parseFloat(radius) || 50000;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: "Invalid location parameters." });
    }

    const pings = await Ping.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: rad,
        },
      },
    }).sort({ createdAt: -1 });

    return res.json(pings);
  } catch (err) {
    console.error("Get Near Pings Error:", err);
    return res.status(500).json({ message: "Server error fetching pings", error: err.message });
  }
};