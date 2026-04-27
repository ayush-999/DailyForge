const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { PrismaClient } = require("../prisma/generated/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const {
  signUp,
  signIn,
  getUserInfo,
  getUserinfoById,
  verifyOTP,
} = require("../controllers/authController");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/signUp", signUp);
router.post("/signIn", signIn);
router.post("/verifyOTP", verifyOTP);
router.get("/getUser", protect, getUserInfo);
router.get("/getUserById/:id", getUserinfoById);

router.post(
  "/uploadProfileImage",
  protect,
  upload.single("profile_image"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const userId = req.user.id;
      const imageUrl = `${req.protocol}://${req.get("host")}/uploads/profile/${userId}/${req.file.filename}`;

      // Save path to the user's ID
      await prisma.user.update({
        where: { id: userId },
        data: { profile_image: imageUrl },
      });

      res
        .status(200)
        .json({ imageUrl, message: "Profile image uploaded successfully" });
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({ error: "Error saving profile image" });
    }
  },
);

router.post(
  "/uploadCoverImage",
  protect,
  upload.single("cover_image"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const userId = req.user.id;
      const imageUrl = `${req.protocol}://${req.get("host")}/uploads/cover/${userId}/${req.file.filename}`;

      // Save path to the user's ID
      await prisma.user.update({
        where: { id: userId },
        data: { cover_image: imageUrl },
      });

      res
        .status(200)
        .json({ imageUrl, message: "Cover image uploaded successfully" });
    } catch (error) {
      console.error("Error updating cover image:", error);
      res.status(500).json({ error: "Error saving cover image" });
    }
  },
);

module.exports = router;
