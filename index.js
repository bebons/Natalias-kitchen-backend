const { Server } = require("socket.io");
const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
require("dotenv").config(); // Load environment variables
const { auth } = require("firebase-admin");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// Express and HTTP setup
const app = express();
const server = http.createServer(app);

// CORS Configuration
const corsOptions = {
  origin: [
    "http://localhost:5173", // Localhost for development
    "https://natalias-kitchen-frontend.vercel.app", // Vercel URL for production
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow credentials (cookies, tokens)
};

app.use(cors(corsOptions)); // Apply CORS globally

// Socket.IO setup
const io = new Server(server, {
  cors: corsOptions,
});

// Store online users
const userSocketMap = {}; // { userId: socketId }
let usersInChat = {}; // Ovdje ćemo pratiti ko je u četu sa kojim korisnicima
let usersInGroupChat = [];
io.on("connection", async (socket) => {
  const token = socket.handshake.auth.token; // Dobijanje tokena iz handshake-a
  if (!token) {
    socket.disconnect(); // Ako nema tokena, isključi korisnika
    return;
  }
  let userId; // Sačuvaj userId ovde
  try {
    const decodedToken = await auth().verifyIdToken(token);
    console.log("A user connected", socket.id);
    userId = socket.handshake.query.userId;

    if (userId) {
      console.log("This is the logged-in user:", userId);
      userSocketMap[userId] = socket.id; // Mapiraš korisnika sa njegovim socket ID-om
      console.log(userSocketMap);
      // Obeležavanje poruka kao "primljene" za korisnika
      await Message.updateMany(
        { receiverId: userId, status: "sent" },
        { $set: { status: "received" } }
      );

      // Fetch the updated messages
      const updatedMessages = await Message.find({
        receiverId: userId,
        status: "received",
      });

      // Get the IDs of the updated messages
      const updatedMessageIds = updatedMessages.map((msg) => msg._id);
      socket.broadcast.emit("messagesMarkedAsReceived", updatedMessageIds);
      io.emit("getOnlineUsers", Object.keys(userSocketMap));
    } else {
      console.log("No userId found in query, the user is not logged in");
    }
    // Emitovanje online korisnika svim povezanim korisnicima (ako je potrebno)
  } catch (error) {
    console.error("Error verifying Firebase token:", error);
    socket.disconnect(); // Ako token nije validan, isključi korisnika
  }
  // Emit the list of online users to all connected clients
  socket.on("onlineUsers", () => {
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
  socket.on("userLeftChat", (data) => {
    const { chatUserId, currentUserId } = data;
    // Uklanjamo korisnika iz liste
    if (usersInChat[chatUserId]) {
      usersInChat[chatUserId] = usersInChat[chatUserId].filter(
        (userId) => userId !== currentUserId
      );
    }
    console.log(`User ${currentUserId} left chat with ${chatUserId}`);
  });
  socket.on("checkIfUserInChat", (data, callback) => {
    const { chatUserId, currentUserId } = data;
    // Proveravamo da li je korisnik u chatu sa chatUserId
    const isInChat = usersInChat[chatUserId]?.includes(currentUserId) || false;
    callback(isInChat); // Vraćamo odgovor klijentu
  });
  socket.on("newMessage", async (messageData) => {
    const { text, file, receiverId, senderId } = messageData;
    let newMessage;
    try {
      let imageUrl;
      if (file) {
        console.log(file);
        // If the file is a Buffer, upload it to Cloudinary
        if (Buffer.isBuffer(file)) {
          const fileName = `${file.name}`; // Ovo je primer formiranja imena fajla (možete koristiti bilo koji format)
          // Wrap Cloudinary upload in a Promise
          imageUrl = await new Promise((resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                {
                  resource_type: "auto",
                  public_id: fileName, // Definišemo ime fajla
                }, // Automatically detect file type (image, video, etc.)
                (error, result) => {
                  if (error) {
                    reject("Error uploading file to Cloudinary: " + error);
                  } else {
                    resolve(result.secure_url); // Return the secure URL after upload
                  }
                }
              )
              .end(file); // Pass the Buffer to Cloudinary
          });
        }
      }
      console.log(imageUrl);
      // Kreiramo novu poruku u bazi
      newMessage = new Message({
        senderId,
        receiverId,
        text,
        file: imageUrl, // Ako postoji fajl, čuvamo URL ili fajl
      });
      // Čuvamo poruku u bazi podataka
      await newMessage.save();
      // Emitujemo poruku drugom korisniku ako je online
      const receiverSocketId = getReceiverSocketId(receiverId);
      if (receiverSocketId) {
        console.log("delivered", receiverId, receiverSocketId);
        io.to(receiverSocketId).emit("messageSent", newMessage); // Pošaljemo poruku primaocu
        newMessage.status = "delivered";
      } else {
        newMessage.status = "sent";
      }
      await newMessage.save();
    } catch (error) {
      if (newMessage) {
        newMessage.status = "failed";
        await newMessage.save();
      }
      console.error("Error sending new message:", error);
      socket.emit("messageError", { error: "Failed to send message." });
    }
  });
  socket.on("userInChat", async (senderId) => {
    const receiverId = userId;
    // Dodajemo korisnika u chat listu
    if (!usersInChat[senderId]) {
      usersInChat[senderId] = [];
    }
    if (!usersInChat[senderId].includes(userId)) {
      usersInChat[senderId].push(userId);
    }
    try {
      await Message.updateMany(
        {
          receiverId,
          senderId,
          status: { $ne: "read" }, // Status nije "read"
        },
        { $set: { status: "read" } }
      );
      const senderSocketId = getReceiverSocketId(senderId);
      socket.emit("messageNumberUpdated", { senderId, receiverId });
      console.log(senderId, senderSocketId);
      if (senderSocketId) {
        console.log("ima socketId");
        io.to(senderSocketId).emit("messageStatusUpdated", {
          senderId,
          receiverId,
        }); // Pošaljemo poruku primaocu
      } else {
        console.log("nema senderSocketId");
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);

    // Uklanjanje korisnika iz userSocketMap
    delete userSocketMap[userId];

    // Uklanjanje korisnika iz usersInChat
    Object.keys(usersInChat).forEach((chatUserId) => {
      usersInChat[chatUserId] = usersInChat[chatUserId].filter(
        (id) => id !== userId
      );
      if (usersInChat[chatUserId].length === 0) {
        delete usersInChat[chatUserId];
      }
    });

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
  socket.on("checkIfOnline", (userId, callback) => {
    if (userSocketMap[userId]) {
      callback(true); // Ako je online
    } else {
      callback(false); // Ako nije online
    }
  });
  socket.on("newGroupMessage", async (messageData) => {
    const { text, file, senderId } = messageData;
    let newMessage;
    try {
      console.log(usersInGroupChat);
      const otherGroupUsers = usersInGroupChat.filter((id) => id !== userId);
      const allUsers = await User.countDocuments();
      const count = allUsers - 1;
      const isRead = otherGroupUsers.length === count;
      let imageUrl;
      if (file) {
        if (Buffer.isBuffer(file)) {
          const fileName = `${file.name}`; // Ovo je primer formiranja imena fajla (možete koristiti bilo koji format)
          // Wrap Cloudinary upload in a Promise
          imageUrl = await new Promise((resolve, reject) => {
            cloudinary.uploader
              .upload_stream(
                {
                  resource_type: "auto",
                  public_id: fileName, // Definišemo ime fajla
                }, // Automatically detect file type (image, video, etc.)
                (error, result) => {
                  if (error) {
                    reject("Error uploading file to Cloudinary: " + error);
                  } else {
                    resolve(result.secure_url); // Return the secure URL after upload
                  }
                }
              )
              .end(file); // Pass the Buffer to Cloudinary
          });
        }
      }
      console.log(isRead, count, otherGroupUsers.length);
      newMessage = new GroupMessage({
        senderId,
        text,
        file: imageUrl, // Ako postoji fajl, čuvamo URL ili fajl
        readBy: otherGroupUsers,
        isRead,
      });
      // Čuvamo poruku u bazi podataka
      await newMessage.save();
      // Emitujemo poruku drugom korisniku ako je online
      io.emit("groupMessageSent", newMessage);
    } catch (error) {
      if (newMessage) {
        newMessage.status = "failed";
        await newMessage.save();
      }
      console.error("Error sending new message:", error);
      socket.emit("messageError", { error: "Failed to send message." });
    }
  });
  socket.on("userInGroupChat", async () => {
    try {
      if (!usersInGroupChat.includes(userId)) {
        usersInGroupChat.push(userId);
      }
      console.log(usersInGroupChat);
      // Prvo ažuriramo poruke da dodamo korisnika u `readBy`
      await GroupMessage.updateMany(
        {
          senderId: { $ne: userId }, // Messages not sent by the user
          readBy: { $ne: userId }, // Messages the user hasn't read
        },
        {
          $push: { readBy: userId }, // Add the user to the `readBy` array
        }
      );

      // Zatim dohvati sve ažurirane poruke
      const updatedMessages = await GroupMessage.find({
        senderId: { $ne: userId },
        readBy: { $in: [userId] }, // Poruke koje je korisnik upravo pročitao
      });

      // Dohvati sve korisnike
      const allUsers = await User.find({}); // Pretpostavlja se da su svi korisnici članovi grupe
      const count = allUsers.length - 1;
      // Provera da li je `readBy` niza za svaku poruku jednak broju korisnika
      const messagesWithAllRead = updatedMessages.filter(
        (message) => message.readBy.length === count
      );

      if (messagesWithAllRead.length > 0) {
        // Ažuriraj `isRead` na `true` za sve poruke gde su svi korisnici pročitali
        await Promise.all(
          messagesWithAllRead.map((message) =>
            GroupMessage.updateOne(
              { _id: message._id }, // Pronađi poruku po njenom ID-u
              { $set: { isRead: true } } // Postavi `isRead` na true
            )
          )
        );

        console.log("Ažurirane poruke sa isRead: true");
      }

      // Možete da uradite nešto sa `messagesWithAllRead`, npr.:
      console.log(
        `Broj poruka koje su svi korisnici pročitali: ${messagesWithAllRead.length}`
      );
      io.emit("groupMessagesUpdated");
      console.log(`Updated messages for user ${userId}`);
    } catch (error) {
      console.error("Error updating messages:", error);
    }
  });
  socket.on("userLeftGroupChat", () => {
    console.log("hej");
    if (usersInGroupChat.includes(userId)) {
      usersInGroupChat = usersInGroupChat.filter((item) => item !== userId);
    }
    console.log(usersInGroupChat);
  });
  socket.on("editMessage", async (messageData) => {
    const { id, text, file, senderId, receiverId } = messageData;

    try {
      // Find the message by its ID and update it
      const message = await Message.findById(id);

      if (message) {
        let imageUrl;
        if (file) {
          console.log(file);
          // If the file is a Buffer, upload it to Cloudinary
          if (Buffer.isBuffer(file)) {
            const fileName = `${file.name}`; // Ovo je primer formiranja imena fajla (možete koristiti bilo koji format)
            // Wrap Cloudinary upload in a Promise
            imageUrl = await new Promise((resolve, reject) => {
              cloudinary.uploader
                .upload_stream(
                  {
                    resource_type: "auto",
                    public_id: fileName, // Definišemo ime fajla
                  }, // Automatically detect file type (image, video, etc.)
                  (error, result) => {
                    if (error) {
                      reject("Error uploading file to Cloudinary: " + error);
                    } else {
                      resolve(result.secure_url); // Return the secure URL after upload
                    }
                  }
                )
                .end(file); // Pass the Buffer to Cloudinary
            });
          }
        }
        // Update the message text and file
        message.text = text || message.text;
        message.file = imageUrl;
        message.isEdited = true;

        // Save the updated message
        await message.save();

        // Emit the updated message to the relevant users (sender and receiver)
        console.log(`Message with ID ${id} has been updated.`);
      } else {
        console.error(`Message with ID ${id} not found.`);
      }
    } catch (error) {
      console.error("Error editing message:", error);
    }
  });
});
// Function to retrieve the socket ID for a given userId
function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}
// MongoDB connection
async function main() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
}

// Middleware for static file serving and CORS
app.use(express.json());

// Serving profile image from 'uploads' directory
// app.get("/api/auth/get-profile-image", (req, res) => {
//   const imagePath = path.join(__dirname, "uploads", "profile-image.jpg"); // Update this path to your image location
//   res.sendFile(imagePath);
// });

// Serve static files from the 'uploads' folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error log:", err.message);
  res.status(err.status || 500).json({ message: err.message });
});

// Routes
const foodRoutes = require("./src/food/food.router");
const orderRoutes = require("./src/orders/order.route");
const userRoutes = require("./src/users/user.route");
const imgUploadRoute = require("./src/imgUpload/img.route");
const friendsRoute = require("./src/friendRequest/friend.router");
const notificationsRoute = require("./src/notifications/notification.router");
const messagesRoute = require("./src/messages/message.router");
const Message = require("./src/messages/message.model");
const GroupMessage = require("./src/messages/groupMessage.model");
const { User } = require("./src/users/user.model");
const { ideahub } = require("googleapis/build/src/apis/ideahub");

app.use("/api/food", foodRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/upload", imgUploadRoute);
app.use("/api/friends", friendsRoute);
app.use("/api/notifications", notificationsRoute);
app.use("/api/messages", messagesRoute);

// Initialize database connection
main();

// Default route
app.get("/", (req, res) => {
  res.send("Just do it king");
});

// Server listen
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});

// // Delete user route
//const { User } = require("./src/users/user.model");
// const serviceAccount = require(path.join(
//   __dirname,
//   "./config/firebase-adminsdk.json"
// ));

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });A

// async function deleteAllUsers() {
//   try {
//     // Dohvata do 1000 korisnika u jednom pozivu
//     await User.deleteMany({});
//     const listUsersResult = await admin.auth().listUsers(1000);
//     const userIds = listUsersResult.users.map((user) => user.uid);

//     if (userIds.length > 0) {
//       // Brisanje korisnika
//       await admin.auth().deleteUsers(userIds);
//       console.log(`${userIds.length} korisnika uspešno obrisano.`);
//     } else {
//       console.log("Nema korisnika za brisanje.");
//     }

//     // Rekurzivni poziv ako ima više korisnika
//     if (listUsersResult.pageToken) {
//       deleteAllUsers(listUsersResult.pageToken);
//     }
//   } catch (error) {
//     console.error("Greška prilikom brisanja korisnika:", error);
//   }
// }

// // Pozivanje funkcije
// deleteAllUsers();
// const uploadsFolder = path.join(__dirname, 'uploads');

// // Function to delete all files in the uploads folder
// function deleteAllFilesInUploads() {
//   fs.readdir(uploadsFolder, (err, files) => {
//     if (err) {
//       console.error('Greška prilikom čitanja fajlova u uploads folderu:', err);
//       return;
//     }

//     // Iterating over each file and deleting it
//     files.forEach((file) => {
//       const filePath = path.join(uploadsFolder, file);
//       fs.unlink(filePath, (err) => {
//         if (err) {
//           console.error(`Greška prilikom brisanja fajla ${file}:`, err);
//         } else {
//           console.log(`Fajl ${file} uspešno obrisan.`);
//         }
//       });
//     });
//   });
// }

// // Call the function to delete all files
// deleteAllFilesInUploads();
