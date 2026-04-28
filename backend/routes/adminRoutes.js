const express = require("express");
const { authenticate, authorize } = require("../middleware/authMiddleware");
const prisma = require("../lib/prisma");

const router = express.Router();

router.use(authenticate);

// ── Users ─────────────────────────────────────────────────────────────────────

router.get("/users", authorize("read", "User"), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const take = 20;
  const skip = (page - 1) * take;
  const search = req.query.search;

  const where = {
    deletedAt: null,
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        emailVerified: true,
        createdAt: true,
        userRoles: { include: { role: { select: { name: true, displayName: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ users, total, page, pages: Math.ceil(total / take) });
});

router.get("/users/:userId", authorize("read", "User"), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      fullName: true,
      displayName: true,
      emailVerified: true,
      createdAt: true,
      userRoles: { include: { role: true } },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// ── Roles ─────────────────────────────────────────────────────────────────────

router.get("/roles", authorize("read", "Role"), async (req, res) => {
  const roles = await prisma.role.findMany({
    include: {
      rolePermissions: { include: { permission: true } },
    },
  });
  res.json(roles);
});

router.post(
  "/users/:userId/roles",
  authorize("manage", "Role"),
  async (req, res) => {
    const { roleId } = req.body ?? {};
    if (!roleId) return res.status(400).json({ error: "roleId is required" });

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return res.status(404).json({ error: "Role not found" });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: req.params.userId, roleId } },
      update: {},
      create: { userId: req.params.userId, roleId, grantedBy: req.user.id },
    });

    await prisma.auditLog
      .create({
        data: {
          userId: req.user.id,
          event: "user.role_assigned",
          metadata: { targetUserId: req.params.userId, roleId },
          ipAddress: req.ip ?? null,
        },
      })
      .catch(() => {});

    res.json({ message: "Role assigned" });
  }
);

router.delete(
  "/users/:userId/roles/:roleId",
  authorize("manage", "Role"),
  async (req, res) => {
    await prisma.userRole.deleteMany({
      where: { userId: req.params.userId, roleId: req.params.roleId },
    });
    res.json({ message: "Role revoked" });
  }
);

// ── Audit log ─────────────────────────────────────────────────────────────────

router.get("/audit-log", authorize("read", "AuditLog"), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const take = 50;
  const skip = (page - 1) * take;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(req.query.userId ? { userId: req.query.userId } : {}),
      ...(req.query.event ? { event: { contains: req.query.event } } : {}),
    },
    include: {
      user: { select: { email: true, fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });

  res.json(logs);
});

module.exports = router;
