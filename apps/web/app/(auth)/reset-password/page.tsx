"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";

interface FormData {
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const token = params.get("token");

  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { newPassword: "", confirmPassword: "" } });

  const passwordValue = watch("newPassword");

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error("Missing reset token. Please use the link from your email.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth-flow/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      });
      const body = await res.json();

      if (!res.ok) {
        setStatus("error");
        toast.error(body.error || "Password reset failed");
        return;
      }

      setStatus("success");
    } catch {
      toast.error("Failed to connect to the server");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/10">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Password reset!
        </h2>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          Your password has been updated. You've been signed out of all devices.
        </p>
        <Button
          asChild
          className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          <Link href="/signin">Sign In</Link>
        </Button>
      </motion.div>
    );
  }

  if (status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center"
      >
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10">
          <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Reset failed
        </h2>
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          The reset link is invalid or has expired.
        </p>
        <Button asChild variant="outline">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Set a new password
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Choose a strong password for your account
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor="newPassword"
          >
            New Password
          </label>
          <Input
            id="newPassword"
            type="password"
            placeholder="Create a strong password"
            {...register("newPassword", {
              required: "Password is required",
              minLength: { value: 8, message: "At least 8 characters" },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
                message:
                  "Must contain uppercase, lowercase, number, and special character",
              },
            })}
            className="h-11 rounded-lg border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-[#1a1a1b]"
          />
          {errors.newPassword && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {errors.newPassword.message}
            </p>
          )}
          {passwordValue && <PasswordStrength password={passwordValue} />}
        </div>

        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            htmlFor="confirmPassword"
          >
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your new password"
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: (v) => v === passwordValue || "Passwords do not match",
            })}
            className="h-11 rounded-lg border-zinc-200 bg-white px-4 dark:border-white/10 dark:bg-[#1a1a1b]"
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          disabled={isLoading || !token}
          className="mt-4 h-11 w-full rounded-lg bg-indigo-600 font-medium text-white transition-all duration-200 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        >
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          {isLoading ? "Resetting…" : "Reset Password"}
        </Button>
      </form>
    </motion.div>
  );
}
