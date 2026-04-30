"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AppNotInstalled } from "@/components/app-not-installed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Trash2, Check } from "lucide-react";
import toast from "react-hot-toast";

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#64748b"];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function duration(start: string, end: string) {
  const diff = timeToMin(end) - timeToMin(start);
  if (diff <= 0) return "";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h ${m > 0 ? m + "m" : ""}`.trim() : `${m}m`;
}

export default function DailyPlannerPage() {
  const [date, setDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", startTime: "09:00", endTime: "10:00", color: COLORS[0], description: "" });
  const dateStr = toDateStr(date);

  const utils = trpc.useUtils();
  const { data: blocks = [], isLoading, error } = trpc.dailyPlanner.blocks.list.useQuery(
    { date: dateStr },
    { retry: false }
  );
  const createBlock = trpc.dailyPlanner.blocks.create.useMutation({
    onSuccess: () => { utils.dailyPlanner.blocks.list.invalidate(); setShowForm(false); setForm({ title: "", startTime: "09:00", endTime: "10:00", color: COLORS[0], description: "" }); toast.success("Block added"); },
    onError: (e) => toast.error(e.message),
  });
  const toggleBlock = trpc.dailyPlanner.blocks.update.useMutation({
    onSuccess: () => utils.dailyPlanner.blocks.list.invalidate(),
  });
  const deleteBlock = trpc.dailyPlanner.blocks.delete.useMutation({
    onSuccess: () => { utils.dailyPlanner.blocks.list.invalidate(); toast.success("Deleted"); },
  });

  if (error?.data?.code === "FORBIDDEN") {
    return (
      <AppNotInstalled
        slug="daily-planner" name="Daily Planner"
        description="Plan your day with time blocks, priorities, and focus sessions."
        icon={<CalendarDays className="h-8 w-8 text-white" />}
        iconBg="bg-violet-600"
        scopes={["planner:read","planner:write","planner:delete"]}
      />
    );
  }

  const prev = () => { const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d); };
  const next = () => { const d = new Date(date); d.setDate(d.getDate() + 1); setDate(d); };
  const today = () => setDate(new Date());

  const sorted = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Date nav */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 bg-zinc-50 px-6 py-3 dark:border-white/5 dark:bg-[#0a0a0b]">
        <div className="flex items-center gap-2">
          <button onClick={prev} className="rounded-lg p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
          <span className="min-w-60 text-center text-sm font-medium text-zinc-900 dark:text-white">{fmt(date)}</span>
          <button onClick={next} className="rounded-lg p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={today} className="ml-2 rounded-lg border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/5">Today</button>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
          <Plus className="h-3.5 w-3.5" /> Add Block
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden">
        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center"><Spinner className="h-7 w-7" /></div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CalendarDays className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
              <p className="font-medium text-zinc-500">No blocks scheduled</p>
              <p className="mt-1 text-sm text-zinc-400">Click "Add Block" to plan your day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map((block) => (
                <div key={block.id} className={cn("flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]", block.completed && "opacity-60")}>
                  <div className="mt-0.5 h-4 w-1 shrink-0 rounded-full" style={{ backgroundColor: block.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn("font-medium text-zinc-900 dark:text-white", block.completed && "line-through")}>{block.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500">{block.startTime} – {block.endTime} · {duration(block.startTime, block.endTime)}</p>
                        {block.description && <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{block.description}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => toggleBlock.mutate({ id: block.id, completed: !block.completed })} className={cn("flex h-6 w-6 items-center justify-center rounded-md transition-colors", block.completed ? "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400" : "bg-zinc-100 text-zinc-400 hover:bg-green-100 hover:text-green-600 dark:bg-white/10 dark:hover:bg-green-500/20")}>
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteBlock.mutate({ id: block.id })} className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-100 text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:bg-white/10 dark:hover:bg-red-500/20 dark:hover:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add block panel */}
        {showForm && (
          <div className="w-80 shrink-0 overflow-y-auto border-l border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-[#0a0a0b]">
            <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">New Time Block</h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Title</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Deep work session" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Start</label>
                  <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">End</label>
                  <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Color</label>
                <div className="flex flex-wrap gap-1.5">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={cn("h-6 w-6 rounded-full border-2 transition-transform hover:scale-110", form.color === c ? "border-zinc-900 dark:border-white scale-110" : "border-transparent")} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Description (optional)</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Notes about this block" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" className="flex-1 bg-violet-600 hover:bg-violet-700" disabled={!form.title || createBlock.isPending}
                  onClick={() => createBlock.mutate({ date: dateStr, title: form.title, startTime: form.startTime, endTime: form.endTime, color: form.color, description: form.description || undefined })}>
                  {createBlock.isPending ? "Adding…" : "Add"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
