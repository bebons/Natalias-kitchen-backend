const express = require("express");
const multer = require("multer");
const path = require("path");
const verifyAdminToken = require("../middleware/verifyAdminToken");

const router = express.Router();

// Konfiguriši multer za čuvanje fajlova
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../../frontend/src/assets/food")); // Čuvaj slike u assets/food
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Jedinstvena imena fajlova
  },
});

const upload = multer({ storage });

// Ruta za upload
router.post("/", verifyAdminToken, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Slika nije poslata." });
  }

  const imageUrl = req.file.filename; // Putanja do slike
  res.status(200).json({ imageUrl }); // Vrati ime slike
});
module.exports = router;
