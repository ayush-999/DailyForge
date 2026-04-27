const { PrismaClient } = require("../prisma/generated/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

// Register
exports.signUp = async (req, res) => {
  const { fullName, email, password } = req.body;

  // Validation: Check for missing fields
  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert into PendingUser to overwrite if they try again
    await prisma.pendingUser.upsert({
      where: { email },
      update: { fullName, password: hashedPassword, otp, expiresAt },
      create: { fullName, email, password: hashedPassword, otp, expiresAt },
    });

    if (process.env.NODE_ENV === "production") {
      // TODO: Implement actual email sending logic here
      console.log(`Sending OTP ${otp} to ${email} via email service...`);
    } else {
      const fs = require("fs");
      const path = require("path");
      const logPath = path.join(__dirname, "../logs/otp-code.log");
      // Ensure logs directory exists
      if (!fs.existsSync(path.dirname(logPath))) {
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
      }
      fs.appendFileSync(
        logPath,
        `Email: ${email}, OTP: ${otp}, Expires: ${expiresAt}\n`,
      );
    }

    res.status(200).json({
      message: "Verification OTP sent successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    const pendingUser = await prisma.pendingUser.findUnique({
      where: { email },
    });

    if (!pendingUser) {
      return res
        .status(400)
        .json({ error: "No pending registration found for this email" });
    }

    if (pendingUser.otp !== otp) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (new Date() > pendingUser.expiresAt) {
      return res.status(400).json({ error: "OTP has expired" });
    }

    // OTP is valid, create the user
    const user = await prisma.user.create({
      data: {
        fullName: pendingUser.fullName,
        email: pendingUser.email,
        password: pendingUser.password,
        is_verified: true,
        account_status: 1, // Active
      },
    });

    // Delete the pending record
    await prisma.pendingUser.delete({ where: { email } });

    // Clean up log file in development
    if (process.env.NODE_ENV !== "production") {
      const fs = require("fs");
      const path = require("path");
      const logPath = path.join(__dirname, "../logs/otp-code.log");
      if (fs.existsSync(logPath)) {
        // Clear the file
        fs.writeFileSync(logPath, "");
      }
    }

    res.status(201).json({
      id: user.id,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
      token: generateToken(user.id),
      message: "Account verified and created successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error verifying OTP", error: error.message });
  }
};

// Login
exports.signIn = async (req, res) => {
  const { email, password } = req.body;

  // Validation: Check for missing fields
  if (!email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    res.status(200).json({
      id: user.id,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
      token: generateToken(user.id),
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error logging in user", error: error.message });
  }
};

// Get Users Info (Public Access)
exports.getUsersInfo = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        account_status: true,
        profile_image: true,
        cover_image: true,
        gender: true,
        website: true,
        bio: true,
        is_verified: true,
        is_featured: true,
        following: true,
        followers: true,
        ranking: true,
        ranking_date: true,
        rating: true,
        social_media: true,
        achievements: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!users) {
      return res.status(404).json({ error: "Users not found" });
    }
    res.status(200).json(users);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching users info", error: error.message });
  }
};

// Get User By ID  (Public Access)
exports.getUserInfoById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format to prevent Prisma 500 errors
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        account_status: true,
        profile_image: true,
        cover_image: true,
        gender: true,
        website: true,
        bio: true,
        is_verified: true,
        is_featured: true,
        following: true,
        followers: true,
        ranking: true,
        ranking_date: true,
        rating: true,
        social_media: true,
        achievements: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user", error: error.message });
  }
};

// Logout
exports.signOut = async (req, res) => {
  try {
    // Since we use stateless JWTs without cookies, the client must discard the token.
    // This route serves to provide a clean termination point and can be extended
    // with token blacklisting in the future if needed.
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error logging out", error: error.message });
  }
};
