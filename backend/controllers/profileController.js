const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const { sendEmailChangeVerification } = require("../services/emailService");

const BCRYPT_COST = 12;

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  displayName: true,
  avatarUrl: true,
  timezone: true,
  locale: true,
  emailVerified: true,
  createdAt: true,
};

// ── GET /profile ──────────────────────────────────────────────────────────────

exports.getProfile = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: USER_SELECT,
  });
  res.json(user);
};

// ── PUT /profile ──────────────────────────────────────────────────────────────

const updateSchema = z.object({
  fullName: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z\s]+$/, "Full name can only contain letters and spaces")
    .optional(),
  displayName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
});

exports.updateProfile = async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: parsed.data,
    select: USER_SELECT,
  });

  res.json(user);
};

// ── POST /profile/change-password ─────────────────────────────────────────────

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
});

exports.changePassword = async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, BCRYPT_COST) },
  });

  // Revoke all sessions — user must re-login
  await prisma.session.updateMany({
    where: { userId: req.user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await prisma.auditLog
    .create({
      data: {
        userId: req.user.id,
        event: "auth.password_changed",
        ipAddress: req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
      },
    })
    .catch(() => {});

  res.json({ message: "Password changed. Please sign in again on all devices." });
};

// ── POST /profile/change-email ────────────────────────────────────────────────

exports.requestEmailChange = async (req, res) => {
  const { newEmail } = req.body ?? {};
  const parsed = z.string().email("Valid email is required").safeParse(newEmail);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const inUse = await prisma.user.findUnique({ where: { email: newEmail } });
  if (inUse) {
    return res.status(400).json({ error: "Email already in use" });
  }

  const rawToken = makeToken();
  const expiresAt = new Date(Date.now() + 24 * 3_600_000);

  await prisma.pendingEmailChange.upsert({
    where: { userId: req.user.id },
    update: { newEmail, tokenHash: hashToken(rawToken), expiresAt },
    create: {
      userId: req.user.id,
      newEmail,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
  });

  await sendEmailChangeVerification(newEmail, rawToken);

  res.json({
    message: "Verification link sent to your new email address. It expires in 24 hours.",
  });
};

// ── GET /profile/verify-email-change ─────────────────────────────────────────

exports.verifyEmailChange = async (req, res) => {
  const { token } = req.query ?? {};
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Token is required" });
  }

  const pending = await prisma.pendingEmailChange.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!pending || new Date() > pending.expiresAt) {
    return res.status(400).json({ error: "Invalid or expired link" });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: pending.userId },
      data: { email: pending.newEmail },
    }),
    prisma.pendingEmailChange.delete({ where: { id: pending.id } }),
  ]);

  res.json({ message: "Email updated successfully." });
};

// ── GET /profile/sessions ─────────────────────────────────────────────────────

exports.listSessions = async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: {
      userId: req.user.id,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      lastActiveAt: true,
      createdAt: true,
    },
    orderBy: { lastActiveAt: "desc" },
  });
  res.json(sessions);
};

// ── DELETE /profile/sessions/:sessionId ───────────────────────────────────────

exports.revokeSession = async (req, res) => {
  const { sessionId } = req.params;
  const session = await prisma.session.findUnique({ where: { id: sessionId } });

  if (!session || session.userId !== req.user.id) {
    return res.status(404).json({ error: "Session not found" });
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() },
  });

  res.json({ message: "Session revoked" });
};

// ── DELETE /profile/account ───────────────────────────────────────────────────

exports.deleteAccount = async (req, res) => {
  // Soft delete — 30-day grace period enforced by a future cleanup job
  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user.id },
      data: { deletedAt: new Date() },
    }),
    prisma.session.updateMany({
      where: { userId: req.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await prisma.auditLog
    .create({
      data: {
        userId: req.user.id,
        event: "user.account_deleted",
        ipAddress: req.ip ?? null,
        userAgent: req.headers["user-agent"] ?? null,
      },
    })
    .catch(() => {});

  res.json({
    message: "Account scheduled for deletion. You have 30 days to contact support to cancel.",
  });
};
