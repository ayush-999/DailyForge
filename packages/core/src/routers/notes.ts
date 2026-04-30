import { z } from "zod";
import { router, appProcedure } from "../trpc/index";
import { db } from "@dailyforge/db";

const READ = appProcedure("notes-diary", "notes:read");
const WRITE = appProcedure("notes-diary", "notes:write");
const DEL = appProcedure("notes-diary", "notes:delete");

export const notesRouter = router({
  list: READ.input(
    z.object({
      isJournal: z.boolean().optional(),
      search: z.string().optional(),
    })
  ).query(async ({ ctx, input }) => {
    return db.note.findMany({
      where: {
        userId: ctx.session.user.id,
        ...(input.isJournal !== undefined ? { isJournal: input.isJournal } : {}),
        ...(input.search
          ? {
              OR: [
                { title: { contains: input.search, mode: "insensitive" } },
                { content: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      select: { id: true, title: true, content: true, tags: true, isPinned: true, isJournal: true, journalDate: true, createdAt: true, updatedAt: true },
    });
  }),

  get: READ.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    return db.note.findUnique({
      where: { id: input.id, userId: ctx.session.user.id },
    });
  }),

  create: WRITE.input(
    z.object({
      title: z.string().min(1).max(300),
      content: z.string().default(""),
      isJournal: z.boolean().default(false),
      journalDate: z.string().optional(),
      tags: z.array(z.string()).default([]),
    })
  ).mutation(async ({ ctx, input }) => {
    return db.note.create({
      data: {
        userId: ctx.session.user.id,
        title: input.title,
        content: input.content,
        isJournal: input.isJournal,
        journalDate: input.journalDate ? new Date(input.journalDate) : null,
        tags: input.tags,
      },
    });
  }),

  update: WRITE.input(
    z.object({
      id: z.string(),
      title: z.string().min(1).max(300).optional(),
      content: z.string().optional(),
      isPinned: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      journalDate: z.string().nullable().optional(),
    })
  ).mutation(async ({ ctx, input }) => {
    const { id, journalDate, ...rest } = input;
    return db.note.update({
      where: { id, userId: ctx.session.user.id },
      data: {
        ...rest,
        ...(journalDate !== undefined
          ? { journalDate: journalDate ? new Date(journalDate) : null }
          : {}),
      },
    });
  }),

  delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await db.note.delete({ where: { id: input.id, userId: ctx.session.user.id } });
    return { ok: true };
  }),
});
