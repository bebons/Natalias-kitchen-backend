const express = require("express");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const {
  adminLogin,
  register,
  verifyEmail,
  finishRegistration,
  checkUserExistence,
  deleteUser,
  getAllUsers,
  updateName,
  updateImage,
  getProfileImage,
  getUserData,
} = require("./user.controller");
const verifyUserToken = require("../middleware/verifyUserToken");
const verifyAdminToken = require("../middleware/verifyAdminToken");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../../uploads")); // Folder za slike
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Dodaj timestamp u ime fajla
  },
});

const upload = multer({ storage });

router.post("/admin", adminLogin);
router.post("/register", register);
router.get("/verify/:token", verifyEmail);
router.post("/finish-registration/:token", finishRegistration);
router.post("/check-user", checkUserExistence);
router.post("/delete-user", verifyUserToken, deleteUser);
router.get("/get-all-users", verifyUserToken, getAllUsers);
router.patch("/update-name", verifyUserToken, updateName);
router.get("/get-user-data", verifyUserToken, getUserData);
router.post(
  "/update-image",
  verifyUserToken,
  upload.single("image"),
  updateImage
);
router.get("/get-profile-image", verifyUserToken, getProfileImage);
module.exports = router;
