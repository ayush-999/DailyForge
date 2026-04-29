"use client";

import { useState, useRef, useEffect } from "react";
import { CheckSquare, Inbox, Calendar, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Filter = "all" | "today" | "completed";

interface ListsPanelProps {
  selectedListId: string | null;
  filter: Filter;
  onSelectList: (id: string) => void;
  onSelectFilter: (f: Filter) => void;
}

const smartViews: { key: Filter; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All Tasks", icon: <Inbox className="h-4 w-4" /> },
  { key: "today", label: "Today", icon: <Calendar className="h-4 w-4" /> },
  { key: "completed", label: "Completed", icon: <CheckCircle2 className="h-4 w-4" /> },
];

export function ListsPanel({ selectedListId, filter, onSelectList, onSelectFilter }: ListsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: lists = [] } = trpc.todo.lists.list.useQuery();

  const createList = trpc.todo.lists.create.useMutation({
    onSuccess: () => {
      utils.todo.lists.list.invalidate();
      setIsCreating(false);
      setNewName("");
    },
    onError: () => toast.error("Failed to create list"),
  });

  const deleteList = trpc.todo.lists.delete.useMutation({
    onSuccess: () => utils.todo.lists.list.invalidate(),
    onError: () => toast.error("Failed to delete list"),
  });

  useEffect(() => {
    if (isCreating) inputRef.current?.focus();
  }, [isCreating]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) { setIsCreating(false); return; }
    createList.mutate({ name });
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-[#111113]">
      <div className="flex-1 overflow-y-auto p-3">
        {/* Smart views */}
        <div className="mb-4">
          {smartViews.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => onSelectFilter(key)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                filter === key && !selectedListId
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                  : "text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-white/5"
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* My Lists */}
        {lists.length > 0 && (
          <div className="mb-1">
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              My Lists
            </p>
            {lists.map((list) => (
              <div key={list.id} className="group relative">
                <button
                  onClick={() => onSelectList(list.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    selectedListId === list.id
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300"
                      : "text-zinc-700 hover:bg-zinc-200/60 dark:text-zinc-300 dark:hover:bg-white/5"
                  )}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: list.color }}
                  />
                  <span className="flex-1 truncate text-left">{list.name}</span>
                  {list._count.todos > 0 && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {list._count.todos}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => deleteList.mutate({ id: list.id })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* New list input */}
        {isCreating ? (
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleCreate}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") { setIsCreating(false); setNewName(""); }
            }}
            placeholder="List name…"
            className="w-full rounded-lg border border-indigo-400 bg-white px-3 py-2 text-sm text-zinc-900 outline-none dark:border-indigo-500 dark:bg-white/5 dark:text-white"
          />
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-white/5"
          >
            <Plus className="h-4 w-4" />
            New List
          </button>
        )}
      </div>
    </aside>
  );
}
