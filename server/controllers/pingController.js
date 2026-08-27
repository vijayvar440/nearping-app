const Ping = require("../models/Ping");

exports.createPing = async (req, res) => {
  try {
    const { title, description, type, landmark, latitude, longitude, lat, lng } = req.body;

    const finalLat = parseFloat(latitude || lat);
    const finalLng = parseFloat(longitude || lng);

    if (isNaN(finalLat) || isNaN(finalLng)) {
      return res.status(400).json({ error: "Invalid Lat/Lng coordinates!" });
    }

    const newPing = new Ping({
      title,
      description,
      type,
      landmark,
      location: {
        type: "Point",
        coordinates: [finalLng, finalLat] // [Longitude, Latitude]
      }
    });

    await newPing.save();

    const io = req.app.get("io");
    if (io) io.emit("new-ping", newPing);

    res.status(201).json(newPing);
  } catch (err) {
    console.error("🔴 CREATE PING ERROR LOG:", err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getNearbyPings = async (req, res) => {
  try {
    const lat = parseFloat(req.query.latitude || req.query.lat);
    const lng = parseFloat(req.query.longitude || req.query.lng);
    const radius = parseInt(req.query.radius || 5000);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid Lat/Lng query parameters!" });
    }

    const pings = await Ping.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat]
          },
          $maxDistance: radius
        }
      }
    });

    res.status(200).json(pings);
  } catch (err) {
    console.error("🔴 GET NEARBY ERROR LOG:", err.message);
    res.status(500).json({ error: err.message });
  }
};