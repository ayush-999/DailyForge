"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

import { BackgroundStars } from "@/components/background-stars"

// Mock data for the "apps" users can install
const APPS = [
  {
    name: "Todo List",
    icon: "✓",
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-500",
    border: "border-indigo-500/20",
  },
  {
    name: "Daily Planner",
    icon: "📅",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-500",
    border: "border-blue-500/20",
  },
  {
    name: "Health Tracker",
    icon: "❤️",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-500",
    border: "border-rose-500/20",
  },
  {
    name: "Expense Tracker",
    icon: "💰",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
    border: "border-amber-500/20",
  },
  {
    name: "Notes & Diary",
    icon: "📓",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-500",
    border: "border-purple-500/20",
  },
  {
    name: "Productivity",
    icon: "⚡",
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-500",
    border: "border-cyan-500/20",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900 transition-colors selection:bg-indigo-500/30 dark:bg-[#0a0a0b] dark:text-zinc-100">
      <BackgroundStars />
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-200 bg-zinc-50/80 backdrop-blur-md dark:border-white/5 dark:bg-[#0a0a0b]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <img src="/images/logo-dark.png" alt="DailyForge Logo" className="h-8 w-auto block dark:hidden" />
            <img src="/images/logo-light.png" alt="DailyForge Logo" className="h-8 w-auto hidden dark:block" />
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link
              href="/login"
              className="font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              Log in
            </Link>
            <Link href="/signup">
              <Button className="rounded-xl bg-indigo-600 px-6 font-medium text-white shadow-[0_0_15px_rgba(79,70,229,0.2)] transition-all hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="px-6 pt-32 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-24 flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-200/50 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-600 dark:bg-indigo-500" />
              v1.0 is now live
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-6 max-w-4xl text-5xl font-bold tracking-tight md:text-7xl"
            >
              Your life,{" "}
              <span className="bg-gradient-to-r from-indigo-500 to-cyan-400 bg-clip-text text-transparent">
                beautifully organized.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-10 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400"
            >
              DailyForge is an open-source modular productivity suite. Install
              exactly what you need—from todo lists to health trackers—and build
              your perfect workspace.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col items-center gap-4 sm:flex-row"
            >
              <Link href="/signup">
                <Button
                  size="lg"
                  className="h-12 rounded-xl bg-indigo-600 px-8 text-base text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  Start Building Free
                </Button>
              </Link>
              <Link href="#" target="_blank">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl border-zinc-300 bg-white px-8 text-base text-zinc-900 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                >
                  View Documentation
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* App Ecosystem Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-20"
          >
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">
                An ecosystem of productivity
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Install and mix modules to match your unique workflow.
              </p>
            </div>

            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {APPS.map((app, index) => (
                <motion.div
                  key={app.name}
                  whileHover={{ y: -5, scale: 1.02 }}
                  className={`group cursor-pointer rounded-2xl border bg-white p-6 shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md dark:bg-[#141415] dark:shadow-none dark:hover:bg-[#1a1a1c]`}
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${app.color}`}
                  >
                    {app.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-zinc-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                    {app.name}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    Add the {app.name} extension to your workspace and integrate
                    it seamlessly with your daily flow.
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-zinc-200 bg-zinc-50 py-12 dark:border-white/5 dark:bg-[#0a0a0b]">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-zinc-500">
          <p>
            © {new Date().getFullYear()} DailyForge. Open Source Productivity.
          </p>
        </div>
      </footer>
    </div>
  )
}
