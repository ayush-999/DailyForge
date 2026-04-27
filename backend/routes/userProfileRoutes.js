const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getUserProfile,
  updateUserProfile,
} = require("../controllers/userProfileController");

const router = express.Router();

router.get("/getUserProfile", protect, getUserProfile);
router.put("/updateUserProfile", protect, updateUserProfile);

module.exports = router;
