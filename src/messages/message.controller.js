const Message = require("./message.model");
const { User } = require("../users/user.model");
const GroupMessages = require("./groupMessage.model");

const getSingleMessage = async (req, res) => {
  try {
    const { id } = req.params; // ID poruke iz URL parametara
    const loggedInUserEmail = req.user.email; // Email trenutno prijavljenog korisnika
    const loggedInUser = await User.findOne({ email: loggedInUserEmail });

    if (!loggedInUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const myId = loggedInUser._id;

    // Pronađi poruku na osnovu ID-a
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }
    // Provera da li je polje `isRead` true
    const isMessageRead = message.status === "read";
    // Odgovor sa porukom i statusom `isRead`
    res.status(200).json(isMessageRead);
  } catch (error) {
    console.log("Error in getSingleMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
const getPrivateMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const loggedInUserEmail = req.user.email;
    const loggedInUser = await User.findOne({ email: loggedInUserEmail });
    const myId = loggedInUser._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
const unreadMessages = async (req, res) => {
  try {
    const loggedInUserEmail = req.user.email;
    const loggedInUser = await User.findOne({ email: loggedInUserEmail });
    const receiverId = loggedInUser._id;

    // Broji nepročitane poruke za svakog korisnika
    const separateUnreadMessagesCount = await Message.aggregate([
      { $match: { receiverId, status: { $ne: "read" } } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
    ]);

    const totalUnreadMessages = separateUnreadMessagesCount.reduce(
      (total, item) => total + item.count,
      0
    );

    res.status(200).json({
      separateUnreadMessagesCount,
      totalUnreadMessages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch unread messages count" });
  }
};
const getGroupMessages = async (req, res) => {
  try {
    const loggedInUserEmail = req.user.email;
    const loggedInUser = await User.findOne({ email: loggedInUserEmail });
    const myId = loggedInUser._id;

    const messages = await GroupMessages.find({});
    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
const unreadGroupMessages = async (req, res) => {
  try {
    const loggedInUserEmail = req.user.email;
    const loggedInUser = await User.findOne({ email: loggedInUserEmail });
    const myId = loggedInUser._id;
    // Broji nepročitane poruke za svakog korisnika
    const unreadMessages = await GroupMessages.find({
      readBy: { $ne: myId },
      senderId: { $ne: myId }, // Exclude messages sent by you
    }).sort({ createdAt: 1 }); // Sort by creation time if needed
    const unreadMessageCount = await GroupMessages.countDocuments({
      readBy: { $ne: myId },
      senderId: { $ne: myId }, // Exclude messages sent by you
    });
    res.status(200).json({
      unreadMessages,
      unreadMessageCount,
    });
  } catch (error) {
    console.error("Error fetching unread group messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread messages. Please try again.",
    });
  }
};
const deleteMessage = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Message ID is required" });
  }

  try {
    const deletedMessage = await Message.findByIdAndDelete(id);

    if (!deletedMessage) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.status(200).json({ message: "Message successfully deleted" });
  } catch (error) {
    console.error("Error in deleteMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getPrivateMessages,
  unreadMessages,
  getGroupMessages,
  unreadGroupMessages,
  getSingleMessage,
  deleteMessage,
};
