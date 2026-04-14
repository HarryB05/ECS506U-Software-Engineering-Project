"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, Loader2, PawPrint } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RoleType = "owner" | "minder";

type RoleManagementSectionProps = {
  currentRoles: RoleType[];
};

export function RoleManagementSection({
  currentRoles,
}: RoleManagementSectionProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasOwner = currentRoles.includes("owner");
  const hasMinder = currentRoles.includes("minder");
  const hasBoth = hasOwner && hasMinder;

  async function addRole(role: RoleType) {
    setBusy(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Your session has expired. Please sign in again.");
      setBusy(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("roles")
      .insert({ user_id: user.id, role_type: role });

    if (insertError) {
      setError(insertError.message);
      setBusy(false);
      return;
    }

    if (role === "minder") {
      const { error: minderError } = await supabase
        .from("minder_profiles")
        .insert({ user_id: user.id });

      // Ignore duplicate key — a soft-deleted profile will be revived by
      // ensureMinderProfileForUser the first time the minder workspace loads.
      if (minderError && minderError.code !== "23505") {
        setError(minderError.message);
        setBusy(false);
        return;
      }
    }

    setSuccess(
      role === "owner"
        ? "Pet Owner role added. You can now book minders and manage pets."
        : "Pet Minder role added. Set up your minder profile in the Minder workspace.",
    );
    setBusy(false);
    router.refresh();
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Roles</CardTitle>
        <CardDescription>
          Your current roles and options to expand your access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {hasOwner && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
              <PawPrint className="size-3.5" />
              Pet Owner
            </span>
          )}
          {hasMinder && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
              <Home className="size-3.5" />
              Pet Minder
            </span>
          )}
        </div>

        {hasBoth ? (
          <p className="text-sm text-muted-foreground">
            You have both roles. Use the mode switch in the top navigation to
            switch between owner and minder views.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add an additional role to unlock more features.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {!hasOwner && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => addRole("owner")}
                  className={cn(
                    "rounded-lg border p-4 text-left shadow-card transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "border-border bg-card hover:border-teal-300 hover:shadow-card-hover",
                    busy && "cursor-not-allowed opacity-60",
                  )}
                >
                  <div className="mb-3 inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
                    <PawPrint className="size-6 text-teal-700 dark:text-teal-300" />
                  </div>
                  <p className="text-base font-medium text-foreground">
                    Add Pet Owner role
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Book minders and manage your pets
                  </p>
                </button>
              )}
              {!hasMinder && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => addRole("minder")}
                  className={cn(
                    "rounded-lg border p-4 text-left shadow-card transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "border-border bg-card hover:border-teal-300 hover:shadow-card-hover",
                    busy && "cursor-not-allowed opacity-60",
                  )}
                >
                  <div className="mb-3 inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
                    <Home className="size-6 text-teal-700 dark:text-teal-300" />
                  </div>
                  <p className="text-base font-medium text-foreground">
                    Add Pet Minder role
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Offer pet care services to owners
                  </p>
                </button>
              )}
            </div>

            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Saving…
              </div>
            )}
            {error && (
              <p className="text-sm text-danger-500" role="alert">
                {error}
              </p>
            )}
            {success && (
              <p className="text-sm text-success-500" role="status">
                {success}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
