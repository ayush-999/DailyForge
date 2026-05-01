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

function monthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function nextDueDate(frequency: string, dayOfMonth: number | null, dayOfWeek: number | null): Date {
  const now = new Date();
  if (frequency === "monthly" && dayOfMonth) {
    const d = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    if (d <= now) d.setMonth(d.getMonth() + 1);
    return d;
  }
  if (frequency === "weekly" && dayOfWeek !== null) {
    const d = new Date(now);
    const diff = (dayOfWeek - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d;
  }
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}

export const expenseRouter = router({
  // ── Categories ──────────────────────────────────────────────────────────────

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
      return db.expenseCategory.upsert({
        where: { userId_name: { userId: ctx.session.user.id, name: input.name } },
        update: { color: input.color, icon: input.icon, budget: input.budget ?? null },
        create: { userId: ctx.session.user.id, name: input.name, color: input.color, icon: input.icon, budget: input.budget ?? null },
      });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.expenseCategory.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),

  // ── Entries ─────────────────────────────────────────────────────────────────

  entries: router({
    list: READ.input(
      z.object({
        year: z.number().int(),
        month: z.number().int().min(1).max(12),
        categoryId: z.string().optional().nullable(),
        type: z.enum(["expense", "income"]).optional(),
        search: z.string().optional(),
      })
    ).query(async ({ ctx, input }) => {
      const { start, end } = monthRange(input.year, input.month);
      return db.expense.findMany({
        where: {
          userId: ctx.session.user.id,
          date: { gte: start, lte: end },
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.search ? { description: { contains: input.search, mode: "insensitive" } } : {}),
        },
        include: { category: true },
        orderBy: { date: "desc" },
      });
    }),

    listRange: READ.input(
      z.object({
        from: z.string(),
        to: z.string(),
        categoryId: z.string().optional().nullable(),
        type: z.enum(["expense", "income"]).optional(),
        search: z.string().optional(),
      })
    ).query(async ({ ctx, input }) => {
      return db.expense.findMany({
        where: {
          userId: ctx.session.user.id,
          date: { gte: new Date(input.from), lte: new Date(input.to + "T23:59:59") },
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.search ? { description: { contains: input.search, mode: "insensitive" } } : {}),
        },
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
      const { start, end } = monthRange(input.year, input.month);
      const [expenses, categories] = await Promise.all([
        db.expense.findMany({
          where: { userId: ctx.session.user.id, date: { gte: start, lte: end } },
          include: { category: true },
        }),
        db.expenseCategory.findMany({ where: { userId: ctx.session.user.id } }),
      ]);

      const totalIncome = expenses.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const totalExpenses = expenses.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);
      const byCategory = categories.map((cat) => ({
        ...cat,
        spent: expenses.filter((e) => e.categoryId === cat.id && e.type === "expense").reduce((s, e) => s + e.amount, 0),
      }));
      const uncategorized = expenses.filter((e) => !e.categoryId && e.type === "expense").reduce((s, e) => s + e.amount, 0);

      return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses, byCategory, uncategorized };
    }),

    // 12-month bar chart data
    annual: READ.input(z.object({ year: z.number().int() })).query(async ({ ctx, input }) => {
      const start = new Date(input.year, 0, 1);
      const end = new Date(input.year, 11, 31, 23, 59, 59, 999);
      const entries = await db.expense.findMany({
        where: { userId: ctx.session.user.id, date: { gte: start, lte: end } },
        select: { date: true, amount: true, type: true },
      });
      const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        name: new Date(input.year, i).toLocaleString("en-US", { month: "short" }),
        income: 0,
        expenses: 0,
      }));
      for (const e of entries) {
        const m = new Date(e.date).getMonth();
        if (e.type === "income") months[m].income += e.amount;
        else months[m].expenses += e.amount;
      }
      return months;
    }),

    // CSV export — returns CSV string, client triggers download
    export: READ.input(
      z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) })
    ).query(async ({ ctx, input }) => {
      const { start, end } = monthRange(input.year, input.month);
      const entries = await db.expense.findMany({
        where: { userId: ctx.session.user.id, date: { gte: start, lte: end } },
        include: { category: true },
        orderBy: { date: "desc" },
      });
      const rows = [
        ["Date", "Type", "Description", "Category", "Amount"].join(","),
        ...entries.map((e) =>
          [
            new Date(e.date).toLocaleDateString("en-IN"),
            e.type,
            `"${e.description.replace(/"/g, '""')}"`,
            e.category?.name ?? "Uncategorized",
            e.amount.toFixed(2),
          ].join(",")
        ),
      ];
      return { csv: rows.join("\n") };
    }),
  }),

  // ── Recurring Transactions ──────────────────────────────────────────────────

  recurring: router({
    list: READ.query(async ({ ctx }) =>
      db.recurringExpense.findMany({
        where: { userId: ctx.session.user.id },
        include: { category: true },
        orderBy: { createdAt: "desc" },
      })
    ),

    create: WRITE.input(
      z.object({
        title: z.string().min(1).max(200),
        amount: z.number().min(0.01),
        type: z.enum(["expense", "income"]).default("expense"),
        categoryId: z.string().optional().nullable(),
        frequency: z.enum(["monthly", "weekly"]),
        dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
        dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
        notes: z.string().max(300).optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      const due = nextDueDate(input.frequency, input.dayOfMonth ?? null, input.dayOfWeek ?? null);
      return db.recurringExpense.create({
        data: { ...input, userId: ctx.session.user.id, nextDueAt: due },
        include: { category: true },
      });
    }),

    update: WRITE.input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        amount: z.number().min(0.01).optional(),
        type: z.enum(["expense", "income"]).optional(),
        categoryId: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        notes: z.string().max(300).optional().nullable(),
      })
    ).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return db.recurringExpense.update({
        where: { id, userId: ctx.session.user.id },
        data,
        include: { category: true },
      });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.recurringExpense.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),

    // Apply all due recurring entries as real transactions
    applyDue: WRITE.mutation(async ({ ctx }) => {
      const now = new Date();
      const due = await db.recurringExpense.findMany({
        where: { userId: ctx.session.user.id, isActive: true, nextDueAt: { lte: now } },
      });
      if (due.length === 0) return { applied: 0 };

      await db.expense.createMany({
        data: due.map((r) => ({
          userId: ctx.session.user.id,
          amount: r.amount,
          description: r.title,
          date: now,
          type: r.type,
          categoryId: r.categoryId,
        })),
      });

      // Advance nextDueAt for each
      await Promise.all(
        due.map((r) =>
          db.recurringExpense.update({
            where: { id: r.id },
            data: { nextDueAt: nextDueDate(r.frequency, r.dayOfMonth, r.dayOfWeek) },
          })
        )
      );

      return { applied: due.length };
    }),
  }),

  // ── Financial Goals ─────────────────────────────────────────────────────────

  goals: router({
    list: READ.query(async ({ ctx }) =>
      db.financialGoal.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
      })
    ),

    create: WRITE.input(
      z.object({
        title: z.string().min(1).max(200),
        targetAmount: z.number().min(1),
        savedAmount: z.number().min(0).default(0),
        deadline: z.string(),
        icon: z.string().max(10).default("🎯"),
        color: z.string().default("#6366f1"),
      })
    ).mutation(async ({ ctx, input }) =>
      db.financialGoal.create({
        data: { ...input, userId: ctx.session.user.id, deadline: new Date(input.deadline) },
      })
    ),

    update: WRITE.input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
        targetAmount: z.number().min(1).optional(),
        savedAmount: z.number().min(0).optional(),
        deadline: z.string().optional(),
        icon: z.string().max(10).optional(),
        color: z.string().optional(),
        isCompleted: z.boolean().optional(),
      })
    ).mutation(async ({ ctx, input }) => {
      const { id, deadline, ...rest } = input;
      return db.financialGoal.update({
        where: { id, userId: ctx.session.user.id },
        data: { ...rest, ...(deadline ? { deadline: new Date(deadline) } : {}) },
      });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.financialGoal.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),
});
