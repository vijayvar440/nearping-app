const express = require("express");

const router = express.Router();

const {
  getMessages,
  sendMessage,
  markMessagesSeen,
} = require("../controllers/messageController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/:userId", authMiddleware, getMessages);

router.post("/send/:userId", authMiddleware, sendMessage);

router.put("/seen/:userId", authMiddleware, markMessagesSeen);

module.exports = router;