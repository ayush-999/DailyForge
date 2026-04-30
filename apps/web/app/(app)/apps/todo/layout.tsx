import type { ReactNode } from "react";
import { CheckSquare } from "lucide-react";

export const metadata = { title: "Todo List — DailyForge" };

export default function TodoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-6 py-3 dark:border-white/10 dark:bg-[#0f0f10]">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
          <CheckSquare className="h-4 w-4 text-white" />
        </div>
        <h1 className="text-base font-semibold text-zinc-900 dark:text-white">
          Todo List
        </h1>
      </header>
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  );
}
