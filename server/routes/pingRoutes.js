const express = require("express");
const router = express.Router();
const pingController = require("../controllers/pingController");

// Create alert
router.post("/create", pingController.createPing);

router.get("/near", pingController.getNearbyPings);
router.get("/nearby", pingController.getNearbyPings);

module.exports = router;