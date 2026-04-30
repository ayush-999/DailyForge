"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Props {
  slug: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  scopes: string[];
}

export function AppNotInstalled({ slug, name, description, icon, iconBg, scopes }: Props) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const install = trpc.apps.install.useMutation({
    onSuccess: async () => {
      await utils.apps.listInstalled.invalidate();
      toast.success(`${name} installed!`);
      router.refresh();
    },
    onError: () => toast.error("Installation failed"),
  });

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
      <div className={cn("flex h-16 w-16 items-center justify-center rounded-2xl", iconBg)}>
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">{name}</h2>
        <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      <Button
        onClick={() => install.mutate({ slug, grantedScopes: scopes })}
        disabled={install.isPending}
        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
      >
        {install.isPending ? "Installing…" : `Install ${name}`}
      </Button>
    </div>
  );
}
