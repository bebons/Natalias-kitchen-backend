const express = require("express");
const {
  postFood,
  getAllFood,
  getSingleFood,
  updateFood,
  deleteFood,
} = require("./food.controllers");
const verifyAdminToken = require("../middleware/verifyAdminToken");
const router = express.Router();
router.post("/add-food", verifyAdminToken, postFood);
router.get("/", getAllFood);
router.get("/:id", getSingleFood);
router.put("/edit/:id", verifyAdminToken, updateFood);
router.delete("/:id", verifyAdminToken, deleteFood);
module.exports = router;
