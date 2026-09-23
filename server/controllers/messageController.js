const Message = require("../models/Message");
const Claim = require("../models/Claim");
const Ping = require("../models/Ping");
const User = require("../models/User");
const isValidId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/*
=========================================================
GET CHAT
GET /api/messages/:userId
=========================================================
*/
const getMessages = async (req, res) => {
  try {
    const currentUserId =
      req.user?.userId || req.user?._id;

    const otherUserId = req.params.userId;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Login required",
      });
    }

    if (!isValidId(otherUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const messages = await Message.find({
      $or: [
        {
          sender: currentUserId,
          receiver: otherUserId,
        },
        {
          sender: otherUserId,
          receiver: currentUserId,
        },
      ],
    })
      .sort({ createdAt: 1 })
      .populate(
        "sender",
        "_id name email"
      )
      .populate(
        "receiver",
        "_id name email"
      );

    return res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error(
      "GET MESSAGES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Messages fetch nahi ho paye",
    });
  }
};


/*
=========================================================
SEND MESSAGE
POST /api/messages/send/:userId
=========================================================
*/
const sendMessage = async (req, res) => {
  try {
    const currentUserId =
      req.user?.userId || req.user?._id;

    const receiverId =
      req.params.userId;

    const {
      message,
      claimId,
    } = req.body;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Login required",
      });
    }

    if (!isValidId(receiverId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid receiver ID",
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Message empty nahi ho sakta",
      });
    }

    /*
    =====================================================
    CLAIM VALIDATION
    =====================================================
    */

    if (!claimId) {
      return res.status(400).json({
        success: false,
        message:
          "Claim ID required",
      });
    }

    if (!isValidId(claimId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid claim ID",
      });
    }

    const claim =
      await Claim.findById(
        claimId
      ).populate("ping");

    if (!claim) {
      return res.status(404).json({
        success: false,
        message:
          "Claim nahi mila",
      });
    }

    if (claim.status !== "ACCEPTED") {
      return res.status(403).json({
        success: false,
        message:
          "Claim accept hone ke baad hi chat available hogi",
      });
    }

    /*
    =====================================================
    OWNER / FINDER
    =====================================================
    */

    const ownerId =
      claim.ping?.user
        ? String(claim.ping.user)
        : null;

    const finderId =
      claim.user
        ? String(claim.user)
        : null;

    const senderId =
      String(currentUserId);

    const targetId =
      String(receiverId);

    /*
    =====================================================
    ONLY OWNER <-> FINDER ALLOWED
    =====================================================
    */

    const validConnection =
      (
        senderId === ownerId &&
        targetId === finderId
      ) ||
      (
        senderId === finderId &&
        targetId === ownerId
      );

    if (!validConnection) {
      return res.status(403).json({
        success: false,
        message:
          "Aap is claim chat ka part nahi hain",
      });
    }

    /*
    =====================================================
    CREATE MESSAGE
    =====================================================
    */

    const newMessage =
      await Message.create({
        sender: currentUserId,
        receiver: receiverId,
        message: message.trim(),
        claimId: claimId,
      });

    /*
    =====================================================
    POPULATE MESSAGE
    =====================================================
    */

    const populatedMessage =
      await Message.findById(
        newMessage._id
      )
        .populate(
          "sender",
          "_id name email"
        )
        .populate(
          "receiver",
          "_id name email"
        );

    /*
    =====================================================
    REAL-TIME SOCKET
    =====================================================
    */

    const io =
      req.app.get("io");

    if (io) {
      io.to(
        `user:${receiverId}`
      ).emit(
        "claim-chat-message",
        populatedMessage
      );
    }

    /*
    =====================================================
    RESPONSE
    =====================================================
    */

    return res.status(201).json({
      success: true,
      message: "Message sent",
      newMessage:
        populatedMessage,
    });

  } catch (error) {
    console.error(
      "SEND MESSAGE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Message send nahi ho paya",
    });
  }
};


/*
=========================================================
MARK MESSAGES SEEN
PUT /api/messages/seen/:userId
=========================================================
*/
const markMessagesSeen = async (
  req,
  res
) => {
  try {
    const currentUserId =
      req.user?.userId ||
      req.user?._id;

    const otherUserId =
      req.params.userId;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message:
          "Login required",
      });
    }

    if (!isValidId(otherUserId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: currentUserId,
        seen: false,
      },
      {
        $set: {
          seen: true,
        },
      }
    );

    return res.json({
      success: true,
    });

  } catch (error) {
    console.error(
      "SEEN MESSAGE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Messages seen update nahi ho paye",
    });
  }
};


/*
=========================================================
DELETE MESSAGE
DELETE /api/messages/:messageId
=========================================================
*/
const deleteMessage = async (
  req,
  res
) => {
  try {
    const currentUserId =
      req.user?.userId ||
      req.user?._id;

    const messageId =
      req.params.messageId;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message:
          "Login required",
      });
    }

    if (!isValidId(messageId)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid message ID",
      });
    }

    const message =
      await Message.findById(
        messageId
      );

    if (!message) {
      return res.status(404).json({
        success: false,
        message:
          "Message nahi mila",
      });
    }

    /*
    =====================================================
    ONLY SENDER CAN DELETE
    =====================================================
    */

    if (
      String(message.sender) !==
      String(currentUserId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Aap sirf apna message delete kar sakte hain",
      });
    }

    /*
    =====================================================
    DELETE FROM DATABASE
    =====================================================
    */

    await Message.findByIdAndDelete(
      messageId
    );

    /*
    =====================================================
    REAL-TIME DELETE
    =====================================================
    */

    const io =
      req.app.get("io");

    if (io) {
      io.to(
        `user:${message.receiver}`
      ).emit(
        "claim-chat-message-deleted",
        {
          messageId:
            message._id,
        }
      );
    }

    return res.json({
      success: true,
      message:
        "Message deleted",
      messageId:
        message._id,
    });

  } catch (error) {
    console.error(
      "DELETE MESSAGE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Message delete nahi ho paya",
    });
  }
};

// =====================================================
// GET MESSAGE HISTORY / CONVERSATIONS
// =====================================================

const getConversations = async (req, res) => {
  try {
    const currentUserId =
      req.user?.userId || req.user?._id;

    if (!currentUserId) {
      return res.status(401).json({
        message: "User authentication required.",
      });
    }

    const claims = await Claim.find({
      status: "ACCEPTED",
      $or: [
        { user: currentUserId },
        {
          ping: {
            $in: await Ping.find({
              user: currentUserId,
            }).distinct("_id"),
          },
        },
      ],
    })
      .populate("user", "name email phone")
      .populate(
        "ping",
        "title type description user"
      )
      .sort({ updatedAt: -1 });

    const conversations = [];

    for (const claim of claims) {
      if (!claim.ping) continue;

      const ownerId = claim.ping.user
        ? String(claim.ping.user)
        : null;

      const finderId = claim.user
        ? String(
            claim.user._id || claim.user
          )
        : null;

      if (!ownerId || !finderId) continue;

      const isOwner =
        String(currentUserId) === ownerId;

      const otherUserId = isOwner
        ? finderId
        : ownerId;

      const otherUser = isOwner
        ? claim.user
        : await User.findById(otherUserId)
            .select("name email phone");

      const lastMessage =
        await Message.findOne({
          $or: [
            {
              sender: currentUserId,
              receiver: otherUserId,
            },
            {
              sender: otherUserId,
              receiver: currentUserId,
            },
          ],
          claimId: claim._id,
        })
          .sort({ createdAt: -1 })
          .select(
            "message sender receiver createdAt seen"
          );

      conversations.push({
        claimId: claim._id,
        pingId: claim.ping._id,
        itemTitle: claim.ping.title,
        claimStatus: claim.status,
        otherUser,
        lastMessage,
      });
    }

    return res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error(
      "Get conversations error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch message history.",
    });
  }
};




module.exports = {
  getMessages,
  sendMessage,
  markMessagesSeen,
  deleteMessage,
  getConversations,
};