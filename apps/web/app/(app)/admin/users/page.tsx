"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UserX,
  ShieldCheck,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

type ParsedUA = { browser: string; os: string; device: "Desktop" | "Mobile" | "Tablet" | "Unknown" };
type GeoLocation = { city: string; region: string; country: string; display: string } | null;

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  status: "ACTIVE" | "SUSPENDED" | "BANNED" | "PENDING" | "DELETED";
  createdAt: Date;
  userRoles: { role: { id: string; name: string; displayName: string } }[];
  lastSeenAt: Date | null;
  isOnline: boolean;
  lastDevice: ParsedUA | null;
  lastLocation: GeoLocation;
};

type SessionRow = {
  id: string;
  isActive: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string | null;
  ua: ParsedUA;
  location: GeoLocation;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  SUSPENDED: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  BANNED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  PENDING: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  DELETED: "bg-zinc-100 text-zinc-500 dark:bg-zinc-500/15 dark:text-zinc-400",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date: Date | string | null): string {
  if (!date) return "Never";
  const ms = Date.now() - new Date(date).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function DeviceIcon({ device }: { device: ParsedUA["device"] }) {
  if (device === "Mobile") return <Smartphone className="h-3.5 w-3.5" />;
  if (device === "Tablet") return <Tablet className="h-3.5 w-3.5" />;
  return <Monitor className="h-3.5 w-3.5" />;
}

function Avatar({ user }: { user: Pick<UserRow, "fullName" | "avatarUrl"> }) {
  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (user.avatarUrl) {
    return (
      <img src={user.avatarUrl} alt={user.fullName} className="h-8 w-8 rounded-full object-cover" />
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-blue-600 text-xs font-semibold text-white">
      {initials}
    </div>
  );
}

// ── Sessions panel ────────────────────────────────────────────────────────────

function SessionsPanel({ userId }: { userId: string }) {
  const { data: sessions = [], isLoading } = trpc.users.adminGetUserSessions.useQuery({ userId });

  if (isLoading) {
    return (
      <div className="flex h-16 items-center justify-center">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-center">
        <div>
          <WifiOff className="mx-auto mb-2 h-6 w-6 text-zinc-300 dark:text-zinc-600" />
          <p className="text-xs text-zinc-400">No active sessions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[270px] space-y-2 overflow-y-auto pr-0.5">
      {(sessions as SessionRow[]).map((s) => (
        <div
          key={s.id}
          className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-white/5 dark:bg-white/[0.03]"
        >
          {/* Device + online indicator */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <DeviceIcon device={s.ua.device} />
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                {s.ua.browser}
              </span>
              <span className="text-xs text-zinc-400">on {s.ua.os}</span>
            </div>
            <span
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                s.isActive
                  ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                  : "bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400"
              )}
            >
              {s.isActive ? (
                <Wifi className="h-2.5 w-2.5" />
              ) : (
                <WifiOff className="h-2.5 w-2.5" />
              )}
              {s.isActive ? "Online" : "Offline"}
            </span>
          </div>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {s.isActive ? "Active now" : `Last seen ${timeAgo(s.lastActiveAt)}`}
            </span>
            {s.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {s.location.display}
              </span>
            )}
            {s.ipAddress && (
              <span className="font-mono text-zinc-300 dark:text-zinc-600">{s.ipAddress}</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-zinc-300 dark:text-zinc-600">
            Session started {new Date(s.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "sessions">("details");
  const [editFullName, setEditFullName] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editStatus, setEditStatus] = useState<string>("ACTIVE");
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);

  const { data, isLoading } = trpc.users.adminList.useQuery({ page, search: search || undefined });
  const { data: allRoles = [] } = trpc.roles.list.useQuery();

  const updateUser = trpc.users.adminUpdate.useMutation({
    onSuccess: () => {
      utils.users.adminList.invalidate();
      toast.success("User updated");
      setEditing(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteUser = trpc.users.adminSoftDelete.useMutation({
    onSuccess: () => {
      utils.users.adminList.invalidate();
      toast.success("User removed");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (user: UserRow) => {
    setEditing(user);
    setActiveTab("details");
    setEditFullName(user.fullName);
    setEditDisplayName(user.displayName ?? "");
    setEditStatus(user.status);
    setEditRoleIds(user.userRoles.map((r) => r.role.id));
  };

  const handleSave = () => {
    if (!editing) return;
    updateUser.mutate({
      id: editing.id,
      fullName: editFullName,
      displayName: editDisplayName || undefined,
      status: editStatus as UserRow["status"],
      roleIds: editRoleIds,
    });
  };

  const handleDelete = (user: UserRow) => {
    if (!window.confirm(`Remove "${user.fullName}" from the platform? This action soft-deletes the account.`)) return;
    deleteUser.mutate({ id: user.id });
  };

  const toggleRole = (roleId: string) => {
    setEditRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  };

  return (
    <div className="px-8 py-6">
      {/* Search + count */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {data && (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {data.total} user{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-[#0f0f10]">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : !data || data.users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserX className="mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm font-medium text-zinc-900 dark:text-white">No users found</p>
            <p className="mt-1 text-xs text-zinc-500">Try a different search query</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left dark:border-white/5 dark:bg-white/[0.02]">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">User</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Account</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Activity</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
              {(data.users as UserRow[]).map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                  {/* User */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {/* Avatar with online dot */}
                      <div className="relative shrink-0">
                        <Avatar user={user} />
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-[#0f0f10]",
                            user.isOnline ? "bg-green-500" : "bg-zinc-300 dark:bg-zinc-600"
                          )}
                          title={user.isOnline ? "Online" : user.lastSeenAt ? `Last seen ${timeAgo(user.lastSeenAt)}` : "Never seen"}
                        />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">{user.fullName}</p>
                        {user.displayName && (
                          <p className="text-xs text-zinc-400">@{user.displayName}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-5 py-3.5 text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      {user.email}
                      {user.emailVerified && (
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-500" title="Verified" />
                      )}
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {user.userRoles.length === 0 ? (
                        <span className="text-xs text-zinc-400">No role</span>
                      ) : (
                        user.userRoles.map(({ role }) => (
                          <span
                            key={role.id}
                            className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                          >
                            {role.displayName}
                          </span>
                        ))
                      )}
                    </div>
                  </td>

                  {/* Account status */}
                  <td className="px-5 py-3.5">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                        STATUS_BADGE[user.status]
                      )}
                    >
                      {user.status}
                    </span>
                  </td>

                  {/* Activity */}
                  <td className="px-5 py-3.5">
                    {user.isOnline ? (
                      <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                        <Wifi className="h-3.5 w-3.5" />
                        <span className="font-medium">Online now</span>
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-400">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{timeAgo(user.lastSeenAt)}</span>
                        </div>
                        {user.lastDevice && (
                          <div className="mt-0.5 flex items-center gap-1 text-zinc-300 dark:text-zinc-600">
                            <DeviceIcon device={user.lastDevice.device} />
                            <span>{user.lastDevice.browser}</span>
                          </div>
                        )}
                        {user.lastLocation && (
                          <div className="mt-0.5 flex items-center gap-1 text-zinc-300 dark:text-zinc-600">
                            <MapPin className="h-3 w-3" />
                            <span>{user.lastLocation.display}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                        title="Edit user"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={deleteUser.isPending}
                        className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        title="Remove user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
          <span>Page {data.page} of {data.pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button variant="outline" size="sm" disabled={page === data.pages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {editing?.fullName}
            </DialogTitle>
            {/* Online status line */}
            {editing && (
              <p className={cn("flex items-center gap-1.5 text-xs", editing.isOnline ? "text-green-600 dark:text-green-400" : "text-zinc-400")}>
                <span className={cn("inline-block h-1.5 w-1.5 rounded-full", editing.isOnline ? "bg-green-500" : "bg-zinc-300")} />
                {editing.isOnline ? "Online now" : editing.lastSeenAt ? `Last seen ${timeAgo(editing.lastSeenAt)}` : "Never active"}
                {!editing.isOnline && editing.lastDevice && (
                  <span className="text-zinc-300 dark:text-zinc-600">
                    · {editing.lastDevice.browser} on {editing.lastDevice.os}
                  </span>
                )}
                {!editing.isOnline && editing.lastLocation && (
                  <span className="text-zinc-300 dark:text-zinc-600">
                    · {editing.lastLocation.display}
                  </span>
                )}
              </p>
            )}
          </DialogHeader>

          {/* Tabs */}
          <div className="shrink-0 flex border-b border-zinc-200 dark:border-white/10">
            {(["details", "sessions"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "border-b-2 px-4 py-2 text-sm font-medium capitalize transition-colors",
                  activeTab === tab
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "details" && (
              <div className="space-y-4 py-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Full Name</label>
                  <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Display Name</label>
                  <Input placeholder="Optional" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Account Status</label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      <SelectItem value="BANNED">Banned</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="DELETED" disabled className="text-zinc-400 opacity-50">Deleted (read-only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Roles</label>
                  <div className="space-y-2 rounded-lg border border-zinc-200 p-3 dark:border-white/10">
                    {allRoles.map((role) => (
                      <label key={role.id} className="flex cursor-pointer items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={editRoleIds.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                          className="h-4 w-4 rounded border-zinc-300 accent-indigo-600"
                        />
                        <div>
                          <span className="text-sm font-medium text-zinc-900 dark:text-white">{role.displayName}</span>
                          {role.description && (
                            <span className="ml-2 text-xs text-zinc-400">{role.description}</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sessions" && editing && (
              <div className="py-4">
                <SessionsPanel userId={editing.id} />
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t border-zinc-100 pt-4 dark:border-white/5">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            {activeTab === "details" && (
              <Button
                onClick={handleSave}
                disabled={updateUser.isPending || !editFullName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                {updateUser.isPending ? "Saving…" : "Save Changes"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
