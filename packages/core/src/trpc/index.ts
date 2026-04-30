import { initTRPC, TRPCError } from "@trpc/server";
import { db } from "@dailyforge/db";

// Prevent flooding the DB — only update lastActiveAt once per 2 min per user
const activityCache = new Set<string>();
function touchLastActive(userId: string) {
  if (activityCache.has(userId)) return;
  activityCache.add(userId);
  setTimeout(() => activityCache.delete(userId), 2 * 60 * 1000);
  void db.session
    .updateMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      data: { lastActiveAt: new Date() },
    })
    .catch(() => {});
}

export interface SessionUser {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

export interface MinimalSession {
  user?: SessionUser;
  expires: string;
}

export interface TRPCContext {
  session: MinimalSession | null;
  db: typeof db;
}

type AuthedSession = MinimalSession & { user: SessionUser & { id: string } };

const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  touchLastActive(ctx.session.user.id);
  return next({
    ctx: {
      ...ctx,
      session: ctx.session as AuthedSession,
    },
  });
});

export const authorizedProcedure = (action: string, resource: string) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const { getUserAbility } = await import("../rbac/index");
    const ability = await getUserAbility(ctx.session.user.id);
    if (!ability.can(action, resource)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });

/** Checks that the calling user has the given app installed with the required scope. */
export const appProcedure = (appSlug: string, requiredScope: string) =>
  protectedProcedure.use(async ({ ctx, next }) => {
    const installation = await ctx.db.appInstallation.findFirst({
      where: {
        userId: ctx.session.user.id,
        app: { slug: appSlug },
        uninstalledAt: null,
      },
    });
    if (!installation) {
      throw new TRPCError({ code: "FORBIDDEN", message: "App not installed" });
    }
    if (!installation.grantedScopes.includes(requiredScope)) {
      throw new TRPCError({ code: "FORBIDDEN", message: `Missing scope: ${requiredScope}` });
    }
    return next({ ctx });
  });

export function createTRPCContext({
  session,
}: {
  session: MinimalSession | null;
}): TRPCContext {
  return { session, db };
}
