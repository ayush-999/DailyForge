import { z } from "zod";
import { router, appProcedure } from "../trpc/index";
import { db } from "@dailyforge/db";
import { createNotification } from "../lib/notify";

const READ = appProcedure("todo", "todos:read");
const WRITE = appProcedure("todo", "todos:write");
const DEL = appProcedure("todo", "todos:delete");

function todayRange() {
  const now = new Date();
  return {
    gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
  };
}

function tomorrowRange() {
  const now = new Date();
  return {
    gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
    lte: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999),
  };
}

export const todoRouter = router({
  // ── Lists / Projects ────────────────────────────────────────────────────────

  lists: router({
    list: READ.query(async ({ ctx }) =>
      db.todoList.findMany({
        where: { userId: ctx.session.user.id },
        include: { _count: { select: { todos: { where: { completed: false } } } } },
        orderBy: { createdAt: "asc" },
      })
    ),

    create: WRITE.input(
      z.object({ name: z.string().min(1).max(100), color: z.string().optional() })
    ).mutation(async ({ ctx, input }) => {
      const list = await db.todoList.create({
        data: { userId: ctx.session.user.id, name: input.name, color: input.color ?? "#6366f1" },
      });
      void createNotification(ctx.session.user.id, "list_created", `List "${input.name}" created`);
      return list;
    }),

    update: WRITE.input(
      z.object({ id: z.string(), name: z.string().min(1).max(100).optional(), color: z.string().optional() })
    ).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return db.todoList.update({ where: { id, userId: ctx.session.user.id }, data });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.todoList.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),

  // ── Items ────────────────────────────────────────────────────────────────────

  items: router({
    list: READ.input(
      z.object({
        listId: z.string().nullable().optional(),
        filter: z.enum(["all", "today", "tomorrow", "completed"]).default("all"),
        search: z.string().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
        status: z.enum(["todo", "in_progress", "done"]).optional(),
        quadrant: z.enum(["ui", "nui", "uni", "nuni"]).optional(),
      })
    ).query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = { userId };

      if (input.listId !== undefined) where.todoListId = input.listId;
      if (input.priority) where.priority = input.priority;
      if (input.status) where.status = input.status;

      if (input.quadrant === "ui")   { where.isUrgent = true;  where.isImportant = true; }
      if (input.quadrant === "nui")  { where.isUrgent = false; where.isImportant = true; }
      if (input.quadrant === "uni")  { where.isUrgent = true;  where.isImportant = false; }
      if (input.quadrant === "nuni") { where.isUrgent = false; where.isImportant = false; }

      if (input.filter === "today")         { where.dueDate = todayRange();    where.completed = false; }
      else if (input.filter === "tomorrow") { where.dueDate = tomorrowRange(); where.completed = false; }
      else if (input.filter === "completed") { where.completed = true; }
      else { where.completed = false; }

      if (input.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      return db.todo.findMany({
        where,
        include: {
          subtasks: { orderBy: { sortOrder: "asc" } },
          todoList: { select: { id: true, name: true, color: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    }),

    create: WRITE.input(
      z.object({
        title: z.string().min(1).max(500),
        description: z.string().max(2000).optional(),
        listId: z.string().nullable().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
        dueDate: z.string().nullable().optional(),
        status: z.enum(["todo", "in_progress", "done"]).default("todo"),
        isUrgent: z.boolean().default(false),
        isImportant: z.boolean().default(true),
        estimatedMinutes: z.number().int().min(1).optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      const todo = await db.todo.create({
        data: {
          userId: ctx.session.user.id,
          todoListId: input.listId ?? null,
          title: input.title,
          description: input.description,
          priority: input.priority,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          status: input.status,
          isUrgent: input.isUrgent,
          isImportant: input.isImportant,
          estimatedMinutes: input.estimatedMinutes,
        },
        include: {
          subtasks: true,
          todoList: { select: { id: true, name: true, color: true } },
        },
      });
      void createNotification(ctx.session.user.id, "todo_created", `Task added: "${input.title}"`);
      return todo;
    }),

    update: WRITE.input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().max(2000).nullable().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
        dueDate: z.string().nullable().optional(),
        status: z.enum(["todo", "in_progress", "done"]).optional(),
        isUrgent: z.boolean().optional(),
        isImportant: z.boolean().optional(),
        estimatedMinutes: z.number().int().min(1).nullable().optional(),
        listId: z.string().nullable().optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      const { id, dueDate, listId, ...rest } = input;
      return db.todo.update({
        where: { id, userId: ctx.session.user.id },
        data: {
          ...rest,
          ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
          ...(listId !== undefined ? { todoListId: listId } : {}),
        },
        include: {
          subtasks: true,
          todoList: { select: { id: true, name: true, color: true } },
        },
      });
    }),

    toggle: WRITE.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const todo = await db.todo.findUniqueOrThrow({ where: { id: input.id, userId: ctx.session.user.id } });
      const nowCompleted = !todo.completed;
      const timerElapsed =
        todo.timerStartedAt && nowCompleted
          ? Math.round((Date.now() - todo.timerStartedAt.getTime()) / 60000)
          : 0;
      const updated = await db.todo.update({
        where: { id: input.id },
        data: {
          completed: nowCompleted,
          completedAt: nowCompleted ? new Date() : null,
          status: nowCompleted ? "done" : "todo",
          ...(timerElapsed > 0
            ? { actualMinutes: todo.actualMinutes + timerElapsed, timerStartedAt: null }
            : {}),
        },
        include: {
          subtasks: true,
          todoList: { select: { id: true, name: true, color: true } },
        },
      });
      if (nowCompleted) void createNotification(ctx.session.user.id, "todo_completed", `Task completed: "${todo.title}"`);
      return updated;
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.todo.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),

    setStatus: WRITE.input(
      z.object({ id: z.string(), status: z.enum(["todo", "in_progress", "done"]) })
    ).mutation(async ({ ctx, input }) => {
      const todo = await db.todo.findUniqueOrThrow({ where: { id: input.id, userId: ctx.session.user.id } });
      const nowCompleted = input.status === "done";
      const timerElapsed =
        todo.timerStartedAt && input.status !== "in_progress"
          ? Math.round((Date.now() - todo.timerStartedAt.getTime()) / 60000)
          : 0;
      return db.todo.update({
        where: { id: input.id },
        data: {
          status: input.status,
          completed: nowCompleted,
          completedAt: nowCompleted ? new Date() : null,
          ...(timerElapsed > 0
            ? { actualMinutes: todo.actualMinutes + timerElapsed, timerStartedAt: null }
            : {}),
        },
        include: {
          subtasks: true,
          todoList: { select: { id: true, name: true, color: true } },
        },
      });
    }),
  }),

  // ── Subtasks ─────────────────────────────────────────────────────────────────

  subtasks: router({
    create: WRITE.input(
      z.object({ todoId: z.string(), title: z.string().min(1).max(300) })
    ).mutation(async ({ ctx, input }) => {
      await db.todo.findUniqueOrThrow({ where: { id: input.todoId, userId: ctx.session.user.id } });
      return db.subtask.create({ data: { todoId: input.todoId, title: input.title } });
    }),

    toggle: WRITE.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const sub = await db.subtask.findUniqueOrThrow({
        where: { id: input.id },
        include: { todo: { select: { userId: true } } },
      });
      if (sub.todo.userId !== ctx.session.user.id) throw new Error("Forbidden");
      return db.subtask.update({ where: { id: input.id }, data: { completed: !sub.completed } });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const sub = await db.subtask.findUniqueOrThrow({
        where: { id: input.id },
        include: { todo: { select: { userId: true } } },
      });
      if (sub.todo.userId !== ctx.session.user.id) throw new Error("Forbidden");
      await db.subtask.delete({ where: { id: input.id } });
      return { ok: true };
    }),
  }),

  // ── Timer ────────────────────────────────────────────────────────────────────

  timer: router({
    start: WRITE.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const todo = await db.todo.findUniqueOrThrow({ where: { id: input.id, userId: ctx.session.user.id } });
      if (todo.timerStartedAt) return todo;
      return db.todo.update({
        where: { id: input.id },
        data: { timerStartedAt: new Date(), status: "in_progress" },
        include: { subtasks: true, todoList: { select: { id: true, name: true, color: true } } },
      });
    }),

    stop: WRITE.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      const todo = await db.todo.findUniqueOrThrow({ where: { id: input.id, userId: ctx.session.user.id } });
      if (!todo.timerStartedAt) return todo;
      const elapsed = Math.round((Date.now() - todo.timerStartedAt.getTime()) / 60000);
      return db.todo.update({
        where: { id: input.id },
        data: { timerStartedAt: null, actualMinutes: todo.actualMinutes + elapsed },
        include: { subtasks: true, todoList: { select: { id: true, name: true, color: true } } },
      });
    }),
  }),
});
