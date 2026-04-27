"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

export default function SignUpPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Create an account
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Join DailyForge to start building your workspace
        </p>
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor="name"
          >
            Full Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="John Doe"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none dark:border-white/10 dark:bg-[#0a0a0b] dark:text-white dark:placeholder:text-zinc-600"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="name@example.com"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none dark:border-white/10 dark:bg-[#0a0a0b] dark:text-white dark:placeholder:text-zinc-600"
          />
        </div>
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor="password"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Create a strong password"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none dark:border-white/10 dark:bg-[#0a0a0b] dark:text-white dark:placeholder:text-zinc-600"
          />
        </div>

        <Button className="mt-4 h-12 w-full rounded-xl bg-indigo-600 font-medium text-white shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
          Create Account
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400">
        <span>Already have an account?</span>
        <Link
          href="/login"
          className="font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Log in
        </Link>
      </div>
    </motion.div>
  )
}
