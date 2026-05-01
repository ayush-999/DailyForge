import { z } from "zod";
import { router, protectedProcedure } from "../trpc/index";
import { db } from "@dailyforge/db";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(30) }).optional())
    .query(async ({ ctx, input }) => {
      return db.notification.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 30,
      });
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return db.notification.count({
      where: { userId: ctx.session.user.id, read: false },
    });
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.notification.updateMany({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { read: true },
      });
      return { ok: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.notification.updateMany({
      where: { userId: ctx.session.user.id, read: false },
      data: { read: true },
    });
    return { ok: true };
  }),

  deleteOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.notification.deleteMany({
        where: { id: input.id, userId: ctx.session.user.id },
      });
      return { ok: true };
    }),

  clearAll: protectedProcedure.mutation(async ({ ctx }) => {
    await db.notification.deleteMany({
      where: { userId: ctx.session.user.id },
    });
    return { ok: true };
  }),

  clearRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.notification.deleteMany({
      where: { userId: ctx.session.user.id, read: true },
    });
    return { ok: true };
  }),
});
