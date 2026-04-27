"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Welcome back
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Enter your details to sign in to your account
        </p>
      </div>

      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
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
          <div className="mb-1.5 flex items-center justify-between">
            <label
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              htmlFor="password"
            >
              Password
            </label>
            <Link
              href="#"
              className="text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 transition-all placeholder:text-zinc-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none dark:border-white/10 dark:bg-[#0a0a0b] dark:text-white dark:placeholder:text-zinc-600"
          />
        </div>

        <Button className="mt-4 h-12 w-full rounded-xl bg-indigo-600 font-medium text-white shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
          Sign In
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400">
        <span>Don't have an account?</span>
        <Link
          href="/signup"
          className="font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Sign up
        </Link>
      </div>
    </motion.div>
  )
}
