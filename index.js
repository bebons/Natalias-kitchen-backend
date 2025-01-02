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
      "https://natalias-kitchen-frontend-wel9.vercel.app",
    ],
    credentials: true,
  })
);

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
// const serviceAccount = require(path.join(
//   __dirname,
//   "./config/firebase-adminsdk.json"
// ));

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// Routes
const foodRoutes = require("./src/food/food.router");
const orderRoutes = require("./src/orders/order.route");
const userRoutes = require("./src/users/user.route");
const imgUploadRoute = require("./src/imgUpload/img.route");
app.use("/api/food", foodRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/upload", imgUploadRoute);

// Delete user route

// app.delete("/delete-user/:uid", async (req, res) => {
//   const uid = req.params.uid;

//   try {
//     // Delete user from Firebase Auth
//     await admin.auth().deleteUser(uid);
//     res.status(200).send(`User with UID ${uid} has been successfully deleted.`);
//   } catch (error) {
//     console.error("Error deleting user:", error);
//     res.status(500).send("Error deleting user");
//   }
// });

main();

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
