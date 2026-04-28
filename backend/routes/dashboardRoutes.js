const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getDashboardData } = require("../controllers/dashboardController");

const router = express.Router();

// All routes in this file are protected by default
router.get("/getData", protect, getDashboardData);

module.exports = router;
