"use client"

import { useEffect, useState } from "react"
import { getAuthHeaders } from "@/lib/auth"
import { Spinner } from "@/components/ui/spinner"
import { CheckCircle, Clock, Zap } from "lucide-react"

interface DashboardData {
  user: {
    id: string
    fullName: string
    email: string
    profile_image: string | null
  }
  stats: {
    totalTodos: number
    completedTodos: number
    upcomingTasks: number
  }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers = getAuthHeaders()
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/dashboard/getData`,
          {
            headers,
          }
        )

        if (!res.ok) {
          throw new Error("Failed to fetch dashboard data")
        }

        const responseData = await res.json()
        setData(responseData.data)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-12 w-12" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-8 py-4 dark:border-white/10 dark:bg-[#0f0f10]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
              Welcome back, {data?.user.fullName}!
            </h1>
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              Here's your productivity overview
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Total Todos Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-[#0f0f10]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Total Tasks
                </p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                  {data?.stats.totalTodos}
                </p>
              </div>
              <div className="rounded-full bg-indigo-100 p-3 dark:bg-indigo-500/10">
                <Zap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
              All your tasks in one place
            </p>
          </div>

          {/* Completed Todos Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-[#0f0f10]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Completed
                </p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                  {data?.stats.completedTodos}
                </p>
              </div>
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
              Tasks you've completed
            </p>
          </div>

          {/* Upcoming Tasks Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-[#0f0f10]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Upcoming
                </p>
                <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-white">
                  {data?.stats.upcomingTasks}
                </p>
              </div>
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-500/10">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-500">
              Tasks waiting for you
            </p>
          </div>
        </div>

        {/* Welcome Card */}
        <div className="mt-8 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-8 dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-blue-500/10">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Ready to boost your productivity?
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Start creating tasks and organizing your day with DailyForge. Your
              success starts here.
            </p>
            <button className="mt-4 rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition-all duration-200 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
              Create First Task
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
