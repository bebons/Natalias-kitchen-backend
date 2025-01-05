const express = require("express");
const router = express.Router();
const {
  adminLogin,
  register,
  verifyEmail,
  finishRegistration,
  checkUserExistence,
  deleteUser,
} = require("./user.controller");

router.post("/admin", adminLogin);
router.post("/register", register);
router.get("/verify/:token", verifyEmail);
router.post("/finish-registration/:token", finishRegistration);
router.post("/check-user", checkUserExistence);
router.post("/delete-user", deleteUser);
module.exports = router;
