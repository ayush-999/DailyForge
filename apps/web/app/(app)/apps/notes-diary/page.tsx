"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { AppNotInstalled } from "@/components/app-not-installed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { NotebookPen, Plus, Trash2, Pin, Search, BookOpen, FileText } from "lucide-react";
import toast from "react-hot-toast";

type Note = { id: string; title: string; content: string; tags: string[]; isPinned: boolean; isJournal: boolean; journalDate: Date | null; createdAt: Date; updatedAt: Date };

function timeAgo(d: Date | string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotesDiaryPage() {
  const [tab, setTab] = useState<"notes"|"journal">("notes");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const utils = trpc.useUtils();
  const isJournal = tab === "journal";

  const { data: notes = [], isLoading, error } = trpc.notes.list.useQuery(
    { isJournal, search: search || undefined },
    { retry: false }
  );
  const create = trpc.notes.create.useMutation({
    onSuccess: (n) => { utils.notes.list.invalidate(); setSelectedId(n.id); setEditTitle(n.title); setEditContent(n.content); setDirty(false); toast.success(`${isJournal ? "Entry" : "Note"} created`); },
    onError: e => toast.error(e.message),
  });
  const update = trpc.notes.update.useMutation({ onSuccess: () => { utils.notes.list.invalidate(); setDirty(false); }, onError: e => toast.error(e.message) });
  const del = trpc.notes.delete.useMutation({ onSuccess: () => { utils.notes.list.invalidate(); setSelectedId(null); toast.success("Deleted"); } });
  const pin = trpc.notes.update.useMutation({ onSuccess: () => utils.notes.list.invalidate() });

  const selected = notes.find(n => n.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) return;
    setEditTitle(selected.title);
    setEditContent(selected.content);
    setDirty(false);
  }, [selectedId]);

  const scheduleSave = (title: string, content: string) => {
    setDirty(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!selectedId) return;
      update.mutate({ id: selectedId, title, content });
    }, 1200);
  };

  const handleNew = () => {
    const title = isJournal
      ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : "Untitled";
    create.mutate({ title, isJournal, journalDate: isJournal ? new Date().toISOString() : undefined });
  };

  if (error?.data?.code === "FORBIDDEN") {
    return (
      <AppNotInstalled
        slug="notes-diary" name="Notes & Diary"
        description="A private space for journaling, quick notes, and rich-text documents."
        icon={<NotebookPen className="h-8 w-8 text-white" />}
        iconBg="bg-amber-500"
        scopes={["notes:read","notes:write","notes:delete"]}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Left: list */}
      <div className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-[#0a0a0b]">
        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-white/10">
          {(["notes","journal"] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setSelectedId(null); }} className={cn("flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors", tab === t ? "border-b-2 border-amber-500 text-amber-600 dark:text-amber-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}>
              {t === "notes" ? <FileText className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
              {t === "notes" ? "Notes" : "Journal"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
            <Input className="pl-8 text-xs h-8" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* New button */}
        <div className="px-2 pb-2">
          <Button size="sm" className="w-full gap-1.5 bg-amber-500 hover:bg-amber-600 text-xs" onClick={handleNew} disabled={create.isPending}>
            <Plus className="h-3.5 w-3.5" /> New {tab === "journal" ? "Entry" : "Note"}
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex h-20 items-center justify-center"><Spinner className="h-5 w-5" /></div>
          ) : notes.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-zinc-400">No {tab === "journal" ? "entries" : "notes"} yet</p>
          ) : (
            notes.map(n => (
              <button key={n.id} onClick={() => setSelectedId(n.id === selectedId ? null : n.id)}
                className={cn("w-full text-left px-3 py-2.5 border-b border-zinc-100 dark:border-white/5 transition-colors", n.id === selectedId ? "bg-amber-50 dark:bg-amber-500/10" : "hover:bg-white dark:hover:bg-white/5")}>
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">{n.isPinned && "📌 "}{n.title}</p>
                </div>
                <p className="mt-0.5 text-[10px] text-zinc-400 truncate">{n.content.slice(0, 60) || "Empty"}</p>
                <p className="mt-0.5 text-[10px] text-zinc-300 dark:text-zinc-600">{timeAgo(n.updatedAt)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: editor */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!selectedId ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <NotebookPen className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500">Select a {tab === "journal" ? "journal entry" : "note"} to edit, or create a new one</p>
          </div>
        ) : (
          <>
            {/* Editor toolbar */}
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5 py-2.5 dark:border-white/10 dark:bg-[#0f0f10]">
              <div className="flex items-center gap-2">
                {dirty && <span className="text-xs text-zinc-400">Saving…</span>}
                {!dirty && update.isSuccess && <span className="text-xs text-green-500">Saved</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => pin.mutate({ id: selectedId, isPinned: !(selected?.isPinned) })}
                  className={cn("rounded-lg p-1.5 transition-colors", selected?.isPinned ? "text-amber-500" : "text-zinc-400 hover:text-amber-500")}>
                  <Pin className="h-4 w-4" />
                </button>
                <button onClick={() => del.mutate({ id: selectedId })} className="rounded-lg p-1.5 text-zinc-400 hover:text-red-500">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Title */}
            <input
              className="shrink-0 border-b border-zinc-100 bg-white px-6 py-4 text-xl font-bold text-zinc-900 placeholder-zinc-300 focus:outline-none dark:border-white/5 dark:bg-[#0f0f10] dark:text-white dark:placeholder-zinc-600"
              placeholder="Title"
              value={editTitle}
              onChange={e => { setEditTitle(e.target.value); scheduleSave(e.target.value, editContent); }}
            />

            {/* Content */}
            <textarea
              className="flex-1 resize-none bg-white px-6 py-4 text-sm leading-relaxed text-zinc-800 placeholder-zinc-300 focus:outline-none dark:bg-[#0f0f10] dark:text-zinc-200 dark:placeholder-zinc-600"
              placeholder={tab === "journal" ? "Write about your day…" : "Start writing…"}
              value={editContent}
              onChange={e => { setEditContent(e.target.value); scheduleSave(editTitle, e.target.value); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
