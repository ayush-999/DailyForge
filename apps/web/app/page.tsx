"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { BackgroundStars } from "@/components/background-stars"
import {
  ArrowRight,
  CheckSquare,
  Calendar,
  Heart,
  Wallet,
  BookOpen,
  Zap,
  Puzzle,
  Link2,
  LayoutDashboard,
} from "lucide-react"

const APPS = [
  {
    name: "Todo List",
    icon: CheckSquare,
    color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-500/20",
    description:
      "Capture tasks, set priorities, and track completion across every project.",
  },
  {
    name: "Daily Planner",
    icon: Calendar,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    description:
      "Plan your day hour-by-hour and stay on top of what matters most.",
  },
  {
    name: "Health Tracker",
    icon: Heart,
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20",
    description:
      "Log workouts, nutrition, and wellness habits in one unified view.",
  },
  {
    name: "Expense Tracker",
    icon: Wallet,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    description:
      "Monitor spending, set budgets, and surface trends over time.",
  },
  {
    name: "Notes & Diary",
    icon: BookOpen,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
    description:
      "Write freely, link notes to tasks, and never lose an idea again.",
  },
  {
    name: "Productivity",
    icon: Zap,
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/20",
    description:
      "Focus timers, habit streaks, and weekly reviews — all in one place.",
  },
]

const CONNECTIONS = [
  {
    icon: Puzzle,
    title: "Apps extend each other",
    description:
      "A todo item can appear in your Daily Planner. A note can attach to a health log. Every app speaks the same language.",
  },
  {
    icon: Link2,
    title: "One manifest, infinite possibilities",
    description:
      "Each app declares its extension points. Other apps contribute to them. No runtime surprises — just clean contracts.",
  },
  {
    icon: LayoutDashboard,
    title: "Your dashboard, your rules",
    description:
      "Install only what you need. Apps you haven't installed don't run, don't load, and don't slow you down.",
  },
]

const TESTIMONIALS = [
  {
    initials: "SR",
    name: "Sarah R.",
    role: "Freelance Designer",
    quote:
      "I used to juggle five different apps. DailyForge replaced all of them — and the way Todo connects into my Planner is genuinely magical.",
  },
  {
    initials: "MK",
    name: "Marcus K.",
    role: "Software Engineer",
    quote:
      "The modular system is exactly what I wanted. I installed the apps I needed in two minutes and the whole thing just worked.",
  },
  {
    initials: "PL",
    name: "Priya L.",
    role: "Product Manager",
    quote:
      "Clean, fast, and actually enjoyable to use. The dark mode alone makes it worth switching.",
  },
]

const FOOTER_LINKS = {
  Product: ["Features", "Changelog", "Roadmap", "Pricing"],
  Resources: ["Documentation", "API Reference", "Community", "Status"],
  Company: ["About", "Blog", "Careers", "Contact"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-zinc-50 font-sans text-zinc-900 transition-colors selection:bg-indigo-500/30 dark:bg-[#0a0a0b] dark:text-zinc-100">
      <BackgroundStars />

      {/* ── Navigation ── */}
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-200 bg-zinc-50/80 backdrop-blur-md dark:border-white/5 dark:bg-[#0a0a0b]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
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
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/signin">
              <Button variant="ghost" className="rounded-lg">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pt-32 pb-24">
        {/* Grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-40 dark:opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.12) 1px, transparent 1px), linear-gradient(to right, rgba(99,102,241,0.12) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        {/* Radial glow */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/15 blur-[100px] dark:bg-indigo-500/25" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-zinc-200/50 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
              v1.0 is now live
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-6 max-w-4xl text-5xl font-bold tracking-tight md:text-7xl"
            >
              Your life,{" "}
              <span className="bg-linear-to-br from-indigo-500 to-cyan-400 bg-clip-text text-transparent">
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
              exactly what you need — from todo lists to health trackers — and
              build your perfect workspace.
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
                  className="h-12 rounded-xl bg-indigo-600 px-8 text-base text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                  Start Building Free
                  <ArrowRight className="ml-2 h-4 w-4" />
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
        </div>
      </section>

      {/* ── Apps Ecosystem ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">
              An ecosystem of productivity
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Install and mix modules to match your unique workflow.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {APPS.map((app, i) => {
              const Icon = app.icon
              return (
                <motion.div
                  key={app.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className="group cursor-pointer rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-white/8 dark:bg-[#141415] dark:hover:bg-[#1a1a1c]"
                >
                  <div
                    className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${app.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-2 font-semibold text-zinc-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-400">
                    {app.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {app.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Connected by Design ── */}
      <section className="relative overflow-hidden bg-zinc-100/60 px-6 py-24 dark:bg-white/3">
        <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-indigo-500/5 via-transparent to-cyan-500/5" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">
              Connected by design
            </h2>
            <p className="mx-auto max-w-xl text-zinc-600 dark:text-zinc-400">
              Every app you install can talk to every other app. The system is
              built on declared contracts, not runtime magic.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-3">
            {CONNECTIONS.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="rounded-2xl border border-zinc-200 bg-white/80 p-6 backdrop-blur-sm dark:border-white/8 dark:bg-[#141415]/80"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                    <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="mb-2 font-semibold text-zinc-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {item.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">
              Loved by people who get things done
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              From freelancers to teams — DailyForge fits the way you work.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/8 dark:bg-[#141415]"
              >
                <p className="mb-6 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-400 to-blue-600 text-xs font-semibold text-white">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {t.name}
                    </p>
                    <p className="text-xs text-zinc-500">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl border border-indigo-200 bg-linear-to-br from-indigo-50 to-cyan-50 p-12 dark:border-indigo-500/20 dark:from-indigo-500/10 dark:to-cyan-500/10"
          >
            <h2 className="mb-4 text-3xl font-bold tracking-tight">
              Ready to forge your day?
            </h2>
            <p className="mb-8 text-zinc-600 dark:text-zinc-400">
              Free to use, open to extend. Start in under a minute.
            </p>
            <Link href="/signup">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-indigo-600 px-10 text-base text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-white/5 dark:bg-[#0a0a0b]">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="mb-12 flex items-center gap-2.5">
            <Image
              src="/images/logo.png"
              alt="DailyForge"
              width={24}
              height={24}
              className="h-6 w-auto object-contain"
            />
            <span className="font-bold text-zinc-900 dark:text-white">
              DailyForge
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {Object.entries(FOOTER_LINKS).map(([category, links]) => (
              <div key={category}>
                <h4 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
                  {category}
                </h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-8 text-sm text-zinc-500 sm:flex-row dark:border-white/5">
            <p>© {new Date().getFullYear()} DailyForge. Open Source Productivity.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-zinc-900 dark:hover:text-white">
                Privacy
              </a>
              <a href="#" className="hover:text-zinc-900 dark:hover:text-white">
                Terms
              </a>
              <a href="#" className="hover:text-zinc-900 dark:hover:text-white">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
