import { z } from "zod";
import { router, appProcedure } from "../trpc/index";
import { db } from "@dailyforge/db";

const READ = appProcedure("notes-diary", "notes:read");
const WRITE = appProcedure("notes-diary", "notes:write");
const DEL = appProcedure("notes-diary", "notes:delete");

const NOTE_SELECT = {
  id: true, title: true, content: true, tags: true,
  isPinned: true, isJournal: true, journalDate: true,
  mood: true, reminderAt: true, folderId: true,
  createdAt: true, updatedAt: true,
  folder: { select: { id: true, name: true, color: true } },
} as const;

export const notesRouter = router({
  // ── Folders ──────────────────────────────────────────────────────────────────

  folders: router({
    list: READ.query(async ({ ctx }) =>
      db.noteFolder.findMany({
        where: { userId: ctx.session.user.id },
        include: { _count: { select: { notes: true } } },
        orderBy: { createdAt: "asc" },
      })
    ),

    create: WRITE.input(
      z.object({ name: z.string().min(1).max(100), color: z.string().optional() })
    ).mutation(async ({ ctx, input }) =>
      db.noteFolder.create({
        data: { userId: ctx.session.user.id, name: input.name, color: input.color ?? "#f59e0b" },
      })
    ),

    update: WRITE.input(
      z.object({ id: z.string(), name: z.string().min(1).max(100).optional(), color: z.string().optional() })
    ).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return db.noteFolder.update({ where: { id, userId: ctx.session.user.id }, data });
    }),

    delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
      await db.noteFolder.delete({ where: { id: input.id, userId: ctx.session.user.id } });
      return { ok: true };
    }),
  }),

  // ── Notes ────────────────────────────────────────────────────────────────────

  list: READ.input(
    z.object({
      isJournal: z.boolean().optional(),
      folderId: z.string().nullable().optional(),
      tag: z.string().optional(),
      search: z.string().optional(),
      mood: z.string().optional(),
    })
  ).query(async ({ ctx, input }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: ctx.session.user.id };
    if (input.isJournal !== undefined) where.isJournal = input.isJournal;
    if (input.folderId !== undefined) where.folderId = input.folderId;
    if (input.mood) where.mood = input.mood;
    if (input.tag) where.tags = { has: input.tag };
    if (input.search) {
      where.OR = [
        { title: { contains: input.search, mode: "insensitive" } },
        { content: { contains: input.search, mode: "insensitive" } },
      ];
    }
    return db.note.findMany({
      where,
      select: NOTE_SELECT,
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    });
  }),

  get: READ.input(z.object({ id: z.string() })).query(async ({ ctx, input }) =>
    db.note.findUnique({
      where: { id: input.id, userId: ctx.session.user.id },
      include: { folder: { select: { id: true, name: true, color: true } } },
    })
  ),

  create: WRITE.input(
    z.object({
      title: z.string().min(1).max(300),
      content: z.string().default(""),
      isJournal: z.boolean().default(false),
      journalDate: z.string().optional(),
      tags: z.array(z.string()).default([]),
      folderId: z.string().nullable().optional(),
      mood: z.string().nullable().optional(),
      reminderAt: z.string().nullable().optional(),
    })
  ).mutation(async ({ ctx, input }) =>
    db.note.create({
      data: {
        userId: ctx.session.user.id,
        title: input.title,
        content: input.content,
        isJournal: input.isJournal,
        journalDate: input.journalDate ? new Date(input.journalDate) : null,
        tags: input.tags,
        folderId: input.folderId ?? null,
        mood: input.mood ?? null,
        reminderAt: input.reminderAt ? new Date(input.reminderAt) : null,
      },
      include: { folder: { select: { id: true, name: true, color: true } } },
    })
  ),

  update: WRITE.input(
    z.object({
      id: z.string(),
      title: z.string().min(1).max(300).optional(),
      content: z.string().optional(),
      isPinned: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
      journalDate: z.string().nullable().optional(),
      folderId: z.string().nullable().optional(),
      mood: z.string().nullable().optional(),
      reminderAt: z.string().nullable().optional(),
      saveVersion: z.boolean().default(false),
    })
  ).mutation(async ({ ctx, input }) => {
    const { id, journalDate, saveVersion, ...rest } = input;

    if (saveVersion) {
      const current = await db.note.findUnique({
        where: { id, userId: ctx.session.user.id },
        select: { title: true, content: true },
      });
      if (current) {
        await db.noteVersion.create({ data: { noteId: id, title: current.title, content: current.content } });
      }
    }

    return db.note.update({
      where: { id, userId: ctx.session.user.id },
      data: {
        ...rest,
        ...(journalDate !== undefined ? { journalDate: journalDate ? new Date(journalDate) : null } : {}),
      },
      include: { folder: { select: { id: true, name: true, color: true } } },
    });
  }),

  delete: DEL.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await db.note.delete({ where: { id: input.id, userId: ctx.session.user.id } });
    return { ok: true };
  }),

  // ── Versions ─────────────────────────────────────────────────────────────────

  versions: router({
    list: READ.input(z.object({ noteId: z.string() })).query(async ({ ctx, input }) => {
      await db.note.findUniqueOrThrow({ where: { id: input.noteId, userId: ctx.session.user.id } });
      return db.noteVersion.findMany({
        where: { noteId: input.noteId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, title: true, createdAt: true, content: true },
      });
    }),

    restore: WRITE.input(z.object({ noteId: z.string(), versionId: z.string() })).mutation(
      async ({ ctx, input }) => {
        const note = await db.note.findUniqueOrThrow({ where: { id: input.noteId, userId: ctx.session.user.id } });
        const version = await db.noteVersion.findUniqueOrThrow({
          where: { id: input.versionId, noteId: input.noteId },
        });
        await db.noteVersion.create({ data: { noteId: input.noteId, title: note.title, content: note.content } });
        return db.note.update({
          where: { id: input.noteId },
          data: { title: version.title, content: version.content },
          include: { folder: { select: { id: true, name: true, color: true } } },
        });
      }
    ),
  }),
});
