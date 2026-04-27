const { PrismaClient } = require("./prisma/generated/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const startCronJobs = () => {
  // Check every 1 minute
  setInterval(async () => {
    try {
      const result = await prisma.pendingUser.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(), // Any record where expiresAt is less than the current time
          },
        },
      });
      
      if (result.count > 0) {
        console.log(`[Cron] Cleaned up ${result.count} expired pending user(s).`);
      }
    } catch (error) {
      console.error("[Cron] Error cleaning up pending users:", error.message);
    }
  }, 60 * 1000); // 60,000 milliseconds = 1 minute
};

module.exports = startCronJobs;
