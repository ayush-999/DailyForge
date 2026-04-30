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
import { Plus, Pencil, Trash2, Lock, Users, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

type Permission = { id: string; resource: string; action: string; scope: string };
type Role = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  rolePermissions: { permission: Permission }[];
  _count: { userRoles: number };
};

function groupPermissions(permissions: Permission[]) {
  const groups: Record<string, Permission[]> = {};
  for (const p of permissions) {
    if (!groups[p.resource]) groups[p.resource] = [];
    groups[p.resource].push(p);
  }
  return groups;
}

const RESOURCE_LABEL: Record<string, string> = {
  all: "Full Platform",
  User: "Users",
  App: "Apps",
  Role: "Roles",
  AuditLog: "Audit Logs",
};

export default function AdminRolesPage() {
  const utils = trpc.useUtils();

  const { data: roles = [], isLoading } = trpc.roles.list.useQuery();
  const { data: allPermissions = [] } = trpc.roles.listPermissions.useQuery();

  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);

  // Edit form state
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPermIds, setEditPermIds] = useState<string[]>([]);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPermIds, setNewPermIds] = useState<string[]>([]);

  const updateRole = trpc.roles.update.useMutation({
    onSuccess: () => {
      utils.roles.list.invalidate();
      toast.success("Role updated");
      setEditingRole(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const createRole = trpc.roles.create.useMutation({
    onSuccess: () => {
      utils.roles.list.invalidate();
      toast.success("Role created");
      setCreating(false);
      setNewName("");
      setNewDisplayName("");
      setNewDescription("");
      setNewPermIds([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteRole = trpc.roles.delete.useMutation({
    onSuccess: () => {
      utils.roles.list.invalidate();
      toast.success("Role deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setEditDisplayName(role.displayName);
    setEditDescription(role.description ?? "");
    setEditPermIds(role.rolePermissions.map((rp) => rp.permission.id));
  };

  const handleUpdate = () => {
    if (!editingRole) return;
    updateRole.mutate({
      id: editingRole.id,
      displayName: editDisplayName,
      description: editDescription || undefined,
      permissionIds: editPermIds,
    });
  };

  const handleCreate = () => {
    createRole.mutate({
      name: newName,
      displayName: newDisplayName,
      description: newDescription || undefined,
      permissionIds: newPermIds,
    });
  };

  const handleDelete = (role: Role) => {
    if (!window.confirm(`Delete role "${role.displayName}"? This cannot be undone.`)) return;
    deleteRole.mutate({ id: role.id });
  };

  const togglePerm = (
    id: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const grouped = groupPermissions(allPermissions);

  const PermissionsEditor = ({
    selected,
    setSelected,
  }: {
    selected: string[];
    setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  }) => (
    <div className="max-h-64 space-y-4 overflow-y-auto pr-1">
      {Object.entries(grouped).map(([resource, perms]) => (
        <div key={resource}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {RESOURCE_LABEL[resource] ?? resource}
          </p>
          <div className="space-y-1.5">
            {perms.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => togglePerm(p.id, selected, setSelected)}
                  className="h-4 w-4 rounded border-zinc-300 accent-indigo-600"
                />
                <span className="text-sm text-zinc-800 dark:text-zinc-200">
                  <span className="font-medium capitalize">{p.action}</span>
                  <span className="ml-1 text-xs text-zinc-400">· {p.resource}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="px-8 py-6">
      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {roles.length} role{roles.length !== 1 ? "s" : ""} configured
        </p>
        <Button
          onClick={() => setCreating(true)}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Role
        </Button>
      </div>

      {/* Roles list */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f0f10]"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-white">
                      {role.displayName}
                    </h3>
                    <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
                      {role.name}
                    </span>
                    {role.isSystem && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                        <Lock className="h-2.5 w-2.5" />
                        System
                      </span>
                    )}
                  </div>

                  {role.description && (
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      {role.description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {role._count.userRoles} user{role._count.userRoles !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {role.rolePermissions.length} permission
                      {role.rolePermissions.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Permissions chips */}
                  {role.rolePermissions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {role.rolePermissions.map(({ permission: p }) => (
                        <span
                          key={p.id}
                          className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                        >
                          {p.resource}:{p.action}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => openEdit(role as Role)}
                    className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                    title="Edit role"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(role as Role)}
                    disabled={role.isSystem || deleteRole.isPending}
                    className={cn(
                      "rounded-lg p-1.5 text-zinc-400 transition-colors",
                      role.isSystem
                        ? "cursor-not-allowed opacity-30"
                        : "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    )}
                    title={role.isSystem ? "System roles cannot be deleted" : "Delete role"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit Role Dialog ── */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Role: {editingRole?.displayName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Display Name
              </label>
              <Input value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Description
              </label>
              <Input
                placeholder="Optional description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Permissions
              </label>
              <div className="rounded-lg border border-zinc-200 p-3 dark:border-white/10">
                <PermissionsEditor selected={editPermIds} setSelected={setEditPermIds} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateRole.isPending || !editDisplayName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {updateRole.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Role Dialog ── */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Role ID <span className="text-zinc-400">(lowercase, underscores only)</span>
              </label>
              <Input
                placeholder="e.g. content_editor"
                value={newName}
                onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Display Name
              </label>
              <Input
                placeholder="e.g. Content Editor"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Description
              </label>
              <Input
                placeholder="Optional description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Permissions
              </label>
              <div className="rounded-lg border border-zinc-200 p-3 dark:border-white/10">
                <PermissionsEditor selected={newPermIds} setSelected={setNewPermIds} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createRole.isPending || !newName.trim() || !newDisplayName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
            >
              {createRole.isPending ? "Creating…" : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
