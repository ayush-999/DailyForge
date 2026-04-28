const express = require("express");
const { authenticate } = require("../middleware/authMiddleware");
const { authLimiter, passwordResetLimiter } = require("../middleware/rateLimiter");
const {
  signUp,
  verifyEmail,
  signIn,
  signOut,
  refresh,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

router.post("/sign-up", authLimiter, signUp);
router.get("/verify-email", verifyEmail);        // GET — the link is clicked in email
router.post("/sign-in", authLimiter, signIn);
router.post("/sign-out", authenticate, signOut);
router.post("/refresh", refresh);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
