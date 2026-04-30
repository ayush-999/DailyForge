"use client";

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { AppNotInstalled } from "@/components/app-not-installed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Zap, Play, Pause, RotateCcw, Coffee, Timer, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

const PRESETS = [
  { label: "Classic", work: 25, brk: 5 },
  { label: "Long", work: 50, brk: 10 },
  { label: "Short", work: 15, brk: 3 },
];

export default function ProductivityPage() {
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [phase, setPhase] = useState<"work"|"break">("work");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [taskLabel, setTaskLabel] = useState("");
  const [sessionsToday, setSessionsToday] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const utils = trpc.useUtils();
  const { data: recentSessions = [], error } = trpc.pomodoro.sessions.list.useQuery({ days: 7 }, { retry: false });
  const { data: todayStats } = trpc.pomodoro.sessions.todayStats.useQuery(undefined, { retry: false });
  const { data: weeklyStats = [] } = trpc.pomodoro.sessions.weeklyStats.useQuery(undefined, { retry: false });
  const logSession = trpc.pomodoro.sessions.create.useMutation({
    onSuccess: () => { utils.pomodoro.sessions.list.invalidate(); utils.pomodoro.sessions.todayStats.invalidate(); utils.pomodoro.sessions.weeklyStats.invalidate(); },
  });

  const totalSecs = phase === "work" ? workDuration * 60 : breakDuration * 60;
  const pct = ((totalSecs - secondsLeft) / totalSecs) * 100;
  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");

  const r = 80;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  useEffect(() => {
    setSecondsLeft(workDuration * 60);
    setPhase("work");
    setRunning(false);
    clearInterval(intervalRef.current);
  }, [workDuration, breakDuration]);

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          if (phase === "work") {
            logSession.mutate({ taskLabel: taskLabel || undefined, duration: workDuration, breakDuration, completedAt: new Date().toISOString() });
            toast.success("Focus session complete! Take a break.");
            setPhase("break");
            return breakDuration * 60;
          } else {
            toast("Break over — ready for another session?");
            setPhase("work");
            return workDuration * 60;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, phase]);

  const reset = () => { clearInterval(intervalRef.current); setRunning(false); setPhase("work"); setSecondsLeft(workDuration * 60); };

  if (error?.data?.code === "FORBIDDEN") {
    return (
      <AppNotInstalled
        slug="productivity" name="Productivity"
        description="Pomodoro timer, focus tracking, and deep-work session management."
        icon={<Zap className="h-8 w-8 text-white" />}
        iconBg="bg-sky-600"
        scopes={["productivity:read","productivity:write","productivity:delete"]}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Left: Timer */}
      <div className="flex w-80 shrink-0 flex-col items-center gap-6 overflow-y-auto border-r border-zinc-200 bg-zinc-50 px-6 py-8 dark:border-white/10 dark:bg-[#0a0a0b]">
        {/* Phase badge */}
        <div className={cn("flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold", phase === "work" ? "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400" : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400")}>
          {phase === "work" ? <Timer className="h-4 w-4" /> : <Coffee className="h-4 w-4" />}
          {phase === "work" ? "Focus" : "Break"}
        </div>

        {/* Ring */}
        <div className="relative">
          <svg width="200" height="200" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth="12" className="text-zinc-200 dark:text-white/10" />
            <circle cx="100" cy="100" r={r} fill="none" strokeWidth="12" strokeLinecap="round"
              stroke={phase === "work" ? "#0ea5e9" : "#22c55e"}
              strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 100 100)"
              style={{ transition: running ? "stroke-dashoffset 1s linear" : undefined }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold tabular-nums text-zinc-900 dark:text-white">{mins}:{secs}</span>
            <span className="mt-1 text-xs text-zinc-400">{phase === "work" ? `${workDuration} min focus` : `${breakDuration} min break`}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button onClick={reset} className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-white/10 dark:hover:bg-white/5">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button onClick={() => setRunning(v => !v)}
            className={cn("flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-105", phase === "work" ? "bg-sky-600 hover:bg-sky-700" : "bg-green-600 hover:bg-green-700")}>
            {running ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 translate-x-0.5" />}
          </button>
        </div>

        {/* Task label */}
        <div className="w-full">
          <label className="mb-1 block text-xs font-medium text-zinc-500">Working on (optional)</label>
          <Input placeholder="What are you focusing on?" value={taskLabel} onChange={e => setTaskLabel(e.target.value)} className="text-sm" />
        </div>

        {/* Presets */}
        <div className="w-full">
          <p className="mb-2 text-xs font-medium text-zinc-500">Presets</p>
          <div className="flex gap-2">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => { setWorkDuration(p.work); setBreakDuration(p.brk); }}
                className={cn("flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors", workDuration === p.work && breakDuration === p.brk ? "border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400" : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20")}>
                {p.label}<br /><span className="text-[10px]">{p.work}/{p.brk}m</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom */}
        <div className="w-full">
          <p className="mb-2 text-xs font-medium text-zinc-500">Custom (minutes)</p>
          <div className="flex gap-2">
            <div className="flex-1"><label className="text-[10px] text-zinc-400">Work</label><Input type="number" min="1" max="120" value={workDuration} onChange={e => setWorkDuration(+e.target.value)} /></div>
            <div className="flex-1"><label className="text-[10px] text-zinc-400">Break</label><Input type="number" min="1" max="60" value={breakDuration} onChange={e => setBreakDuration(+e.target.value)} /></div>
          </div>
        </div>
      </div>

      {/* Right: Stats + History */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto px-6 py-6">
        {/* Today stats */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Sessions Today</p>
            <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">{todayStats?.count ?? 0}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Focus Minutes</p>
            <p className="mt-1 text-3xl font-bold text-zinc-900 dark:text-white">{todayStats?.totalMinutes ?? 0}</p>
          </div>
        </div>

        {/* Weekly bar chart */}
        {weeklyStats.length > 0 && (
          <div className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">This Week</p>
            <div className="flex items-end gap-1.5 h-20">
              {weeklyStats.map((day) => {
                const maxMins = Math.max(...weeklyStats.map(d => d.minutes), 1);
                const h = Math.max((day.minutes / maxMins) * 100, 4);
                return (
                  <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                    <div className="relative w-full group">
                      <div className="w-full rounded-t-sm bg-sky-500 dark:bg-sky-600 transition-all" style={{ height: `${h}%`, minHeight: day.minutes > 0 ? "8px" : "4px", opacity: day.minutes > 0 ? 1 : 0.2 }} />
                    </div>
                    <span className="text-[10px] text-zinc-400">{new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }).slice(0,2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Session history */}
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Recent Sessions</p>
        {recentSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Timer className="mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-400">No sessions yet — start the timer!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0f0f10]">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">{s.taskLabel || "Focus session"}</p>
                  <p className="text-xs text-zinc-400">{s.duration} min · {s.completedAt ? new Date(s.completedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
