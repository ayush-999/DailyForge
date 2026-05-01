"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { AppNotInstalled } from "@/components/app-not-installed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  Heart, Droplets, Dumbbell, Moon, Trash2, Plus,
  Activity, BarChart3, User, Scale, TrendingUp, Flame, Utensils,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

type TabId = "dashboard" | "logs" | "workouts" | "sleep" | "reports" | "profile";

const WATER_AMOUNTS = [150, 250, 350, 500];
const WORKOUT_TYPES = ["Running", "Walking", "Cycling", "Swimming", "Gym", "Yoga", "HIIT", "Other"];
const QUALITY_LABELS = ["", "Terrible", "Poor", "Okay", "Good", "Excellent"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: "Underweight", color: "text-blue-500" };
  if (bmi < 25) return { label: "Normal", color: "text-green-500" };
  if (bmi < 30) return { label: "Overweight", color: "text-amber-500" };
  return { label: "Obese", color: "text-red-500" };
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
      active ? "border-rose-500 text-rose-600 dark:text-rose-400" : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}>
      {children}
    </button>
  );
}

function StatCard({ icon, label, value, sub, color = "bg-rose-100 dark:bg-rose-500/10", iconColor = "text-rose-600 dark:text-rose-400" }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string; iconColor?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
      <div className="mb-3 flex items-center gap-2">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", color)}>
          <span className={iconColor}>{icon}</span>
        </div>
        <span className="text-xs font-medium text-zinc-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-900 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function MiniProgress({ value, max, color = "bg-rose-500" }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / (max || 1)) * 100, 100);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

function DashboardTab() {
  const utils = trpc.useUtils();
  const { data: stats, isLoading } = trpc.health.stats.useQuery(undefined, { retry: false });
  const logWater = trpc.health.water.log.useMutation({ onSuccess: () => { utils.health.stats.invalidate(); toast.success("Water logged"); }, onError: e => toast.error(e.message) });
  const logSteps = trpc.health.steps.log.useMutation({ onSuccess: () => { utils.health.stats.invalidate(); toast.success("Steps updated"); }, onError: e => toast.error(e.message) });
  const logWeight = trpc.health.weight.log.useMutation({ onSuccess: () => { utils.health.stats.invalidate(); toast.success("Weight logged"); }, onError: e => toast.error(e.message) });
  const [stepsInput, setStepsInput] = useState("");
  const [weightInput, setWeightInput] = useState("");

  if (isLoading) return <div className="flex h-60 items-center justify-center"><Spinner className="h-7 w-7" /></div>;

  const waterPct = Math.min(((stats?.waterToday ?? 0) / (stats?.waterGoal ?? 2500)) * 100, 100);
  const stepsPct = Math.min(((stats?.stepsToday ?? 0) / (stats?.stepGoal ?? 8000)) * 100, 100);
  const calPct = Math.min(((stats?.caloriesToday ?? 0) / (stats?.calorieGoal ?? 2000)) * 100, 100);
  const bmi = stats?.bmi;
  const bmiInfo = bmi ? bmiCategory(bmi) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Droplets className="h-4 w-4" />} label="Water Today"
          value={`${stats?.waterToday ?? 0} ml`} sub={`Goal: ${stats?.waterGoal ?? 2500} ml`}
          color="bg-blue-100 dark:bg-blue-500/10" iconColor="text-blue-600 dark:text-blue-400" />
        <StatCard icon={<Activity className="h-4 w-4" />} label="Steps Today"
          value={(stats?.stepsToday ?? 0).toLocaleString()} sub={`Goal: ${(stats?.stepGoal ?? 8000).toLocaleString()}`}
          color="bg-green-100 dark:bg-green-500/10" iconColor="text-green-600 dark:text-green-400" />
        <StatCard icon={<Flame className="h-4 w-4" />} label="Calories"
          value={`${stats?.caloriesToday ?? 0} kcal`} sub={`Goal: ${stats?.calorieGoal ?? 2000} kcal`}
          color="bg-orange-100 dark:bg-orange-500/10" iconColor="text-orange-600 dark:text-orange-400" />
        <StatCard icon={<Moon className="h-4 w-4" />} label="Avg Sleep (7d)"
          value={stats?.avgSleepHours ? `${stats.avgSleepHours}h` : "—"}
          sub={stats?.avgSleepQuality ? `Quality: ${QUALITY_LABELS[Math.round(stats.avgSleepQuality)] ?? ""}` : "No data"}
          color="bg-indigo-100 dark:bg-indigo-500/10" iconColor="text-indigo-600 dark:text-indigo-400" />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10] space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Today's Progress</p>
        <div className="space-y-2.5">
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><Droplets className="h-3 w-3 text-blue-500" />Water</span>
              <span>{Math.round(waterPct)}%</span>
            </div>
            <MiniProgress value={stats?.waterToday ?? 0} max={stats?.waterGoal ?? 2500} color="bg-blue-500" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><Activity className="h-3 w-3 text-green-500" />Steps</span>
              <span>{Math.round(stepsPct)}%</span>
            </div>
            <MiniProgress value={stats?.stepsToday ?? 0} max={stats?.stepGoal ?? 8000} color="bg-green-500" />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1.5"><Flame className="h-3 w-3 text-orange-500" />Calories</span>
              <span>{Math.round(calPct)}%</span>
            </div>
            <MiniProgress value={stats?.caloriesToday ?? 0} max={stats?.calorieGoal ?? 2000} color="bg-orange-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">BMI</p>
          {bmi ? (
            <div>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white">{bmi}</p>
              <p className={cn("mt-0.5 text-sm font-medium", bmiInfo?.color)}>{bmiInfo?.label}</p>
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Add height & weight in Profile</p>
          )}
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">Weight</p>
          {stats?.latestWeightKg ? (
            <div>
              <p className="text-3xl font-bold text-zinc-900 dark:text-white">{stats.latestWeightKg} kg</p>
              {stats.targetWeightKg && <p className="mt-0.5 text-xs text-zinc-400">Target: {stats.targetWeightKg} kg</p>}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No weight logged yet</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10] space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Quick Log</p>
        <div>
          <p className="mb-2 text-xs text-zinc-500">Water (ml)</p>
          <div className="flex flex-wrap gap-1.5">
            {WATER_AMOUNTS.map(a => (
              <Button key={a} size="sm" variant="outline" disabled={logWater.isPending} onClick={() => logWater.mutate({ amount: a })}
                className="h-7 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 text-xs">
                +{a}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-zinc-500">Steps Today</p>
          <div className="flex gap-2">
            <Input type="number" min="0" max="100000" placeholder="e.g. 5000" className="h-8 w-36 text-sm" value={stepsInput} onChange={e => setStepsInput(e.target.value)} />
            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-xs" disabled={!stepsInput || logSteps.isPending}
              onClick={() => { logSteps.mutate({ steps: parseInt(stepsInput) }); setStepsInput(""); }}>Log Steps</Button>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-zinc-500">Weight (kg)</p>
          <div className="flex gap-2">
            <Input type="number" step="0.1" min="1" max="500" placeholder="e.g. 70.5" className="h-8 w-36 text-sm" value={weightInput} onChange={e => setWeightInput(e.target.value)} />
            <Button size="sm" className="h-8 bg-rose-500 hover:bg-rose-600 text-xs" disabled={!weightInput || logWeight.isPending}
              onClick={() => { logWeight.mutate({ weightKg: parseFloat(weightInput) }); setWeightInput(""); }}>Log Weight</Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0f0f10]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-500/10">
            <Dumbbell className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-white">Workouts (30 days)</p>
            <p className="text-xs text-zinc-400">Keep it up!</p>
          </div>
        </div>
        <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stats?.workouts30d ?? 0}</p>
      </div>
    </div>
  );
}

// ── Daily Logs ───────────────────────────────────────────────────────────────

function DailyLogsTab() {
  const utils = trpc.useUtils();

  const { data: waterData, isLoading: wL } = trpc.health.water.today.useQuery(undefined, { retry: false });
  const logWater = trpc.health.water.log.useMutation({ onSuccess: () => utils.health.water.today.invalidate(), onError: e => toast.error(e.message) });
  const delWater = trpc.health.water.delete.useMutation({ onSuccess: () => utils.health.water.today.invalidate() });
  const [customWater, setCustomWater] = useState("");

  const { data: stepsData, isLoading: sL } = trpc.health.steps.today.useQuery(undefined, { retry: false });
  const logSteps = trpc.health.steps.log.useMutation({ onSuccess: () => utils.health.steps.today.invalidate(), onError: e => toast.error(e.message) });
  const [stepsInput, setStepsInput] = useState("");

  const { data: weightList = [], isLoading: wgL } = trpc.health.weight.list.useQuery({ days: 7 }, { retry: false });
  const logWeight = trpc.health.weight.log.useMutation({ onSuccess: () => utils.health.weight.list.invalidate(), onError: e => toast.error(e.message) });
  const delWeight = trpc.health.weight.delete.useMutation({ onSuccess: () => utils.health.weight.list.invalidate() });
  const [weightInput, setWeightInput] = useState("");
  const [weightNotes, setWeightNotes] = useState("");

  const { data: foodData, isLoading: fL } = trpc.health.food.today.useQuery(undefined, { retry: false });
  const logFood = trpc.health.food.log.useMutation({
    onSuccess: () => { utils.health.food.today.invalidate(); setFoodForm({ mealType: "breakfast", name: "", calories: "", protein: "", carbs: "", fat: "" }); setShowFood(false); toast.success("Food logged"); },
    onError: e => toast.error(e.message),
  });
  const delFood = trpc.health.food.delete.useMutation({ onSuccess: () => utils.health.food.today.invalidate() });
  const [showFood, setShowFood] = useState(false);
  const [foodForm, setFoodForm] = useState({ mealType: "breakfast" as typeof MEAL_TYPES[number], name: "", calories: "", protein: "", carbs: "", fat: "" });

  if (wL || sL || wgL || fL) return <div className="flex h-60 items-center justify-center"><Spinner className="h-7 w-7" /></div>;

  return (
    <div className="space-y-6">

      {/* Water */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white"><Droplets className="h-4 w-4 text-blue-500" />Water Intake</h3>
          <span className="text-xs text-zinc-400">{waterData?.total ?? 0} / {waterData?.goal ?? 2500} ml</span>
        </div>
        <MiniProgress value={waterData?.total ?? 0} max={waterData?.goal ?? 2500} color="bg-blue-500" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {WATER_AMOUNTS.map(a => (
            <Button key={a} size="sm" variant="outline" disabled={logWater.isPending} onClick={() => logWater.mutate({ amount: a })}
              className="h-7 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 text-xs">+{a} ml</Button>
          ))}
          <div className="flex gap-1">
            <Input type="number" min="1" max="2000" className="h-7 w-20 text-xs" placeholder="Custom" value={customWater} onChange={e => setCustomWater(e.target.value)} />
            <Button size="sm" className="h-7 text-xs" disabled={!customWater || logWater.isPending} onClick={() => { logWater.mutate({ amount: parseInt(customWater) }); setCustomWater(""); }}>Add</Button>
          </div>
        </div>
        {(waterData?.logs ?? []).length > 0 && (
          <div className="mt-3 space-y-1">
            {waterData!.logs.map(l => (
              <div key={l.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white px-3 py-1.5 dark:border-white/5 dark:bg-[#0f0f10]">
                <span className="text-xs text-zinc-600 dark:text-zinc-300">{l.amount} ml</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">{new Date(l.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                  <button onClick={() => delWater.mutate({ id: l.id })} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className="border-zinc-100 dark:border-white/5" />

      {/* Steps */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white"><Activity className="h-4 w-4 text-green-500" />Steps Today</h3>
          <span className="text-xs text-zinc-400">{(stepsData?.steps ?? 0).toLocaleString()} / {(stepsData?.goal ?? 8000).toLocaleString()}</span>
        </div>
        <MiniProgress value={stepsData?.steps ?? 0} max={stepsData?.goal ?? 8000} color="bg-green-500" />
        <div className="mt-3 flex gap-2">
          <Input type="number" min="0" max="100000" placeholder="Enter steps" className="h-8 w-40 text-sm" value={stepsInput} onChange={e => setStepsInput(e.target.value)} />
          <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" disabled={!stepsInput || logSteps.isPending}
            onClick={() => { logSteps.mutate({ steps: parseInt(stepsInput) }); setStepsInput(""); }}>
            {logSteps.isPending ? "Saving…" : "Update"}
          </Button>
        </div>
        {(stepsData?.steps ?? 0) >= (stepsData?.goal ?? 8000) && <p className="mt-2 text-xs font-medium text-green-600 dark:text-green-400">Goal reached! 🎉</p>}
      </section>

      <hr className="border-zinc-100 dark:border-white/5" />

      {/* Weight */}
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white"><Scale className="h-4 w-4 text-rose-500" />Weight Log (Last 7 Days)</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <Input type="number" step="0.1" min="1" max="500" placeholder="Weight (kg)" className="h-8 w-32 text-sm" value={weightInput} onChange={e => setWeightInput(e.target.value)} />
          <Input placeholder="Notes (optional)" className="h-8 w-40 text-sm" value={weightNotes} onChange={e => setWeightNotes(e.target.value)} />
          <Button size="sm" className="h-8 bg-rose-500 hover:bg-rose-600" disabled={!weightInput || logWeight.isPending}
            onClick={() => { logWeight.mutate({ weightKg: parseFloat(weightInput), notes: weightNotes || undefined }); setWeightInput(""); setWeightNotes(""); }}>Log</Button>
        </div>
        {weightList.length > 0 ? (
          <div className="space-y-1">
            {[...weightList].reverse().map(w => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-white px-3 py-1.5 dark:border-white/5 dark:bg-[#0f0f10]">
                <div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">{w.weightKg} kg</span>
                  {w.notes && <span className="ml-2 text-xs text-zinc-400">{w.notes}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">{new Date(w.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <button onClick={() => delWeight.mutate({ id: w.id })} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600"><Trash2 className="h-3 w-3" /></button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-zinc-400">No weight entries this week</p>}
      </section>

      <hr className="border-zinc-100 dark:border-white/5" />

      {/* Food */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white"><Utensils className="h-4 w-4 text-orange-500" />Food Log</h3>
          <span className="text-xs text-zinc-400">{foodData?.totalCalories ?? 0} / {foodData?.goal ?? 2000} kcal</span>
        </div>
        <MiniProgress value={foodData?.totalCalories ?? 0} max={foodData?.goal ?? 2000} color="bg-orange-500" />
        <Button size="sm" className="mt-3 gap-1.5 bg-orange-500 hover:bg-orange-600" onClick={() => setShowFood(v => !v)}>
          <Plus className="h-3.5 w-3.5" /> Add Food
        </Button>
        {showFood && (
          <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-[#0a0a0b] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Meal Type</label>
                <select value={foodForm.mealType} onChange={e => setFoodForm(f => ({ ...f, mealType: e.target.value as typeof MEAL_TYPES[number] }))}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500">
                  {MEAL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Food Name</label>
                <Input value={foodForm.name} onChange={e => setFoodForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Oatmeal" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Calories*</label>
                <Input type="number" min="0" value={foodForm.calories} onChange={e => setFoodForm(f => ({ ...f, calories: e.target.value }))} placeholder="300" /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Protein (g)</label>
                <Input type="number" min="0" value={foodForm.protein} onChange={e => setFoodForm(f => ({ ...f, protein: e.target.value }))} placeholder="20" /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Carbs (g)</label>
                <Input type="number" min="0" value={foodForm.carbs} onChange={e => setFoodForm(f => ({ ...f, carbs: e.target.value }))} placeholder="50" /></div>
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Fat (g)</label>
                <Input type="number" min="0" value={foodForm.fat} onChange={e => setFoodForm(f => ({ ...f, fat: e.target.value }))} placeholder="10" /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowFood(false)}>Cancel</Button>
              <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600" disabled={!foodForm.name || !foodForm.calories || logFood.isPending}
                onClick={() => logFood.mutate({
                  mealType: foodForm.mealType, name: foodForm.name, calories: parseInt(foodForm.calories),
                  protein: foodForm.protein ? parseFloat(foodForm.protein) : undefined,
                  carbs: foodForm.carbs ? parseFloat(foodForm.carbs) : undefined,
                  fat: foodForm.fat ? parseFloat(foodForm.fat) : undefined,
                })}>
                {logFood.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
        {(foodData?.logs ?? []).length > 0 ? (
          <div className="mt-3 space-y-2">
            {MEAL_TYPES.filter(m => (foodData?.logs ?? []).some(l => l.mealType === m)).map(meal => (
              <div key={meal}>
                <p className="mb-1 text-xs font-medium capitalize text-zinc-400">{meal}</p>
                {(foodData?.logs ?? []).filter(l => l.mealType === meal).map(l => (
                  <div key={l.id} className="mb-1 flex items-center justify-between rounded-lg border border-zinc-100 bg-white px-3 py-1.5 dark:border-white/5 dark:bg-[#0f0f10]">
                    <span className="text-xs text-zinc-700 dark:text-zinc-300">{l.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-orange-600 dark:text-orange-400">{l.calories} kcal</span>
                      {l.protein != null && <span className="text-xs text-zinc-400">P:{l.protein}g</span>}
                      <button onClick={() => delFood.mutate({ id: l.id })} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-zinc-400">No food logged today</p>}
      </section>
    </div>
  );
}

// ── Workouts ─────────────────────────────────────────────────────────────────

function WorkoutsTab() {
  const utils = trpc.useUtils();
  const { data: workouts = [], isLoading } = trpc.health.workout.list.useQuery({ days: 30 }, { retry: false });
  const create = trpc.health.workout.create.useMutation({
    onSuccess: () => { utils.health.workout.list.invalidate(); setShowForm(false); setForm({ type: "", duration: "", calories: "", notes: "" }); toast.success("Workout logged"); },
    onError: e => toast.error(e.message),
  });
  const del = trpc.health.workout.delete.useMutation({ onSuccess: () => utils.health.workout.list.invalidate() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "", duration: "", calories: "", notes: "" });

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Spinner className="h-7 w-7" /></div>;

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
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Duration (min)</label>
              <Input type="number" min="1" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="30" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Calories (optional)</label>
              <Input type="number" min="0" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} placeholder="250" /></div>
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Notes (optional)</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" /></div>
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-500/10">
                  <Dumbbell className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{w.type}</p>
                  <p className="text-xs text-zinc-500">{w.duration} min{w.calories ? ` · ${w.calories} kcal` : ""} · {new Date(w.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
              </div>
              <button onClick={() => del.mutate({ id: w.id })} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sleep ────────────────────────────────────────────────────────────────────

function SleepTab() {
  const utils = trpc.useUtils();
  const { data: logs = [], isLoading } = trpc.health.sleep.recent.useQuery({ days: 14 }, { retry: false });
  const log = trpc.health.sleep.log.useMutation({
    onSuccess: () => { utils.health.sleep.recent.invalidate(); setShowForm(false); setForm({ bedtime: "22:30", wakeTime: "06:30", quality: 3, notes: "" }); toast.success("Sleep logged"); },
    onError: e => toast.error(e.message),
  });
  const del = trpc.health.sleep.delete.useMutation({ onSuccess: () => utils.health.sleep.recent.invalidate() });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ bedtime: "22:30", wakeTime: "06:30", quality: 3, notes: "" });

  if (isLoading) return <div className="flex h-40 items-center justify-center"><Spinner className="h-7 w-7" /></div>;

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
              {[1, 2, 3, 4, 5].map(q => (
                <button key={q} onClick={() => setForm(f => ({ ...f, quality: q }))}
                  className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium border transition-colors",
                    form.quality === q ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-white/10")}>{q}</button>
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
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10">
                  <Moon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{l.bedtime} → {l.wakeTime} · {l.hours.toFixed(1)}h</p>
                  <p className="text-xs text-zinc-500">Quality: {QUALITY_LABELS[l.quality]} · {new Date(l.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
              </div>
              <button onClick={() => del.mutate({ id: l.id })} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Reports ──────────────────────────────────────────────────────────────────

function ReportsTab() {
  const [range, setRange] = useState<"7" | "30" | "90">("30");
  const today = new Date().toISOString().slice(0, 10);
  const from = (() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(range));
    return d.toISOString().slice(0, 10);
  })();
  const { data, isLoading } = trpc.health.reports.range.useQuery({ from, to: today }, { retry: false });

  if (isLoading) return <div className="flex h-60 items-center justify-center"><Spinner className="h-7 w-7" /></div>;

  const H = 200;
  const hasData = data && (data.weights.length + data.caloriesByDay.length + data.sleepByDay.length + data.stepsByDay.length + data.waterByDay.length) > 0;

  return (
    <div className="space-y-6">
      <div className="flex gap-1.5">
        {(["7", "30", "90"] as const).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={cn("rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              range === r ? "bg-rose-500 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/15")}>
            {r}d
          </button>
        ))}
      </div>

      {!hasData && <p className="py-12 text-center text-sm text-zinc-400">No data in this range yet. Start logging to see reports.</p>}

      {(data?.weights?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
          <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Weight Trend (kg)</p>
          <ResponsiveContainer width="100%" height={H}>
            <LineChart data={data!.weights}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip formatter={(v: number) => [`${v} kg`, "Weight"]} labelFormatter={d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <Line type="monotone" dataKey="weightKg" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {(data?.caloriesByDay?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
          <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Calories: Consumed vs Burned</p>
          <ResponsiveContainer width="100%" height={H}>
            <AreaChart data={data!.caloriesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip labelFormatter={d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <Legend />
              <Area type="monotone" dataKey="consumed" name="Consumed" stroke="#f97316" fill="#f9731620" strokeWidth={2} />
              <Area type="monotone" dataKey="burned" name="Burned" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {(data?.sleepByDay?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
          <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Sleep Hours</p>
          <ResponsiveContainer width="100%" height={H}>
            <BarChart data={data!.sleepByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 12]} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}h`, "Sleep"]} labelFormatter={d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <Bar dataKey="hours" name="Sleep Hours" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(data?.stepsByDay?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
          <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Daily Steps</p>
          <ResponsiveContainer width="100%" height={H}>
            <BarChart data={data!.stepsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [v.toLocaleString(), "Steps"]} labelFormatter={d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <Bar dataKey="steps" fill="#22c55e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(data?.waterByDay?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
          <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">Water Intake (ml/day)</p>
          <ResponsiveContainer width="100%" height={H}>
            <BarChart data={data!.waterByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v} ml`, "Water"]} labelFormatter={d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <Bar dataKey="total" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Profile ──────────────────────────────────────────────────────────────────

function ProfileTab() {
  const utils = trpc.useUtils();
  const { data: profile, isLoading } = trpc.health.profile.get.useQuery(undefined, { retry: false });
  const upsert = trpc.health.profile.upsert.useMutation({
    onSuccess: () => { utils.health.profile.get.invalidate(); utils.health.stats.invalidate(); toast.success("Profile saved"); },
    onError: e => toast.error(e.message),
  });

  const [form, setForm] = useState({
    age: "", weightKg: "", heightCm: "",
    gender: "" as "" | "male" | "female" | "other",
    goal: "" as "" | "lose" | "gain" | "maintain",
    targetWeightKg: "", dailyStepGoal: "8000", dailyWaterGoalMl: "2500", dailyCalorieGoal: "2000",
  });

  useEffect(() => {
    if (profile !== undefined) {
      setForm({
        age: profile?.age?.toString() ?? "",
        weightKg: profile?.weightKg?.toString() ?? "",
        heightCm: profile?.heightCm?.toString() ?? "",
        gender: (profile?.gender as typeof form.gender) ?? "",
        goal: (profile?.goal as typeof form.goal) ?? "",
        targetWeightKg: profile?.targetWeightKg?.toString() ?? "",
        dailyStepGoal: profile?.dailyStepGoal?.toString() ?? "8000",
        dailyWaterGoalMl: profile?.dailyWaterGoalMl?.toString() ?? "2500",
        dailyCalorieGoal: profile?.dailyCalorieGoal?.toString() ?? "2000",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const liveWeight = parseFloat(form.weightKg);
  const liveHeight = parseFloat(form.heightCm);
  const liveBmi = liveWeight > 0 && liveHeight > 0 ? Math.round((liveWeight / Math.pow(liveHeight / 100, 2)) * 10) / 10 : null;
  const liveBmiInfo = liveBmi ? bmiCategory(liveBmi) : null;

  if (isLoading) return <div className="flex h-60 items-center justify-center"><Spinner className="h-7 w-7" /></div>;

  const sel = (value: string, onChange: (v: string) => void, opts: { value: string; label: string }[]) => (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500">
      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div className="max-w-lg space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f0f10] space-y-4">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Personal Info</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-xs font-medium text-zinc-500">Age</label>
            <Input type="number" min="1" max="120" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="25" /></div>
          <div><label className="mb-1 block text-xs font-medium text-zinc-500">Gender</label>
            {sel(form.gender, v => setForm(f => ({ ...f, gender: v as typeof form.gender })), [
              { value: "", label: "Select" }, { value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" },
            ])}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-xs font-medium text-zinc-500">Weight (kg)</label>
            <Input type="number" step="0.1" min="1" max="500" value={form.weightKg} onChange={e => setForm(f => ({ ...f, weightKg: e.target.value }))} placeholder="70" /></div>
          <div><label className="mb-1 block text-xs font-medium text-zinc-500">Height (cm)</label>
            <Input type="number" step="0.1" min="50" max="300" value={form.heightCm} onChange={e => setForm(f => ({ ...f, heightCm: e.target.value }))} placeholder="175" /></div>
        </div>
        {liveBmi && (
          <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-white/5">
            <span className="text-xs text-zinc-500">Calculated BMI</span>
            <span className={cn("text-sm font-bold", liveBmiInfo?.color)}>{liveBmi} — {liveBmiInfo?.label}</span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><label className="mb-1 block text-xs font-medium text-zinc-500">Goal</label>
            {sel(form.goal, v => setForm(f => ({ ...f, goal: v as typeof form.goal })), [
              { value: "", label: "Select" }, { value: "lose", label: "Lose Weight" }, { value: "gain", label: "Gain Weight" }, { value: "maintain", label: "Maintain" },
            ])}</div>
          <div><label className="mb-1 block text-xs font-medium text-zinc-500">Target Weight (kg)</label>
            <Input type="number" step="0.1" min="1" max="500" value={form.targetWeightKg} onChange={e => setForm(f => ({ ...f, targetWeightKg: e.target.value }))} placeholder="65" /></div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#0f0f10] space-y-4">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Daily Goals</p>
        <div><label className="mb-1 block text-xs font-medium text-zinc-500">Daily Step Goal</label>
          <Input type="number" min="100" max="100000" value={form.dailyStepGoal} onChange={e => setForm(f => ({ ...f, dailyStepGoal: e.target.value }))} placeholder="8000" /></div>
        <div><label className="mb-1 block text-xs font-medium text-zinc-500">Daily Water Goal (ml)</label>
          <Input type="number" min="100" max="10000" value={form.dailyWaterGoalMl} onChange={e => setForm(f => ({ ...f, dailyWaterGoalMl: e.target.value }))} placeholder="2500" /></div>
        <div><label className="mb-1 block text-xs font-medium text-zinc-500">Daily Calorie Goal</label>
          <Input type="number" min="500" max="10000" value={form.dailyCalorieGoal} onChange={e => setForm(f => ({ ...f, dailyCalorieGoal: e.target.value }))} placeholder="2000" /></div>
      </div>

      <Button disabled={upsert.isPending} onClick={() => upsert.mutate({
        age: form.age ? parseInt(form.age) : undefined,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : undefined,
        heightCm: form.heightCm ? parseFloat(form.heightCm) : undefined,
        gender: (form.gender || undefined) as "male" | "female" | "other" | undefined,
        goal: (form.goal || undefined) as "lose" | "gain" | "maintain" | undefined,
        targetWeightKg: form.targetWeightKg ? parseFloat(form.targetWeightKg) : undefined,
        dailyStepGoal: form.dailyStepGoal ? parseInt(form.dailyStepGoal) : undefined,
        dailyWaterGoalMl: form.dailyWaterGoalMl ? parseInt(form.dailyWaterGoalMl) : undefined,
        dailyCalorieGoal: form.dailyCalorieGoal ? parseInt(form.dailyCalorieGoal) : undefined,
      })} className="w-full bg-rose-500 hover:bg-rose-600">
        {upsert.isPending ? "Saving…" : "Save Profile"}
      </Button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HealthTrackerPage() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const { error } = trpc.health.stats.useQuery(undefined, { retry: false });

  if (error?.data?.code === "FORBIDDEN") {
    return (
      <AppNotInstalled
        slug="health-tracker" name="Health Tracker"
        description="Track workouts, water intake, sleep, and wellness streaks."
        icon={<Heart className="h-8 w-8 text-white" />}
        iconBg="bg-rose-500"
        scopes={["health:read", "health:write", "health:delete"]}
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 overflow-x-auto border-b border-zinc-200 bg-white px-6 dark:border-white/10 dark:bg-[#0f0f10]">
        <TabBtn active={tab === "dashboard"} onClick={() => setTab("dashboard")}><span className="flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Dashboard</span></TabBtn>
        <TabBtn active={tab === "logs"} onClick={() => setTab("logs")}><span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" />Daily Logs</span></TabBtn>
        <TabBtn active={tab === "workouts"} onClick={() => setTab("workouts")}><span className="flex items-center gap-1.5"><Dumbbell className="h-3.5 w-3.5" />Workouts</span></TabBtn>
        <TabBtn active={tab === "sleep"} onClick={() => setTab("sleep")}><span className="flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" />Sleep</span></TabBtn>
        <TabBtn active={tab === "reports"} onClick={() => setTab("reports")}><span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Reports</span></TabBtn>
        <TabBtn active={tab === "profile"} onClick={() => setTab("profile")}><span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Profile</span></TabBtn>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl">
        {tab === "dashboard" && <DashboardTab />}
        {tab === "logs" && <DailyLogsTab />}
        {tab === "workouts" && <WorkoutsTab />}
        {tab === "sleep" && <SleepTab />}
        {tab === "reports" && <ReportsTab />}
        {tab === "profile" && <ProfileTab />}
      </div>
    </div>
  );
}
