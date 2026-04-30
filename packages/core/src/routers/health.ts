import { z } from "zod";
import { router, appProcedure } from "../trpc/index";
import { db } from "@dailyforge/db";

const READ = appProcedure("health-tracker", "health:read");
const WRITE = appProcedure("health-tracker", "health:write");
const DEL = appProcedure("health-tracker", "health:delete");

function dayRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export const healthRouter = router({
  water: router({
    today: READ.query(async ({ ctx }) => {
      const { start, end } = dayRange(new Date());
      const logs = await db.waterLog.findMany({
        where: { userId: ctx.session.user.id, date: { gte: start, lte: end } },
        orderBy: { createdAt: "asc" },
      });
      const total = logs.reduce((s, l) => s + l.amount, 0);
      return { logs, total, goal: 2500 };
    }),

    log: WRITE.input(z.object({ amount: z.number().int().min(1).max(5000) })).mutation(
      async ({ ctx, input }) => {
        return db.waterLog.create({
          data: { userId: ctx.session.user.id, date: new Date(), amount: input.amount },
        });
      }
    ),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.waterLog.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),

  workout: router({
    list: READ.input(z.object({ days: z.number().int().min(1).max(90).default(7) })).query(
      async ({ ctx, input }) => {
        const since = new Date();
        since.setDate(since.getDate() - input.days);
        return db.workoutLog.findMany({
          where: { userId: ctx.session.user.id, date: { gte: since } },
          orderBy: { date: "desc" },
        });
      }
    ),

    create: WRITE.input(
      z.object({
        type: z.string().min(1).max(100),
        duration: z.number().int().min(1).max(1440),
        calories: z.number().int().min(0).optional(),
        notes: z.string().max(500).optional(),
        date: z.string().optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      return db.workoutLog.create({
        data: {
          userId: ctx.session.user.id,
          date: input.date ? new Date(input.date) : new Date(),
          type: input.type,
          duration: input.duration,
          calories: input.calories,
          notes: input.notes,
        },
      });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.workoutLog.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),

  sleep: router({
    recent: READ.query(async ({ ctx }) => {
      const since = new Date();
      since.setDate(since.getDate() - 14);
      return db.sleepLog.findMany({
        where: { userId: ctx.session.user.id, date: { gte: since } },
        orderBy: { date: "desc" },
      });
    }),

    log: WRITE.input(
      z.object({
        bedtime: z.string().regex(/^\d{2}:\d{2}$/),
        wakeTime: z.string().regex(/^\d{2}:\d{2}$/),
        quality: z.number().int().min(1).max(5),
        notes: z.string().max(500).optional(),
        date: z.string().optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      return db.sleepLog.create({
        data: {
          userId: ctx.session.user.id,
          date: input.date ? new Date(input.date) : new Date(),
          bedtime: input.bedtime,
          wakeTime: input.wakeTime,
          quality: input.quality,
          notes: input.notes,
        },
      });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.sleepLog.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),

  stats: READ.query(async ({ ctx }) => {
    const { start: todayStart, end: todayEnd } = dayRange(new Date());
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [waterToday, workouts30d, sleepLogs] = await Promise.all([
      db.waterLog.aggregate({
        where: { userId: ctx.session.user.id, date: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
      }),
      db.workoutLog.count({
        where: { userId: ctx.session.user.id, date: { gte: thirtyDaysAgo } },
      }),
      db.sleepLog.findMany({
        where: { userId: ctx.session.user.id, date: { gte: thirtyDaysAgo } },
        select: { quality: true },
      }),
    ]);

    const avgSleep =
      sleepLogs.length > 0
        ? sleepLogs.reduce((s, l) => s + l.quality, 0) / sleepLogs.length
        : null;

    return {
      waterToday: waterToday._sum.amount ?? 0,
      workouts30d,
      avgSleepQuality: avgSleep ? Math.round(avgSleep * 10) / 10 : null,
    };
  }),
});
