const express = require("express");
const {
  getPrivateMessages,
  unreadMessages,
  getGroupMessages,
  unreadGroupMessages,
  getSingleMessage,
  deleteMessage,
} = require("./message.controller");

const router = express.Router();

// Middleware to ensure the user is authenticated
const verifyUserToken = require("../middleware/verifyUserToken");

// Get private messages between the logged-in user and a specific user
router.get("/get/:id", verifyUserToken, getPrivateMessages);

router.get("/unread", verifyUserToken, unreadMessages);

router.get("/get-group-messages", verifyUserToken, getGroupMessages);

router.get("/unread-group-messages", verifyUserToken, getGroupMessages);

router.get("/get-single-message/:id", verifyUserToken, getSingleMessage);

router.delete("/delete-message/:id", verifyUserToken, deleteMessage);

module.exports = router;
