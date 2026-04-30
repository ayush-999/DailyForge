"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  CheckCircle2,
  Clock,
  ListTodo,
  Plus,
  Store,
  CalendarDays,
  Heart,
  Wallet,
  NotebookPen,
  Zap,
} from "lucide-react";

const APP_ICONS: Record<string, React.ReactNode> = {
  todo: <CheckSquare className="h-4 w-4 text-white" />,
  "daily-planner": <CalendarDays className="h-4 w-4 text-white" />,
  "health-tracker": <Heart className="h-4 w-4 text-white" />,
  "expense-tracker": <Wallet className="h-4 w-4 text-white" />,
  "notes-diary": <NotebookPen className="h-4 w-4 text-white" />,
  productivity: <Zap className="h-4 w-4 text-white" />,
};
const APP_ICON_BG: Record<string, string> = {
  todo: "bg-indigo-600",
  "daily-planner": "bg-violet-600",
  "health-tracker": "bg-rose-500",
  "expense-tracker": "bg-emerald-600",
  "notes-diary": "bg-amber-500",
  productivity: "bg-sky-600",
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-amber-400",
  LOW: "bg-zinc-400 dark:bg-zinc-500",
};

function StatCard({
  label,
  value,
  icon,
  iconBg,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  iconBg: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f0f10]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className={cn("rounded-xl p-2.5", iconBg)}>{icon}</div>
      </div>
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">{sub}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: user, isLoading: userLoading } = trpc.users.me.useQuery();
  const { data: rawInstalled = [] } = trpc.apps.listInstalled.useQuery();
  const installed = rawInstalled as {
    app: { id: string; slug: string; name: string };
  }[];
  const installedSlugs = new Set(installed.map((i) => i.app.slug));
  const hasTodo = installedSlugs.has("todo");

  const { data: pendingTodos = [] } = trpc.todo.items.list.useQuery(
    { filter: "all" },
    { enabled: hasTodo, retry: false }
  );
  const { data: completedTodos = [] } = trpc.todo.items.list.useQuery(
    { filter: "completed" },
    { enabled: hasTodo, retry: false }
  );
  const { data: todayTodos = [] } = trpc.todo.items.list.useQuery(
    { filter: "today" },
    { enabled: hasTodo, retry: false }
  );

  const recentTasks = [...(pendingTodos as any[])]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (userLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-8 py-5 dark:border-white/10 dark:bg-[#0f0f10]">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Welcome back, {user?.fullName ?? user?.displayName ?? "there"}!
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{today}</p>
      </header>

      <main className="flex-1 space-y-8 px-8 py-8">
        {/* ── Stats ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Pending Tasks"
            value={hasTodo ? pendingTodos.length : "—"}
            icon={
              <ListTodo className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            }
            iconBg="bg-indigo-100 dark:bg-indigo-500/10"
            sub={hasTodo ? "Tasks to complete" : "Install Todo to track"}
          />
          <StatCard
            label="Due Today"
            value={hasTodo ? todayTodos.length : "—"}
            icon={
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            }
            iconBg="bg-amber-100 dark:bg-amber-500/10"
            sub={hasTodo ? "On your plate today" : "Install Todo to track"}
          />
          <StatCard
            label="Completed"
            value={hasTodo ? completedTodos.length : "—"}
            icon={
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            }
            iconBg="bg-green-100 dark:bg-green-500/10"
            sub={hasTodo ? "Tasks finished" : "Install Todo to track"}
          />
        </div>

        {/* ── Installed Apps ── */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Your Apps
            </h2>
            <Link
              href="/store"
              className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              App Store →
            </Link>
          </div>

          {installed.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-12 text-center dark:border-white/10">
              <Store className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                No apps installed
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Visit the App Store to extend your workspace
              </p>
              <Button
                asChild
                size="sm"
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                <Link href="/store">Browse Apps</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {installed.map(({ app }) => (
                <Link
                  key={app.slug}
                  href={`/apps/${app.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-all hover:border-indigo-300 hover:shadow-sm dark:border-white/10 dark:bg-[#0f0f10] dark:hover:border-indigo-500/40"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      APP_ICON_BG[app.slug] ?? "bg-zinc-600"
                    )}
                  >
                    {APP_ICONS[app.slug] ?? (
                      <span className="text-xs font-bold text-white">
                        {app.name[0]}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {app.name}
                  </span>
                </Link>
              ))}

              <Link
                href="/store"
                className="flex items-center gap-3 rounded-xl border border-dashed border-zinc-200 px-4 py-3 transition-all hover:border-indigo-300 dark:border-white/10 dark:hover:border-indigo-500/40"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/10">
                  <Plus className="h-4 w-4 text-zinc-500" />
                </div>
                <span className="text-sm font-medium text-zinc-500">Add App</span>
              </Link>
            </div>
          )}
        </section>

        {/* ── Recent Tasks (only if Todo is installed) ── */}
        {hasTodo && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Recent Tasks
              </h2>
              <Link
                href="/apps/todo"
                className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                View All →
              </Link>
            </div>

            {recentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-10 text-center dark:border-white/10">
                <CheckSquare className="mx-auto mb-3 h-7 w-7 text-zinc-400" />
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                  No tasks yet
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Create your first task in the Todo app
                </p>
                <Button asChild size="sm" variant="outline" className="mt-4">
                  <Link href="/apps/todo">
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    New Task
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-[#0f0f10]">
                {recentTasks.map((task: any, i: number) => {
                  const due = task.dueDate ? new Date(task.dueDate) : null;
                  const overdue = due && due < new Date();
                  return (
                    <Link
                      key={task.id}
                      href="/apps/todo"
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-white/5",
                        i !== 0 && "border-t border-zinc-100 dark:border-white/5"
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          PRIORITY_COLOR[task.priority] ?? "bg-zinc-400"
                        )}
                      />
                      <span className="flex-1 truncate text-sm text-zinc-900 dark:text-white">
                        {task.title}
                      </span>
                      {due && (
                        <span
                          className={cn(
                            "shrink-0 text-xs",
                            overdue
                              ? "font-medium text-red-500"
                              : "text-zinc-400"
                          )}
                        >
                          {due.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── CTA (only when no apps installed) ── */}
        {installed.length === 0 && (
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-8 dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-blue-500/10">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Ready to boost your productivity?
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Install your first app from the App Store to start tracking tasks,
              habits, and more.
            </p>
            <Button
              asChild
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              <Link href="/store">
                <Store className="mr-2 h-4 w-4" />
                Browse App Store
              </Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
