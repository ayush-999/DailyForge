"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Shield, Users, KeyRound } from "lucide-react";

const NAV = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/roles", label: "Roles", icon: KeyRound },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: check, isLoading } = trpc.users.adminCheck.useQuery();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!check?.isSuperAdmin) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
          <Shield className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <p className="text-lg font-semibold text-zinc-900 dark:text-white">Access Denied</p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Super Admin privileges are required to access this area.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header + sub-nav */}
      <header className="shrink-0 border-b border-zinc-200 bg-white dark:border-white/10 dark:bg-[#0f0f10]">
        <div className="px-8 pt-5 pb-0">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Admin</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Manage users, roles, and platform access control
          </p>
        </div>
        <nav className="mt-4 flex gap-1 px-8">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith(href)
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
