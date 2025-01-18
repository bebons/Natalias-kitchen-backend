const { User } = require("../users/user.model");
const Notification = require("./notifications.model");

const getNotifications = async (req, res) => {
  try {
    const email = req.user.email; // Preuzmite email korisnika iz tokena
    // Pronađi korisnika na osnovu email-a
    const user = await User.findOne({ email }); // Dodato `await` za asinhrono pozivanje
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userId = user._id; // Preuzmi MongoDB ID korisnika

    // Pronađi nepročitane notifikacije za korisnika
    const unreadNotifications = await Notification.countDocuments({
      userId: userId,
      read: false, // Samo nepročitane
    });
    res.status(200).json({
      hasUnread: unreadNotifications > 0, // Da li ima nepročitanih notifikacija
      unreadCount: unreadNotifications, // Ukupan broj nepročitanih notifikacija
    });
  } catch (error) {
    console.error("Error checking unread notifications:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const markNotificationsAsRead = async (req, res) => {
  try {
    const email = req.user.email; // Korisnikov email iz tokena
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ažuriraj sve nepročitane notifikacije za tog korisnika
    await Notification.updateMany(
      { userId: user._id, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: "Notifications marked as read" });
  } catch (err) {
    console.error("Error marking notifications as read:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getNotifications, markNotificationsAsRead };
