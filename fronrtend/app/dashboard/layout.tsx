"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"
import DashboardSidebar from "@/components/dashboard-sidebar"
import { Spinner } from "@/components/ui/spinner"
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = isAuthenticated()
      if (!authenticated) {
        router.push("/signin")
      } else {
        setIsAuth(true)
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="h-12 w-12" />
      </div>
    )
  }

  if (!isAuth) {
    return null
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-2">
          <SidebarTrigger className="md:hidden" />
        </div>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
