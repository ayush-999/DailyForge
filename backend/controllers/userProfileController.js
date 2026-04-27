const { PrismaClient } = require("../prisma/generated/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// @desc    Get logged in user profile
// @route   GET /api/v1/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        address: true,
        social_media: true,
        achievements: true,
        rating: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Omit sensitive data
    delete user.password;

    res.status(200).json(user);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching user profile", error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const { fullName, gender, dob, phone, website, bio } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullName: fullName !== undefined ? fullName : undefined,
        gender: gender !== undefined ? Number(gender) : undefined,
        dob: dob !== undefined ? new Date(dob) : undefined,
        phone: phone !== undefined ? phone : undefined,
        website: website !== undefined ? website : undefined,
        bio: bio !== undefined ? bio : undefined,
      },
    });

    // Omit sensitive data
    delete updatedUser.password;

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating user profile", error: error.message });
  }
};
