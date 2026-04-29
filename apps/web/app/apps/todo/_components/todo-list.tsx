"use client";

import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { TodoItem } from "./todo-item";
import toast from "react-hot-toast";

type Filter = "all" | "today" | "completed";

interface TodoListProps {
  listId: string | undefined;
  filter: Filter;
  listName: string;
}

export function TodoList({ listId, filter, listName }: TodoListProps) {
  const [newTitle, setNewTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: todos = [], isLoading } = trpc.todo.items.list.useQuery(
    { listId, filter },
    { staleTime: 0 }
  );

  const createTodo = trpc.todo.items.create.useMutation({
    onSuccess: () => {
      utils.todo.items.list.invalidate();
      setNewTitle("");
      inputRef.current?.focus();
    },
    onError: () => toast.error("Failed to create task"),
  });

  const invalidate = () => {
    utils.todo.items.list.invalidate();
    utils.todo.lists.list.invalidate();
  };

  const handleCreate = () => {
    const title = newTitle.trim();
    if (!title) return;
    createTodo.mutate({ title, listId });
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-white/10">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
          {listName}
        </h2>
        {todos.length > 0 && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
            {todos.length}
          </span>
        )}
      </div>

      {/* Add task input */}
      {filter !== "completed" && (
        <div className="shrink-0 border-b border-zinc-100 px-4 py-3 dark:border-white/5">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 focus-within:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:focus-within:border-indigo-500">
            <Plus className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onFocus={() => setIsAdding(true)}
              onBlur={() => setIsAdding(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") { setNewTitle(""); (e.target as HTMLInputElement).blur(); }
              }}
              placeholder="Add a task…"
              className="flex-1 bg-transparent text-sm text-zinc-900 placeholder-zinc-400 outline-none dark:text-white"
            />
            {isAdding && newTitle.trim() && (
              <button
                onMouseDown={(e) => { e.preventDefault(); handleCreate(); }}
                className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Add
              </button>
            )}
          </div>
        </div>
      )}

      {/* Todo items */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : todos.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {filter === "completed"
                ? "No completed tasks yet"
                : filter === "today"
                ? "Nothing due today"
                : "No tasks here. Add one above!"}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {todos.map((todo) => (
              <TodoItem key={todo.id} todo={todo as any} onMutate={invalidate} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
