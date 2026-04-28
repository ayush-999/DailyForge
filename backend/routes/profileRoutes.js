const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const {
  getProfile,
  updateProfile,
  changePassword,
  requestEmailChange,
  verifyEmailChange,
  listSessions,
  revokeSession,
  deleteAccount,
} = require("../controllers/profileController");

const router = express.Router();

router.use(authenticate); // every profile route requires a valid session

router.get("/", getProfile);
router.put("/", updateProfile);
router.post("/change-password", changePassword);
router.post("/change-email", requestEmailChange);
router.get("/verify-email-change", verifyEmailChange);
router.get("/sessions", listSessions);
router.delete("/sessions/:sessionId", revokeSession);
router.delete("/account", deleteAccount);

module.exports = router;
