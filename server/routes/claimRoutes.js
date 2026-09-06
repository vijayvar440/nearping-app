const express = require("express");
const router = express.Router();
const claimController = require("../controllers/claimController");

// Routes
router.post("/submit", claimController.submitClaim);
router.get("/ping/:pingId", claimController.getClaimsByPing);

// Accept endpoints (Dono URL formats supported)
router.patch("/:claimId/accept", claimController.acceptClaim);
router.put("/accept/:claimId", claimController.acceptClaim);

module.exports = router;