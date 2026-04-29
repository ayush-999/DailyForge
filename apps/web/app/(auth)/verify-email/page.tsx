"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import Link from "next/link"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Status = "verifying" | "success" | "error"

export default function VerifyEmailPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token")

  const [status, setStatus] = useState<Status>("verifying")
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setMessage("No verification token found in the link.")
      return
    }

    const verify = async () => {
      try {
        const res = await fetch(
          `/api/auth-flow/verify-email?token=${encodeURIComponent(token)}`
        )
        const body = await res.json()

        if (res.ok) {
          setStatus("success")
          setMessage(body.message || "Email verified successfully.")
          // Auto-redirect to sign in after 3 seconds
          setTimeout(() => router.push("/signin"), 3000)
        } else {
          setStatus("error")
          setMessage(body.error || "Verification failed.")
        }
      } catch {
        setStatus("error")
        setMessage("Could not connect to the server. Please try again.")
      }
    }

    verify()
  }, [token, router])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center"
    >
      {status === "verifying" && (
        <>
          <Loader2 className="mx-auto mb-6 h-14 w-14 animate-spin text-indigo-600 dark:text-indigo-400" />
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
            Verifying your email…
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Just a moment.
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/10">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
            Email verified!
          </h2>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            {message}
          </p>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-500">
            Redirecting you to sign in…
          </p>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
            <Link href="/signin">Sign In Now</Link>
          </Button>
        </>
      )}

      {status === "error" && (
        <>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
            Verification failed
          </h2>
          <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
            {message}
          </p>
          <Button asChild variant="outline">
            <Link href="/signup">Back to Sign Up</Link>
          </Button>
        </>
      )}
    </motion.div>
  )
}
