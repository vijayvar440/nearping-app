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
    } = req.body;

    // =================================================
    // GET LATITUDE
    // =================================================

    const rawLat =
      lat ??
      latitude ??
      location?.lat ??
      location?.latitude ??
      location?.coordinates?.[1];

    // =================================================
    // GET LONGITUDE
    // =================================================

    const rawLng =
      lng ??
      longitude ??
      location?.lng ??
      location?.longitude ??
      location?.coordinates?.[0];

    const parsedLat = Number(rawLat);
    const parsedLng = Number(rawLng);

    // =================================================
    // VALIDATE LOCATION
    // =================================================

    if (
      !Number.isFinite(parsedLat) ||
      !Number.isFinite(parsedLng)
    ) {
      return res.status(400).json({
        success: false,
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
        message:
          "Latitude or longitude is out of range.",
      });
    }

    // =================================================
    // GEOJSON
    //
    // IMPORTANT:
    // longitude FIRST
    // latitude SECOND
    // =================================================

    const formattedLocation = {
      type: "Point",
      coordinates: [
        parsedLng,
        parsedLat,
      ],
    };

    // =================================================
    // BROADCAST RADIUS
    // KM
    // =================================================

    let finalRadius =
      Number(broadcastRadius);

    if (
      !Number.isFinite(finalRadius) ||
      finalRadius <= 0
    ) {
      finalRadius = 5;
    }

    // Maximum 50 KM
    finalRadius = Math.min(
      finalRadius,
      50
    );

    // =================================================
    // EXPIRY
    // =================================================

    let finalExpiryHours =
      Number(expiryHours);

    if (
      !Number.isFinite(
        finalExpiryHours
      ) ||
      finalExpiryHours <= 0
    ) {
      finalExpiryHours = 24;
    }

    // Maximum 7 days
    finalExpiryHours = Math.min(
      finalExpiryHours,
      168
    );

    const expiresAt = new Date(
      Date.now() +
        finalExpiryHours *
          60 *
          60 *
          1000
    );

    // =================================================
    // USER ID
    // =================================================

    const currentUserId =
      req.user?.userId ||
      req.user?._id ||
      null;

    // =================================================
    // CREATE PING
    // =================================================

    const newPing = new Ping({
      title: title?.trim(),
      type:
        type || "LOST",

      description:
        description?.trim() || "",

      landmark:
        landmark?.trim() || "",

      contactInfo:
        contactInfo?.trim() || "",

      secretQuestion:
        secretQuestion?.trim() || "",

      location:
        formattedLocation,

      broadcastRadius:
        finalRadius,

      expiresAt,

      user:
        currentUserId,

      status: "ACTIVE",
    });

    await newPing.save();

    // =================================================
    // LOG
    // =================================================

    console.log(
      "===================================="
    );

    console.log(
      "✅ NEW PING CREATED"
    );

    console.log(
      "🆔 Ping ID:",
      newPing._id.toString()
    );

    console.log(
      "📍 Latitude:",
      parsedLat
    );

    console.log(
      "📍 Longitude:",
      parsedLng
    );

    console.log(
      "📡 Radius:",
      finalRadius,
      "KM"
    );

    console.log(
      "⏰ Expiry:",
      expiresAt
    );

    console.log(
      "===================================="
    );

    // =================================================
    // SOCKET
    // =================================================

    const io =
      req.app.get("io");

    if (io) {
      // Realtime new alert
      io.emit(
        "new-ping",
        newPing
      );

      console.log(
        "📡 new-ping emitted"
      );
    }

    // =================================================
    // AUTO MATCH
    // =================================================

    const currentType =
      String(type || "LOST")
        .toUpperCase();

    const targetType =
      currentType === "LOST"
        ? "FOUND"
        : currentType === "FOUND"
        ? "LOST"
        : null;

    let nearbyMatches = [];

    if (targetType) {
      nearbyMatches =
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

              $maxDistance:
                finalRadius * 1000,
            },
          },
        }).populate(
          "user",
          "_id name email"
        );
    }

    // =================================================
    // MATCH SOCKET
    // =================================================

    if (
      io &&
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

    // =================================================
    // RESPONSE
    // =================================================

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

      message:
        "Failed to create alert.",

      error:
        error.message,
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

    const lat = Number(rawLat);
    const lng = Number(rawLng);
    const radius = Number(
      rawRadius
    );

    // =================================================
    // VALIDATE
    // =================================================

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return res.status(400).json({
        success: false,
        message:
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
        message:
          "Latitude or longitude is invalid.",
      });
    }

    let finalRadius =
      Number.isFinite(radius) &&
      radius > 0
        ? radius
        : 5;

    // Maximum search radius 50 KM
    finalRadius = Math.min(
      finalRadius,
      50
    );

    // =================================================
    // SEARCH
    // =================================================

    console.log(
      "===================================="
    );

    console.log(
      "🔎 NEARBY PING SEARCH"
    );

    console.log(
      "📍 Latitude:",
      lat
    );

    console.log(
      "📍 Longitude:",
      lng
    );

    console.log(
      "📡 Radius:",
      finalRadius,
      "KM"
    );

    console.log(
      "===================================="
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
              // longitude FIRST
              coordinates: [
                lng,
                lat,
              ],
            },

            // KM → METERS
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
      "📍 Nearby pings found:",
      pings.length
    );

    // =================================================
    // RESPONSE
    // =================================================

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

      message:
        "Failed to fetch nearby alerts.",

      error:
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

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Alert ID is required.",
      });
    }

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

    // =================================================
    // SOCKET
    // =================================================

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

    console.log(
      "🗑️ Ping deleted:",
      id
    );

    return res.status(200).json({
      success: true,

      message:
        "Alert successfully deleted.",
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

      error:
        error.message,
    });
  }
};