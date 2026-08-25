const express = require("express");
const router = express.Router();
const { createPing, getNearbyPings } = require("../controllers/pingController");

router.post("/create", createPing);
router.get("/nearby", getNearbyPings);

module.exports = router;