import { NextRequest, NextResponse } from "next/server";
import { db } from "@dailyforge/db";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    const regs = await db.pendingRegistration.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    const sessions = await db.session.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    const resets = await db.passwordReset.deleteMany({
      where: { usedAt: { not: null }, expiresAt: { lt: now } },
    });

    return NextResponse.json({
      ok: true,
      deleted: {
        pendingRegistrations: regs.count,
        sessions: sessions.count,
        passwordResets: resets.count,
      },
    });
  } catch (err) {
    console.error("[cron/cleanup]", err);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
