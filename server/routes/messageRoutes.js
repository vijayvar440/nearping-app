const express = require("express");

const router = express.Router();

const {
  getMessages,
  sendMessage,
  markMessagesSeen,
  deleteMessage,
  getConversations,
} = require("../controllers/messageController");

const authMiddleware = require("../middleware/authMiddleware");

// =====================================================
// CONVERSATIONS
// IMPORTANT: /:userId SE PEHLE
// =====================================================

router.get(
  "/conversations",
  authMiddleware,
  getConversations
);

// =====================================================
// MESSAGE HISTORY
// =====================================================

router.get(
  "/:userId",
  authMiddleware,
  getMessages
);

// =====================================================
// SEND MESSAGE
// =====================================================

router.post(
  "/send/:userId",
  authMiddleware,
  sendMessage
);

// =====================================================
// MARK AS SEEN
// =====================================================

router.put(
  "/seen/:userId",
  authMiddleware,
  markMessagesSeen
);

// =====================================================
// DELETE MESSAGE
// =====================================================

router.delete(
  "/:messageId",
  authMiddleware,
  deleteMessage
);

module.exports = router;