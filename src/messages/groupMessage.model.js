const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: { type: String },
  file: { type: String }, // Optional field for file attachments
  createdAt: { type: Date, default: Date.now },
  readBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // References the users who have read the message
    },
  ],
  isRead: {
    type: Boolean,
  },
});

const GroupMessage = mongoose.model("GroupMessage", messageSchema);

module.exports = GroupMessage;
