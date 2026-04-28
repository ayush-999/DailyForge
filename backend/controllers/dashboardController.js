const { PrismaClient } = require("../prisma/generated/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// Get dashboard overview data
exports.getDashboardData = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        profile_image: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // You can add more dashboard metrics here
    // For example: todos count, upcoming tasks, etc.
    const stats = {
      totalTodos: 0, // Update with actual count
      completedTodos: 0,
      upcomingTasks: 0,
    };

    res.status(200).json({
      success: true,
      data: {
        user,
        stats,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
