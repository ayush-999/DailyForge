"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { ListsPanel } from "./_components/lists-panel";
import { TodoList } from "./_components/todo-list";
import { NotInstalled } from "./_components/not-installed";

type Filter = "all" | "today" | "completed";

export default function TodoPage() {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const { isLoading, error } = trpc.todo.lists.list.useQuery(undefined, {
    retry: (_, err) => (err as any)?.data?.code !== "FORBIDDEN",
  });

  if (error?.data?.code === "FORBIDDEN") return <NotInstalled />;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const listName = selectedListId
    ? undefined
    : filter === "all"
    ? "All Tasks"
    : filter === "today"
    ? "Today"
    : "Completed";

  return (
    <div className="flex min-h-0 flex-1">
      <ListsPanel
        selectedListId={selectedListId}
        filter={filter}
        onSelectList={(id) => {
          setSelectedListId(id);
          setFilter("all");
        }}
        onSelectFilter={(f) => {
          setFilter(f);
          setSelectedListId(null);
        }}
      />
      <TodoList
        listId={selectedListId ?? undefined}
        filter={filter}
        listName={listName ?? ""}
      />
    </div>
  );
}
