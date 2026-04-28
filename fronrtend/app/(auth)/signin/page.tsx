"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import toast from "react-hot-toast"
import { setTokens } from "@/lib/auth"

interface SignInFormData {
  email: string
  password: string
}

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/sign-in`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      )
      const body = await res.json()

      if (!res.ok) {
        toast.error(body.error || "Invalid credentials")
        return
      }

      setTokens(body.accessToken, body.refreshToken)
      toast.success("Welcome back!")
      router.push("/dashboard")
    } catch {
      toast.error("Failed to connect to the server")
    } finally {
      setIsLoading(false)
    }
  }

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

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
          <div className="mb-1.5 flex items-center justify-between">
            <label
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              htmlFor="password"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 8, message: "At least 8 characters" },
            })}
            className="h-11 rounded-lg border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-[#1a1a1b]"
          />
          {errors.password && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          disabled={isLoading}
          className="mt-4 h-11 w-full rounded-lg bg-indigo-600 font-medium text-white transition-all duration-200 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-400">
        <span>Don&apos;t have an account?</span>
        <Link
          href="/signup"
          className="font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Sign Up
        </Link>
      </div>
    </motion.div>
  )
}
