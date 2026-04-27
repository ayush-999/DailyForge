const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const userId = req.user ? req.user.id : "unknown";
    let dir = "uploads/";

    if (file.fieldname === "profile_image") {
      dir = path.join("uploads", "profile", String(userId));
    } else if (file.fieldname === "cover_image") {
      dir = path.join("uploads", "cover", String(userId));
    }

    // Ensure directory exists
    fs.mkdirSync(dir, { recursive: true });

    cb(null, dir); // Directory to save uploaded files
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname); // Unique filename
  },
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only JPEG, PNG, and JPG are allowed."),
      false,
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
});

module.exports = upload;
