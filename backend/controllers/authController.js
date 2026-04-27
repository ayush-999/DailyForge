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

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
      },
    });

    res.status(201).json({
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
      .json({ message: "Error registering user", error: error.message });
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

// Get User Info
exports.getUserInfo = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        account_status: true,
        profile_image: true,
        cover_image: true,
        gender: true,
        dob: true,
        phone: true,
        website: true,
        bio: true,
        is_verified: true,
        is_featured: true,
        following: true,
        followers: true,
        ranking: true,
        ranking_date: true,
        address: true,
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
      .json({ message: "Error fetching user info", error: error.message });
  }
};

// Get User By ID
exports.getUserinfoById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        account_status: true,
        profile_image: true,
        cover_image: true,
        gender: true,
        dob: true,
        phone: true,
        website: true,
        bio: true,
        is_verified: true,
        is_featured: true,
        following: true,
        followers: true,
        ranking: true,
        ranking_date: true,
        address: true,
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

