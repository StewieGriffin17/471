const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema({
  userId: String,
  message: String,
  reply: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
