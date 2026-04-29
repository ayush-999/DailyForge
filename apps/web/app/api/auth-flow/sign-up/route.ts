import { NextRequest, NextResponse } from "next/server";
import { db } from "@dailyforge/db";
import { sendVerificationEmail } from "@dailyforge/core/email";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

const BCRYPT_COST = 12;
const EMAIL_VERIFY_TTL_HOURS = 24;

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
      "Password must contain uppercase, lowercase, number, and special character",
    ),
});

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = signUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { fullName, email, password } = parsed.data;

  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const rawToken = makeToken();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL_HOURS * 3_600_000);

    await db.pendingRegistration.upsert({
      where: { email },
      update: { fullName, passwordHash, tokenHash: hashToken(rawToken), expiresAt },
      create: { fullName, email, passwordHash, tokenHash: hashToken(rawToken), expiresAt },
    });

    await sendVerificationEmail(email, rawToken);

    return NextResponse.json({
      message:
        "Verification email sent. Check your inbox and click the link to activate your account.",
    });
  } catch (err) {
    console.error("[sign-up]", err);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
