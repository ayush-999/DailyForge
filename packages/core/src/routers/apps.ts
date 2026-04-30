import { z } from "zod";
import { router, protectedProcedure } from "../trpc/index";
import { db } from "@dailyforge/db";
import { createNotification } from "../lib/notify";

export const appsRouter = router({
  list: protectedProcedure.query(async () => {
    return db.app.findMany({
      where: { isPublished: true },
      include: { scopes: true },
      orderBy: { name: "asc" },
    });
  }),

  listInstalled: protectedProcedure.query(async ({ ctx }) => {
    return db.appInstallation.findMany({
      where: { userId: ctx.session.user.id, uninstalledAt: null },
      include: { app: { include: { scopes: true } } },
      orderBy: { installedAt: "desc" },
    });
  }),

  install: protectedProcedure
    .input(z.object({ slug: z.string(), grantedScopes: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const app = await db.app.findUnique({ where: { slug: input.slug } });
      if (!app || !app.isPublished) throw new Error("App not found");

      await db.appInstallation.upsert({
        where: { userId_appId: { userId: ctx.session.user.id, appId: app.id } },
        update: { grantedScopes: input.grantedScopes, uninstalledAt: null },
        create: {
          userId: ctx.session.user.id,
          appId: app.id,
          grantedScopes: input.grantedScopes,
        },
      });

      void createNotification(
        ctx.session.user.id,
        "app_installed",
        `${app.name} installed`,
        `${app.name} is now available in your workspace.`
      );

      return { ok: true };
    }),

  uninstall: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const app = await db.app.findUnique({ where: { slug: input.slug } });
      if (!app) throw new Error("App not found");

      await db.appInstallation.updateMany({
        where: { userId: ctx.session.user.id, appId: app.id },
        data: { uninstalledAt: new Date() },
      });

      void createNotification(
        ctx.session.user.id,
        "app_uninstalled",
        `${app.name} uninstalled`,
        `${app.name} has been removed from your workspace.`
      );

      return { ok: true };
    }),
});
