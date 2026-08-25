const Ping = require("../models/Ping");

// 1. Create New Alert / Ping
exports.createPing = async (req, res) => {
  try {
    const { title, description, type, landmark, latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and Longitude are required" });
    }

    const newPing = new Ping({
      title,
      description,
      type,
      landmark,
      location: {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)] // ⚠️ Longitude FIRST
      }
    });

    await newPing.save();

    // Socket broadcast (if configured)
    const io = req.app.get("io");
    if (io) io.emit("new-ping", newPing);

    res.status(201).json(newPing);
  } catch (err) {
    console.error("Create Ping Error Log:", err);
    res.status(500).json({ error: err.message });
  }
};

// 2. Get Nearby Pings
exports.getNearbyPings = async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query; // Default 5km radius

    if (!lat || !lng) {
      return res.status(400).json({ error: "Lat and Lng query params required" });
    }

    const pings = await Ping.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)] // ⚠️ Longitude FIRST
          },
          $maxDistance: parseInt(radius) // distance in meters
        }
      }
    });

    res.status(200).json(pings);
  } catch (err) {
    console.error("Get Nearby Error Log:", err);
    res.status(500).json({ error: err.message });
  }
};