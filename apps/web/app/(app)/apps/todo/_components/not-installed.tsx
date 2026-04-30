"use client";

import { CheckSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export function NotInstalled() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const install = trpc.apps.install.useMutation({
    onSuccess: async () => {
      await utils.todo.invalidate();
      await utils.apps.listInstalled.invalidate();
      toast.success("Todo List installed!");
      router.refresh();
    },
    onError: () => toast.error("Installation failed"),
  });

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-500/10">
        <CheckSquare className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
          Todo List
        </h2>
        <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
          Install this app to start organizing your tasks and lists.
        </p>
      </div>
      <Button
        onClick={() =>
          install.mutate({
            slug: "todo",
            grantedScopes: ["todos:read", "todos:write", "todos:delete"],
          })
        }
        disabled={install.isPending}
        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
      >
        {install.isPending ? "Installing…" : "Install Todo List"}
      </Button>
    </div>
  );
}
