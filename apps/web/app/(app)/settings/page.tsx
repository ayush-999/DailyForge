"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Settings, Moon, Sun, Monitor, Bell, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-white/10 dark:bg-[#0f0f10]">
      <div className="mb-5 border-b border-zinc-100 pb-4 dark:border-white/5">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function ThemeOption({
  value,
  label,
  icon,
  current,
  onClick,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  current: string | undefined;
  onClick: () => void;
}) {
  const active = current === value;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center gap-2 rounded-xl border-2 px-4 py-4 transition-all",
        active
          ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10"
          : "border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20"
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          active
            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
            : "bg-zinc-100 text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
        )}
      >
        {icon}
      </div>
      <span
        className={cn(
          "text-sm font-medium",
          active
            ? "text-indigo-700 dark:text-indigo-300"
            : "text-zinc-700 dark:text-zinc-300"
        )}
      >
        {label}
      </span>
    </button>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <Section title="Appearance" description="Choose how DailyForge looks on your device">
      <Label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Theme
      </Label>
      <div className="flex gap-3">
        <ThemeOption
          value="light"
          label="Light"
          icon={<Sun className="h-5 w-5" />}
          current={theme}
          onClick={() => setTheme("light")}
        />
        <ThemeOption
          value="dark"
          label="Dark"
          icon={<Moon className="h-5 w-5" />}
          current={theme}
          onClick={() => setTheme("dark")}
        />
        <ThemeOption
          value="system"
          label="System"
          icon={<Monitor className="h-5 w-5" />}
          current={theme}
          onClick={() => setTheme("system")}
        />
      </div>
    </Section>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-3">
      <div className="pr-8">
        <p className="text-sm font-medium text-zinc-900 dark:text-white">{label}</p>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
          enabled ? "bg-indigo-600 dark:bg-indigo-500" : "bg-zinc-200 dark:bg-white/15"
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
            enabled ? "translate-x-4.5" : "translate-x-0.5"
          )}
        />
      </button>
    </div>
  );
}

function NotificationsSection() {
  const [emailDigest, setEmailDigest] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  const handleSave = () => {
    toast.success("Notification preferences saved");
  };

  return (
    <Section title="Notifications" description="Control how and when DailyForge notifies you">
      <div className="divide-y divide-zinc-100 dark:divide-white/5">
        <ToggleRow
          label="Daily email digest"
          description="Receive a summary of your tasks each morning"
          enabled={emailDigest}
          onChange={setEmailDigest}
        />
        <ToggleRow
          label="Task due reminders"
          description="Get notified when tasks are approaching their due date"
          enabled={taskReminders}
          onChange={setTaskReminders}
        />
        <ToggleRow
          label="Weekly productivity report"
          description="A weekly overview of your completed tasks and streaks"
          enabled={weeklyReport}
          onChange={setWeeklyReport}
        />
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          Save Preferences
        </Button>
      </div>
    </Section>
  );
}

function LocaleSection() {
  const LOCALES = [
    { value: "en-US", label: "English (US)" },
    { value: "en-GB", label: "English (UK)" },
    { value: "hi-IN", label: "Hindi (India)" },
    { value: "fr-FR", label: "French (France)" },
    { value: "de-DE", label: "German (Germany)" },
    { value: "ja-JP", label: "Japanese (Japan)" },
  ];

  const [locale, setLocale] = useState("en-US");

  return (
    <Section title="Language & Region" description="Localization preferences for dates, numbers, and language">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="locale" className="text-sm">Language</Label>
          <select
            id="locale"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className={cn(
              "flex h-9 w-full max-w-xs rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1",
              "dark:border-white/10 dark:bg-[#0f0f10] dark:text-white"
            )}
          >
            {LOCALES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end max-w-xs">
          <Button
            size="sm"
            onClick={() => toast.success("Language preference saved")}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
          >
            Save
          </Button>
        </div>
      </div>
    </Section>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex h-full flex-col overflow-auto">
      <header className="border-b border-zinc-200 bg-white px-8 py-5 dark:border-white/10 dark:bg-[#0f0f10]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 dark:bg-white/10">
            <Settings className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Settings
            </h1>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              Configure your DailyForge experience
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-6 px-8 py-8">
        <AppearanceSection />
        <NotificationsSection />
        <LocaleSection />
      </main>
    </div>
  );
}
