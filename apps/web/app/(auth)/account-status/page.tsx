"use client"

import { useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Clock, ShieldBan, LogOut } from "lucide-react"

const STATUS_CONFIG: Record<string, {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}> = {
  SUSPENDED: {
    icon: <AlertTriangle className="h-10 w-10" />,
    title: "Account Suspended",
    description:
      "Your account has been temporarily suspended. This may be due to a violation of our terms of service. Please contact support if you believe this is a mistake.",
    color: "text-amber-500",
  },
  BANNED: {
    icon: <ShieldBan className="h-10 w-10" />,
    title: "Account Banned",
    description:
      "Your account has been permanently banned from DailyForge. If you believe this decision was made in error, please reach out to our support team.",
    color: "text-red-500",
  },
  PENDING: {
    icon: <Clock className="h-10 w-10" />,
    title: "Account Pending Approval",
    description:
      "Your account is currently under review. We'll notify you by email once your account has been approved. Thank you for your patience.",
    color: "text-blue-500",
  },
}

export default function AccountStatusPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const accountStatus = (session?.user as { status?: string } | undefined)?.status

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.replace("/signin")
    } else if (sessionStatus === "authenticated" && (!accountStatus || accountStatus === "ACTIVE")) {
      router.replace("/dashboard")
    }
  }, [sessionStatus, accountStatus, router])

  const config = STATUS_CONFIG[accountStatus ?? "SUSPENDED"] ?? STATUS_CONFIG.SUSPENDED

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center"
    >
      <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-white/5 ${config.color}`}>
        {config.icon}
      </div>

      <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
        {config.title}
      </h2>
      <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {config.description}
      </p>

      <div className="space-y-3">
        <Button
          className="w-full bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          onClick={() => signOut({ callbackUrl: "/signin" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
        <p className="text-xs text-zinc-400">
          Need help?{" "}
          <a
            href="mailto:support@dailyforge.app"
            className="text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Contact support
          </a>
        </p>
      </div>
    </motion.div>
  )
}
