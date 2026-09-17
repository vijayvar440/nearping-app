const mongoose = require("mongoose");
const Message = require("../models/Message");
const Claim = require("../models/Claim");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/*
  GET CHAT
  /api/messages/:userId
*/
const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user?._id;
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
      .populate("sender", "_id name email")
      .populate("receiver", "_id name email");

    return res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Messages fetch nahi ho paye",
    });
  }
};

/*
  SEND MESSAGE
  /api/messages/send/:userId
*/
const sendMessage = async (req, res) => {
  try {
    const currentUserId = req.user?._id;
    const receiverId = req.params.userId;
    const { message, claimId } = req.body;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Login required",
      });
    }

    if (!isValidId(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid receiver ID",
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message empty nahi ho sakta",
      });
    }

    /*
      Chat sirf ACCEPTED claim ke baad allowed hai.
    */
    if (claimId) {
      if (!isValidId(claimId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid claim ID",
        });
      }

      const claim = await Claim.findById(claimId).populate("ping");

      if (!claim) {
        return res.status(404).json({
          success: false,
          message: "Claim nahi mila",
        });
      }

      if (claim.status !== "ACCEPTED") {
        return res.status(403).json({
          success: false,
          message: "Claim accept hone ke baad hi chat available hogi",
        });
      }

      const ownerId = claim.ping?.user
        ? String(claim.ping.user)
        : null;

      const finderId = claim.user
        ? String(claim.user)
        : null;

      const senderId = String(currentUserId);
      const targetId = String(receiverId);

      const validConnection =
        (senderId === ownerId && targetId === finderId) ||
        (senderId === finderId && targetId === ownerId);

      if (!validConnection) {
        return res.status(403).json({
          success: false,
          message: "Aap is claim chat ka part nahi hain",
        });
      }
    }

    const newMessage = await Message.create({
      sender: currentUserId,
      receiver: receiverId,
      message: message.trim(),
      claimId: claimId || null,
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "_id name email")
      .populate("receiver", "_id name email");

    /*
      Real-time message
    */
    const io = req.app.get("io");

    if (io) {
      io.to(`user:${receiverId}`).emit(
        "claim-chat-message",
        populatedMessage
      );
    }

    return res.status(201).json({
      success: true,
      message: "Message sent",
      newMessage: populatedMessage,
    });
  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Message send nahi ho paya",
    });
  }
};

/*
  MARK MESSAGES SEEN
  PUT /api/messages/seen/:userId
*/
const markMessagesSeen = async (req, res) => {
  try {
    const currentUserId = req.user?._id;
    const otherUserId = req.params.userId;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Login required",
      });
    }

    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: currentUserId,
        seen: false,
      },
      {
        $set: { seen: true },
      }
    );

    return res.json({
      success: true,
    });
  } catch (error) {
    console.error("SEEN MESSAGE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Messages seen update nahi ho paye",
    });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  markMessagesSeen,
};