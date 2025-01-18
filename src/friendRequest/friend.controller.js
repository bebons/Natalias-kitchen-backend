const all = require("../users/user.model");
const User = all.User;
const FriendRequest = require("./friend.model");
const Notification = require("../notifications/notifications.model");
const sendEmail = require("../middleware/sendEmail");

const checkFriendRequest = async (req, res) => {
  const senderEmail = req.user.email; // Email of the user who sends the request (from the token)
  const { receiverEmail } = req.body; // Email of the user receiving the request

  try {
    // Find the users (sender and receiver)
    const sender = await User.findOne({ email: senderEmail });
    const receiver = await User.findOne({ email: receiverEmail });

    // If either user is not found, return an error
    if (!sender || !receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if a friend request already exists (either pending, accepted, or rejected)
    const existingRequest = await FriendRequest.findOne({
      sender: sender._id,
      receiver: receiver._id,
      status: "pending",
    });
    const viceVersaRequest = await FriendRequest.findOne({
      sender: receiver._id,
      receiver: sender._id,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(200).json({ message: "Friend request exists" });
    } else if (viceVersaRequest) {
      return res.status(200).json({
        message: "Vice versa request",
        requestId: viceVersaRequest._id,
      });
    } else {
      return res.status(200).json({ message: "No friend request found" });
    }
  } catch (error) {
    console.error("Error checking friend request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const checkFriendship = async (req, res) => {
  const senderEmail = req.user.email; // Email of the user who sends the request (from the token)
  const { receiverEmail } = req.body;
  try {
    // Find the users (sender and receiver)
    const sender = await User.findOne({ email: senderEmail });
    const receiver = await User.findOne({ email: receiverEmail });

    // If either user is not found, return an error
    if (!sender || !receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    const friendship = await FriendRequest.findOne({
      sender: receiver._id,
      receiver: sender._id,
      status: "accepted",
    });

    const viceVersaFriendship = await FriendRequest.findOne({
      sender: sender._id,
      receiver: receiver._id,
      status: "accepted",
    });

    if (friendship || viceVersaFriendship) {
      return res.status(200).json({ message: "Friendship" });
    } else {
      return res.status(200).json({ message: "No friend friendship found" });
    }
  } catch (error) {
    console.error("Error checking friend request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const friendRequest = async (req, res) => {
  const { email } = req.body; // Email korisnika kome šaljemo zahtev
  const senderEmail = req.user.email; // Email korisnika koji šalje zahtev (iz tokena)

  try {
    // Pronađi korisnika koji šalje zahtev
    const sender = await User.findOne({ email: senderEmail });
    const receiver = await User.findOne({ email });

    // Proveri da li su korisnici pronađeni
    if (!sender || !receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    // Proveri da li je zahtev već poslat (ne možeš slati više od jednog zahteva)
    const existingRequest = await FriendRequest.findOne({
      sender: sender._id,
      receiver: receiver._id,
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Kreiraj novi prijateljski zahtev
    const newRequest = new FriendRequest({
      sender: sender._id,
      receiver: receiver._id,
      status: "pending", // Početni status je pending
    });

    await newRequest.save(); // Spasi zahtev u bazi
    await sendFriendRequestNotification(sender.email, receiver.email);

    res.status(200).json({ message: "Friend request sent" });
  } catch (error) {
    console.error("Error sending friend request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const sendFriendRequestNotification = async (senderEmail, receiverEmail) => {
  try {
    const receiver = await User.findOne({ email: receiverEmail });
    if (!receiver) return;
    const message = `You have received a friend request from ${senderEmail}`;
    const notification = new Notification({
      userId: receiver._id,
      message: message,
    });

    await notification.save(); // Save notification in DB
    await sendEmail(receiver.email, "New Friend Request", message);
    // Optionally, you can send an email or push notification here.
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

const acceptFriendRequest = async (req, res) => {
  const { requestId } = req.body;

  try {
    // Pronalaženje zahteva
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Pronalaženje sendera i receivera
    const [sender, receiver] = await Promise.all([
      User.findById(request.sender),
      User.findById(request.receiver),
    ]);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Sender or receiver not found" });
    }

    // Provera ovlašćenja korisnika
    if (receiver.email !== req.user.email) {
      return res
        .status(403)
        .json({ message: "You are not authorized to accept this request" });
    }

    // Ažuriranje liste prijatelja
    receiver.friends.push(sender._id);
    sender.friends.push(receiver._id);

    // Paralelno čuvanje podataka
    await Promise.all([receiver.save(), sender.save()]);

    // Ažuriranje statusa zahteva
    request.status = "accepted";
    await request.save();

    // Slanje notifikacije
    await acceptNotification(sender.email, receiver.email);

    res.json({ message: "Friend request accepted successfully" });
  } catch (err) {
    console.error("Error accepting friend request:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const acceptNotification = async (senderEmail, receiverEmail) => {
  try {
    const sender = await User.findOne({ email: senderEmail });
    if (!sender) return;

    const message = `${receiverEmail} accepted your friend request`;
    const notification = new Notification({
      userId: sender._id,
      message: message,
    });

    await Promise.all([
      notification.save(), // Sačuvaj notifikaciju
      sendEmail(sender.email, "Friend Request Accepted", message), // Pošalji email
    ]);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

const rejectFriendRequest = async (req, res) => {
  const { requestId } = req.body;

  try {
    // Pronalaženje zahteva
    const request = await FriendRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Pronalaženje sendera i receivera
    const [sender, receiver] = await Promise.all([
      User.findById(request.sender),
      User.findById(request.receiver),
    ]);

    if (!sender || !receiver) {
      return res.status(404).json({ message: "Sender or receiver not found" });
    }

    // Provera ovlašćenja korisnika
    const receiverEmail = receiver.email;
    if (receiverEmail !== req.user.email) {
      return res
        .status(403)
        .json({ message: "You are not authorized to reject this request" });
    }

    // Brisanje zahteva i slanje notifikacije
    await Promise.all([
      FriendRequest.deleteOne({ _id: requestId }),
      rejectNotification(sender.email, receiver.email),
    ]);

    res.json({ message: "Friend request declined" });
  } catch (err) {
    console.error("Error declining friend request:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const rejectNotification = async (senderEmail, receiverEmail) => {
  try {
    const sender = await User.findOne({ email: senderEmail });
    if (!sender) return;

    const message = `${receiverEmail} rejected your friend request`;
    const notification = new Notification({
      userId: sender._id,
      message: message,
    });

    await Promise.all([
      notification.save(), // Sačuvaj notifikaciju
      sendEmail(sender.email, "Rejection", message), // Pošalji email
    ]);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

const getFriendRequests = async (req, res) => {
  try {
    const email = req.user.email;
    const user = await User.findOne({ email });
    const userId = user._id;
    // Proveravamo da li postoje pending zahtevi za prijateljstvo za korisnika
    const friendRequests = await FriendRequest.find({
      receiver: userId,
      status: "pending",
    })
      .populate("sender", "name email profilePicture") // Popunjavamo podatke o pošiljaocu
      .sort({ createdAt: -1 }); // Sortiramo po datumu kreiranja (najnoviji prvo)

    // Vraćamo zahteve klijentu
    res.status(200).json({
      success: true,
      requests: friendRequests,
    });
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    res.status(500).json({ message: "Server error" });
  }
};
const getFriends = async (req, res) => {
  const email = req.user.email;
  const user = await User.findOne({ email });
  const userId = user._id;

  // Prikazujemo sve prihvaćene prijatelje
  const friends = await FriendRequest.find({
    $or: [{ receiver: userId }, { sender: userId }],
    status: "accepted",
  })
    .populate("receiver sender", "name email profilePicture")
    .exec();
  const friendList = friends.map((friendship) => {
    if (friendship.receiver._id.equals(userId)) {
      return friendship.sender;
    } else {
      return friendship.receiver;
    }
  });
  res.status(200).json({ friends: friendList });
};

const unfriend = async (req, res) => {
  try {
    const { friendId } = req.body;
    const email = req.user.email;
    const user = await User.findOne({ email });
    if (!friendId) {
      return res.status(400).json({ message: "Friend ID is required." });
    }
    const friend = await User.findById(friendId);
    if (!friend) {
      return res.status(404).json({ message: "Friend not found." });
    }
    const userId = user._id;
    // Brisanje prijateljstva
    await FriendRequest.deleteOne({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId },
      ],
      status: "accepted",
    });
    await unfriendNotification(email, friend.email);
    res.status(200).json({ message: "Unfriended successfully." });
  } catch (error) {
    console.error("Error unfriending:", error);
    res.status(500).json({ message: "Server error." });
  }
};

const unfriendNotification = async (senderEmail, receiverEmail) => {
  try {
    const receiver = await User.findOne({ email: receiverEmail });
    if (!receiver) return;
    const message = `${senderEmail} and you are not friends anymore`;
    const notification = new Notification({
      userId: receiver._id,
      message: message,
    });

    await Promise.all([
      notification.save(), // Sačuvaj notifikaciju
      sendEmail(receiver.email, "You have been unfriended", message), // Pošalji email
    ]);
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

module.exports = {
  friendRequest,
  checkFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  unfriend,
  checkFriendship,
};
