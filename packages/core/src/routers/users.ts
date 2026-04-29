import { z } from "zod";
import { router, protectedProcedure, authorizedProcedure } from "../trpc/index";
import { updateProfileSchema, changePasswordSchema } from "@dailyforge/shared";
import { db } from "@dailyforge/db";
import bcrypt from "bcryptjs";

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
} as const;

export const usersRouter = router({
  // ── Own profile ────────────────────────────────────────────────────────────

  me: protectedProcedure.query(async ({ ctx }) => {
    return db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: USER_SELECT,
    });
  }),

  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      return db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        select: USER_SELECT,
      });
    }),

  changePassword: protectedProcedure
    .input(changePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const user = await db.user.findUniqueOrThrow({
        where: { id: ctx.session.user.id },
      });
      const isMatch = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!isMatch) {
        throw new Error("Current password is incorrect");
      }
      await db.user.update({
        where: { id: ctx.session.user.id },
        data: { passwordHash: await bcrypt.hash(input.newPassword, 12) },
      });
      await db.session.updateMany({
        where: { userId: ctx.session.user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { ok: true };
    }),

  listSessions: protectedProcedure.query(async ({ ctx }) => {
    return db.session.findMany({
      where: {
        userId: ctx.session.user.id,
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
  }),

  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await db.session.findUnique({
        where: { id: input.sessionId },
      });
      if (!session || session.userId !== ctx.session.user.id) {
        throw new Error("Session not found");
      }
      await db.session.update({
        where: { id: input.sessionId },
        data: { revokedAt: new Date() },
      });
      return { ok: true };
    }),

  // ── Admin ──────────────────────────────────────────────────────────────────

  adminList: authorizedProcedure("read", "User")
    .input(z.object({ page: z.number().min(1).default(1), search: z.string().optional() }))
    .query(async ({ input }) => {
      const take = 20;
      const skip = (input.page - 1) * take;
      const where = {
        deletedAt: null,
        ...(input.search
          ? {
              OR: [
                { fullName: { contains: input.search, mode: "insensitive" as const } },
                { email: { contains: input.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      };
      const [users, total] = await Promise.all([
        db.user.findMany({
          where,
          select: { ...USER_SELECT, userRoles: { include: { role: true } } },
          orderBy: { createdAt: "desc" },
          take,
          skip,
        }),
        db.user.count({ where }),
      ]);
      return { users, total, page: input.page, pages: Math.ceil(total / take) };
    }),
});
