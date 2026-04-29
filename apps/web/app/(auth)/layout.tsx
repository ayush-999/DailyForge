import Link from "next/link"
import { ReactNode } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-zinc-50 font-sans text-zinc-900 transition-colors dark:bg-[#0a0a0b] dark:text-zinc-100">
      {/* Background decorations */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-125 w-200 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[120px] dark:bg-indigo-500/20" />
      <div className="pointer-events-none absolute top-0 h-full w-full bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />

      {/* Header */}
      <div className="absolute top-0 left-0 z-10 flex w-full items-center justify-between p-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/logo.png"
            alt="DailyForge"
            width={28}
            height={28}
            className="h-7 w-auto object-contain"
          />
          <span className="font-bold text-zinc-900 dark:text-white">
            DailyForge
          </span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <main className="relative z-10 p-6 sm:mx-auto sm:w-full sm:max-w-150">
        <div className="rounded-3xl border border-zinc-200 bg-white/80 p-8 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#141415]/80 dark:shadow-none">
          {children}
        </div>
      </main>

      {/* Footer */}
      <div className="absolute bottom-6 z-10 w-full text-center text-xs text-zinc-500">
        <p>Protected by DailyForge Security</p>
      </div>
    </div>
  )
}
