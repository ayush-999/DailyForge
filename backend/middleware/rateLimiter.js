const rateLimit = require("express-rate-limit");

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many requests from this IP, please try again in 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

exports.passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many password reset requests, please try again in 1 hour" },
  standardHeaders: true,
  legacyHeaders: false,
});
