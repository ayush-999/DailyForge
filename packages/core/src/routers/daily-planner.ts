import { z } from "zod";
import { router, appProcedure } from "../trpc/index";
import { db } from "@dailyforge/db";

const READ = appProcedure("daily-planner", "planner:read");
const WRITE = appProcedure("daily-planner", "planner:write");
const DEL = appProcedure("daily-planner", "planner:delete");

export const dailyPlannerRouter = router({
  blocks: router({
    list: READ.input(z.object({ date: z.string() })).query(async ({ ctx, input }) => {
      const day = new Date(input.date);
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const end = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
      return db.timeBlock.findMany({
        where: { userId: ctx.session.user.id, date: { gte: start, lte: end } },
        orderBy: { startTime: "asc" },
      });
    }),

    create: WRITE.input(
      z.object({
        date: z.string(),
        title: z.string().min(1).max(200),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        color: z.string().optional(),
        description: z.string().max(1000).optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      return db.timeBlock.create({
        data: {
          userId: ctx.session.user.id,
          date: new Date(input.date),
          title: input.title,
          startTime: input.startTime,
          endTime: input.endTime,
          color: input.color ?? "#6366f1",
          description: input.description,
        },
      });
    }),

    update: WRITE.input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        color: z.string().optional(),
        description: z.string().max(1000).nullable().optional(),
        completed: z.boolean().optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return db.timeBlock.update({
        where: { id, userId: ctx.session.user.id },
        data,
      });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.timeBlock.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),
});
