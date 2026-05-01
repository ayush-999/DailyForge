"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bell,
  CheckSquare,
  CheckCircle2,
  Download,
  Trash2,
  User,
  KeyRound,
  Store,
  ListTodo,
  X,
  CheckCheck,
  Eraser,
} from "lucide-react";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: Date | string;
};

const TYPE_META: Record<
  string,
  { icon: React.ReactNode; color: string }
> = {
  todo_created: {
    icon: <CheckSquare className="h-4 w-4" />,
    color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
  },
  todo_completed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400",
  },
  list_created: {
    icon: <ListTodo className="h-4 w-4" />,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  },
  app_installed: {
    icon: <Download className="h-4 w-4" />,
    color: "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400",
  },
  app_uninstalled: {
    icon: <Store className="h-4 w-4" />,
    color: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
  },
  password_changed: {
    icon: <KeyRound className="h-4 w-4" />,
    color: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
  },
  profile_updated: {
    icon: <User className="h-4 w-4" />,
    color: "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300",
  },
  session_revoked: {
    icon: <Trash2 className="h-4 w-4" />,
    color: "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400",
  },
};

function timeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function NotificationItem({
  n,
  onRead,
  onDelete,
}: {
  n: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const meta = TYPE_META[n.type] ?? TYPE_META.profile_updated;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-white/5",
        !n.read && "bg-indigo-50/50 dark:bg-indigo-500/5"
      )}
    >
      {/* Icon */}
      <button
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
          meta.color
        )}
        onClick={() => !n.read && onRead(n.id)}
        title={n.read ? undefined : "Mark as read"}
      >
        {meta.icon}
      </button>

      {/* Body */}
      <div className="min-w-0 flex-1" onClick={() => !n.read && onRead(n.id)}>
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "cursor-default text-sm leading-tight",
              n.read
                ? "text-zinc-600 dark:text-zinc-400"
                : "font-medium text-zinc-900 dark:text-white"
            )}
          >
            {n.title}
          </p>
          <span className="shrink-0 text-[11px] text-zinc-400 dark:text-zinc-500">
            {timeAgo(n.createdAt)}
          </span>
        </div>
        {n.body && (
          <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500 line-clamp-2">
            {n.body}
          </p>
        )}
      </div>

      {/* Unread dot + delete */}
      <div className="flex shrink-0 flex-col items-center gap-1.5 pt-0.5">
        {!n.read && <span className="h-2 w-2 rounded-full bg-indigo-500" />}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(n.id); }}
          title="Dismiss"
          className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-500 transition-all dark:text-zinc-600 dark:hover:text-red-400"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AppNavbar() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = trpc.notifications.list.useQuery(
    undefined,
    { refetchInterval: 30_000 }
  );

  const unreadCount = notifications.filter((n) => !n.read).length;
  const badgeLabel = unreadCount === 0 ? null : unreadCount > 9 ? "9+" : String(unreadCount);

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const deleteOne = trpc.notifications.deleteOne.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const clearRead = trpc.notifications.clearRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const clearAll = trpc.notifications.clearAll.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const readCount = notifications.filter((n) => n.read).length;

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border bg-white px-4 py-2 dark:bg-[#0f0f10]">
      {/* Left: sidebar trigger */}
      <SidebarTrigger />

      {/* Right: notification bell */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {badgeLabel && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold leading-none text-white dark:bg-indigo-500">
                {badgeLabel}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-80 overflow-hidden rounded-2xl p-0"
        >
          {/* Header */}
          <DropdownMenuLabel className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
              Notifications
              {notifications.length > 0 && (
                <span className="ml-1.5 text-xs font-normal text-zinc-400">({notifications.length})</span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={(e) => { e.preventDefault(); markAllRead.mutate(); }}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400 disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Read all
              </button>
            )}
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="my-0" />

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                <Bell className="mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  No notifications
                </p>
                <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                  Actions you take will appear here
                </p>
              </div>
            ) : (
              notifications.map((n, i) => (
                <div key={n.id}>
                  {i > 0 && (
                    <div className="mx-4 border-t border-zinc-100 dark:border-white/5" />
                  )}
                  <NotificationItem
                    n={n as Notification}
                    onRead={(id) => markRead.mutate({ id })}
                    onDelete={(id) => deleteOne.mutate({ id })}
                  />
                </div>
              ))
            )}
          </div>

          {/* Footer actions */}
          {notifications.length > 0 && (
            <>
              <DropdownMenuSeparator className="my-0" />
              <div className="flex items-center justify-between px-3 py-2">
                <button
                  onClick={(e) => { e.preventDefault(); clearRead.mutate(); }}
                  disabled={readCount === 0 || clearRead.isPending}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-zinc-300"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Clear read ({readCount})
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); clearAll.mutate(); }}
                  disabled={clearAll.isPending}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all
                </button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
