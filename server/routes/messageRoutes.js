const express = require("express");

const router = express.Router();

const {
  getMessages,
  sendMessage,
  markMessagesSeen,
  deleteMessage,
} = require("../controllers/messageController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/:userId", authMiddleware, getMessages);

router.post("/send/:userId", authMiddleware, sendMessage);

router.put("/seen/:userId", authMiddleware, markMessagesSeen);

router.delete("/:messageId", authMiddleware, deleteMessage);

module.exports = router;