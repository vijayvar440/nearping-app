const express = require("express");
const router = express.Router();
const { createPing, getPingsNear } = require("../controllers/pingController");

// GET /api/pings/near
router.get("/near", getPingsNear);

// POST /api/pings
router.post("/", createPing);

module.exports = router;