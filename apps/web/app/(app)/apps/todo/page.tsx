"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { AppNotInstalled } from "@/components/app-not-installed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  CheckSquare, Plus, Trash2, Pencil, Search, Flag, Calendar,
  Kanban, Grid3X3, FolderOpen, List, ChevronRight,
  Clock, ChevronDown, X, Timer, Check,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ────────────────────────────────────────────────────────────────────

type Priority = "LOW" | "MEDIUM" | "HIGH";
type Status = "todo" | "in_progress" | "done";
type TabId = "list" | "kanban" | "matrix" | "projects";
type Filter = "all" | "today" | "tomorrow" | "completed";

type Subtask = { id: string; title: string; completed: boolean; sortOrder: number };
type TodoItem = {
  id: string; title: string; description: string | null; completed: boolean;
  priority: Priority; dueDate: Date | null; status: Status;
  isUrgent: boolean; isImportant: boolean;
  estimatedMinutes: number | null; actualMinutes: number;
  timerStartedAt: Date | null;
  todoListId: string | null;
  todoList: { id: string; name: string; color: string } | null;
  subtasks: Subtask[];
  createdAt: Date;
};

// ── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: "text-slate-400", MEDIUM: "text-amber-500", HIGH: "text-red-500",
};
const PRIORITY_BG: Record<Priority, string> = {
  LOW: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  MEDIUM: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  HIGH: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};
const STATUS_COLS: { key: Status; label: string; color: string }[] = [
  { key: "todo",        label: "To Do",       color: "border-zinc-300 dark:border-zinc-700" },
  { key: "in_progress", label: "In Progress", color: "border-blue-400 dark:border-blue-600" },
  { key: "done",        label: "Done",        color: "border-green-400 dark:border-green-600" },
];
const MATRIX_QUADRANTS = [
  { key: "ui",   label: "Urgent + Important",      sub: "Do First",    bg: "bg-red-50 dark:bg-red-500/5",    border: "border-red-200 dark:border-red-500/30",    badge: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
  { key: "nui",  label: "Not Urgent + Important",  sub: "Schedule",    bg: "bg-blue-50 dark:bg-blue-500/5",  border: "border-blue-200 dark:border-blue-500/30",  badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  { key: "uni",  label: "Urgent + Not Important",  sub: "Delegate",    bg: "bg-amber-50 dark:bg-amber-500/5",border: "border-amber-200 dark:border-amber-500/30",badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
  { key: "nuni", label: "Not Urgent + Unimportant",sub: "Eliminate",   bg: "bg-zinc-50 dark:bg-zinc-500/5",  border: "border-zinc-200 dark:border-zinc-500/30",  badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400" },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDue(d: Date | null | string) {
  if (!d) return null;
  const date = new Date(d);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return { label: "Today", cls: "text-amber-600 dark:text-amber-400" };
  if (diff === 1) return { label: "Tomorrow", cls: "text-blue-600 dark:text-blue-400" };
  if (diff < 0)   return { label: "Overdue", cls: "text-red-600 dark:text-red-400" };
  return { label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), cls: "text-zinc-400" };
}

function fmtMinutes(min: number) {
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h ${min % 60}m`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
      active ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}>
      {children}
    </button>
  );
}

function PriorityBadge({ p }: { p: Priority }) {
  return <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", PRIORITY_BG[p])}>{p}</span>;
}

// ── Task Form Modal ──────────────────────────────────────────────────────────

function TaskForm({
  lists, editTodo, onClose,
}: {
  lists: { id: string; name: string; color: string }[];
  editTodo?: TodoItem | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const create = trpc.todo.items.create.useMutation({ onSuccess: () => { utils.todo.items.list.invalidate(); onClose(); toast.success("Task created"); }, onError: e => toast.error(e.message) });
  const update = trpc.todo.items.update.useMutation({ onSuccess: () => { utils.todo.items.list.invalidate(); onClose(); toast.success("Task updated"); }, onError: e => toast.error(e.message) });

  const [form, setForm] = useState({
    title: editTodo?.title ?? "",
    description: editTodo?.description ?? "",
    priority: (editTodo?.priority ?? "MEDIUM") as Priority,
    dueDate: editTodo?.dueDate ? new Date(editTodo.dueDate).toISOString().slice(0, 10) : "",
    listId: editTodo?.todoListId ?? "",
    status: (editTodo?.status ?? "todo") as Status,
    isUrgent: editTodo?.isUrgent ?? false,
    isImportant: editTodo?.isImportant ?? true,
    estimatedMinutes: editTodo?.estimatedMinutes?.toString() ?? "",
  });

  const submit = () => {
    const base = {
      title: form.title.trim(),
      description: form.description || undefined,
      priority: form.priority,
      dueDate: form.dueDate || null,
      listId: form.listId || null,
      status: form.status,
      isUrgent: form.isUrgent,
      isImportant: form.isImportant,
      estimatedMinutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes) : undefined,
    };
    if (!base.title) return;
    if (editTodo) update.mutate({ id: editTodo.id, ...base });
    else create.mutate(base);
  };

  const busy = create.isPending || update.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#141414]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-white/5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{editTodo ? "Edit Task" : "New Task"}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">
          <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title*" autoFocus />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" rows={2}
            className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-[#0f0f10] dark:text-zinc-200 dark:placeholder-zinc-600" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Due Date</label>
              <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Project</label>
              <select value={form.listId} onChange={e => setForm(f => ({ ...f, listId: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">No project</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Estimated time (minutes)</label>
            <Input type="number" min="1" value={form.estimatedMinutes} onChange={e => setForm(f => ({ ...f, estimatedMinutes: e.target.value }))} placeholder="e.g. 30" />
          </div>
          {/* Eisenhower flags */}
          <div className="flex gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <input type="checkbox" checked={form.isUrgent} onChange={e => setForm(f => ({ ...f, isUrgent: e.target.checked }))} className="h-3.5 w-3.5 accent-red-500" />
              Urgent
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <input type="checkbox" checked={form.isImportant} onChange={e => setForm(f => ({ ...f, isImportant: e.target.checked }))} className="h-3.5 w-3.5 accent-indigo-500" />
              Important
            </label>
          </div>
        </div>
        <div className="flex gap-2 border-t border-zinc-100 px-5 py-4 dark:border-white/5">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={!form.title.trim() || busy} onClick={submit}>
            {busy ? "Saving…" : editTodo ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({
  todo, onEdit, compact = false,
}: {
  todo: TodoItem; onEdit: () => void; compact?: boolean;
}) {
  const utils = trpc.useUtils();
  const inv = () => utils.todo.items.list.invalidate();
  const toggle = trpc.todo.items.toggle.useMutation({ onSuccess: inv });
  const del = trpc.todo.items.delete.useMutation({ onSuccess: inv });
  const startTimer = trpc.todo.timer.start.useMutation({ onSuccess: inv });
  const stopTimer = trpc.todo.timer.stop.useMutation({ onSuccess: inv });
  const addSub = trpc.todo.subtasks.create.useMutation({ onSuccess: inv });
  const toggleSub = trpc.todo.subtasks.toggle.useMutation({ onSuccess: inv });
  const delSub = trpc.todo.subtasks.delete.useMutation({ onSuccess: inv });

  const [expanded, setExpanded] = useState(false);
  const [subInput, setSubInput] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Live timer tick
  useEffect(() => {
    clearInterval(timerRef.current);
    if (todo.timerStartedAt) {
      const tick = () => setElapsed(Math.round((Date.now() - new Date(todo.timerStartedAt!).getTime()) / 60000));
      tick();
      timerRef.current = setInterval(tick, 30000);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [todo.timerStartedAt]);

  const due = formatDue(todo.dueDate);
  const doneSubtasks = todo.subtasks.filter(s => s.completed).length;

  return (
    <div className={cn("rounded-xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-[#0f0f10] transition-opacity", todo.completed && "opacity-60")}>
      <div className="flex items-start gap-3 p-3">
        {/* Checkbox */}
        <button onClick={() => toggle.mutate({ id: todo.id })} className="mt-0.5 shrink-0">
          <div className={cn("flex h-4.5 w-4.5 items-center justify-center rounded border-2 transition-colors",
            todo.completed ? "border-indigo-500 bg-indigo-500" : "border-zinc-300 dark:border-zinc-600")}>
            {todo.completed && <Check className="h-2.5 w-2.5 text-white" />}
          </div>
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-sm font-medium text-zinc-900 dark:text-white", todo.completed && "line-through text-zinc-400")}>{todo.title}</span>
            <PriorityBadge p={todo.priority} />
            {todo.todoList && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: todo.todoList.color + "22", color: todo.todoList.color }}>
                {todo.todoList.name}
              </span>
            )}
          </div>
          {!compact && todo.description && <p className="mt-0.5 text-xs text-zinc-400 line-clamp-1">{todo.description}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {due && <span className={cn("flex items-center gap-0.5 text-[10px] font-medium", due.cls)}><Calendar className="h-2.5 w-2.5" />{due.label}</span>}
            {todo.subtasks.length > 0 && (
              <span className="text-[10px] text-zinc-400">{doneSubtasks}/{todo.subtasks.length} subtasks</span>
            )}
            {(todo.actualMinutes > 0 || todo.timerStartedAt) && (
              <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                <Clock className="h-2.5 w-2.5" />
                {fmtMinutes(todo.actualMinutes + elapsed)}
                {todo.estimatedMinutes ? ` / ${fmtMinutes(todo.estimatedMinutes)}` : ""}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {todo.timerStartedAt ? (
            <button onClick={() => stopTimer.mutate({ id: todo.id })} className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Stop timer">
              <Timer className="h-3.5 w-3.5 animate-pulse" />
            </button>
          ) : (
            <button onClick={() => startTimer.mutate({ id: todo.id })} className="rounded p-1 text-zinc-400 hover:text-indigo-500" title="Start timer">
              <Timer className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={onEdit} className="rounded p-1 text-zinc-400 hover:text-indigo-500"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => setExpanded(v => !v)} className="rounded p-1 text-zinc-400 hover:text-zinc-600">
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
          <button onClick={() => del.mutate({ id: todo.id })} className="rounded p-1 text-zinc-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Expanded: description + subtasks */}
      {expanded && (
        <div className="border-t border-zinc-100 px-3 pb-3 pt-2 dark:border-white/5 space-y-2">
          {todo.description && <p className="text-xs text-zinc-500">{todo.description}</p>}
          {todo.estimatedMinutes && (
            <p className="text-xs text-zinc-400">Est: {fmtMinutes(todo.estimatedMinutes)} · Actual: {fmtMinutes(todo.actualMinutes + elapsed)}</p>
          )}
          {/* Subtasks */}
          <div className="space-y-1">
            {todo.subtasks.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                <button onClick={() => toggleSub.mutate({ id: s.id })} className="shrink-0">
                  <div className={cn("flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors",
                    s.completed ? "border-indigo-400 bg-indigo-400" : "border-zinc-300 dark:border-zinc-600")}>
                    {s.completed && <Check className="h-2 w-2 text-white" />}
                  </div>
                </button>
                <span className={cn("flex-1 text-xs text-zinc-700 dark:text-zinc-300", s.completed && "line-through text-zinc-400")}>{s.title}</span>
                <button onClick={() => delSub.mutate({ id: s.id })} className="text-zinc-300 hover:text-red-500"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Input value={subInput} onChange={e => setSubInput(e.target.value)} placeholder="Add subtask…" className="h-7 text-xs flex-1"
              onKeyDown={e => { if (e.key === "Enter" && subInput.trim()) { addSub.mutate({ todoId: todo.id, title: subInput.trim() }); setSubInput(""); } }} />
            <Button size="sm" className="h-7 px-2 text-xs bg-indigo-600 hover:bg-indigo-700" disabled={!subInput.trim()}
              onClick={() => { addSub.mutate({ todoId: todo.id, title: subInput.trim() }); setSubInput(""); }}>Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── List Tab ─────────────────────────────────────────────────────────────────

function ListTab({
  lists, selectedListId, filter, search, priority,
  onEdit,
}: {
  lists: { id: string; name: string; color: string }[];
  selectedListId: string | null;
  filter: Filter;
  search: string;
  priority: Priority | "";
  onEdit: (t: TodoItem) => void;
}) {
  const { data: todos = [], isLoading } = trpc.todo.items.list.useQuery({
    listId: selectedListId,
    filter,
    search: search || undefined,
    priority: priority || undefined,
  }, { retry: false });

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Spinner className="h-6 w-6" /></div>;
  if (todos.length === 0) return <p className="py-12 text-center text-sm text-zinc-400">No tasks here</p>;

  return (
    <div className="space-y-2">
      {todos.map(t => <TaskCard key={t.id} todo={t as unknown as TodoItem} onEdit={() => onEdit(t as unknown as TodoItem)} />)}
    </div>
  );
}

// ── Kanban Tab ───────────────────────────────────────────────────────────────

function KanbanTab({ lists, selectedListId, onEdit }: {
  lists: { id: string; name: string; color: string }[];
  selectedListId: string | null;
  onEdit: (t: TodoItem) => void;
}) {
  const utils = trpc.useUtils();
  const { data: all = [], isLoading } = trpc.todo.items.list.useQuery({
    listId: selectedListId,
    filter: "all",
  }, { retry: false });
  const { data: done = [] } = trpc.todo.items.list.useQuery({
    listId: selectedListId,
    filter: "completed",
  }, { retry: false });

  const setStatus = trpc.todo.items.setStatus.useMutation({ onSuccess: () => utils.todo.items.list.invalidate() });
  const [dragId, setDragId] = useState<string | null>(null);

  const allTodos = [...(all as unknown as TodoItem[]), ...(done as unknown as TodoItem[])];
  const byStatus = (s: Status) => allTodos.filter(t => t.status === s || (s === "done" && t.completed && t.status !== "todo" && t.status !== "in_progress"));

  const onDragStart = (id: string) => setDragId(id);
  const onDrop = (s: Status) => {
    if (dragId) { setStatus.mutate({ id: dragId, status: s }); setDragId(null); }
  };

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Spinner className="h-6 w-6" /></div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {STATUS_COLS.map(col => (
        <div key={col.key}
          className={cn("min-h-[300px] rounded-xl border-2 bg-zinc-50 p-3 dark:bg-[#0a0a0b]", col.color)}
          onDragOver={e => e.preventDefault()}
          onDrop={() => onDrop(col.key)}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">{col.label} <span className="ml-1 text-zinc-300">({byStatus(col.key).length})</span></p>
          <div className="space-y-2">
            {byStatus(col.key).map(t => (
              <div key={t.id} draggable onDragStart={() => onDragStart(t.id)} className="cursor-grab active:cursor-grabbing">
                <TaskCard todo={t} onEdit={() => onEdit(t)} compact />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Eisenhower Matrix Tab ────────────────────────────────────────────────────

function MatrixTab({ onEdit }: { onEdit: (t: TodoItem) => void }) {
  const { data: all = [], isLoading } = trpc.todo.items.list.useQuery({ filter: "all" }, { retry: false });
  const todos = all as unknown as TodoItem[];

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Spinner className="h-6 w-6" /></div>;

  const byQuadrant = (key: string) => todos.filter(t => {
    if (key === "ui")   return t.isUrgent && t.isImportant;
    if (key === "nui")  return !t.isUrgent && t.isImportant;
    if (key === "uni")  return t.isUrgent && !t.isImportant;
    return !t.isUrgent && !t.isImportant;
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      {MATRIX_QUADRANTS.map(q => {
        const tasks = byQuadrant(q.key);
        return (
          <div key={q.key} className={cn("rounded-xl border p-4", q.bg, q.border)}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{q.label}</p>
                <span className={cn("mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", q.badge)}>{q.sub}</span>
              </div>
              <span className="text-lg font-bold text-zinc-300 dark:text-zinc-600">{tasks.length}</span>
            </div>
            <div className="space-y-1.5">
              {tasks.length === 0
                ? <p className="text-xs text-zinc-400">No tasks</p>
                : tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 dark:bg-[#0f0f10]">
                      <Flag className={cn("h-3 w-3 shrink-0", PRIORITY_COLORS[t.priority])} />
                      <span className="flex-1 truncate text-xs text-zinc-700 dark:text-zinc-300">{t.title}</span>
                      <button onClick={() => onEdit(t)} className="text-zinc-300 hover:text-indigo-500"><Pencil className="h-3 w-3" /></button>
                    </div>
                  ))
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Projects Tab ─────────────────────────────────────────────────────────────

function ProjectsTab() {
  const utils = trpc.useUtils();
  const { data: lists = [], isLoading } = trpc.todo.lists.list.useQuery(undefined, { retry: false });
  const create = trpc.todo.lists.create.useMutation({ onSuccess: () => { utils.todo.lists.list.invalidate(); setNewName(""); toast.success("Project created"); }, onError: e => toast.error(e.message) });
  const upd = trpc.todo.lists.update.useMutation({ onSuccess: () => { utils.todo.lists.list.invalidate(); setEditId(null); } });
  const del = trpc.todo.lists.delete.useMutation({ onSuccess: () => utils.todo.lists.list.invalidate() });

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Spinner className="h-6 w-6" /></div>;

  return (
    <div className="max-w-md space-y-4">
      <div className="flex gap-2">
        <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="h-9 w-10 cursor-pointer rounded-md border border-zinc-200 dark:border-white/10" />
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="New project name…" className="flex-1"
          onKeyDown={e => { if (e.key === "Enter" && newName.trim()) create.mutate({ name: newName.trim(), color: newColor }); }} />
        <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={!newName.trim() || create.isPending}
          onClick={() => create.mutate({ name: newName.trim(), color: newColor })}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {lists.length === 0 ? (
        <p className="text-center text-sm text-zinc-400 py-8">No projects yet</p>
      ) : (
        <div className="space-y-2">
          {lists.map(l => (
            <div key={l.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-white/10 dark:bg-[#0f0f10]">
              {editId === l.id ? (
                <>
                  <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded border border-zinc-200 dark:border-white/10" />
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 flex-1 text-sm" />
                  <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => upd.mutate({ id: l.id, name: editName, color: editColor })}>Save</Button>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setEditId(null)}>Cancel</Button>
                </>
              ) : (
                <>
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ background: l.color }} />
                  <span className="flex-1 text-sm font-medium text-zinc-900 dark:text-white">{l.name}</span>
                  <span className="text-xs text-zinc-400">{(l as { _count?: { todos: number } })._count?.todos ?? 0} pending</span>
                  <button onClick={() => { setEditId(l.id); setEditName(l.name); setEditColor(l.color); }} className="text-zinc-400 hover:text-indigo-500"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => del.mutate({ id: l.id })} className="text-zinc-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TodoPage() {
  const [tab, setTab] = useState<TabId>("list");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editTodo, setEditTodo] = useState<TodoItem | null>(null);

  const { data: lists = [], error } = trpc.todo.lists.list.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  if (error?.data?.code === "FORBIDDEN") {
    return (
      <AppNotInstalled
        slug="todo" name="Todo List"
        description="Manage tasks, projects, and goals with kanban, Eisenhower matrix, and time tracking."
        icon={<CheckSquare className="h-8 w-8 text-white" />}
        iconBg="bg-indigo-500"
        scopes={["todos:read", "todos:write", "todos:delete"]}
      />
    );
  }

  const handleEdit = (t: TodoItem) => { setEditTodo(t); setShowForm(true); };
  const handleNew = () => { setEditTodo(null); setShowForm(true); };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 flex-col border-b border-zinc-200 bg-white dark:border-white/10 dark:bg-[#0f0f10]">
        <div className="flex items-center gap-3 px-6 pt-4 pb-0">
          {/* Tab bar */}
          <div className="flex overflow-x-auto">
            <TabBtn active={tab === "list"} onClick={() => setTab("list")}><List className="h-3.5 w-3.5" />List</TabBtn>
            <TabBtn active={tab === "kanban"} onClick={() => setTab("kanban")}><Kanban className="h-3.5 w-3.5" />Kanban</TabBtn>
            <TabBtn active={tab === "matrix"} onClick={() => setTab("matrix")}><Grid3X3 className="h-3.5 w-3.5" />Matrix</TabBtn>
            <TabBtn active={tab === "projects"} onClick={() => setTab("projects")}><FolderOpen className="h-3.5 w-3.5" />Projects</TabBtn>
          </div>
          <div className="ml-auto">
            <Button size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700" onClick={handleNew}>
              <Plus className="h-3.5 w-3.5" /> New Task
            </Button>
          </div>
        </div>

        {/* Filters (list tab only) */}
        {tab === "list" && (
          <div className="flex flex-wrap items-center gap-2 px-6 py-3">
            {/* Filter pills */}
            {(["all", "today", "tomorrow", "completed"] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                  filter === f ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300")}>
                {f}
              </button>
            ))}
            <div className="ml-1 h-4 w-px bg-zinc-200 dark:bg-white/10" />
            {/* Project filter */}
            <select value={selectedListId ?? ""} onChange={e => setSelectedListId(e.target.value || null)}
              className="h-7 rounded-full border-0 bg-zinc-100 px-3 text-xs font-medium text-zinc-600 focus:outline-none dark:bg-white/10 dark:text-zinc-300">
              <option value="">All projects</option>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {/* Priority filter */}
            <select value={priority} onChange={e => setPriority(e.target.value as Priority | "")}
              className="h-7 rounded-full border-0 bg-zinc-100 px-3 text-xs font-medium text-zinc-600 focus:outline-none dark:bg-white/10 dark:text-zinc-300">
              <option value="">All priorities</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            {/* Search */}
            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-zinc-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="h-7 w-44 pl-8 text-xs" />
            </div>
          </div>
        )}

        {/* Kanban: project filter */}
        {tab === "kanban" && (
          <div className="flex items-center gap-2 px-6 py-3">
            <select value={selectedListId ?? ""} onChange={e => setSelectedListId(e.target.value || null)}
              className="h-7 rounded-full border-0 bg-zinc-100 px-3 text-xs font-medium text-zinc-600 focus:outline-none dark:bg-white/10 dark:text-zinc-300">
              <option value="">All projects</option>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "list" && (
          <ListTab lists={lists} selectedListId={selectedListId} filter={filter} search={search} priority={priority} onEdit={handleEdit} />
        )}
        {tab === "kanban" && (
          <KanbanTab lists={lists} selectedListId={selectedListId} onEdit={handleEdit} />
        )}
        {tab === "matrix" && <MatrixTab onEdit={handleEdit} />}
        {tab === "projects" && <ProjectsTab />}
      </div>

      {/* Task form modal */}
      {showForm && (
        <TaskForm lists={lists} editTodo={editTodo} onClose={() => { setShowForm(false); setEditTodo(null); utils.todo.items.list.invalidate(); }} />
      )}
    </div>
  );
}
