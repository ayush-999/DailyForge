import { z } from "zod";
import { router, appProcedure } from "../trpc/index";
import { db } from "@dailyforge/db";

const READ = appProcedure("productivity", "productivity:read");
const WRITE = appProcedure("productivity", "productivity:write");
const DEL = appProcedure("productivity", "productivity:delete");

export const pomodoroRouter = router({
  sessions: router({
    list: READ.input(z.object({ days: z.number().int().min(1).max(90).default(7) })).query(
      async ({ ctx, input }) => {
        const since = new Date();
        since.setDate(since.getDate() - input.days);
        return db.pomodoroSession.findMany({
          where: { userId: ctx.session.user.id, createdAt: { gte: since } },
          orderBy: { createdAt: "desc" },
        });
      }
    ),

    create: WRITE.input(
      z.object({
        taskLabel: z.string().max(200).optional(),
        duration: z.number().int().min(1).max(180),
        breakDuration: z.number().int().min(1).max(60).default(5),
        completedAt: z.string().optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      return db.pomodoroSession.create({
        data: {
          userId: ctx.session.user.id,
          taskLabel: input.taskLabel,
          duration: input.duration,
          breakDuration: input.breakDuration,
          completedAt: input.completedAt ? new Date(input.completedAt) : new Date(),
        },
      });
    }),

    todayStats: READ.query(async ({ ctx }) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const sessions = await db.pomodoroSession.findMany({
        where: {
          userId: ctx.session.user.id,
          completedAt: { not: null, gte: start },
        },
        select: { duration: true },
      });
      return {
        count: sessions.length,
        totalMinutes: sessions.reduce((s, p) => s + p.duration, 0),
      };
    }),

    weeklyStats: READ.query(async ({ ctx }) => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0, 0, 0, 0);
        return d;
      });

      const sessions = await db.pomodoroSession.findMany({
        where: {
          userId: ctx.session.user.id,
          completedAt: { not: null, gte: days[0] },
        },
        select: { duration: true, completedAt: true },
      });

      return days.map((day) => {
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        const daySessions = sessions.filter(
          (s) => s.completedAt && s.completedAt >= day && s.completedAt < next
        );
        return {
          date: day.toISOString().slice(0, 10),
          sessions: daySessions.length,
          minutes: daySessions.reduce((s, p) => s + p.duration, 0),
        };
      });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.pomodoroSession.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),
});
