"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AppNotInstalled } from "@/components/app-not-installed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Wallet, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExpenseTrackerPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [form, setForm] = useState({ amount: "", description: "", date: today(), type: "expense" as "expense"|"income", categoryId: "" });
  const [showForm, setShowForm] = useState(false);

  const utils = trpc.useUtils();
  const invalidate = () => { utils.expense.entries.list.invalidate(); utils.expense.entries.summary.invalidate(); };

  const { data: categories = [], isLoading: catLoading, error } = trpc.expense.categories.list.useQuery(undefined, { retry: false });
  const { data: entries = [], isLoading: entLoading } = trpc.expense.entries.list.useQuery({ year, month }, { retry: false });
  const { data: summary } = trpc.expense.entries.summary.useQuery({ year, month }, { retry: false });
  const create = trpc.expense.entries.create.useMutation({ onSuccess: () => { invalidate(); setShowForm(false); setForm({ amount: "", description: "", date: today(), type: "expense", categoryId: "" }); toast.success("Entry added"); }, onError: e => toast.error(e.message) });
  const del = trpc.expense.entries.delete.useMutation({ onSuccess: () => { invalidate(); toast.success("Deleted"); } });

  if (error?.data?.code === "FORBIDDEN") {
    return (
      <AppNotInstalled
        slug="expense-tracker" name="Expense Tracker"
        description="Log expenses, set budgets, and visualize your spending habits."
        icon={<Wallet className="h-8 w-8 text-white" />}
        iconBg="bg-emerald-600"
        scopes={["expenses:read","expenses:write","expenses:delete"]}
      />
    );
  }

  const monthName = new Date(year, month - 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Left: Summary */}
      <div className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 bg-zinc-50 p-5 dark:border-white/10 dark:bg-[#0a0a0b]">
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-sm font-semibold text-zinc-900 dark:text-white">{monthName}</span>
          <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-zinc-200 dark:hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
        </div>

        {/* Summary cards */}
        <div className="space-y-2">
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-500/20 dark:bg-green-500/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">Income</p>
            <p className="mt-1 text-xl font-bold text-green-700 dark:text-green-300">{fmt(summary?.totalIncome ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/20 dark:bg-red-500/5">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Expenses</p>
            <p className="mt-1 text-xl font-bold text-red-700 dark:text-red-300">{fmt(summary?.totalExpenses ?? 0)}</p>
          </div>
          <div className={cn("rounded-xl border p-3", (summary?.balance ?? 0) >= 0 ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5" : "border-orange-200 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/5")}>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Balance</p>
            <p className={cn("mt-1 text-xl font-bold", (summary?.balance ?? 0) >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-orange-700 dark:text-orange-300")}>{fmt(summary?.balance ?? 0)}</p>
          </div>
        </div>

        {/* Category breakdown */}
        {(summary?.byCategory ?? []).filter(c => c.spent > 0).length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">By Category</p>
            <div className="space-y-2">
              {(summary?.byCategory ?? []).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent).map(cat => (
                <div key={cat.id}>
                  <div className="mb-0.5 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">{cat.icon} {cat.name}</span>
                    <span className="font-medium text-zinc-900 dark:text-white">{fmt(cat.spent)}</span>
                  </div>
                  {cat.budget && (
                    <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-white/10">
                      <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min((cat.spent / cat.budget) * 100, 100)}%`, backgroundColor: cat.color }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right: Entries */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-5 py-3 dark:border-white/10 dark:bg-[#0f0f10]">
          <p className="text-sm text-zinc-500">{entries.length} entries this month</p>
          <Button size="sm" onClick={() => setShowForm(v => !v)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"><Plus className="h-3.5 w-3.5" /> Add Entry</Button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="shrink-0 border-b border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-[#0a0a0b]">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as "expense"|"income" }))}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Amount (₹)</label>
                <Input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Description</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was this for?" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-500">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              {form.type === "expense" && (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Category</label>
                  <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-[#0f0f10] dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">No category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-end gap-2 sm:col-span-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={!form.amount || !form.description || create.isPending}
                  onClick={() => create.mutate({ amount: parseFloat(form.amount), description: form.description, date: form.date, type: form.type, categoryId: form.categoryId || null })}>
                  {create.isPending ? "Saving…" : "Add"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Entries list */}
        <div className="flex-1 overflow-y-auto">
          {entLoading || catLoading ? (
            <div className="flex h-40 items-center justify-center"><Spinner className="h-7 w-7" /></div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Wallet className="mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
              <p className="font-medium text-zinc-500">No entries for {monthName}</p>
              <p className="mt-1 text-sm text-zinc-400">Click "Add Entry" to start tracking</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-white/5">
              {entries.map(e => {
                const cat = e.categoryId ? catMap[e.categoryId] : null;
                return (
                  <div key={e.id} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-white/5">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm", e.type === "income" ? "bg-green-100 dark:bg-green-500/10" : "bg-red-100 dark:bg-red-500/10")}>
                      {e.type === "income" ? <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" /> : cat ? <span>{cat.icon}</span> : <TrendingDown className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{e.description}</p>
                      <p className="text-xs text-zinc-400">{cat?.name ?? (e.type === "income" ? "Income" : "Uncategorized")} · {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    </div>
                    <p className={cn("shrink-0 text-sm font-semibold", e.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                      {e.type === "income" ? "+" : "-"}{fmt(e.amount)}
                    </p>
                    <button onClick={() => del.mutate({ id: e.id })} className="shrink-0 text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
