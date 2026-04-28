const prisma = require("./lib/prisma");

const startCronJobs = () => {
  setInterval(async () => {
    try {
      const now = new Date();

      const regs = await prisma.pendingRegistration.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      if (regs.count > 0)
        console.log(`[Cron] Removed ${regs.count} expired registration(s)`);

      const sessions = await prisma.session.deleteMany({
        where: { expiresAt: { lt: now } },
      });
      if (sessions.count > 0)
        console.log(`[Cron] Removed ${sessions.count} expired session(s)`);

      // Clean up used password reset tokens older than 24h
      const resets = await prisma.passwordReset.deleteMany({
        where: {
          usedAt: { not: null },
          expiresAt: { lt: now },
        },
      });
      if (resets.count > 0)
        console.log(`[Cron] Removed ${resets.count} used password reset(s)`);
    } catch (err) {
      console.error("[Cron]", err.message);
    }
  }, 60_000);
};

module.exports = startCronJobs;
