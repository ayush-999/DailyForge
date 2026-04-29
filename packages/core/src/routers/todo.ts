import { z } from "zod";
import { router, appProcedure } from "../trpc/index";
import { db } from "@dailyforge/db";

const READ = appProcedure("todo", "todos:read");
const WRITE = appProcedure("todo", "todos:write");
const DEL = appProcedure("todo", "todos:delete");

export const todoRouter = router({
  lists: router({
    list: READ.query(async ({ ctx }) => {
      return db.todoList.findMany({
        where: { userId: ctx.session.user.id },
        include: {
          _count: { select: { todos: { where: { completed: false } } } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

    create: WRITE.input(
      z.object({
        name: z.string().min(1).max(100),
        color: z.string().optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      return db.todoList.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          color: input.color ?? "#6366f1",
        },
      });
    }),

    rename: WRITE.input(
      z.object({ id: z.string(), name: z.string().min(1).max(100) })
    ).mutation(async ({ ctx, input }) => {
      return db.todoList.update({
        where: { id: input.id, userId: ctx.session.user.id },
        data: { name: input.name },
      });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(
      async ({ ctx, input }) => {
        await db.todoList.delete({
          where: { id: input.id, userId: ctx.session.user.id },
        });
        return { ok: true };
      }
    ),
  }),

  items: router({
    list: READ.input(
      z.object({
        listId: z.string().optional(),
        filter: z.enum(["all", "today", "completed"]).default("all"),
      })
    ).query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      );

      type WhereClause = {
        userId: string;
        todoListId?: string | null;
        completed?: boolean;
        dueDate?: { gte: Date; lte: Date };
      };

      const where: WhereClause = { userId };

      if (input.listId) {
        where.todoListId = input.listId;
      }

      if (input.filter === "today") {
        where.dueDate = { gte: todayStart, lte: todayEnd };
        where.completed = false;
      } else if (input.filter === "completed") {
        where.completed = true;
      } else {
        where.completed = false;
      }

      return db.todo.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    }),

    create: WRITE.input(
      z.object({
        title: z.string().min(1).max(500),
        listId: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
        dueDate: z.string().datetime().optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      return db.todo.create({
        data: {
          userId: ctx.session.user.id,
          todoListId: input.listId ?? null,
          title: input.title,
          priority: input.priority,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        },
      });
    }),

    update: WRITE.input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(500).optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
        dueDate: z.string().datetime().nullable().optional(),
        description: z.string().max(2000).optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      const { id, dueDate, ...rest } = input;
      return db.todo.update({
        where: { id, userId: ctx.session.user.id },
        data: {
          ...rest,
          ...(dueDate !== undefined
            ? { dueDate: dueDate ? new Date(dueDate) : null }
            : {}),
        },
      });
    }),

    toggle: WRITE.input(z.object({ id: z.string() })).mutation(
      async ({ ctx, input }) => {
        const todo = await db.todo.findUniqueOrThrow({
          where: { id: input.id, userId: ctx.session.user.id },
        });
        return db.todo.update({
          where: { id: input.id },
          data: {
            completed: !todo.completed,
            completedAt: !todo.completed ? new Date() : null,
          },
        });
      }
    ),

    delete: DEL.input(z.object({ id: z.string() })).mutation(
      async ({ ctx, input }) => {
        await db.todo.delete({
          where: { id: input.id, userId: ctx.session.user.id },
        });
        return { ok: true };
      }
    ),
  }),
});
