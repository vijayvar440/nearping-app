const Claim = require("../models/Claim");
const Ping = require("../models/Ping");
const User = require("../models/User");

// 📐 Helper: Distance Calculator (Haversine Formula in KM)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in KM

  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// =====================================================
// 1. SUBMIT CLAIM
// =====================================================

exports.submitClaim = async (req, res) => {
  try {
    const {
      pingId,
      finderAnswer,
      finderContact,
      message,
      contactInfo,
      userId,
      user,
      lat,
      lng,
      latitude,
      longitude,
    } = req.body;

    const targetPingId = pingId || req.body.ping;

    const currentUserId =
      req.user?._id || userId || user;

    // -------------------------------------------------
    // 1. CHECK PING
    // -------------------------------------------------

    const ping = await Ping.findById(targetPingId);

    if (!ping) {
      return res.status(404).json({
        error: "Ping not found",
      });
    }

    // -------------------------------------------------
    // 2. CHECK CLAIM USER
    // -------------------------------------------------

    if (!currentUserId) {
      return res.status(401).json({
        error: "User not found",
      });
    }

    // -------------------------------------------------
    // 3. EXTRACT FINDER LOCATION
    // -------------------------------------------------

    let claimantLat = lat ?? latitude;
    let claimantLng = lng ?? longitude;

    // Agar request mein location nahi hai,
    // user profile se lastKnownLocation lo

    if (
      claimantLat === undefined ||
      claimantLng === undefined
    ) {
      const userDoc = await User.findById(currentUserId);

      if (
        userDoc?.lastKnownLocation?.coordinates?.length === 2
      ) {
        [claimantLng, claimantLat] =
          userDoc.lastKnownLocation.coordinates;
      }
    }

    // -------------------------------------------------
    // 4. LOCATION VERIFICATION
    // -------------------------------------------------

    if (
      claimantLat !== undefined &&
      claimantLng !== undefined &&
      ping.location?.coordinates?.length === 2
    ) {
      const [pingLng, pingLat] =
        ping.location.coordinates;

      const distance = calculateDistance(
        parseFloat(claimantLat),
        parseFloat(claimantLng),
        parseFloat(pingLat),
        parseFloat(pingLng)
      );

      // 15 KM LIMIT

      if (distance > 15) {
        return res.status(403).json({
          error: "Location Blocked",

          message: `Aap incident spot se ${distance.toFixed(
            1
          )}km door hain. Claim submit karne ke liye aapka 15km ki range mein hona zaroori hai.`,
        });
      }
    }

    // -------------------------------------------------
    // 5. PREVENT DUPLICATE CLAIM
    // -------------------------------------------------

    const existingClaim = await Claim.findOne({
      $or: [
        {
          pingId: targetPingId,
          user: currentUserId,
        },
        {
          ping: targetPingId,
          user: currentUserId,
        },
      ],
      status: {
        $in: ["PENDING", "ACCEPTED"],
      },
    });

    if (existingClaim) {
      return res.status(400).json({
        error: "You have already submitted a claim for this ping.",
      });
    }

    // -------------------------------------------------
    // 6. CREATE CLAIM
    // -------------------------------------------------

    const newClaim = new Claim({
      ping: targetPingId,
      pingId: targetPingId,

      user: currentUserId,

      finderAnswer:
        finderAnswer ||
        message ||
        "",

      finderContact:
        finderContact ||
        contactInfo ||
        "",

      status: "PENDING",
    });

    await newClaim.save();

    // -------------------------------------------------
    // 7. POPULATE FINDER INFORMATION
    // -------------------------------------------------

    const populatedClaim =
      await Claim.findById(newClaim._id)
        .populate(
          "user",
          "_id name email"
        );

    // -------------------------------------------------
    // 8. SOCKET.IO
    // -------------------------------------------------

    const io = req.app.get("io");

    if (io) {

      // -----------------------------------------------
      // A. EXISTING CLAIM EVENT
      // -----------------------------------------------

      io.emit(
        "new-claim",
        populatedClaim
      );

      // -----------------------------------------------
      // B. PING SPECIFIC EVENT
      // -----------------------------------------------

      io.emit(
        `new-claim-${targetPingId}`,
        populatedClaim
      );

      // -----------------------------------------------
      // C. OWNER SPECIFIC NOTIFICATION
      // -----------------------------------------------

      if (ping.user) {

        const ownerId =
          ping.user.toString();

        io.emit(
          `new-claim-owner-${ownerId}`,
          {
            type: "NEW_CLAIM",

            message:
              "Someone found your lost item.",

            pingId:
              targetPingId,

            claimId:
              newClaim._id,

            claim:
              populatedClaim,
          }
        );
      }
    }

    // -------------------------------------------------
    // 9. RESPONSE
    // -------------------------------------------------

    return res.status(201).json({
      success: true,

      message:
        "Claim submitted successfully.",

      claim:
        populatedClaim,
    });

  } catch (error) {

    console.error(
      "Submit Claim Error:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to submit claim",

      details:
        error.message,
    });
  }
};

// =====================================================
// 2. FETCH CLAIMS BY PING
// =====================================================

exports.getClaimsByPing = async (req, res) => {
  try {

    const { pingId } = req.params;

    const claims =
      await Claim.find({
        $or: [
          { pingId: pingId },
          { ping: pingId },
        ],
      })
        .populate(
          "user",
          "_id name email"
        )
        .sort({
          createdAt: -1,
        });

    return res.json(
      claims
    );

  } catch (error) {

    console.error(
      "Get Claims Error:",
      error
    );

    return res.status(500).json({
      error:
        "Error fetching claims",
    });
  }
};

// =====================================================
// 3. ACCEPT CLAIM
// =====================================================

exports.acceptClaim = async (req, res) => {
  try {

    const { claimId } =
      req.params;

    // -------------------------------------------------
    // FIND CLAIM
    // -------------------------------------------------

    const claim =
      await Claim.findById(
        claimId
      );

    if (!claim) {
      return res.status(404).json({
        error:
          "Claim not found",
      });
    }

    // -------------------------------------------------
    // ACCEPT CLAIM
    // -------------------------------------------------

    claim.status =
      "ACCEPTED";

    await claim.save();

    // -------------------------------------------------
    // FIND PING
    // -------------------------------------------------

    const targetPingId =
      claim.pingId ||
      claim.ping;

    const ping =
      await Ping.findByIdAndUpdate(
        targetPingId,

        {
          status:
            "RESOLVED",
        },

        {
          new: true,
        }
      );

    // -------------------------------------------------
    // SOCKET.IO
    // -------------------------------------------------

    const io =
      req.app.get("io");

    if (io) {

      // Ping resolved

      io.emit(
        "ping-resolved",
        {
          pingId:
            targetPingId,
        }
      );

      // Claim accepted

      io.emit(
        `claim-accepted-${claim._id}`,
        {
          ping,
          claim,
        }
      );

      // -----------------------------------------------
      // FINDER KO NOTIFICATION
      // -----------------------------------------------

      if (claim.user) {

        const finderId =
          claim.user.toString();

        io.emit(
          `claim-accepted-user-${finderId}`,
          {
            type:
              "CLAIM_ACCEPTED",

            message:
              "Your claim has been accepted by the owner.",

            pingId:
              targetPingId,

            claimId:
              claim._id,

            claim,
            ping,
          }
        );
      }
    }

    // -------------------------------------------------
    // RESPONSE
    // -------------------------------------------------

    return res.json({

      success: true,

      message:
        "Claim accepted and Ping resolved.",

      claim,

      ping,
    });

  } catch (error) {

    console.error(
      "Accept Claim Error:",
      error
    );

    return res.status(500).json({
      error:
        "Error accepting claim",
    });
  }
};