import { NextRequest, NextResponse } from "next/server";
import { db } from "@dailyforge/db";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    "Password must contain uppercase, lowercase, number, and special character",
  );

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function POST(req: NextRequest) {
  let body: { token?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token, newPassword } = body;
  if (!token || !newPassword) {
    return NextResponse.json(
      { error: "Token and new password are required" },
      { status: 400 },
    );
  }

  const pwResult = passwordSchema.safeParse(newPassword);
  if (!pwResult.success) {
    return NextResponse.json(
      { error: pwResult.error.issues[0].message },
      { status: 400 },
    );
  }

  try {
    const record = await db.passwordReset.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!record || record.usedAt || new Date() > record.expiresAt) {
      return NextResponse.json(
        { error: "Invalid or expired password reset link" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      db.passwordReset.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      db.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      message: "Password reset successfully. You can now sign in.",
    });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}
