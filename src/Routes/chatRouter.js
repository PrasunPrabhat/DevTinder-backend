const express = require("express");
const { userAuth } = require("../Middlewares/authMiddleware");
const ChatModel = require("../models/ChatDB");

const chatRouter = express.Router();

// GET chats between logged-in user and target user
chatRouter.get("/chat/:targetUserId", userAuth, async (req, res) => {
  try {
    const senderId = req.user._id;
    const targetUserId = req.params.targetUserId;

    const chats = await ChatModel.find({
      participants: { $all: [senderId, targetUserId] },
    }).populate("messages.senderId", "firstName lastName photoUrl");

    // Merge all messages across all chat docs
    const allMessages = chats.flatMap((c) => c.messages);

    // Sort by createdAt
    allMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.status(200).json({ messages: allMessages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});
module.exports = chatRouter;
