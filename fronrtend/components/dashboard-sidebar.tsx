"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { getAuthHeaders, removeToken } from "@/lib/auth"
import {
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface UserData {
  id: string
  fullName: string
  email: string
  profile_image: string | null
}

function UserAvatar({
  user,
  size = "sm",
}: {
  user: UserData | null
  size?: "sm" | "lg"
}) {
  const dim = size === "lg" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs"
  const iconSize = size === "lg" ? "h-5 w-5" : "h-4 w-4"

  if (!user) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-400 to-blue-600",
          dim
        )}
      >
        <User className={cn("text-white", iconSize)} />
      </div>
    )
  }

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  if (user.profile_image) {
    const base =
      process.env.NEXT_PUBLIC_API_URL?.split("/api")[0] ??
      "http://localhost:5000"
    const src = user.profile_image.startsWith("http")
      ? user.profile_image
      : `${base}${user.profile_image}`
    return (
      <Image
        src={src}
        alt={user.fullName}
        width={size === "lg" ? 40 : 32}
        height={size === "lg" ? 40 : 32}
        className={cn("shrink-0 rounded-full object-cover", dim)}
      />
    )
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-400 to-blue-600 font-semibold text-white",
        dim
      )}
    >
      {initials}
    </div>
  )
}

export default function DashboardSidebar() {
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)

  const handleLogout = () => {
    removeToken()
    router.push("/signin")
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = getAuthHeaders()
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/dashboard/getData`,
          { headers }
        )
        if (!res.ok) return
        const json = await res.json()
        setUser(json.data?.user ?? null)
      } catch {
        // silently fail — UI shows fallback avatar
      }
    }
    fetchData()
  }, [])

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      {/* Header — logo + brand */}
      <SidebarHeader className="border-b border-sidebar-border px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  <Image
                    src="/images/logo.png"
                    alt="DailyForge"
                    width={32}
                    height={32}
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <span className="font-semibold text-sidebar-foreground">
                  DailyForge
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive tooltip="Dashboard">
                <Link href="/dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — user account dropdown */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <UserAvatar user={user} />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.fullName ?? "Loading…"}
                    </span>
                    <span className="truncate text-xs text-sidebar-foreground/60">
                      {user?.email ?? ""}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-sidebar-foreground/40" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-56 rounded-xl"
                side="top"
                align="end"
                sideOffset={8}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-3 px-2 py-2">
                    <UserAvatar user={user} size="lg" />
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.fullName}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                  <Link href="/profile">
                    <User className="h-4 w-4" />
                    <span>Account</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer gap-2">
                  <Link href="/settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={toggleTheme}
                  className="cursor-pointer gap-2"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="h-4 w-4" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="h-4 w-4" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer gap-2 text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
