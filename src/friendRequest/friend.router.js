const express = require("express");
const verifyUserToken = require("../middleware/verifyUserToken");
const {
  friendRequest,
  checkFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  unfriend,
  checkFriendship,
} = require("./friend.controller");
const router = express.Router();
router.post("/friend-request", verifyUserToken, friendRequest);
router.post("/check-friend-request", verifyUserToken, checkFriendRequest);
router.get("/get-friend-requests", verifyUserToken, getFriendRequests);
router.post("/accept-friend-request", verifyUserToken, acceptFriendRequest);
router.post("/reject-friend-request", verifyUserToken, rejectFriendRequest);
router.get("/get-friends", verifyUserToken, getFriends);
router.post("/unfriend", verifyUserToken, unfriend);
router.post("/check-friendship", verifyUserToken, checkFriendship);
module.exports = router;
