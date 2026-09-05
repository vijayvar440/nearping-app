const express = require("express");
const router = express.Router();
const claimController = require("../controllers/claimController");

// Clean Routes
router.post("/submit", claimController.submitClaim);
router.get("/ping/:pingId", claimController.getClaimsByPing);
router.patch("/:claimId/accept", claimController.acceptClaim);

module.exports = router;