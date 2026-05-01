"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { AppNotInstalled } from "@/components/app-not-installed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  Wallet, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Plus, Trash2,
  Pencil, X, Search, Download, RefreshCw, Target, Repeat, Tag, BarChart2,
  CheckCircle2, Calendar, Filter,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import toast from "react-hot-toast";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function pct(part: number, total: number) {
  return total > 0 ? Math.min(Math.round((part / total) * 100), 100) : 0;
}

// ── Shared small components ───────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={cn(
      "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
      active ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
    )}>
      {icon}{label}
    </button>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={cn("rounded-2xl border p-4", color)}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-xs opacity-60">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const p = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = value > max && max > 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10">
      <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, backgroundColor: over ? "#ef4444" : color }} />
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────

function DashboardTab({ year, month, onNav }: { year: number; month: number; onNav: (d: number) => void }) {
  const { data: summary } = trpc.expense.entries.summary.useQuery({ year, month });
  const { data: annual } = trpc.expense.entries.annual.useQuery({ year });
  const { data: entries = [] } = trpc.expense.entries.list.useQuery({ year, month });

  const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const recent = entries.slice(0, 5);
  const pieData = (summary?.byCategory ?? []).filter((c) => c.spent > 0).map((c) => ({ name: c.name, value: c.spent, color: c.color }));

  return (
    <div className="space-y-6">
      {/* Month nav + summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => onNav(-1)} className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-semibold">{monthName}</span>
          <button onClick={() => onNav(1)} className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Income" value={fmt(summary?.totalIncome ?? 0)} color="border-green-200 bg-green-50 text-green-800 dark:border-green-500/20 dark:bg-green-500/5 dark:text-green-300" />
        <StatCard label="Expenses" value={fmt(summary?.totalExpenses ?? 0)} color="border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-300" />
        <StatCard label="Balance" value={fmt(summary?.balance ?? 0)} color={(summary?.balance ?? 0) >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-300" : "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/5 dark:text-orange-300"} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Annual bar chart */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
          <p className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{year} Overview</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={annual ?? []} barSize={8} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="income" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex gap-4 text-xs text-zinc-400">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-green-500" />Income</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-500" />Expenses</span>
          </div>
        </div>

        {/* Category pie */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
          <p className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Spending by Category</p>
          {pieData.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-zinc-400">No expenses this month</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      {recent.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-[#0f0f10]">
          <div className="border-b border-zinc-100 px-4 py-3 dark:border-white/5">
            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Recent Transactions</p>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-white/5">
            {recent.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm", e.type === "income" ? "bg-green-100 dark:bg-green-500/10" : "bg-red-100 dark:bg-red-500/10")}>
                  {e.type === "income" ? <TrendingUp className="h-3.5 w-3.5 text-green-600" /> : (e as any).category ? <span className="text-xs">{(e as any).category.icon}</span> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{e.description}</p>
                  <p className="text-xs text-zinc-400">{new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                </div>
                <p className={cn("shrink-0 text-sm font-semibold", e.type === "income" ? "text-green-600" : "text-red-500")}>
                  {e.type === "income" ? "+" : "-"}{fmt(e.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transactions Tab ──────────────────────────────────────────────────────────

function TransactionsTab({ year, month }: { year: number; month: number }) {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
  const [catFilter, setCatFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: "", description: "", date: today(), type: "expense" as "expense" | "income", categoryId: "" });

  const { data: categories = [] } = trpc.expense.categories.list.useQuery();
  const { data: entries = [], isLoading } = trpc.expense.entries.list.useQuery({ year, month });

  const create = trpc.expense.entries.create.useMutation({
    onSuccess: () => {
      utils.expense.entries.list.invalidate();
      utils.expense.entries.summary.invalidate();
      setShowForm(false);
      setForm({ amount: "", description: "", date: today(), type: "expense", categoryId: "" });
      toast.success("Entry added");
    },
    onError: (e) => toast.error(e.message),
  });

  const del = trpc.expense.entries.delete.useMutation({
    onSuccess: () => { utils.expense.entries.list.invalidate(); utils.expense.entries.summary.invalidate(); },
  });

  const exportQuery = trpc.expense.entries.export.useQuery({ year, month }, { enabled: false });

  const handleExport = async () => {
    const res = await exportQuery.refetch();
    if (!res.data) return;
    const blob = new Blob([res.data.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (catFilter && e.categoryId !== catFilter) return false;
      if (search && !e.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [entries, typeFilter, catFilter, search]);

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <Input className="pl-8 h-9 text-sm" placeholder="Search transactions…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white">
          <option value="all">All types</option>
          <option value="expense">Expenses</option>
          <option value="income">Income</option>
        </select>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
          className="h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />CSV
        </Button>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-3.5 w-3.5" />Add
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-[#0a0a0b]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Type</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Amount (₹)</label>
              <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Description</label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What was this for?" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Date</label>
              <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            {form.type === "expense" && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-zinc-500">Category</label>
                <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white">
                  <option value="">No category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex items-end gap-2 sm:col-span-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                disabled={!form.amount || !form.description || create.isPending}
                onClick={() => create.mutate({ amount: parseFloat(form.amount), description: form.description, date: form.date, type: form.type, categoryId: form.categoryId || null })}>
                {create.isPending ? "Saving…" : "Add"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="rounded-2xl border border-zinc-200 bg-white dark:border-white/10 dark:bg-[#0f0f10]">
        <div className="border-b border-zinc-100 px-4 py-2.5 dark:border-white/5">
          <p className="text-xs text-zinc-500">{filtered.length} entries · {monthName}</p>
        </div>
        {isLoading ? (
          <div className="flex h-32 items-center justify-center"><Spinner className="h-6 w-6" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14">
            <Wallet className="mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-400">No transactions found</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-white/5">
            {filtered.map((e) => {
              const cat = e.categoryId ? catMap[e.categoryId] : null;
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-white/[0.02]">
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm", e.type === "income" ? "bg-green-100 dark:bg-green-500/10" : "bg-red-100 dark:bg-red-500/10")}>
                    {e.type === "income" ? <TrendingUp className="h-4 w-4 text-green-600" /> : cat ? <span>{cat.icon}</span> : <TrendingDown className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{e.description}</p>
                    <p className="text-xs text-zinc-400">{cat?.name ?? (e.type === "income" ? "Income" : "Uncategorized")} · {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  </div>
                  <p className={cn("shrink-0 text-sm font-semibold", e.type === "income" ? "text-green-600" : "text-red-500")}>
                    {e.type === "income" ? "+" : "-"}{fmt(e.amount)}
                  </p>
                  <button onClick={() => del.mutate({ id: e.id })} className="shrink-0 text-zinc-300 hover:text-red-500 dark:text-zinc-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Budgets Tab ───────────────────────────────────────────────────────────────

function BudgetsTab({ year, month }: { year: number; month: number }) {
  const { data: summary } = trpc.expense.entries.summary.useQuery({ year, month });
  const [editId, setEditId] = useState<string | null>(null);
  const [editBudget, setEditBudget] = useState("");
  const utils = trpc.useUtils();

  const upsert = trpc.expense.categories.upsert.useMutation({
    onSuccess: () => { utils.expense.entries.summary.invalidate(); utils.expense.categories.list.invalidate(); setEditId(null); toast.success("Budget updated"); },
    onError: (e) => toast.error(e.message),
  });

  const cats = (summary?.byCategory ?? []).sort((a, b) => b.spent - a.spent);
  const totalBudget = cats.reduce((s, c) => s + (c.budget ?? 0), 0);
  const totalSpent = cats.reduce((s, c) => s + c.spent, 0);
  const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Budget" value={totalBudget > 0 ? fmt(totalBudget) : "Not set"} color="border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-500/20 dark:bg-indigo-500/5 dark:text-indigo-300" />
        <StatCard label="Spent" value={fmt(totalSpent)} color="border-red-200 bg-red-50 text-red-800 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-300" />
        <StatCard label="Remaining" value={totalBudget > 0 ? fmt(totalBudget - totalSpent) : "—"} color={(totalBudget - totalSpent) >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/5 dark:text-emerald-300" : "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-500/20 dark:bg-orange-500/5 dark:text-orange-300"} />
      </div>

      <p className="text-xs text-zinc-400">{monthName} · Click a category to set its budget</p>

      <div className="space-y-3">
        {cats.map((cat) => {
          const over = cat.budget != null && cat.spent > cat.budget;
          return (
            <div key={cat.id} className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-white/10 dark:bg-[#0f0f10]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">{cat.name}</span>
                  {over && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400">OVER</span>}
                </div>
                {editId === cat.id ? (
                  <div className="flex items-center gap-2">
                    <Input type="number" min="0" className="h-7 w-28 text-sm" value={editBudget} onChange={(e) => setEditBudget(e.target.value)} placeholder="Budget ₹" autoFocus />
                    <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 px-2 text-xs"
                      disabled={upsert.isPending}
                      onClick={() => upsert.mutate({ id: cat.id, name: cat.name, color: cat.color, icon: cat.icon ?? undefined, budget: editBudget ? parseFloat(editBudget) : null })}>
                      Save
                    </Button>
                    <button onClick={() => setEditId(null)}><X className="h-3.5 w-3.5 text-zinc-400" /></button>
                  </div>
                ) : (
                  <button onClick={() => { setEditId(cat.id); setEditBudget(cat.budget?.toString() ?? ""); }}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-indigo-500">
                    <Pencil className="h-3 w-3" />{cat.budget ? fmt(cat.budget) : "Set budget"}
                  </button>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar value={cat.spent} max={cat.budget ?? cat.spent} color={cat.color} />
                </div>
                <span className={cn("text-xs font-medium", over ? "text-red-500" : "text-zinc-400")}>
                  {fmt(cat.spent)}{cat.budget ? ` / ${fmt(cat.budget)}` : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab({ year }: { year: number }) {
  const [reportYear, setReportYear] = useState(year);
  const { data: annual, isLoading } = trpc.expense.entries.annual.useQuery({ year: reportYear });
  const { data: summary } = trpc.expense.entries.summary.useQuery({ year: reportYear, month: new Date().getMonth() + 1 });

  const pieData = (summary?.byCategory ?? []).filter((c) => c.spent > 0).map((c) => ({ name: c.name, value: c.spent, color: c.color }));
  const balanceData = (annual ?? []).map((m) => ({ ...m, balance: m.income - m.expenses }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Annual Report</p>
        <div className="flex items-center gap-1">
          <button onClick={() => setReportYear((y) => y - 1)} className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-bold">{reportYear}</span>
          <button onClick={() => setReportYear((y) => y + 1)} className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {isLoading ? <div className="flex h-40 items-center justify-center"><Spinner className="h-6 w-6" /></div> : (
        <>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">Income vs Expenses ({reportYear})</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={annual ?? []} barSize={10} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">Monthly Balance Trend ({reportYear})</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={balanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.1)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="balance" name="Balance" radius={[3, 3, 0, 0]}
                  fill="#6366f1"
                  label={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {pieData.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0f0f10]">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">This Month — Spending by Category</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Recurring Tab ─────────────────────────────────────────────────────────────

function RecurringTab() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.expense.recurring.list.useQuery();
  const { data: categories = [] } = trpc.expense.categories.list.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", type: "expense" as "expense" | "income", categoryId: "", frequency: "monthly" as "monthly" | "weekly", dayOfMonth: "1", notes: "" });

  const create = trpc.expense.recurring.create.useMutation({
    onSuccess: () => { utils.expense.recurring.list.invalidate(); setShowForm(false); setForm({ title: "", amount: "", type: "expense", categoryId: "", frequency: "monthly", dayOfMonth: "1", notes: "" }); toast.success("Recurring added"); },
    onError: (e) => toast.error(e.message),
  });
  const toggle = trpc.expense.recurring.update.useMutation({ onSuccess: () => utils.expense.recurring.list.invalidate() });
  const del = trpc.expense.recurring.delete.useMutation({ onSuccess: () => { utils.expense.recurring.list.invalidate(); toast.success("Deleted"); } });
  const apply = trpc.expense.recurring.applyDue.useMutation({
    onSuccess: (d) => { utils.expense.entries.list.invalidate(); utils.expense.entries.summary.invalidate(); toast.success(`Applied ${d.applied} recurring entries`); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"><Plus className="h-3.5 w-3.5" />Add Recurring</Button>
        <Button size="sm" variant="outline" onClick={() => apply.mutate()} disabled={apply.isPending} className="gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", apply.isPending && "animate-spin")} />Apply Due
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-[#0a0a0b] space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Title</label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Monthly rent" /></div>
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Amount (₹)</label><Input type="number" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="5000" /></div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Type</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as any }))}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white">
                <option value="expense">Expense</option><option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as any }))}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white">
                <option value="monthly">Monthly</option><option value="weekly">Weekly</option>
              </select>
            </div>
            {form.frequency === "monthly" && (
              <div><label className="mb-1 block text-xs font-medium text-zinc-500">Day of month</label><Input type="number" min="1" max="31" value={form.dayOfMonth} onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))} /></div>
            )}
            {form.type === "expense" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Category</label>
                <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white">
                  <option value="">None</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={!form.title || !form.amount || create.isPending}
              onClick={() => create.mutate({ title: form.title, amount: parseFloat(form.amount), type: form.type, categoryId: form.categoryId || null, frequency: form.frequency, dayOfMonth: form.frequency === "monthly" ? parseInt(form.dayOfMonth) : null, notes: form.notes || undefined })}>
              {create.isPending ? "Saving…" : "Add"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? <div className="flex h-24 items-center justify-center"><Spinner className="h-6 w-6" /></div> : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Repeat className="mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-400">No recurring transactions yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className={cn("flex items-center gap-3 rounded-xl border p-3 transition-opacity", !item.isActive && "opacity-50", "border-zinc-200 bg-white dark:border-white/10 dark:bg-[#0f0f10]")}>
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", item.type === "income" ? "bg-green-100 dark:bg-green-500/10" : "bg-red-100 dark:bg-red-500/10")}>
                <Repeat className={cn("h-4 w-4", item.type === "income" ? "text-green-600" : "text-red-500")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{item.title}</p>
                <p className="text-xs text-zinc-400">{item.frequency} · Due {new Date(item.nextDueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{item.category ? ` · ${item.category.icon} ${item.category.name}` : ""}</p>
              </div>
              <p className={cn("text-sm font-semibold", item.type === "income" ? "text-green-600" : "text-red-500")}>
                {item.type === "income" ? "+" : "-"}{fmt(item.amount)}
              </p>
              <button onClick={() => toggle.mutate({ id: item.id, isActive: !item.isActive })} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                {item.isActive ? "Pause" : "Resume"}
              </button>
              <button onClick={() => del.mutate({ id: item.id })} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Goals Tab ─────────────────────────────────────────────────────────────────

function GoalsTab() {
  const utils = trpc.useUtils();
  const { data: goals = [], isLoading } = trpc.expense.goals.list.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [depositAmt, setDepositAmt] = useState("");
  const [form, setForm] = useState({ title: "", targetAmount: "", savedAmount: "0", deadline: "", icon: "🎯", color: "#6366f1" });

  const create = trpc.expense.goals.create.useMutation({
    onSuccess: () => { utils.expense.goals.list.invalidate(); setShowForm(false); setForm({ title: "", targetAmount: "", savedAmount: "0", deadline: "", icon: "🎯", color: "#6366f1" }); toast.success("Goal created"); },
    onError: (e) => toast.error(e.message),
  });
  const update = trpc.expense.goals.update.useMutation({
    onSuccess: () => { utils.expense.goals.list.invalidate(); setDepositId(null); setDepositAmt(""); toast.success("Progress updated"); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.expense.goals.delete.useMutation({ onSuccess: () => { utils.expense.goals.list.invalidate(); toast.success("Goal deleted"); } });

  const ICONS = ["🎯", "🏠", "🚗", "✈️", "💍", "📱", "🎓", "💰", "🏖️", "🛍️"];

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setShowForm((v) => !v)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"><Plus className="h-3.5 w-3.5" />New Goal</Button>

      {showForm && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-[#0a0a0b] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Goal title</label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Save for vacation" /></div>
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Target amount (₹)</label><Input type="number" value={form.targetAmount} onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))} placeholder="100000" /></div>
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Already saved (₹)</label><Input type="number" value={form.savedAmount} onChange={(e) => setForm((f) => ({ ...f, savedAmount: e.target.value }))} placeholder="0" /></div>
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Target date</label><Input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} /></div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => (
                <button key={ic} onClick={() => setForm((f) => ({ ...f, icon: ic }))} className={cn("h-8 w-8 rounded-lg text-lg", form.icon === ic ? "bg-indigo-100 ring-2 ring-indigo-500 dark:bg-indigo-500/20" : "hover:bg-zinc-100 dark:hover:bg-white/10")}>{ic}</button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              disabled={!form.title || !form.targetAmount || !form.deadline || create.isPending}
              onClick={() => create.mutate({ title: form.title, targetAmount: parseFloat(form.targetAmount), savedAmount: parseFloat(form.savedAmount) || 0, deadline: form.deadline, icon: form.icon, color: form.color })}>
              {create.isPending ? "Creating…" : "Create Goal"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? <div className="flex h-24 items-center justify-center"><Spinner className="h-6 w-6" /></div> : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Target className="mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-400">No financial goals yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((g) => {
            const p = pct(g.savedAmount, g.targetAmount);
            const daysLeft = Math.ceil((new Date(g.deadline).getTime() - Date.now()) / 86400000);
            return (
              <div key={g.id} className={cn("rounded-2xl border p-4", g.isCompleted ? "border-green-200 bg-green-50/50 dark:border-green-500/20 dark:bg-green-500/5" : "border-zinc-200 bg-white dark:border-white/10 dark:bg-[#0f0f10]")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{g.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">{g.title}</p>
                      <p className="text-xs text-zinc-400">{daysLeft > 0 ? `${daysLeft} days left` : "Deadline passed"}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {g.isCompleted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                    <button onClick={() => del.mutate({ id: g.id })} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-zinc-500">
                    <span>{fmt(g.savedAmount)} saved</span>
                    <span>{p}% of {fmt(g.targetAmount)}</span>
                  </div>
                  <ProgressBar value={g.savedAmount} max={g.targetAmount} color={g.color} />
                </div>
                {depositId === g.id ? (
                  <div className="mt-2 flex gap-2">
                    <Input type="number" min="0" className="h-7 flex-1 text-sm" placeholder="Add ₹ amount" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} autoFocus />
                    <Button size="sm" className="h-7 px-2 text-xs bg-indigo-600 hover:bg-indigo-700"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: g.id, savedAmount: Math.min(g.savedAmount + parseFloat(depositAmt || "0"), g.targetAmount), isCompleted: g.savedAmount + parseFloat(depositAmt || "0") >= g.targetAmount })}>
                      Add
                    </Button>
                    <button onClick={() => setDepositId(null)}><X className="h-3.5 w-3.5 text-zinc-400" /></button>
                  </div>
                ) : (
                  !g.isCompleted && (
                    <button onClick={() => setDepositId(g.id)} className="mt-2 text-xs text-indigo-500 hover:text-indigo-600 dark:text-indigo-400">+ Add savings</button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Categories Tab ────────────────────────────────────────────────────────────

function CategoriesTab() {
  const utils = trpc.useUtils();
  const { data: categories = [], isLoading } = trpc.expense.categories.list.useQuery();
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", color: "#6366f1", icon: "📦", budget: "" });

  const upsert = trpc.expense.categories.upsert.useMutation({
    onSuccess: () => { utils.expense.categories.list.invalidate(); setEditId(null); setShowNew(false); setForm({ name: "", color: "#6366f1", icon: "📦", budget: "" }); toast.success("Category saved"); },
    onError: (e) => toast.error(e.message),
  });
  const del = trpc.expense.categories.delete.useMutation({
    onSuccess: () => { utils.expense.categories.list.invalidate(); toast.success("Category deleted"); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Button size="sm" onClick={() => setShowNew((v) => !v)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"><Plus className="h-3.5 w-3.5" />New Category</Button>

      {showNew && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-[#0a0a0b]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Icon</label><Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} className="text-center text-lg" maxLength={2} /></div>
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Name</label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Category name" /></div>
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Color</label><input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="h-9 w-full cursor-pointer rounded-md border border-zinc-200 dark:border-white/10" /></div>
            <div><label className="mb-1 block text-xs font-medium text-zinc-500">Monthly budget (₹)</label><Input type="number" value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} placeholder="Optional" /></div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              disabled={!form.name || upsert.isPending}
              onClick={() => upsert.mutate({ name: form.name, color: form.color, icon: form.icon, budget: form.budget ? parseFloat(form.budget) : null })}>
              {upsert.isPending ? "Saving…" : "Create"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? <div className="flex h-24 items-center justify-center"><Spinner className="h-6 w-6" /></div> : (
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((cat) => (
            editId === cat.id ? (
              <div key={cat.id} className="rounded-xl border border-indigo-300 bg-white p-3 dark:border-indigo-500/40 dark:bg-[#0f0f10] space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input defaultValue={cat.icon ?? ""} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} className="text-center" maxLength={2} />
                  <Input defaultValue={cat.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  <input type="color" defaultValue={cat.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="h-9 w-full cursor-pointer rounded-md border border-zinc-200 dark:border-white/10" />
                  <Input type="number" defaultValue={cat.budget?.toString() ?? ""} placeholder="Budget (optional)" onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditId(null)}>Cancel</Button>
                  <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={upsert.isPending}
                    onClick={() => upsert.mutate({ id: cat.id, name: form.name || cat.name, color: form.color || cat.color, icon: form.icon || (cat.icon ?? undefined), budget: form.budget ? parseFloat(form.budget) : null })}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div key={cat.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-white/10 dark:bg-[#0f0f10]">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: cat.color + "22" }}>{cat.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{cat.name}</p>
                  {cat.budget && <p className="text-xs text-zinc-400">Budget: {fmt(cat.budget)}/mo</p>}
                </div>
                <button onClick={() => { setEditId(cat.id); setForm({ name: cat.name, color: cat.color, icon: cat.icon ?? "📦", budget: cat.budget?.toString() ?? "" }); }} className="text-zinc-400 hover:text-indigo-500"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => del.mutate({ id: cat.id })} className="text-zinc-300 hover:text-red-500 dark:text-zinc-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "transactions" | "budgets" | "reports" | "recurring" | "goals" | "categories";

export default function ExpenseTrackerPage() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { error } = trpc.expense.categories.list.useQuery(undefined, { retry: false });

  if (error?.data?.code === "FORBIDDEN") {
    return (
      <AppNotInstalled
        slug="expense-tracker" name="Expense Tracker"
        description="Log expenses, set budgets, track goals, and visualize your spending habits."
        icon={<Wallet className="h-8 w-8 text-white" />}
        iconBg="bg-emerald-600"
        scopes={["expenses:read", "expenses:write", "expenses:delete"]}
      />
    );
  }

  const handleNav = (dir: number) => {
    if (dir === -1) { if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1); }
    else { if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1); }
  };

  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "dashboard", icon: <BarChart2 className="h-3.5 w-3.5" />, label: "Dashboard" },
    { key: "transactions", icon: <Wallet className="h-3.5 w-3.5" />, label: "Transactions" },
    { key: "budgets", icon: <Filter className="h-3.5 w-3.5" />, label: "Budgets" },
    { key: "reports", icon: <TrendingUp className="h-3.5 w-3.5" />, label: "Reports" },
    { key: "recurring", icon: <Repeat className="h-3.5 w-3.5" />, label: "Recurring" },
    { key: "goals", icon: <Target className="h-3.5 w-3.5" />, label: "Goals" },
    { key: "categories", icon: <Tag className="h-3.5 w-3.5" />, label: "Categories" },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex shrink-0 overflow-x-auto border-b border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-[#0f0f10]">
        {tabs.map((t) => <TabBtn key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} icon={t.icon} label={t.label} />)}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 max-w-4xl">
        {tab === "dashboard" && <DashboardTab year={year} month={month} onNav={handleNav} />}
        {tab === "transactions" && <TransactionsTab year={year} month={month} />}
        {tab === "budgets" && <BudgetsTab year={year} month={month} />}
        {tab === "reports" && <ReportsTab year={year} />}
        {tab === "recurring" && <RecurringTab />}
        {tab === "goals" && <GoalsTab />}
        {tab === "categories" && <CategoriesTab />}
      </div>
    </div>
  );
}
