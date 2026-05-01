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

function toDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function calcSleepHours(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeTime.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export const healthRouter = router({
  // ── Profile ─────────────────────────────────────────────────────────────────

  profile: router({
    get: READ.query(async ({ ctx }) =>
      db.healthProfile.findUnique({ where: { userId: ctx.session.user.id } })
    ),

    upsert: WRITE.input(
      z.object({
        age: z.number().int().min(1).max(120).optional().nullable(),
        weightKg: z.number().min(1).max(500).optional().nullable(),
        heightCm: z.number().min(50).max(300).optional().nullable(),
        gender: z.enum(["male", "female", "other"]).optional().nullable(),
        goal: z.enum(["lose", "gain", "maintain"]).optional().nullable(),
        targetWeightKg: z.number().min(1).max(500).optional().nullable(),
        dailyStepGoal: z.number().int().min(100).max(100000).optional(),
        dailyWaterGoalMl: z.number().int().min(100).max(10000).optional(),
        dailyCalorieGoal: z.number().int().min(500).max(10000).optional(),
      })
    ).mutation(async ({ ctx, input }) =>
      db.healthProfile.upsert({
        where: { userId: ctx.session.user.id },
        update: input,
        create: { userId: ctx.session.user.id, ...input },
      })
    ),
  }),

  // ── Water ────────────────────────────────────────────────────────────────────

  water: router({
    today: READ.query(async ({ ctx }) => {
      const { start, end } = dayRange(new Date());
      const [logs, profile] = await Promise.all([
        db.waterLog.findMany({
          where: { userId: ctx.session.user.id, date: { gte: start, lte: end } },
          orderBy: { createdAt: "asc" },
        }),
        db.healthProfile.findUnique({ where: { userId: ctx.session.user.id }, select: { dailyWaterGoalMl: true } }),
      ]);
      return { logs, total: logs.reduce((s, l) => s + l.amount, 0), goal: profile?.dailyWaterGoalMl ?? 2500 };
    }),

    log: WRITE.input(z.object({ amount: z.number().int().min(1).max(5000) })).mutation(
      async ({ ctx, input }) =>
        db.waterLog.create({ data: { userId: ctx.session.user.id, date: new Date(), amount: input.amount } })
    ),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.waterLog.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),

    history: READ.input(z.object({ days: z.number().int().min(7).max(90).default(30) })).query(
      async ({ ctx, input }) => {
        const since = new Date();
        since.setDate(since.getDate() - input.days);
        const logs = await db.waterLog.findMany({
          where: { userId: ctx.session.user.id, date: { gte: since } },
          orderBy: { date: "asc" },
        });
        const profile = await db.healthProfile.findUnique({
          where: { userId: ctx.session.user.id },
          select: { dailyWaterGoalMl: true },
        });
        const goal = profile?.dailyWaterGoalMl ?? 2500;
        // Group by day
        const map = new Map<string, number>();
        for (const l of logs) {
          const key = toDay(new Date(l.date)).toISOString().slice(0, 10);
          map.set(key, (map.get(key) ?? 0) + l.amount);
        }
        return Array.from(map.entries()).map(([date, total]) => ({ date, total, goal }));
      }
    ),
  }),

  // ── Workout ──────────────────────────────────────────────────────────────────

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
    ).mutation(async ({ ctx, input }) =>
      db.workoutLog.create({
        data: {
          userId: ctx.session.user.id,
          date: input.date ? new Date(input.date) : new Date(),
          type: input.type,
          duration: input.duration,
          calories: input.calories,
          notes: input.notes,
        },
      })
    ),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.workoutLog.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),

  // ── Sleep ────────────────────────────────────────────────────────────────────

  sleep: router({
    recent: READ.input(z.object({ days: z.number().int().min(7).max(90).default(14) })).query(
      async ({ ctx, input }) => {
        const since = new Date();
        since.setDate(since.getDate() - input.days);
        const logs = await db.sleepLog.findMany({
          where: { userId: ctx.session.user.id, date: { gte: since } },
          orderBy: { date: "desc" },
        });
        return logs.map((l) => ({ ...l, hours: calcSleepHours(l.bedtime, l.wakeTime) }));
      }
    ),

    log: WRITE.input(
      z.object({
        bedtime: z.string().regex(/^\d{2}:\d{2}$/),
        wakeTime: z.string().regex(/^\d{2}:\d{2}$/),
        quality: z.number().int().min(1).max(5),
        notes: z.string().max(500).optional(),
        date: z.string().optional(),
      })
    ).mutation(async ({ ctx, input }) =>
      db.sleepLog.create({
        data: {
          userId: ctx.session.user.id,
          date: input.date ? new Date(input.date) : new Date(),
          bedtime: input.bedtime,
          wakeTime: input.wakeTime,
          quality: input.quality,
          notes: input.notes,
        },
      })
    ),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.sleepLog.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),

  // ── Weight ───────────────────────────────────────────────────────────────────

  weight: router({
    list: READ.input(z.object({ days: z.number().int().min(7).max(365).default(30) })).query(
      async ({ ctx, input }) => {
        const since = new Date();
        since.setDate(since.getDate() - input.days);
        return db.weightLog.findMany({
          where: { userId: ctx.session.user.id, date: { gte: since } },
          orderBy: { date: "asc" },
        });
      }
    ),

    log: WRITE.input(
      z.object({
        weightKg: z.number().min(1).max(500),
        notes: z.string().max(300).optional(),
        date: z.string().optional(),
      })
    ).mutation(async ({ ctx, input }) =>
      db.weightLog.create({
        data: {
          userId: ctx.session.user.id,
          date: input.date ? toDay(new Date(input.date)) : toDay(new Date()),
          weightKg: input.weightKg,
          notes: input.notes,
        },
      })
    ),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.weightLog.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),

  // ── Steps ────────────────────────────────────────────────────────────────────

  steps: router({
    today: READ.query(async ({ ctx }) => {
      const { start, end } = dayRange(new Date());
      const [log, profile] = await Promise.all([
        db.stepLog.findFirst({
          where: { userId: ctx.session.user.id, date: { gte: start, lte: end } },
          orderBy: { createdAt: "desc" },
        }),
        db.healthProfile.findUnique({ where: { userId: ctx.session.user.id }, select: { dailyStepGoal: true } }),
      ]);
      return { steps: log?.steps ?? 0, goal: profile?.dailyStepGoal ?? 8000, logId: log?.id ?? null };
    }),

    log: WRITE.input(
      z.object({ steps: z.number().int().min(0).max(100000), date: z.string().optional() })
    ).mutation(async ({ ctx, input }) =>
      db.stepLog.create({
        data: {
          userId: ctx.session.user.id,
          date: input.date ? toDay(new Date(input.date)) : toDay(new Date()),
          steps: input.steps,
        },
      })
    ),

    list: READ.input(z.object({ days: z.number().int().min(7).max(90).default(30) })).query(
      async ({ ctx, input }) => {
        const since = new Date();
        since.setDate(since.getDate() - input.days);
        const [logs, profile] = await Promise.all([
          db.stepLog.findMany({
            where: { userId: ctx.session.user.id, date: { gte: since } },
            orderBy: { date: "asc" },
          }),
          db.healthProfile.findUnique({ where: { userId: ctx.session.user.id }, select: { dailyStepGoal: true } }),
        ]);
        const goal = profile?.dailyStepGoal ?? 8000;
        return logs.map((l) => ({ ...l, goal, date: l.date.toISOString().slice(0, 10) }));
      }
    ),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.stepLog.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),

  // ── Food / Diet ──────────────────────────────────────────────────────────────

  food: router({
    today: READ.query(async ({ ctx }) => {
      const { start, end } = dayRange(new Date());
      const [logs, profile] = await Promise.all([
        db.foodLog.findMany({
          where: { userId: ctx.session.user.id, date: { gte: start, lte: end } },
          orderBy: { createdAt: "asc" },
        }),
        db.healthProfile.findUnique({ where: { userId: ctx.session.user.id }, select: { dailyCalorieGoal: true } }),
      ]);
      const totalCalories = logs.reduce((s, l) => s + l.calories, 0);
      return { logs, totalCalories, goal: profile?.dailyCalorieGoal ?? 2000 };
    }),

    log: WRITE.input(
      z.object({
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        name: z.string().min(1).max(200),
        calories: z.number().int().min(0).max(10000),
        protein: z.number().min(0).optional(),
        carbs: z.number().min(0).optional(),
        fat: z.number().min(0).optional(),
        date: z.string().optional(),
      })
    ).mutation(async ({ ctx, input }) =>
      db.foodLog.create({
        data: {
          userId: ctx.session.user.id,
          date: input.date ? new Date(input.date) : new Date(),
          mealType: input.mealType,
          name: input.name,
          calories: input.calories,
          protein: input.protein,
          carbs: input.carbs,
          fat: input.fat,
        },
      })
    ),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.foodLog.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),

    history: READ.input(z.object({ days: z.number().int().min(7).max(90).default(30) })).query(
      async ({ ctx, input }) => {
        const since = new Date();
        since.setDate(since.getDate() - input.days);
        const [logs, profile] = await Promise.all([
          db.foodLog.findMany({
            where: { userId: ctx.session.user.id, date: { gte: since } },
            orderBy: { date: "asc" },
          }),
          db.healthProfile.findUnique({ where: { userId: ctx.session.user.id }, select: { dailyCalorieGoal: true } }),
        ]);
        const goal = profile?.dailyCalorieGoal ?? 2000;
        const map = new Map<string, number>();
        for (const l of logs) {
          const key = toDay(new Date(l.date)).toISOString().slice(0, 10);
          map.set(key, (map.get(key) ?? 0) + l.calories);
        }
        return Array.from(map.entries()).map(([date, calories]) => ({ date, calories, goal }));
      }
    ),
  }),

  // ── Dashboard Stats ──────────────────────────────────────────────────────────

  stats: READ.query(async ({ ctx }) => {
    const { start: todayStart, end: todayEnd } = dayRange(new Date());
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [waterToday, workouts30d, sleepLogs, profile, weightLogs, stepsToday, foodToday] =
      await Promise.all([
        db.waterLog.aggregate({
          where: { userId: ctx.session.user.id, date: { gte: todayStart, lte: todayEnd } },
          _sum: { amount: true },
        }),
        db.workoutLog.count({
          where: { userId: ctx.session.user.id, date: { gte: thirtyDaysAgo } },
        }),
        db.sleepLog.findMany({
          where: { userId: ctx.session.user.id, date: { gte: thirtyDaysAgo } },
          select: { quality: true, bedtime: true, wakeTime: true },
          orderBy: { date: "desc" },
          take: 7,
        }),
        db.healthProfile.findUnique({ where: { userId: ctx.session.user.id } }),
        db.weightLog.findMany({
          where: { userId: ctx.session.user.id },
          orderBy: { date: "desc" },
          take: 1,
        }),
        db.stepLog.findFirst({
          where: { userId: ctx.session.user.id, date: { gte: todayStart, lte: todayEnd } },
        }),
        db.foodLog.aggregate({
          where: { userId: ctx.session.user.id, date: { gte: todayStart, lte: todayEnd } },
          _sum: { calories: true },
        }),
      ]);

    const avgSleep =
      sleepLogs.length > 0
        ? sleepLogs.reduce((s, l) => s + calcSleepHours(l.bedtime, l.wakeTime), 0) / sleepLogs.length
        : null;

    // BMI
    let bmi: number | null = null;
    if (profile?.heightCm && profile.weightKg) {
      const hm = profile.heightCm / 100;
      bmi = Math.round((profile.weightKg / (hm * hm)) * 10) / 10;
    }

    return {
      waterToday: waterToday._sum.amount ?? 0,
      waterGoal: profile?.dailyWaterGoalMl ?? 2500,
      workouts30d,
      avgSleepHours: avgSleep ? Math.round(avgSleep * 10) / 10 : null,
      avgSleepQuality: sleepLogs.length > 0 ? Math.round((sleepLogs.reduce((s, l) => s + l.quality, 0) / sleepLogs.length) * 10) / 10 : null,
      latestWeightKg: weightLogs[0]?.weightKg ?? profile?.weightKg ?? null,
      targetWeightKg: profile?.targetWeightKg ?? null,
      stepsToday: stepsToday?.steps ?? 0,
      stepGoal: profile?.dailyStepGoal ?? 8000,
      caloriesToday: foodToday._sum.calories ?? 0,
      calorieGoal: profile?.dailyCalorieGoal ?? 2000,
      bmi,
      profile,
    };
  }),

  // ── Reports (date range) ─────────────────────────────────────────────────────

  reports: router({
    range: READ.input(
      z.object({
        from: z.string(),
        to: z.string(),
      })
    ).query(async ({ ctx, input }) => {
      const from = new Date(input.from);
      const to = new Date(input.to + "T23:59:59");

      const [weights, waterLogs, workouts, sleepLogs, stepLogs, foodLogs] = await Promise.all([
        db.weightLog.findMany({ where: { userId: ctx.session.user.id, date: { gte: from, lte: to } }, orderBy: { date: "asc" } }),
        db.waterLog.findMany({ where: { userId: ctx.session.user.id, date: { gte: from, lte: to } }, orderBy: { date: "asc" } }),
        db.workoutLog.findMany({ where: { userId: ctx.session.user.id, date: { gte: from, lte: to } }, orderBy: { date: "asc" } }),
        db.sleepLog.findMany({ where: { userId: ctx.session.user.id, date: { gte: from, lte: to } }, orderBy: { date: "asc" } }),
        db.stepLog.findMany({ where: { userId: ctx.session.user.id, date: { gte: from, lte: to } }, orderBy: { date: "asc" } }),
        db.foodLog.findMany({ where: { userId: ctx.session.user.id, date: { gte: from, lte: to } }, orderBy: { date: "asc" } }),
      ]);

      // Group water by day
      const waterByDay = new Map<string, number>();
      for (const l of waterLogs) {
        const k = toDay(new Date(l.date)).toISOString().slice(0, 10);
        waterByDay.set(k, (waterByDay.get(k) ?? 0) + l.amount);
      }

      // Group calories by day
      const caloriesByDay = new Map<string, { consumed: number; burned: number }>();
      for (const l of foodLogs) {
        const k = toDay(new Date(l.date)).toISOString().slice(0, 10);
        const cur = caloriesByDay.get(k) ?? { consumed: 0, burned: 0 };
        caloriesByDay.set(k, { ...cur, consumed: cur.consumed + l.calories });
      }
      for (const w of workouts) {
        const k = toDay(new Date(w.date)).toISOString().slice(0, 10);
        const cur = caloriesByDay.get(k) ?? { consumed: 0, burned: 0 };
        caloriesByDay.set(k, { ...cur, burned: cur.burned + (w.calories ?? 0) });
      }

      return {
        weights: weights.map((w) => ({ date: w.date.toISOString().slice(0, 10), weightKg: w.weightKg })),
        waterByDay: Array.from(waterByDay.entries()).map(([date, total]) => ({ date, total })),
        caloriesByDay: Array.from(caloriesByDay.entries()).map(([date, v]) => ({ date, ...v })),
        sleepByDay: sleepLogs.map((l) => ({
          date: l.date.toISOString().slice(0, 10),
          hours: calcSleepHours(l.bedtime, l.wakeTime),
          quality: l.quality,
        })),
        stepsByDay: stepLogs.map((l) => ({ date: l.date.toISOString().slice(0, 10), steps: l.steps })),
      };
    }),
  }),
});
