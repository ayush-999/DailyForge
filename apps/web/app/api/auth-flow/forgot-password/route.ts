import { NextRequest, NextResponse } from "next/server";
import { db } from "@dailyforge/db";
import { sendPasswordResetEmail } from "@dailyforge/core/email";
import crypto from "crypto";

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(req: NextRequest) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email } = body;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always return 200 — never reveal whether the address exists
  try {
    const user = await db.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (user && user.emailVerified) {
      await db.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      const rawToken = makeToken();
      await db.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });

      await sendPasswordResetEmail(email, rawToken);
    }
  } catch (err) {
    console.error("[forgot-password]", err);
  }

  return NextResponse.json({
    message: "If that email exists, a password reset link has been sent.",
  });
}
