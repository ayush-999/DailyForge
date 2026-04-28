"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordStrength } from "@/components/ui/password-strength"
import { Spinner } from "@/components/ui/spinner"
import { MailCheck } from "lucide-react"
import toast from "react-hot-toast"

interface SignUpFormData {
  fullName: string
  email: string
  password: string
}

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    mode: "onChange",
    defaultValues: { fullName: "", email: "", password: "" },
  })

  const passwordValue = watch("password")

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/sign-up`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      )
      const body = await res.json()

      if (!res.ok) {
        toast.error(body.error || "Something went wrong")
        return
      }

      setSentTo(data.email)
    } catch {
      toast.error("Failed to connect to the server")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Check-your-email state ────────────────────────────────────────────────

  if (sentTo) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/10">
          <MailCheck className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Check your inbox
        </h2>
        <p className="mb-1 text-sm text-zinc-600 dark:text-zinc-400">
          We sent a verification link to
        </p>
        <p className="mb-6 font-medium text-zinc-900 dark:text-white">{sentTo}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-500">
          Click the link in the email to activate your account. The link expires
          in 24 hours.
        </p>
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-500">
          Wrong email?{" "}
          <button
            onClick={() => setSentTo(null)}
            className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Go back
          </button>
        </p>
      </motion.div>
    )
  }

  // ── Sign-up form ──────────────────────────────────────────────────────────

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

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor="name"
          >
            Full Name
          </label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            {...register("fullName", {
              required: "Full name is required",
              minLength: { value: 2, message: "At least 2 characters" },
              maxLength: { value: 50, message: "Cannot exceed 50 characters" },
              pattern: {
                value: /^[a-zA-Z\s]*$/,
                message: "Only letters and spaces",
              },
            })}
            className="h-11 rounded-lg border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-[#1a1a1b]"
          />
          {errors.fullName && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor="email"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: "Please enter a valid email address",
              },
            })}
            className="h-11 rounded-lg border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-[#1a1a1b]"
          />
          {errors.email && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor="password"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Create a strong password"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "At least 8 characters" },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                message:
                  "Must contain uppercase, lowercase, number, and special character",
              },
            })}
            className="h-11 rounded-lg border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-[#1a1a1b]"
          />
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {errors.password.message}
            </p>
          )}
          {passwordValue && <PasswordStrength password={passwordValue} />}
        </div>

        <Button
          disabled={isLoading}
          className="mt-4 h-11 w-full rounded-lg bg-indigo-600 font-medium text-white transition-all duration-200 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400">
        <span>Already have an account?</span>
        <Link
          href="/signin"
          className="font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Sign In
        </Link>
      </div>
    </motion.div>
  )
}
