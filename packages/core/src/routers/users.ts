import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, authorizedProcedure } from "../trpc/index";
import { updateProfileSchema, changePasswordSchema } from "@dailyforge/shared";
import { db } from "@dailyforge/db";
import bcrypt from "bcryptjs";
import { createNotification } from "../lib/notify";
import { parseUserAgent } from "../lib/ua";
import { lookupGeoIP } from "../lib/geoip";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// Server-side invalidation set — forces the jwt callback to re-check status from DB
// on the user's next request instead of waiting for the 5-minute cache to expire.
const g = globalThis as { __statusInvalidated?: Set<string> };
if (!g.__statusInvalidated) g.__statusInvalidated = new Set<string>();
function invalidateUserStatus(userId: string) {
  g.__statusInvalidated!.add(userId);
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
      const updated = await db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        select: USER_SELECT,
      });
      void createNotification(ctx.session.user.id, "profile_updated", "Profile updated");
      return updated;
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
      void createNotification(
        ctx.session.user.id,
        "password_changed",
        "Password changed",
        "Your password was updated and all other sessions were signed out."
      );
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

  adminCheck: protectedProcedure.query(async ({ ctx }) => {
    const roles = await db.userRole.findMany({
      where: { userId: ctx.session.user.id },
      include: { role: { select: { name: true } } },
    });
    const names = new Set(roles.map((r) => r.role.name));
    return {
      isSuperAdmin: names.has("super_admin"),
      isAdmin: names.has("admin") || names.has("super_admin"),
    };
  }),

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
          select: {
            id: true,
            email: true,
            fullName: true,
            displayName: true,
            avatarUrl: true,
            emailVerified: true,
            status: true,
            createdAt: true,
            userRoles: { include: { role: { select: { id: true, name: true, displayName: true } } } },
          },
          orderBy: { createdAt: "desc" },
          take,
          skip,
        }),
        db.user.count({ where }),
      ]);

      // Enrich with activity data from active sessions
      const userIds = users.map((u) => u.id);
      const activeSessions = await db.session.findMany({
        where: { userId: { in: userIds }, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { lastActiveAt: "desc" },
        select: { userId: true, lastActiveAt: true, userAgent: true, ipAddress: true },
      });

      // Keep only the most recent session per user
      const sessionMap = new Map<string, (typeof activeSessions)[0]>();
      for (const s of activeSessions) {
        if (!sessionMap.has(s.userId)) sessionMap.set(s.userId, s);
      }

      const onlineCutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS);
      const enriched = users.map((u) => {
        const s = sessionMap.get(u.id);
        return {
          ...u,
          lastSeenAt: s?.lastActiveAt ?? null,
          isOnline: s ? s.lastActiveAt > onlineCutoff : false,
          lastDevice: s ? parseUserAgent(s.userAgent) : null,
          lastLocation: s ? lookupGeoIP(s.ipAddress) : null,
        };
      });

      return { users: enriched, total, page: input.page, pages: Math.ceil(total / take) };
    }),

  adminGetUserSessions: authorizedProcedure("read", "User")
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const sessions = await db.session.findMany({
        where: { userId: input.userId, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { lastActiveAt: "desc" },
        select: {
          id: true,
          lastActiveAt: true,
          createdAt: true,
          expiresAt: true,
          userAgent: true,
          ipAddress: true,
        },
      });
      const onlineCutoff = new Date(Date.now() - ONLINE_THRESHOLD_MS);
      return sessions.map((s) => ({
        id: s.id,
        isActive: s.lastActiveAt > onlineCutoff,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        ipAddress: s.ipAddress,
        ua: parseUserAgent(s.userAgent),
        location: lookupGeoIP(s.ipAddress),
      }));
    }),

  adminGetById: authorizedProcedure("read", "User")
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.user.findUnique({
        where: { id: input.id, deletedAt: null },
        select: {
          id: true,
          email: true,
          fullName: true,
          displayName: true,
          avatarUrl: true,
          emailVerified: true,
          status: true,
          createdAt: true,
          userRoles: { include: { role: { select: { id: true, name: true, displayName: true } } } },
        },
      });
    }),

  adminUpdate: authorizedProcedure("update", "User")
    .input(
      z.object({
        id: z.string(),
        fullName: z.string().min(1).optional(),
        displayName: z.string().optional(),
        status: z.enum(["ACTIVE", "SUSPENDED", "BANNED", "PENDING"]).optional(),
        roleIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot modify your own account via admin panel" });
      }
      const { id, roleIds, ...data } = input;

      if (roleIds !== undefined) {
        await db.userRole.deleteMany({ where: { userId: id } });
        if (roleIds.length > 0) {
          await db.userRole.createMany({
            data: roleIds.map((roleId) => ({ userId: id, roleId, grantedBy: ctx.session.user.id })),
          });
        }
      }

      const updated = await db.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          fullName: true,
          displayName: true,
          avatarUrl: true,
          emailVerified: true,
          status: true,
          createdAt: true,
          userRoles: { include: { role: { select: { id: true, name: true, displayName: true } } } },
        },
      });

      // If status changed, force the user's next request to re-check their status from DB
      if (data.status) invalidateUserStatus(id);

      return updated;
    }),

  adminSoftDelete: authorizedProcedure("delete", "User")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete your own account" });
      }
      await db.user.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
      invalidateUserStatus(input.id);
      return { ok: true };
    }),
});
