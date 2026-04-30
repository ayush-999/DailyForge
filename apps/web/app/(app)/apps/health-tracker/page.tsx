"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AppNotInstalled } from "@/components/app-not-installed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Heart, Droplets, Dumbbell, Moon, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";

const WATER_AMOUNTS = [150, 250, 350, 500];
const WORKOUT_TYPES = ["Running","Walking","Cycling","Swimming","Gym","Yoga","HIIT","Other"];
const QUALITY_LABELS = ["","Terrible","Poor","Okay","Good","Excellent"];

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", active ? "border-rose-500 text-rose-600 dark:text-rose-400" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}>
      {children}
    </button>
  );
}

function WaterTab() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.health.water.today.useQuery(undefined, { retry: false });
  const log = trpc.health.water.log.useMutation({ onSuccess: () => utils.health.water.today.invalidate(), onError: (e) => toast.error(e.message) });
  const del = trpc.health.water.delete.useMutation({ onSuccess: () => utils.health.water.today.invalidate() });
  const [custom, setCustom] = useState("");

  if (isLoading) return <div className="flex h-40 justify-center items-center"><Spinner className="h-7 w-7" /></div>;

  const pct = Math.min(((data?.total ?? 0) / (data?.goal ?? 2500)) * 100, 100);
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="space-y-6">
      {/* Progress ring */}
      <div className="flex flex-col items-center gap-3 py-4">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-zinc-100 dark:text-white/10" />
          <circle cx="70" cy="70" r={r} fill="none" stroke="#3b82f6" strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset 0.4s ease" }} />
          <text x="70" y="65" textAnchor="middle" className="fill-zinc-900 dark:fill-white" fontSize="18" fontWeight="700">{data?.total ?? 0}</text>
          <text x="70" y="84" textAnchor="middle" className="fill-zinc-400" fontSize="11">of {data?.goal} ml</text>
        </svg>
        <p className={cn("text-sm font-medium", pct >= 100 ? "text-green-600 dark:text-green-400" : "text-zinc-500")}>
          {pct >= 100 ? "Daily goal reached! 🎉" : `${Math.round(pct)}% of daily goal`}
        </p>
      </div>

      {/* Quick add */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Quick Add</p>
        <div className="flex flex-wrap gap-2">
          {WATER_AMOUNTS.map(a => (
            <Button key={a} size="sm" variant="outline" disabled={log.isPending} onClick={() => log.mutate({ amount: a })}
              className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/10">
              <Droplets className="h-3.5 w-3.5" /> {a} ml
            </Button>
          ))}
          <div className="flex gap-1.5">
            <Input type="number" min="1" max="2000" className="w-24" placeholder="Custom" value={custom} onChange={e => setCustom(e.target.value)} />
            <Button size="sm" disabled={!custom || log.isPending} onClick={() => { log.mutate({ amount: parseInt(custom) }); setCustom(""); }}>Add</Button>
          </div>
        </div>
      </div>

      {/* Log */}
      {(data?.logs ?? []).length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Today's Log</p>
          <div className="space-y-1.5">
            {data!.logs.map(l => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white px-3 py-2 dark:border-white/5 dark:bg-[#0f0f10]">
                <span className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"><Droplets className="h-3.5 w-3.5 text-blue-500" />{l.amount} ml</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">{new Date(l.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                  <button onClick={() => del.mutate({ id: l.id })} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkoutTab() {
  const utils = trpc.useUtils();
  const { data: workouts = [], isLoading } = trpc.health.workout.list.useQuery({ days: 14 }, { retry: false });
  const create = trpc.health.workout.create.useMutation({ onSuccess: () => { utils.health.workout.list.invalidate(); setShowForm(false); setForm({ type: "", duration: "", calories: "", notes: "" }); toast.success("Workout logged"); }, onError: e => toast.error(e.message) });
  const del = trpc.health.workout.delete.useMutation({ onSuccess: () => utils.health.workout.list.invalidate() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "", duration: "", calories: "", notes: "" });

  if (isLoading) return <div className="flex h-40 justify-center items-center"><Spinner className="h-7 w-7" /></div>;

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-1.5 bg-rose-500 hover:bg-rose-600"><Plus className="h-3.5 w-3.5" /> Log Workout</Button>

      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-[#0a0a0b] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500">
                <option value="">Select type</option>
                {WORKOUT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Duration (min)</label>
              <Input type="number" min="1" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Calories (optional)</label>
              <Input type="number" min="0" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} placeholder="250" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Notes (optional)</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" className="flex-1 bg-rose-500 hover:bg-rose-600" disabled={!form.type || !form.duration || create.isPending}
              onClick={() => create.mutate({ type: form.type, duration: parseInt(form.duration), calories: form.calories ? parseInt(form.calories) : undefined, notes: form.notes || undefined })}>
              {create.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {workouts.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">No workouts logged yet</p>
      ) : (
        <div className="space-y-2">
          {workouts.map(w => (
            <div key={w.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 dark:border-white/10 dark:bg-[#0f0f10]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-500/10"><Dumbbell className="h-4 w-4 text-rose-600 dark:text-rose-400" /></div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{w.type}</p>
                  <p className="text-xs text-zinc-500">{w.duration} min{w.calories ? ` · ${w.calories} kcal` : ""} · {new Date(w.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
              </div>
              <button onClick={() => del.mutate({ id: w.id })} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SleepTab() {
  const utils = trpc.useUtils();
  const { data: logs = [], isLoading } = trpc.health.sleep.recent.useQuery(undefined, { retry: false });
  const log = trpc.health.sleep.log.useMutation({ onSuccess: () => { utils.health.sleep.recent.invalidate(); setShowForm(false); setForm({ bedtime: "22:30", wakeTime: "06:30", quality: 3, notes: "" }); toast.success("Sleep logged"); }, onError: e => toast.error(e.message) });
  const del = trpc.health.sleep.delete.useMutation({ onSuccess: () => utils.health.sleep.recent.invalidate() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bedtime: "22:30", wakeTime: "06:30", quality: 3, notes: "" });

  const calcHours = (bed: string, wake: string) => {
    const [bh, bm] = bed.split(":").map(Number);
    const [wh, wm] = wake.split(":").map(Number);
    let mins = (wh * 60 + wm) - (bh * 60 + bm);
    if (mins < 0) mins += 24 * 60;
    return (mins / 60).toFixed(1);
  };

  if (isLoading) return <div className="flex h-40 justify-center items-center"><Spinner className="h-7 w-7" /></div>;

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"><Plus className="h-3.5 w-3.5" /> Log Sleep</Button>

      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-[#0a0a0b] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Bedtime</label><Input type="time" value={form.bedtime} onChange={e => setForm(f => ({ ...f, bedtime: e.target.value }))} /></div>
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Wake up</label><Input type="time" value={form.wakeTime} onChange={e => setForm(f => ({ ...f, wakeTime: e.target.value }))} /></div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-500">Quality: <span className="text-zinc-900 dark:text-white">{QUALITY_LABELS[form.quality]}</span></label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(q => (
                <button key={q} onClick={() => setForm(f => ({ ...f, quality: q }))} className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium border transition-colors", form.quality === q ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-white/10")}>{q}</button>
              ))}
            </div>
          </div>
          <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes (optional)" />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700" disabled={log.isPending}
              onClick={() => log.mutate({ bedtime: form.bedtime, wakeTime: form.wakeTime, quality: form.quality, notes: form.notes || undefined })}>
              {log.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}

      {logs.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">No sleep logs yet</p>
      ) : (
        <div className="space-y-2">
          {logs.map(l => (
            <div key={l.id} className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-3 dark:border-white/10 dark:bg-[#0f0f10]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10"><Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /></div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{l.bedtime} → {l.wakeTime} · {calcHours(l.bedtime, l.wakeTime)}h</p>
                  <p className="text-xs text-zinc-500">Quality: {QUALITY_LABELS[l.quality]} · {new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
              </div>
              <button onClick={() => del.mutate({ id: l.id })} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HealthTrackerPage() {
  const [tab, setTab] = useState<"water"|"workout"|"sleep">("water");
  const { error } = trpc.health.stats.useQuery(undefined, { retry: false });

  if (error?.data?.code === "FORBIDDEN") {
    return (
      <AppNotInstalled
        slug="health-tracker" name="Health Tracker"
        description="Track workouts, water intake, sleep, and wellness streaks."
        icon={<Heart className="h-8 w-8 text-white" />}
        iconBg="bg-rose-500"
        scopes={["health:read","health:write","health:delete"]}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 border-b border-zinc-200 bg-white px-6 dark:border-white/10 dark:bg-[#0f0f10]">
        <Tab active={tab === "water"} onClick={() => setTab("water")}><span className="flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5" />Water</span></Tab>
        <Tab active={tab === "workout"} onClick={() => setTab("workout")}><span className="flex items-center gap-1.5"><Dumbbell className="h-3.5 w-3.5" />Workouts</span></Tab>
        <Tab active={tab === "sleep"} onClick={() => setTab("sleep")}><span className="flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" />Sleep</span></Tab>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl">
        {tab === "water" && <WaterTab />}
        {tab === "workout" && <WorkoutTab />}
        {tab === "sleep" && <SleepTab />}
      </div>
    </div>
  );
}
