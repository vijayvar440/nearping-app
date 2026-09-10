const express = require("express");
const router = express.Router();
const { createPing, getPingsNear, deletePing } = require("../controllers/pingController");

// GET /api/pings/near
router.get("/near", getPingsNear);

// POST /api/pings
router.post("/", createPing);

// DELETE /api/pings/:id 👈 YEH NAYA ADD KAREIN
router.delete("/:id", deletePing);

module.exports = router;