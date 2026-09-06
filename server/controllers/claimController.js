const Claim = require("../models/Claim");
const Ping = require("../models/Ping");

// 1. Submit Claim
exports.submitClaim = async (req, res) => {
  try {
    const { pingId, finderAnswer, finderContact, message, contactInfo, userId, user } = req.body;
    const targetPingId = pingId || req.body.ping;

    const ping = await Ping.findById(targetPingId);
    if (!ping) return res.status(404).json({ error: "Ping not found" });

    const newClaim = new Claim({
      ping: targetPingId,
      pingId: targetPingId,
      user: req.user?._id || userId || user,
      finderAnswer: finderAnswer || message || "",
      finderContact: finderContact || contactInfo || "",
    });

    await newClaim.save();
    const populatedClaim = await Claim.findById(newClaim._id).populate("user", "_id name email");

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

// 2. Fetch Claims by Ping ID
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

// 3. Accept Claim & Auto-Resolve Ping
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