"use client";

import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import {
  CheckSquare,
  Download,
  Trash2,
  CalendarDays,
  Heart,
  Wallet,
  NotebookPen,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const APP_ICONS: Record<string, React.ReactNode> = {
  todo: <CheckSquare className="h-6 w-6 text-white" />,
  "daily-planner": <CalendarDays className="h-6 w-6 text-white" />,
  "health-tracker": <Heart className="h-6 w-6 text-white" />,
  "expense-tracker": <Wallet className="h-6 w-6 text-white" />,
  "notes-diary": <NotebookPen className="h-6 w-6 text-white" />,
  productivity: <Zap className="h-6 w-6 text-white" />,
};

const APP_ICON_BG: Record<string, string> = {
  todo: "bg-indigo-600",
  "daily-planner": "bg-violet-600",
  "health-tracker": "bg-rose-500",
  "expense-tracker": "bg-emerald-600",
  "notes-diary": "bg-amber-500",
  productivity: "bg-sky-600",
};

const COMING_SOON_APPS: never[] = [];

export default function StorePage() {
  const utils = trpc.useUtils();
  const { data: apps = [], isLoading } = trpc.apps.list.useQuery();
  const { data: installed = [] } = trpc.apps.listInstalled.useQuery();

  const install = trpc.apps.install.useMutation({
    onSuccess: () => {
      utils.apps.listInstalled.invalidate();
      toast.success("App installed!");
    },
    onError: () => toast.error("Installation failed"),
  });

  const uninstall = trpc.apps.uninstall.useMutation({
    onSuccess: () => {
      utils.apps.listInstalled.invalidate();
      toast.success("App uninstalled");
    },
    onError: () => toast.error("Uninstall failed"),
  });

  const installedSlugs = new Set(installed.map((i) => i.app.slug));

  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="border-b border-zinc-200 bg-white px-8 py-4 dark:border-white/10 dark:bg-[#0f0f10]">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          App Store
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Extend DailyForge with powerful mini-apps
        </p>
      </header>

      <main className="flex-1 space-y-10 px-8 py-8">
        {/* ── Available Apps ── */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Available
          </h2>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          ) : apps.length === 0 ? (
            <p className="text-sm text-zinc-400">No apps available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((app) => {
                const isInstalled = installedSlugs.has(app.slug);
                const isWorking =
                  (install.isPending && install.variables?.slug === app.slug) ||
                  (uninstall.isPending && uninstall.variables?.slug === app.slug);

                return (
                  <div
                    key={app.id}
                    className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-[#0f0f10]"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                          APP_ICON_BG[app.slug] ?? "bg-zinc-600"
                        )}
                      >
                        {APP_ICONS[app.slug] ?? (
                          <span className="text-xl text-white">{app.name[0]}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-zinc-900 dark:text-white">
                            {app.name}
                          </h3>
                          {isInstalled && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:bg-green-500/10 dark:text-green-400">
                              Installed
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                          {app.category}
                        </p>
                      </div>
                    </div>

                    {app.description && (
                      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                        {app.description}
                      </p>
                    )}

                    {app.scopes.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                          Permissions
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {app.scopes.map((s) => (
                            <span
                              key={s.id}
                              className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-white/10 dark:text-zinc-400"
                            >
                              {s.scope}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      {isInstalled ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isWorking}
                          onClick={() => uninstall.mutate({ slug: app.slug })}
                          className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {isWorking ? "Removing…" : "Uninstall"}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isWorking}
                          onClick={() =>
                            install.mutate({
                              slug: app.slug,
                              grantedScopes: app.scopes.map((s) => s.scope),
                            })
                          }
                          className="gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {isWorking ? "Installing…" : "Install"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Coming Soon ── */}
        {COMING_SOON_APPS.length > 0 && <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Coming Soon
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMING_SOON_APPS.map((app) => (
              <div
                key={app.slug}
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 opacity-70 dark:border-white/10 dark:bg-[#0f0f10]"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                      app.iconBg
                    )}
                  >
                    {app.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-900 dark:text-white">
                        {app.name}
                      </h3>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                        Soon
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {app.category}
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  {app.description}
                </p>

                <div className="mt-4 flex justify-end">
                  <Button size="sm" disabled variant="outline" className="gap-2 cursor-not-allowed">
                    <Download className="h-3.5 w-3.5" />
                    Coming Soon
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>}
      </main>
    </div>
  );
}
