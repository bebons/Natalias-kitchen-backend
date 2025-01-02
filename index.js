const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const admin = require("firebase-admin");

require("dotenv").config();

const port = process.env.PORT || 5000;

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://natalias-kitchen-frontend-wel9.vercel.app",
    ], // Zameni sa frontend URL-om u produkciji
    credentials: true,
  })
);

// Define routes
const foodRoutes = require("./src/food/food.router");
const orderRoutes = require("./src/orders/order.route");
const userRoutes = require("./src/users/user.route");
const imgUploadRoute = require("./src/imgUpload/img.route");
app.use("/api/food", foodRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/auth", userRoutes);
app.use("/api/upload", imgUploadRoute); // Dodaj rutu za upload

// Serve frontend
// app.use(express.static(path.join(__dirname, "frontend/build")));
// app.get("/*", (req, res) => {
//   res.sendFile(path.join(__dirname, "frontend/build", "index.html"));
// });

// Connect to MongoDB
async function main() {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Mongodb connected");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1); // Prekini server ako se ne poveže
  }
}

// Start server

// Inicijalizacija Firebase Admin SDK
// const serviceAccount = require("../adminSDKfirebase.json"); // Putanja do preuzetog JSON fajla

// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// // Middleware za parsiranje JSON-a

// // Ruta za brisanje korisnika
// app.delete("/delete-user/:uid", async (req, res) => {
//   const uid = req.params.uid;

//   try {
//     // Poziva funkciju za brisanje korisnika iz Firebase Auth
//     await admin.auth().deleteUser(uid);
//     res.status(200).send(`Korisnik sa UID ${uid} je uspešno obrisan.`);
//   } catch (error) {
//     console.error("Greška pri brisanju korisnika:", error);
//     res.status(500).send("Greška pri brisanju korisnika");
//   }
// });

main();
app.listen(port, () => {
  console.log(`Server is running on: port ${port}`);
});
