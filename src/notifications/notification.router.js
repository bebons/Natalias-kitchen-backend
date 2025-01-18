const express = require("express");
const {
  getNotifications,
  markNotificationsAsRead,
} = require("./notifications.controller");
const verifyUserToken = require("../middleware/verifyUserToken");

const router = express.Router();

// GET ruta za preuzimanje notifikacija
router.get("/unread-notifications", verifyUserToken, getNotifications);
router.post(
  "/mark-notifications-as-read",
  verifyUserToken,
  markNotificationsAsRead
);
module.exports = router;
