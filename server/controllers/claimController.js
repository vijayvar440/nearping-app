const Claim = require("../models/Claim");
const Ping = require("../models/Ping");

// 1. Submit a new Claim
exports.submitClaim = async (req, res) => {
  try {
    const { pingId, finderAnswer, finderContact } = req.body;

    const ping = await Ping.findById(pingId);
    if (!ping) return res.status(404).json({ error: "Ping not found" });

    const newClaim = new Claim({ pingId, finderAnswer, finderContact });
    await newClaim.save();

    const io = req.app.get("io");
    if (io) io.emit(`new-claim-${pingId}`, newClaim);

    res.status(201).json({ success: true, message: "Claim submitted!", claim: newClaim });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit claim" });
  }
};

// 2. Fetch claims for a specific Ping
exports.getClaimsByPing = async (req, res) => {
  try {
    const claims = await Claim.find({ pingId: req.params.pingId }).sort({ createdAt: -1 });
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: "Error fetching claims" });
  }
};

// 3. Accept a Claim & Resolve Ping
exports.acceptClaim = async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.claimId);
    if (!claim) return res.status(404).json({ error: "Claim not found" });

    claim.status = "ACCEPTED";
    await claim.save();

    const ping = await Ping.findByIdAndUpdate(
      claim.pingId,
      { status: "RESOLVED" },
      { new: true }
    );

    const io = req.app.get("io");
    if (io) {
      io.emit(`claim-accepted-${claim._id}`, { ping, claim });
      io.emit("ping-resolved", { pingId: ping._id });
    }

    res.json({ success: true, message: "Claim accepted and Ping resolved", claim, ping });
  } catch (error) {
    res.status(500).json({ error: "Error accepting claim" });
  }
};