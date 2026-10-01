const Ping = require("../models/Ping");

// =====================================================
// 1. CREATE PING
// =====================================================

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
      user,
    } = req.body;

    // -------------------------------------------------
    // GET LATITUDE
    // -------------------------------------------------

    const rawLat =
      lat ??
      latitude ??
      location?.lat ??
      location?.latitude ??
      location?.coordinates?.[1];

    // -------------------------------------------------
    // GET LONGITUDE
    // -------------------------------------------------

    const rawLng =
      lng ??
      longitude ??
      location?.lng ??
      location?.longitude ??
      location?.coordinates?.[0];

    // -------------------------------------------------
    // VALIDATE LOCATION
    // -------------------------------------------------

    const parsedLat = Number(rawLat);
    const parsedLng = Number(rawLng);

    if (
      !Number.isFinite(parsedLat) ||
      !Number.isFinite(parsedLng)
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid Location",
        message:
          "Valid latitude and longitude are required.",
      });
    }

    if (
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      return res.status(400).json({
        success: false,
        error: "Invalid Location",
        message: "Latitude or longitude is out of range.",
      });
    }

    // -------------------------------------------------
    // GEOJSON LOCATION
    //
    // IMPORTANT:
    // [longitude, latitude]
    // -------------------------------------------------

    const formattedLocation = {
      type: "Point",
      coordinates: [
        parsedLng,
        parsedLat,
      ],
    };

    // -------------------------------------------------
    // BROADCAST RADIUS
    // KM
    // -------------------------------------------------

    const finalRadius =
      Number(broadcastRadius) > 0
        ? Number(broadcastRadius)
        : 5;

    // -------------------------------------------------
    // EXPIRY
    // -------------------------------------------------

    const finalExpiryHours =
      Number(expiryHours) > 0
        ? Number(expiryHours)
        : 24;

    const expiresAt = new Date(
      Date.now() +
        finalExpiryHours * 60 * 60 * 1000
    );

    // -------------------------------------------------
    // USER ID
    // -------------------------------------------------

    const currentUserId =
      req.user?.userId ||
      req.user?._id ||
      user ||
      null;

    // -------------------------------------------------
    // CREATE PING
    // -------------------------------------------------

    const newPing = new Ping({
      title,
      type: type || "LOST",
      description,
      landmark,
      contactInfo,
      secretQuestion:
        secretQuestion || "",

      location: formattedLocation,

      broadcastRadius:
        finalRadius,

      expiresAt,

      user: currentUserId,
    });

    await newPing.save();

    console.log(
      "✅ Ping Created:",
      newPing._id.toString()
    );

    console.log(
      "📍 Ping Location:",
      newPing.location
    );

    console.log(
      "⏰ Expires:",
      newPing.expiresAt
    );

    // -------------------------------------------------
    // SOCKET
    // -------------------------------------------------

    const io = req.app.get("io");

    // -------------------------------------------------
    // AUTO MATCH
    // -------------------------------------------------

    const targetType =
      String(type).toUpperCase() === "LOST"
        ? "FOUND"
        : "LOST";

    const nearbyMatches =
      await Ping.find({
        type: targetType,

        status: "ACTIVE",

        expiresAt: {
          $gt: new Date(),
        },

        location: {
          $near: {
            $geometry:
              formattedLocation,

            // KM -> METERS
            $maxDistance:
              finalRadius * 1000,
          },
        },
      }).populate(
        "user",
        "_id name email"
      );

    // -------------------------------------------------
    // SOCKET EVENTS
    // -------------------------------------------------

    if (io) {
      // New alert
      io.emit(
        "new-ping",
        newPing
      );

      // Auto match
      if (
        nearbyMatches.length > 0
      ) {
        io.emit(
          "potential-match-found",
          {
            newPing,
            matchedPings:
              nearbyMatches,
          }
        );
      }
    }

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(201).json({
      success: true,

      message:
        "Alert successfully created.",

      ping: newPing,

      matchesFound:
        nearbyMatches.length,
    });
  } catch (error) {
    console.error(
      "❌ Create Ping Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Failed to create ping",
      details: error.message,
    });
  }
};

// =====================================================
// 2. GET NEARBY ACTIVE PINGS
// =====================================================

exports.getPingsNear = async (
  req,
  res
) => {
  try {
    const rawLat =
      req.query.lat ??
      req.query.latitude;

    const rawLng =
      req.query.lng ??
      req.query.longitude;

    const rawRadius =
      req.query.radius ??
      req.query.rad ??
      5;

    // -------------------------------------------------
    // PARSE
    // -------------------------------------------------

    const lat = Number(rawLat);
    const lng = Number(rawLng);
    const radius = Number(rawRadius);

    // -------------------------------------------------
    // VALIDATE
    // -------------------------------------------------

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Valid latitude and longitude are required.",
      });
    }

    if (
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Latitude or longitude is out of range.",
      });
    }

    const finalRadius =
      Number.isFinite(radius) &&
      radius > 0
        ? radius
        : 5;

    // -------------------------------------------------
    // SEARCH
    // -------------------------------------------------

    console.log(
      "🔎 Searching nearby pings:",
      {
        lat,
        lng,
        radiusKm: finalRadius,
      }
    );

    const pings =
      await Ping.find({
        status: "ACTIVE",

        expiresAt: {
          $gt: new Date(),
        },

        location: {
          $near: {
            $geometry: {
              type: "Point",

              // IMPORTANT:
              // longitude first
              coordinates: [
                lng,
                lat,
              ],
            },

            // KM -> METERS
            $maxDistance:
              finalRadius * 1000,
          },
        },
      })
        .populate(
          "user",
          "_id name email"
        )
        .sort({
          createdAt: -1,
        });

    console.log(
      `📍 ${pings.length} nearby pings found`
    );

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.status(200).json(
      pings
    );
  } catch (error) {
    console.error(
      "❌ getPingsNear Error:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Failed to fetch nearby alerts",
      details:
        error.message,
    });
  }
};

// =====================================================
// 3. DELETE PING
// =====================================================

exports.deletePing = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    const deletedPing =
      await Ping.findByIdAndDelete(
        id
      );

    if (!deletedPing) {
      return res.status(404).json({
        success: false,
        message:
          "Alert nahi mila.",
      });
    }

    const io =
      req.app.get("io");

    if (io) {
      io.emit(
        "ping-deleted",
        {
          pingId: id,
        }
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "Alert sabhi jagah se delete ho gaya.",
    });
  } catch (error) {
    console.error(
      "❌ Delete Ping Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Server error during delete.",
      details:
        error.message,
    });
  }
};