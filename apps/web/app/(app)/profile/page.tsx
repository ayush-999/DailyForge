"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { User, KeyRound, Monitor, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-[#0f0f10]">
      <div className="mb-5 border-b border-zinc-100 pb-4 dark:border-white/5">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function Avatar({ name }: { name: string | null }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-blue-600 text-xl font-bold text-white">
      {initials}
    </div>
  );
}

function ProfileSection() {
  const utils = trpc.useUtils();
  const { data: user, isLoading } = trpc.users.me.useQuery();
  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      utils.users.me.invalidate();
      toast.success("Profile updated");
    },
    onError: (e) => toast.error(e.message || "Update failed"),
  });

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("");

  if (isLoading) return <Spinner className="h-5 w-5" />;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      fullName: fullName || user?.fullName || undefined,
      displayName: displayName || user?.displayName || undefined,
      timezone: timezone || user?.timezone || undefined,
    });
  };

  return (
    <Section title="Profile" description="Update your name and display preferences">
      <div className="flex items-center gap-4 mb-6">
        <Avatar name={user?.fullName ?? null} />
        <div>
          <p className="font-medium text-zinc-900 dark:text-white">
            {user?.fullName ?? user?.displayName ?? "—"}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{user?.email}</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder={user?.fullName ?? "Your full name"}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              placeholder={user?.displayName ?? "Display name"}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            placeholder={user?.timezone ?? "e.g. Asia/Kolkata"}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={updateProfile.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {updateProfile.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </Section>
  );
}

function PasswordSection() {
  const changePassword = trpc.users.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed — you'll be signed out of other sessions");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    },
    onError: (e) => toast.error(e.message || "Password change failed"),
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      toast.error("New passwords don't match");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <Section title="Password" description="Change your account password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm Password</Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={changePassword.isPending || !currentPassword || !newPassword}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            {changePassword.isPending ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </form>
    </Section>
  );
}

function SessionsSection() {
  const utils = trpc.useUtils();
  const { data: sessions = [], isLoading } = trpc.users.listSessions.useQuery();
  const revokeSession = trpc.users.revokeSession.useMutation({
    onSuccess: () => {
      utils.users.listSessions.invalidate();
      toast.success("Session revoked");
    },
    onError: () => toast.error("Failed to revoke session"),
  });

  return (
    <Section
      title="Active Sessions"
      description="Devices currently signed in to your account"
    >
      {isLoading ? (
        <Spinner className="h-5 w-5" />
      ) : sessions.length === 0 ? (
        <p className="text-sm text-zinc-400">No active sessions found.</p>
      ) : (
        <div className="divide-y divide-zinc-100 dark:divide-white/5">
          {sessions.map((session) => {
            const lastActive = new Date(session.lastActiveAt);
            const created = new Date(session.createdAt);
            return (
              <div
                key={session.id}
                className="flex items-start justify-between py-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-white/10">
                    <Monitor className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">
                      {session.userAgent
                        ? session.userAgent.slice(0, 60)
                        : "Unknown device"}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                      {session.ipAddress ?? "Unknown IP"} · Last active{" "}
                      {lastActive.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      Signed in{" "}
                      {created.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revokeSession.isPending}
                  onClick={() => revokeSession.mutate({ sessionId: session.id })}
                  className={cn(
                    "shrink-0 gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700",
                    "dark:text-red-400 dark:hover:bg-red-500/10"
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

export default function ProfilePage() {
  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="border-b border-zinc-200 bg-white px-8 py-5 dark:border-white/10 dark:bg-[#0f0f10]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/10">
            <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Account
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Manage your profile and security settings
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-6 px-8 py-8">
        <ProfileSection />
        <PasswordSection />
        <SessionsSection />
      </main>
    </div>
  );
}
