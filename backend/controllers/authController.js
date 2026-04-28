require("dotenv").config();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../lib/prisma");
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../services/emailService");

// ── Constants ─────────────────────────────────────────────────────────────────

const BCRYPT_COST = 12;
const REFRESH_TTL_DAYS = 7;
const EMAIL_VERIFY_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_HOURS = 1;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function issueAccessToken(userId) {
  return jwt.sign({ sub: userId, type: "access" }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
}

async function createSession(userId, req) {
  const raw = makeToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000);
  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: hashToken(raw),
      userAgent: req.headers["user-agent"] ?? null,
      ipAddress: clientIp(req),
      expiresAt,
    },
  });
  return raw;
}

function clientIp(req) {
  return (
    (req.headers["x-forwarded-for"] || req.ip || "")
      .toString()
      .split(",")[0]
      .trim() || null
  );
}

async function audit(userId, event, req, metadata) {
  await prisma.auditLog
    .create({
      data: {
        userId: userId ?? null,
        event,
        metadata: metadata ?? null,
        ipAddress: clientIp(req),
        userAgent: req.headers["user-agent"] ?? null,
      },
    })
    .catch(() => {}); // audit failures must never crash the main flow
}

// ── Validation schemas ────────────────────────────────────────────────────────

const signUpSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(50, "Full name cannot exceed 50 characters")
    .regex(/^[a-zA-Z\s]+$/, "Full name can only contain letters and spaces"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      "Password must contain uppercase, lowercase, number, and special character"
    ),
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    "Password must contain uppercase, lowercase, number, and special character"
  );

// ── Controllers ───────────────────────────────────────────────────────────────

exports.signUp = async (req, res) => {
  const parsed = signUpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const { fullName, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const rawToken = makeToken();
    const expiresAt = new Date(
      Date.now() + EMAIL_VERIFY_TTL_HOURS * 3_600_000
    );

    await prisma.pendingRegistration.upsert({
      where: { email },
      update: { fullName, passwordHash, tokenHash: hashToken(rawToken), expiresAt },
      create: {
        fullName,
        email,
        passwordHash,
        tokenHash: hashToken(rawToken),
        expiresAt,
      },
    });

    await sendVerificationEmail(email, rawToken);

    res.status(200).json({
      message:
        "Verification email sent. Check your inbox and click the link to activate your account.",
    });
  } catch (err) {
    console.error("[signUp]", err);
    res.status(500).json({ error: "Failed to create account" });
  }
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "Verification token is required" });
  }

  try {
    const pending = await prisma.pendingRegistration.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!pending) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification link" });
    }

    if (new Date() > pending.expiresAt) {
      await prisma.pendingRegistration.delete({ where: { id: pending.id } });
      return res.status(400).json({
        error: "Verification link has expired. Please sign up again.",
      });
    }

    // Guard against double-click
    const alreadyExists = await prisma.user.findUnique({
      where: { email: pending.email },
    });
    if (alreadyExists) {
      await prisma.pendingRegistration.delete({ where: { id: pending.id } });
      return res
        .status(200)
        .json({ message: "Email already verified. You can sign in." });
    }

    const userRole = await prisma.role.findUnique({ where: { name: "user" } });

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: pending.email,
          fullName: pending.fullName,
          passwordHash: pending.passwordHash,
          emailVerified: true,
        },
      });
      if (userRole) {
        await tx.userRole.create({
          data: { userId: newUser.id, roleId: userRole.id },
        });
      }
      await tx.pendingRegistration.delete({ where: { id: pending.id } });
      return newUser;
    });

    await audit(user.id, "auth.email_verified", req, { email: user.email });

    res
      .status(201)
      .json({ message: "Email verified successfully. You can now sign in." });
  } catch (err) {
    console.error("[verifyEmail]", err);
    res.status(500).json({ error: "Verification failed" });
  }
};

exports.signIn = async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Brute-force guard: 5+ failures in the last 15 minutes
    const recentFailures = await prisma.loginAttempt.count({
      where: {
        email,
        success: false,
        createdAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) },
      },
    });

    if (recentFailures >= MAX_FAILED_ATTEMPTS) {
      return res.status(429).json({
        error: `Too many failed login attempts. Try again in 15 minutes.`,
      });
    }

    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    // Always run bcrypt to prevent timing-based user enumeration
    const isMatch = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, "$2b$12$placeholder.hash.to.waste.time");

    await prisma.loginAttempt.create({
      data: {
        email,
        userId: user?.id ?? null,
        success: !!(user && isMatch),
        ipAddress: clientIp(req),
        userAgent: req.headers["user-agent"] ?? null,
      },
    });

    if (!user || !isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.emailVerified) {
      return res
        .status(403)
        .json({ error: "Please verify your email before signing in" });
    }

    const accessToken = issueAccessToken(user.id);
    const refreshToken = await createSession(user.id, req);

    await audit(user.id, "auth.sign_in", req);

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error("[signIn]", err);
    res.status(500).json({ error: "Sign in failed" });
  }
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) {
    return res.status(401).json({ error: "Refresh token required" });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { refreshTokenHash: hashToken(refreshToken) },
    });

    if (!session || session.revokedAt || new Date() > session.expiresAt) {
      return res
        .status(401)
        .json({ error: "Invalid or expired refresh token" });
    }

    // Rotate: revoke old, issue new
    const newRaw = makeToken();
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000);

    await prisma.$transaction([
      prisma.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      prisma.session.create({
        data: {
          userId: session.userId,
          refreshTokenHash: hashToken(newRaw),
          userAgent: req.headers["user-agent"] ?? null,
          ipAddress: clientIp(req),
          expiresAt,
        },
      }),
    ]);

    res.status(200).json({
      accessToken: issueAccessToken(session.userId),
      refreshToken: newRaw,
    });
  } catch (err) {
    console.error("[refresh]", err);
    res.status(500).json({ error: "Token refresh failed" });
  }
};

exports.signOut = async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (refreshToken) {
    await prisma.session
      .updateMany({
        where: {
          refreshTokenHash: hashToken(refreshToken),
          userId: req.user.id,
        },
        data: { revokedAt: new Date() },
      })
      .catch(() => {});
  }
  await audit(req.user.id, "auth.sign_out", req);
  res.status(200).json({ message: "Signed out successfully" });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body ?? {};
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Capture request metadata before responding (res will be sent first)
  const ip = clientIp(req);
  const ua = req.headers["user-agent"] ?? null;

  // Respond immediately — never reveal whether the address exists
  res
    .status(200)
    .json({
      message: "If that email exists, a password reset link has been sent.",
    });

  // Background: send the email asynchronously
  void (async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { email, deletedAt: null },
      });
      if (!user || !user.emailVerified) return;

      // Invalidate any outstanding reset tokens
      await prisma.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const rawToken = makeToken();
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(
            Date.now() + PASSWORD_RESET_TTL_HOURS * 3_600_000
          ),
        },
      });

      await sendPasswordResetEmail(email, rawToken);
      await prisma.auditLog
        .create({
          data: { userId: user.id, event: "auth.forgot_password", ipAddress: ip, userAgent: ua },
        })
        .catch(() => {});
    } catch (err) {
      console.error("[forgotPassword]", err);
    }
  })();
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body ?? {};
  if (!token || !newPassword) {
    return res
      .status(400)
      .json({ error: "Token and new password are required" });
  }

  const pwParsed = passwordSchema.safeParse(newPassword);
  if (!pwParsed.success) {
    return res.status(400).json({ error: pwParsed.error.issues[0].message });
  }

  try {
    const record = await prisma.passwordReset.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!record || record.usedAt || new Date() > record.expiresAt) {
      return res
        .status(400)
        .json({ error: "Invalid or expired password reset link" });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Force re-login on all devices
      prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await audit(record.userId, "auth.password_reset", req);

    res
      .status(200)
      .json({ message: "Password reset successfully. You can now sign in." });
  } catch (err) {
    console.error("[resetPassword]", err);
    res.status(500).json({ error: "Password reset failed" });
  }
};
