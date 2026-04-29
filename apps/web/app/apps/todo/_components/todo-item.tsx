"use client";

import { useState } from "react";
import { Trash2, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Priority = "LOW" | "MEDIUM" | "HIGH";

interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate: Date | null;
  description: string | null;
}

interface TodoItemProps {
  todo: Todo;
  onMutate: () => void;
}

const priorityConfig: Record<Priority, { color: string; label: string; next: Priority }> = {
  LOW: { color: "bg-zinc-300 dark:bg-zinc-600", label: "Low", next: "MEDIUM" },
  MEDIUM: { color: "bg-amber-400", label: "Medium", next: "HIGH" },
  HIGH: { color: "bg-red-500", label: "High", next: "LOW" },
};

function formatDue(date: Date | null) {
  if (!date) return null;
  const d = new Date(date);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (isToday) return "Today";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TodoItem({ todo, onMutate }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);

  const toggle = trpc.todo.items.toggle.useMutation({
    onSuccess: onMutate,
    onError: () => toast.error("Failed to update task"),
  });
  const update = trpc.todo.items.update.useMutation({
    onSuccess: onMutate,
    onError: () => toast.error("Failed to update task"),
  });
  const del = trpc.todo.items.delete.useMutation({
    onSuccess: onMutate,
    onError: () => toast.error("Failed to delete task"),
  });

  const handleSaveTitle = () => {
    setIsEditing(false);
    const title = editTitle.trim();
    if (title && title !== todo.title) {
      update.mutate({ id: todo.id, title });
    } else {
      setEditTitle(todo.title);
    }
  };

  const cyclePriority = () => {
    const next = priorityConfig[todo.priority].next;
    update.mutate({ id: todo.id, priority: next });
  };

  const pc = priorityConfig[todo.priority];
  const dueLabel = formatDue(todo.dueDate);

  return (
    <div className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.03]">
      {/* Checkbox */}
      <button
        onClick={() => toggle.mutate({ id: todo.id })}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          todo.completed
            ? "border-indigo-500 bg-indigo-500"
            : "border-zinc-300 hover:border-indigo-400 dark:border-zinc-600"
        )}
      >
        {todo.completed && (
          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Title */}
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle();
              if (e.key === "Escape") { setIsEditing(false); setEditTitle(todo.title); }
            }}
            className="w-full bg-transparent text-sm text-zinc-900 outline-none dark:text-white"
          />
        ) : (
          <span
            onClick={() => !todo.completed && setIsEditing(true)}
            className={cn(
              "block text-sm",
              todo.completed
                ? "text-zinc-400 line-through dark:text-zinc-500"
                : "cursor-text text-zinc-900 dark:text-white"
            )}
          >
            {todo.title}
          </span>
        )}

        {dueLabel && (
          <span
            className={cn(
              "mt-0.5 flex items-center gap-1 text-[11px]",
              todo.completed
                ? "text-zinc-400"
                : new Date(todo.dueDate!) < new Date()
                ? "text-red-500"
                : "text-zinc-400 dark:text-zinc-500"
            )}
          >
            <Calendar className="h-3 w-3" />
            {dueLabel}
          </span>
        )}
      </div>

      {/* Priority dot */}
      <button
        onClick={cyclePriority}
        title={`Priority: ${pc.label} (click to cycle)`}
        className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full transition-opacity", pc.color)}
      />

      {/* Delete */}
      <button
        onClick={() => del.mutate({ id: todo.id })}
        className="mt-0.5 shrink-0 rounded p-0.5 text-zinc-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100 dark:text-zinc-600"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
