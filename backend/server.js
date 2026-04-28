require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const adminRoutes = require("./routes/adminRoutes");
const startCronJobs = require("./cron");

const app = express();

app.set("trust proxy", 1); // trust first proxy so req.ip is the real client IP

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

startCronJobs();

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("[Unhandled]", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));
