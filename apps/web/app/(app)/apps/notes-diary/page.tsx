"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { AppNotInstalled } from "@/components/app-not-installed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  NotebookPen, Plus, Trash2, Pin, Search, BookOpen, FileText,
  FolderOpen, Tag, Clock, ChevronRight, X, History, Eye,
  Bold, Italic, Heading1, Heading2, List, Code, CheckSquare,
  Smile, RotateCcw, Folder, Pencil,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ────────────────────────────────────────────────────────────────────

type Note = {
  id: string; title: string; content: string; tags: string[];
  isPinned: boolean; isJournal: boolean; journalDate: Date | null;
  mood: string | null; reminderAt: Date | null; folderId: string | null;
  folder: { id: string; name: string; color: string } | null;
  createdAt: Date; updatedAt: Date;
};

type NoteFolder = { id: string; name: string; color: string; _count: { notes: number } };

// ── Constants ────────────────────────────────────────────────────────────────

const MOODS = [
  { key: "happy",   icon: "😊", label: "Happy" },
  { key: "excited", icon: "🤩", label: "Excited" },
  { key: "neutral", icon: "😐", label: "Neutral" },
  { key: "anxious", icon: "😰", label: "Anxious" },
  { key: "sad",     icon: "😢", label: "Sad" },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(d: Date | string) {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Simple markdown → plain-text preview (first line only)
function mdPreview(content: string) {
  return content.replace(/^#{1,6}\s+/gm, "").replace(/\*\*|__|\*|_|`|~~|>\s|^-\s/gm, "").slice(0, 80);
}

// Markdown → HTML for preview pane
function mdToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`{3}([\s\S]*?)`{3}/g, "<pre><code>$1</code></pre>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex gap-1.5"><span>✅</span><span class="line-through">$1</span></li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex gap-1.5"><span>⬜</span><span>$1</span></li>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n{2,}/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

// ── Toolbar action ────────────────────────────────────────────────────────────

function insertMarkdown(
  textarea: HTMLTextAreaElement,
  before: string,
  after = "",
  placeholder = "text"
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end) || placeholder;
  const replacement = before + selected + after;
  const newVal = textarea.value.slice(0, start) + replacement + textarea.value.slice(end);
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  nativeInputValueSetter?.call(textarea, newVal);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.focus();
  textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
}

// ── Editor Toolbar ────────────────────────────────────────────────────────────

function EditorToolbar({ textareaRef }: { textareaRef: React.RefObject<HTMLTextAreaElement | null> }) {
  const act = (before: string, after = "", ph = "text") => {
    if (textareaRef.current) insertMarkdown(textareaRef.current, before, after, ph);
  };
  const btn = (icon: React.ReactNode, title: string, action: () => void) => (
    <button type="button" title={title} onClick={action}
      className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200 transition-colors">
      {icon}
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-100 bg-white px-3 py-1.5 dark:border-white/5 dark:bg-[#0f0f10]">
      {btn(<Bold className="h-3.5 w-3.5" />, "Bold", () => act("**", "**"))}
      {btn(<Italic className="h-3.5 w-3.5" />, "Italic", () => act("*", "*"))}
      <div className="h-4 w-px bg-zinc-200 dark:bg-white/10 mx-0.5" />
      {btn(<Heading1 className="h-3.5 w-3.5" />, "Heading 1", () => act("# ", "", "Heading"))}
      {btn(<Heading2 className="h-3.5 w-3.5" />, "Heading 2", () => act("## ", "", "Heading"))}
      <div className="h-4 w-px bg-zinc-200 dark:bg-white/10 mx-0.5" />
      {btn(<List className="h-3.5 w-3.5" />, "Bullet list", () => act("- ", "", "Item"))}
      {btn(<CheckSquare className="h-3.5 w-3.5" />, "Checklist", () => act("- [ ] ", "", "Task"))}
      {btn(<Code className="h-3.5 w-3.5" />, "Inline code", () => act("`", "`"))}
      {btn(<span className="font-mono text-xs font-bold">{"</>"}</span>, "Code block", () => act("```\n", "\n```", "code"))}
      <div className="h-4 w-px bg-zinc-200 dark:bg-white/10 mx-0.5" />
      {btn(<Smile className="h-3.5 w-3.5" />, "Emoji", () => act("", "", "😊"))}
    </div>
  );
}

// ── Markdown Preview ──────────────────────────────────────────────────────────

function MarkdownPreview({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm max-w-none flex-1 overflow-y-auto px-6 py-4 text-zinc-800 dark:prose-invert dark:text-zinc-200
        prose-headings:font-semibold prose-headings:text-zinc-900 dark:prose-headings:text-white
        prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1 prose-code:text-sm dark:prose-code:bg-white/10
        prose-pre:rounded-lg prose-pre:bg-zinc-100 dark:prose-pre:bg-white/10"
      dangerouslySetInnerHTML={{ __html: mdToHtml(content) }}
    />
  );
}

// ── Version History Panel ─────────────────────────────────────────────────────

function VersionPanel({ noteId, onClose, onRestore }: {
  noteId: string; onClose: () => void; onRestore: () => void;
}) {
  const { data: versions = [], isLoading } = trpc.notes.versions.list.useQuery({ noteId }, { retry: false });
  const restore = trpc.notes.versions.restore.useMutation({
    onSuccess: () => { toast.success("Version restored"); onRestore(); onClose(); },
    onError: e => toast.error(e.message),
  });
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="flex w-64 shrink-0 flex-col border-l border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-[#0a0a0b]">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5 dark:border-white/5">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Version History</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X className="h-3.5 w-3.5" /></button>
      </div>
      {isLoading ? (
        <div className="flex h-20 items-center justify-center"><Spinner className="h-4 w-4" /></div>
      ) : versions.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-zinc-400">No saved versions yet.<br />Versions save on manual save.</p>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {versions.map(v => (
            <div key={v.id} className={cn("border-b border-zinc-100 px-3 py-2 dark:border-white/5", preview === v.id && "bg-amber-50 dark:bg-amber-500/10")}>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{v.title}</p>
              <p className="text-[10px] text-zinc-400">{new Date(v.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              <div className="mt-1.5 flex gap-1.5">
                <button onClick={() => setPreview(preview === v.id ? null : v.id)}
                  className="rounded bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300">
                  {preview === v.id ? "Hide" : "Preview"}
                </button>
                <button onClick={() => restore.mutate({ noteId, versionId: v.id })}
                  className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400">
                  Restore
                </button>
              </div>
              {preview === v.id && (
                <div className="mt-2 max-h-32 overflow-y-auto rounded bg-white px-2 py-1.5 text-[10px] text-zinc-600 dark:bg-[#0f0f10] dark:text-zinc-400 whitespace-pre-wrap">
                  {v.content || "(empty)"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({
  tab, setTab, folders, selectedFolder, setSelectedFolder,
  selectedTag, setSelectedTag, search, setSearch,
  notes, selectedId, setSelectedId, onNew, isLoading,
  allTags,
}: {
  tab: "notes" | "journal"; setTab: (t: "notes" | "journal") => void;
  folders: NoteFolder[]; selectedFolder: string | null; setSelectedFolder: (id: string | null) => void;
  selectedTag: string | null; setSelectedTag: (t: string | null) => void;
  search: string; setSearch: (s: string) => void;
  notes: Note[]; selectedId: string | null; setSelectedId: (id: string | null) => void;
  onNew: () => void; isLoading: boolean;
  allTags: string[];
}) {
  const [showFolders, setShowFolders] = useState(true);
  const [showTags, setShowTags] = useState(false);

  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-[#0a0a0b]">
      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-white/10">
        {(["notes", "journal"] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setSelectedId(null); }}
            className={cn("flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors",
              tab === t ? "border-b-2 border-amber-500 text-amber-600 dark:text-amber-400" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}>
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
        <Button size="sm" className="w-full gap-1.5 bg-amber-500 hover:bg-amber-600 text-xs" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" /> New {tab === "journal" ? "Entry" : "Note"}
        </Button>
      </div>

      {/* Folders (notes only) */}
      {tab === "notes" && (
        <div className="border-t border-zinc-100 dark:border-white/5">
          <button onClick={() => setShowFolders(v => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-600">
            <span className="flex items-center gap-1"><Folder className="h-3 w-3" />Folders</span>
            <ChevronRight className={cn("h-3 w-3 transition-transform", showFolders && "rotate-90")} />
          </button>
          {showFolders && (
            <div className="pb-1">
              <button onClick={() => setSelectedFolder(null)}
                className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                  !selectedFolder ? "text-amber-600 dark:text-amber-400" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}>
                <FolderOpen className="h-3 w-3" /> All Notes
              </button>
              {folders.map(f => (
                <button key={f.id} onClick={() => setSelectedFolder(selectedFolder === f.id ? null : f.id)}
                  className={cn("flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors",
                    selectedFolder === f.id ? "text-amber-600 dark:text-amber-400" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}>
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ background: f.color }} />
                  <span className="flex-1 truncate">{f.name}</span>
                  <span className="text-[10px] text-zinc-300 dark:text-zinc-600">{f._count.notes}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="border-t border-zinc-100 dark:border-white/5">
          <button onClick={() => setShowTags(v => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-600">
            <span className="flex items-center gap-1"><Tag className="h-3 w-3" />Tags</span>
            <ChevronRight className={cn("h-3 w-3 transition-transform", showTags && "rotate-90")} />
          </button>
          {showTags && (
            <div className="flex flex-wrap gap-1 px-3 pb-2">
              {allTags.map(tag => (
                <button key={tag} onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
                    selectedTag === tag ? "bg-amber-500 text-white" : "bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-white/10 dark:text-zinc-400")}>
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Note list */}
      <div className="flex-1 overflow-y-auto border-t border-zinc-100 dark:border-white/5">
        {isLoading ? (
          <div className="flex h-20 items-center justify-center"><Spinner className="h-5 w-5" /></div>
        ) : notes.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-zinc-400">No {tab === "journal" ? "entries" : "notes"} yet</p>
        ) : (
          notes.map(n => (
            <button key={n.id} onClick={() => setSelectedId(n.id === selectedId ? null : n.id)}
              className={cn("w-full text-left px-3 py-2.5 border-b border-zinc-100 dark:border-white/5 transition-colors",
                n.id === selectedId ? "bg-amber-50 dark:bg-amber-500/10" : "hover:bg-white dark:hover:bg-white/5")}>
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                  {n.isPinned && "📌 "}{n.mood ? MOODS.find(m => m.key === n.mood)?.icon + " " : ""}{n.title}
                </p>
                {n.folder && (
                  <div className="h-1.5 w-1.5 rounded-full shrink-0 mt-1" style={{ background: n.folder.color }} />
                )}
              </div>
              <p className="mt-0.5 text-[10px] text-zinc-400 truncate">{mdPreview(n.content) || "Empty"}</p>
              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                {n.tags.slice(0, 2).map(t => (
                  <span key={t} className="text-[9px] text-amber-600 dark:text-amber-400">#{t}</span>
                ))}
                <span className="ml-auto text-[9px] text-zinc-300 dark:text-zinc-600">{timeAgo(n.updatedAt)}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Note Metadata Panel ───────────────────────────────────────────────────────

function MetaPanel({
  note, folders, onUpdate, onClose,
}: {
  note: Note; folders: NoteFolder[]; onUpdate: (data: Partial<Note>) => void; onClose: () => void;
}) {
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (!tag || note.tags.includes(tag)) return;
    onUpdate({ tags: [...note.tags, tag] });
    setTagInput("");
  };

  const removeTag = (t: string) => onUpdate({ tags: note.tags.filter(x => x !== t) });

  return (
    <div className="flex w-56 shrink-0 flex-col border-l border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-[#0a0a0b] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2.5 dark:border-white/5">
        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Properties</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X className="h-3.5 w-3.5" /></button>
      </div>

      <div className="space-y-4 p-3">
        {/* Folder */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Folder</p>
          <select value={note.folderId ?? ""} onChange={e => onUpdate({ folderId: e.target.value || null } as Partial<Note>)}
            className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-white/10 dark:bg-[#0f0f10] dark:text-white focus:outline-none">
            <option value="">No folder</option>
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {/* Tags */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Tags</p>
          <div className="flex flex-wrap gap-1 mb-1.5">
            {note.tags.map(t => (
              <span key={t} className="flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                #{t}
                <button onClick={() => removeTag(t)} className="ml-0.5"><X className="h-2.5 w-2.5" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="#tag" className="h-7 text-xs flex-1"
              onKeyDown={e => { if (e.key === "Enter") addTag(); }} />
            <Button size="sm" className="h-7 px-2 text-xs bg-amber-500 hover:bg-amber-600" onClick={addTag}>+</Button>
          </div>
        </div>

        {/* Mood (journal only) */}
        {note.isJournal && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Mood</p>
            <div className="grid grid-cols-5 gap-1">
              {MOODS.map(m => (
                <button key={m.key} onClick={() => onUpdate({ mood: note.mood === m.key ? null : m.key } as Partial<Note>)}
                  title={m.label}
                  className={cn("flex items-center justify-center rounded-lg py-1 text-base transition-colors",
                    note.mood === m.key ? "bg-amber-100 ring-1 ring-amber-400 dark:bg-amber-500/20" : "hover:bg-zinc-100 dark:hover:bg-white/10")}>
                  {m.icon}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reminder */}
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Reminder</p>
          <Input type="datetime-local"
            value={note.reminderAt ? new Date(note.reminderAt).toISOString().slice(0, 16) : ""}
            onChange={e => onUpdate({ reminderAt: e.target.value ? new Date(e.target.value).toISOString() : null } as Partial<Note>)}
            className="h-7 text-xs" />
        </div>

        {/* Info */}
        <div className="space-y-1 text-[10px] text-zinc-400">
          <p>Created: {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
          <p>Updated: {timeAgo(note.updatedAt)}</p>
          <p>Words: {note.content.split(/\s+/).filter(Boolean).length}</p>
        </div>
      </div>
    </div>
  );
}

// ── Folder Manager ────────────────────────────────────────────────────────────

function FolderManager({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const { data: folders = [] } = trpc.notes.folders.list.useQuery(undefined, { retry: false });
  const create = trpc.notes.folders.create.useMutation({ onSuccess: () => { utils.notes.folders.list.invalidate(); setName(""); toast.success("Folder created"); } });
  const upd = trpc.notes.folders.update.useMutation({ onSuccess: () => { utils.notes.folders.list.invalidate(); setEditId(null); } });
  const del = trpc.notes.folders.delete.useMutation({ onSuccess: () => utils.notes.folders.list.invalidate() });
  const [name, setName] = useState("");
  const [color, setColor] = useState("#f59e0b");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#141414]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-white/5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Manage Folders</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-zinc-400" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-9 w-10 cursor-pointer rounded-md border border-zinc-200 dark:border-white/10" />
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Folder name…" className="flex-1"
              onKeyDown={e => { if (e.key === "Enter" && name.trim()) create.mutate({ name: name.trim(), color }); }} />
            <Button className="bg-amber-500 hover:bg-amber-600" disabled={!name.trim()} onClick={() => create.mutate({ name: name.trim(), color })}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {folders.map(f => (
              <div key={f.id} className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 p-2 dark:border-white/5 dark:bg-white/5">
                {editId === f.id ? (
                  <>
                    <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="h-7 w-7 cursor-pointer rounded border border-zinc-200 dark:border-white/10" />
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 flex-1 text-xs" />
                    <Button size="sm" className="h-7 bg-amber-500 hover:bg-amber-600 text-xs" onClick={() => upd.mutate({ id: f.id, name: editName, color: editColor })}>Save</Button>
                    <button onClick={() => setEditId(null)} className="text-zinc-400"><X className="h-3.5 w-3.5" /></button>
                  </>
                ) : (
                  <>
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ background: f.color }} />
                    <span className="flex-1 text-xs text-zinc-700 dark:text-zinc-300">{f.name}</span>
                    <span className="text-[10px] text-zinc-400">{f._count.notes}</span>
                    <button onClick={() => { setEditId(f.id); setEditName(f.name); setEditColor(f.color); }} className="text-zinc-400 hover:text-amber-500"><Pencil className="h-3 w-3" /></button>
                    <button onClick={() => del.mutate({ id: f.id })} className="text-zinc-400 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotesDiaryPage() {
  const [tab, setTab] = useState<"notes" | "journal">("notes");
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // editor state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showFolderMgr, setShowFolderMgr] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const utils = trpc.useUtils();
  const isJournal = tab === "journal";

  const { data: notes = [], isLoading, error } = trpc.notes.list.useQuery(
    { isJournal, search: search || undefined, folderId: selectedFolder, tag: selectedTag || undefined },
    { retry: false }
  );
  const { data: folders = [] } = trpc.notes.folders.list.useQuery(undefined, { retry: false });

  const create = trpc.notes.create.useMutation({
    onSuccess: (n) => {
      utils.notes.list.invalidate();
      setSelectedId(n.id);
      setEditTitle(n.title);
      setEditContent(n.content);
      setDirty(false);
      toast.success(`${isJournal ? "Entry" : "Note"} created`);
    },
    onError: e => toast.error(e.message),
  });

  const update = trpc.notes.update.useMutation({
    onSuccess: () => { utils.notes.list.invalidate(); setDirty(false); },
    onError: e => toast.error(e.message),
  });

  const del = trpc.notes.delete.useMutation({
    onSuccess: () => { utils.notes.list.invalidate(); setSelectedId(null); toast.success("Deleted"); },
  });

  const selected = notes.find(n => n.id === selectedId) ?? null;

  // Sync editor when selection changes
  useEffect(() => {
    if (!selected) return;
    setEditTitle(selected.title);
    setEditContent(selected.content);
    setDirty(false);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleSave = useCallback((title: string, content: string) => {
    setDirty(true);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (!selectedId) return;
      update.mutate({ id: selectedId, title, content });
    }, 1200);
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveNow = () => {
    clearTimeout(saveTimer.current);
    if (!selectedId) return;
    update.mutate({ id: selectedId, title: editTitle, content: editContent, saveVersion: true });
    toast.success("Saved & version created");
  };

  const handleNew = () => {
    const title = isJournal
      ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      : "Untitled";
    create.mutate({ title, isJournal, journalDate: isJournal ? new Date().toISOString() : undefined });
  };

  const handleMetaUpdate = (data: Partial<Note>) => {
    if (!selectedId) return;
    update.mutate({ id: selectedId, ...data } as Parameters<typeof update.mutate>[0]);
  };

  // Collect all unique tags across notes
  const allTags = [...new Set(notes.flatMap(n => n.tags))];

  if (error?.data?.code === "FORBIDDEN") {
    return (
      <AppNotInstalled
        slug="notes-diary" name="Notes & Diary"
        description="A private space for journaling, notes, rich-text editing, and diary entries."
        icon={<NotebookPen className="h-8 w-8 text-white" />}
        iconBg="bg-amber-500"
        scopes={["notes:read", "notes:write", "notes:delete"]}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        tab={tab} setTab={(t) => { setTab(t); setSelectedFolder(null); setSelectedTag(null); }}
        folders={folders} selectedFolder={selectedFolder} setSelectedFolder={setSelectedFolder}
        selectedTag={selectedTag} setSelectedTag={setSelectedTag}
        search={search} setSearch={setSearch}
        notes={notes as unknown as Note[]} selectedId={selectedId} setSelectedId={setSelectedId}
        onNew={handleNew} isLoading={isLoading} allTags={allTags}
      />

      {/* Editor area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!selectedId ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <NotebookPen className="h-12 w-12 text-zinc-200 dark:text-zinc-700" />
            <div>
              <p className="text-sm font-medium text-zinc-500">Select a {tab === "journal" ? "journal entry" : "note"} or create a new one</p>
              <div className="mt-3 flex gap-2 justify-center">
                <Button size="sm" className="gap-1.5 bg-amber-500 hover:bg-amber-600" onClick={handleNew} disabled={create.isPending}>
                  <Plus className="h-3.5 w-3.5" /> New {tab === "journal" ? "Entry" : "Note"}
                </Button>
                {tab === "notes" && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowFolderMgr(true)}>
                    <Folder className="h-3.5 w-3.5" /> Manage Folders
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-5 py-2 dark:border-white/10 dark:bg-[#0f0f10]">
              <div className="flex items-center gap-1.5 flex-1">
                {dirty && <span className="text-xs text-zinc-400">Saving…</span>}
                {!dirty && !update.isPending && <span className="text-xs text-green-500">Saved</span>}
              </div>
              <div className="flex items-center gap-1">
                {/* Save version */}
                <button onClick={saveNow} title="Save version"
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10">
                  <RotateCcw className="h-3.5 w-3.5" /> Save
                </button>
                {/* Preview toggle */}
                <button onClick={() => setPreview(v => !v)} title="Toggle preview"
                  className={cn("rounded-lg p-1.5 transition-colors", preview ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" : "text-zinc-400 hover:text-zinc-600")}>
                  <Eye className="h-4 w-4" />
                </button>
                {/* Properties */}
                <button onClick={() => { setShowMeta(v => !v); setShowVersions(false); }}
                  className={cn("rounded-lg p-1.5 transition-colors", showMeta ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" : "text-zinc-400 hover:text-zinc-600")}
                  title="Properties">
                  <Tag className="h-4 w-4" />
                </button>
                {/* Version history */}
                <button onClick={() => { setShowVersions(v => !v); setShowMeta(false); }}
                  className={cn("rounded-lg p-1.5 transition-colors", showVersions ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400" : "text-zinc-400 hover:text-zinc-600")}
                  title="Version history">
                  <History className="h-4 w-4" />
                </button>
                {/* Pin */}
                <button onClick={() => update.mutate({ id: selectedId, isPinned: !selected?.isPinned })}
                  className={cn("rounded-lg p-1.5 transition-colors", selected?.isPinned ? "text-amber-500" : "text-zinc-400 hover:text-amber-500")}
                  title={selected?.isPinned ? "Unpin" : "Pin"}>
                  <Pin className="h-4 w-4" />
                </button>
                {/* Delete */}
                <button onClick={() => del.mutate({ id: selectedId })}
                  className="rounded-lg p-1.5 text-zinc-400 hover:text-red-500" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* Writing area */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {/* Title */}
                <input
                  className="shrink-0 border-b border-zinc-100 bg-white px-6 py-4 text-xl font-bold text-zinc-900 placeholder-zinc-300 focus:outline-none dark:border-white/5 dark:bg-[#0f0f10] dark:text-white dark:placeholder-zinc-600"
                  placeholder="Title"
                  value={editTitle}
                  onChange={e => { setEditTitle(e.target.value); scheduleSave(e.target.value, editContent); }}
                />

                {/* Mood bar for journal */}
                {isJournal && selected && (
                  <div className="flex shrink-0 items-center gap-2 border-b border-zinc-100 bg-white px-6 py-2 dark:border-white/5 dark:bg-[#0f0f10]">
                    <span className="text-xs text-zinc-400">Mood:</span>
                    {MOODS.map(m => (
                      <button key={m.key} onClick={() => handleMetaUpdate({ mood: selected.mood === m.key ? null : m.key } as Partial<Note>)}
                        title={m.label}
                        className={cn("rounded-lg px-1.5 py-0.5 text-sm transition-colors",
                          selected.mood === m.key ? "bg-amber-100 dark:bg-amber-500/20" : "hover:bg-zinc-100 dark:hover:bg-white/10")}>
                        {m.icon}
                      </button>
                    ))}
                  </div>
                )}

                {/* Markdown toolbar */}
                {!preview && <EditorToolbar textareaRef={textareaRef} />}

                {/* Editor / Preview */}
                {preview ? (
                  <MarkdownPreview content={editContent} />
                ) : (
                  <textarea
                    ref={textareaRef}
                    className="flex-1 resize-none bg-white px-6 py-4 font-mono text-sm leading-relaxed text-zinc-800 placeholder-zinc-300 focus:outline-none dark:bg-[#0f0f10] dark:text-zinc-200 dark:placeholder-zinc-600"
                    placeholder={tab === "journal" ? "Write about your day…\n\nUse **bold**, *italic*, # Heading, - list, ```code```" : "Start writing…\n\nMarkdown supported: **bold**, *italic*, # Heading, - list, - [ ] task"}
                    value={editContent}
                    onChange={e => { setEditContent(e.target.value); scheduleSave(editTitle, e.target.value); }}
                  />
                )}
              </div>

              {/* Right panels */}
              {showMeta && selected && (
                <MetaPanel
                  note={selected as unknown as Note}
                  folders={folders}
                  onUpdate={handleMetaUpdate}
                  onClose={() => setShowMeta(false)}
                />
              )}
              {showVersions && selectedId && (
                <VersionPanel
                  noteId={selectedId}
                  onClose={() => setShowVersions(false)}
                  onRestore={() => { utils.notes.list.invalidate(); utils.notes.get.invalidate({ id: selectedId }); }}
                />
              )}
            </div>
          </>
        )}
      </div>

      {showFolderMgr && <FolderManager onClose={() => { setShowFolderMgr(false); utils.notes.folders.list.invalidate(); }} />}
    </div>
  );
}
