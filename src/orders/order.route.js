const express = require("express");
const { createAOrder, getOrderByEmail } = require("./order.controller");
const verifyUserToken = require("../middleware/verifyUserToken");
const router = express.Router();
router.post("/", verifyUserToken, createAOrder);
router.get("/email/:email", verifyUserToken, getOrderByEmail);
module.exports = router;
