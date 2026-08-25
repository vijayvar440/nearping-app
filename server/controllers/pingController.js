const Ping = require("../models/Ping");

const createPing = async (req, res) => {
  try {
    const { title, description, type, landmark, longitude, latitude, radius } = req.body;
    
    const newPing = await Ping.create({
      title, description, type, landmark,
      location: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
      radius: radius || 500
    });

    res.status(201).json({ success: true, data: newPing });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const getNearbyPings = async (req, res) => {
  try {
    const { longitude, latitude, radius = 500 } = req.query;

    const pings = await Ping.find({
      status: "ACTIVE",
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: parseInt(radius)
        }
      }
    });

    res.status(200).json({ success: true, count: pings.length, data: pings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


module.exports = { createPing, getNearbyPings };