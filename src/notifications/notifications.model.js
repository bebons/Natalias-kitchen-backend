// models/Notification.js (Node.js + Mongoose)
const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // ID korisnika koji treba da primi obavestenje
  message: String, // Tekst obavestenja
  read: { type: Boolean, default: false }, // Da li je obavestenje procitano
  createdAt: { type: Date, default: Date.now },
});

Notification = mongoose.model("Notification", NotificationSchema);
module.exports = Notification;
