const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const admin = require("firebase-admin");
require("dotenv").config(); // Make sure you load the environment variables

const port = process.env.PORT || 5000;

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://natalias-kitchen-frontend.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors());
app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://natalias-kitchen-frontend.vercel.app"
  ); // Dodaj domen sa kog šalješ zahtev
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});
// MongoDB connection
async function main() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Mongodb connected");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
}

// Firebase Admin SDK initialization using the environment variable

// Routes
const foodRoutes = require("./src/food/food.router");
const orderRoutes = require("./src/orders/order.route");
const userRoutes = require("./src/users/user.route");
const imgUploadRoute = require("./src/imgUpload/img.route");
const { User } = require("./src/users/user.model");
app.use("/api/food", foodRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/upload", imgUploadRoute);

// Delete user route
// const serviceAccount = require(path.join(
//   __dirname,
//   "./config/firebase-adminsdk.json"
// ));

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// app.delete("/delete-user/:uid", async (req, res) => {
//   const uid = req.params.uid;

//   try {
//     // Delete user from Firebase Auth
//     const user = await admin.auth().getUser(uid);
//     const email = user.email;

//     await admin.auth().deleteUser(uid);

//     await User.deleteOne({ email: email });

//     res
//       .status(200)
//       .send(
//         `User with UID ${uid} and EMAIL ${email} has been successfully deleted.`
//       );
//   } catch (error) {
//     console.error("Error deleting user:", error);
//     res.status(500).send("Error deleting user");
//   }
// });

// async function deleteAllUsers() {
//   try {
//     // Dohvata do 1000 korisnika u jednom pozivu
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

main();

app.get("/", (req, res) => {
  res.send("Just do it king");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
