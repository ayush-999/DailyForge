import { z } from "zod";
import { router, appProcedure } from "../trpc/index";
import { db } from "@dailyforge/db";

const READ = appProcedure("expense-tracker", "expenses:read");
const WRITE = appProcedure("expense-tracker", "expenses:write");
const DEL = appProcedure("expense-tracker", "expenses:delete");

const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", color: "#ef4444", icon: "🍔" },
  { name: "Transport", color: "#f97316", icon: "🚗" },
  { name: "Housing", color: "#a855f7", icon: "🏠" },
  { name: "Entertainment", color: "#ec4899", icon: "🎬" },
  { name: "Healthcare", color: "#14b8a6", icon: "💊" },
  { name: "Shopping", color: "#6366f1", icon: "🛍️" },
  { name: "Utilities", color: "#64748b", icon: "⚡" },
  { name: "Other", color: "#78716c", icon: "📦" },
];

export const expenseRouter = router({
  categories: router({
    list: READ.query(async ({ ctx }) => {
      const existing = await db.expenseCategory.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { name: "asc" },
      });
      if (existing.length === 0) {
        await db.expenseCategory.createMany({
          data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: ctx.session.user.id })),
        });
        return db.expenseCategory.findMany({
          where: { userId: ctx.session.user.id },
          orderBy: { name: "asc" },
        });
      }
      return existing;
    }),

    upsert: WRITE.input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1).max(100),
        color: z.string(),
        icon: z.string().optional(),
        budget: z.number().min(0).optional().nullable(),
      })
    ).mutation(async ({ ctx, input }) => {
      if (input.id) {
        return db.expenseCategory.update({
          where: { id: input.id, userId: ctx.session.user.id },
          data: { name: input.name, color: input.color, icon: input.icon, budget: input.budget },
        });
      }
      return db.expenseCategory.create({
        data: { userId: ctx.session.user.id, ...input },
      });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.expenseCategory.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),

  entries: router({
    list: READ.input(
      z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) })
    ).query(async ({ ctx, input }) => {
      const start = new Date(input.year, input.month - 1, 1);
      const end = new Date(input.year, input.month, 0, 23, 59, 59, 999);
      return db.expense.findMany({
        where: { userId: ctx.session.user.id, date: { gte: start, lte: end } },
        include: { category: true },
        orderBy: { date: "desc" },
      });
    }),

    create: WRITE.input(
      z.object({
        amount: z.number().min(0.01),
        description: z.string().min(1).max(500),
        date: z.string(),
        type: z.enum(["expense", "income"]).default("expense"),
        categoryId: z.string().optional().nullable(),
      })
    ).mutation(async ({ ctx, input }) => {
      return db.expense.create({
        data: {
          userId: ctx.session.user.id,
          amount: input.amount,
          description: input.description,
          date: new Date(input.date),
          type: input.type,
          categoryId: input.categoryId ?? null,
        },
        include: { category: true },
      });
    }),

    update: WRITE.input(
      z.object({
        id: z.string(),
        amount: z.number().min(0.01).optional(),
        description: z.string().min(1).max(500).optional(),
        date: z.string().optional(),
        type: z.enum(["expense", "income"]).optional(),
        categoryId: z.string().nullable().optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      const { id, date, ...rest } = input;
      return db.expense.update({
        where: { id, userId: ctx.session.user.id },
        data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
        include: { category: true },
      });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.expense.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),

    summary: READ.input(
      z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) })
    ).query(async ({ ctx, input }) => {
      const start = new Date(input.year, input.month - 1, 1);
      const end = new Date(input.year, input.month, 0, 23, 59, 59, 999);

      const [expenses, categories] = await Promise.all([
        db.expense.findMany({
          where: { userId: ctx.session.user.id, date: { gte: start, lte: end } },
          include: { category: true },
        }),
        db.expenseCategory.findMany({ where: { userId: ctx.session.user.id } }),
      ]);

      const totalIncome = expenses
        .filter((e) => e.type === "income")
        .reduce((s, e) => s + e.amount, 0);
      const totalExpenses = expenses
        .filter((e) => e.type === "expense")
        .reduce((s, e) => s + e.amount, 0);

      const byCategory = categories.map((cat) => {
        const spent = expenses
          .filter((e) => e.categoryId === cat.id && e.type === "expense")
          .reduce((s, e) => s + e.amount, 0);
        return { ...cat, spent };
      });

      const uncategorized = expenses
        .filter((e) => !e.categoryId && e.type === "expense")
        .reduce((s, e) => s + e.amount, 0);

      return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses, byCategory, uncategorized };
    }),
  }),
});
