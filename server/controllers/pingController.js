const Ping = require("../models/Ping");

// 1. Create Ping with Auto-Matching Radar
exports.createPing = async (req, res) => {
  try {
    const {
      title,
      type,
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
      expiryHours,
      user
    } = req.body;

    // 📍 Extract latitude and longitude safely
    const rawLat =
      lat ??
      latitude ??
      location?.lat ??
      location?.latitude ??
      location?.coordinates?.[1];

    const rawLng =
      lng ??
      longitude ??
      location?.lng ??
      location?.longitude ??
      location?.coordinates?.[0];

    // ❌ Location validation
    if (
      rawLat === undefined ||
      rawLng === undefined ||
      isNaN(rawLat) ||
      isNaN(rawLng)
    ) {
      return res.status(400).json({
        error: "Invalid Location",
        message: "Latitude and Longitude are required to create a ping."
      });
    }

    // 📍 GeoJSON format
    const formattedLocation = {
      type: "Point",
      coordinates: [
        parseFloat(rawLng),
        parseFloat(rawLat)
      ]
    };

    // 📡 Broadcast radius in KM
    const finalRadius = Number(broadcastRadius) || 5;

    // ⏰ Alert Duration
    const finalExpiryHours = Number(expiryHours) || 24;

    // ⏰ Calculate exact expiry time
    const expiresAt = new Date(
      Date.now() + finalExpiryHours * 60 * 60 * 1000
    );

    // 🚨 Create Ping
    const newPing = new Ping({
      title,
      type: type || "LOST",
      description,
      landmark,
      contactInfo,
      secretQuestion: secretQuestion || "",

      location: formattedLocation,

      // 📡 Radius
      broadcastRadius: finalRadius,

      // ⏰ Custom expiry
      expiresAt,

      // 👤 User
      user: req.user?._id || req.user?.userId || user
    });

    await newPing.save();

    const io = req.app.get("io");

    // 🎯 AUTO-MATCH RADAR
    const targetType =
      type === "LOST" || type === "lost"
        ? "FOUND"
        : "LOST";

    const nearbyMatches = await Ping.find({
      type: targetType,

      // ✅ Only active alerts
      status: "ACTIVE",

      // ⏰ Expired alerts ko match nahi karna
      expiresAt: { $gt: new Date() },

      location: {
        $near: {
          $geometry: formattedLocation,

          // 📡 Radius is already in KM
          $maxDistance: finalRadius * 1000
        }
      }
    }).populate("user", "name email");

    // 📡 Socket Events
    if (io) {
      // 🆕 New ping
      io.emit("new-ping", newPing);

      // 🎯 Potential match
      if (nearbyMatches.length > 0) {
        io.emit("potential-match-found", {
          newPing,
          matchedPings: nearbyMatches
        });
      }
    }

    // ✅ Response
    return res.status(201).json({
      success: true,
      ping: newPing,
      matchesFound: nearbyMatches.length
    });

  } catch (error) {
    console.error("Create Ping Error:", error);

    return res.status(500).json({
      error: "Failed to create ping",
      details: error.message
    });
  }
};


// 2. Get Nearby Active Pings
exports.getPingsNear = async (req, res) => {
  try {
    const lng = req.query.lng || req.query.longitude;
    const lat = req.query.lat || req.query.latitude;

    // 📡 Radius is in KM
    const radius = req.query.radius || req.query.rad || 5;

    // ❌ Location validation
    if (
      lng === undefined ||
      lat === undefined ||
      isNaN(lng) ||
      isNaN(lat)
    ) {
      return res.status(400).json({
        error: "Latitude and Longitude are required"
      });
    }

    const finalRadius = Number(radius) || 5;

    const pings = await Ping.find({
      // ✅ Only active alerts
      status: "ACTIVE",

      // ⏰ Only non-expired alerts
      expiresAt: {
        $gt: new Date()
      },

      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [
              parseFloat(lng),
              parseFloat(lat)
            ]
          },

          // 📡 Convert KM → meters
          $maxDistance: finalRadius * 1000
        }
      }
    })
      .populate("user", "_id name email")
      .sort({ createdAt: -1 });

    return res.json(pings);

  } catch (error) {
    console.error("getPingsNear Error:", error);

    return res.status(500).json({
      error: error.message
    });
  }
};


// 3. Delete Ping
exports.deletePing = async (req, res) => {
  try {
    const { id } = req.params;

    // 🗑️ Delete from database
    const deletedPing = await Ping.findByIdAndDelete(id);

    if (!deletedPing) {
      return res.status(404).json({
        message: "Alert nahi mila"
      });
    }

    // 📡 Socket.io
    const io = req.app.get("io");

    if (io) {
      io.emit("ping-deleted", {
        pingId: id
      });
    }

    return res.status(200).json({
      success: true,
      message: "Alert sabhi jagah se delete ho gaya"
    });

  } catch (error) {
    console.error("Delete Error:", error);

    return res.status(500).json({
      message: "Server error during delete"
    });
  }
};