import { NextRequest, NextResponse } from "next/server";
import { db } from "@dailyforge/db";
import crypto from "crypto";

function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json(
      { error: "Verification token is required" },
      { status: 400 },
    );
  }

  try {
    const pending = await db.pendingRegistration.findUnique({
      where: { tokenHash: hashToken(token) },
    });

    if (!pending) {
      return NextResponse.json(
        { error: "Invalid or expired verification link" },
        { status: 400 },
      );
    }

    if (new Date() > pending.expiresAt) {
      await db.pendingRegistration.delete({ where: { id: pending.id } });
      return NextResponse.json(
        { error: "Verification link has expired. Please sign up again." },
        { status: 400 },
      );
    }

    const alreadyExists = await db.user.findUnique({
      where: { email: pending.email },
    });
    if (alreadyExists) {
      await db.pendingRegistration.delete({ where: { id: pending.id } });
      return NextResponse.json({
        message: "Email already verified. You can sign in.",
      });
    }

    const userRole = await db.role.findUnique({ where: { name: "user" } });

    await db.$transaction(async (tx) => {
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

    return NextResponse.json(
      { message: "Email verified successfully. You can now sign in." },
      { status: 201 },
    );
  } catch (err) {
    console.error("[verify-email]", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
