import { db } from "@dailyforge/db";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body?: string
) {
  try {
    await db.notification.create({ data: { userId, type, title, body } });
  } catch {
    // non-critical
  }
}
