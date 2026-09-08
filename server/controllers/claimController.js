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

// 1. SUBMIT CLAIM (With Location Verification)
exports.submitClaim = async (req, res) => {
  try {
    const { pingId, finderAnswer, finderContact, message, contactInfo, userId, user, lat, lng, latitude, longitude } = req.body;
    const targetPingId = pingId || req.body.ping;
    const currentUserId = req.user?._id || userId || user;

    // 1. Check Ping Existence
    const ping = await Ping.findById(targetPingId);
    if (!ping) return res.status(404).json({ error: "Ping not found" });

    // 2. Extract Claimant Coordinates
    let claimantLat = lat ?? latitude;
    let claimantLng = lng ?? longitude;

    // Agar body mein coordinates nahi aaye, toh User Profile (`lastKnownLocation`) se uthao
    if (claimantLat === undefined || claimantLng === undefined) {
      const userDoc = await User.findById(currentUserId);
      if (userDoc?.lastKnownLocation?.coordinates?.length === 2) {
        [claimantLng, claimantLat] = userDoc.lastKnownLocation.coordinates;
      }
    }

    // 3. Proximity Fraud Verification (15 KM Limit)
    if (claimantLat !== undefined && claimantLng !== undefined && ping.location?.coordinates?.length === 2) {
      const [pingLng, pingLat] = ping.location.coordinates;
      const distance = calculateDistance(
        parseFloat(claimantLat),
        parseFloat(claimantLng),
        parseFloat(pingLat),
        parseFloat(pingLng)
      );

      // 🚨 Block claim if user is > 15km away
      if (distance > 15) {
        return res.status(403).json({
          error: "Location Blocked",
          message: `Aap incident spot se ${distance.toFixed(1)}km door hain. Claim submit karne ke liye aapka 15km ki range mein hona zaroori hai.`,
        });
      }
    }

    // 4. Save Verified Claim
    const newClaim = new Claim({
      ping: targetPingId,
      pingId: targetPingId,
      user: currentUserId,
      finderAnswer: finderAnswer || message || "",
      finderContact: finderContact || contactInfo || "",
    });

    await newClaim.save();
    const populatedClaim = await Claim.findById(newClaim._id).populate("user", "_id name email");

    // Realtime Notification Trigger
    const io = req.app.get("io");
    if (io) {
      io.emit("new-claim", populatedClaim);
      io.emit(`new-claim-${targetPingId}`, populatedClaim);
    }

    return res.status(201).json({ success: true, claim: populatedClaim });
  } catch (error) {
    console.error("Submit Claim Error:", error);
    return res.status(500).json({ error: "Failed to submit claim", details: error.message });
  }
};

// 2. FETCH CLAIMS
exports.getClaimsByPing = async (req, res) => {
  try {
    const { pingId } = req.params;
    const claims = await Claim.find({
      $or: [{ pingId: pingId }, { ping: pingId }]
    })
      .populate("user", "_id name email")
      .sort({ createdAt: -1 });

    return res.json(claims);
  } catch (error) {
    console.error("Get Claims Error:", error);
    return res.status(500).json({ error: "Error fetching claims" });
  }
};

// 3. ACCEPT CLAIM
exports.acceptClaim = async (req, res) => {
  try {
    const { claimId } = req.params;
    const claim = await Claim.findById(claimId);
    if (!claim) return res.status(404).json({ error: "Claim not found" });

    claim.status = "ACCEPTED";
    await claim.save();

    const targetPingId = claim.pingId || claim.ping;
    const ping = await Ping.findByIdAndUpdate(
      targetPingId,
      { status: "RESOLVED" },
      { new: true }
    );

    const io = req.app.get("io");
    if (io) {
      io.emit("ping-resolved", { pingId: targetPingId });
      io.emit(`claim-accepted-${claim._id}`, { ping, claim });
    }

    return res.json({ success: true, message: "Claim accepted and Ping resolved", claim, ping });
  } catch (error) {
    console.error("Accept Claim Error:", error);
    return res.status(500).json({ error: "Error accepting claim" });
  }
};