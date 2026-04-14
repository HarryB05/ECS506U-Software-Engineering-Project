"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Home, PawPrint } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RoleType = "owner" | "minder";

type ProfileRolePreferencesProps = {
  initialRoles: RoleType[];
};

type SupabaseLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

function sortRoles(roles: RoleType[]): RoleType[] {
  const set = new Set(roles);
  const ordered: RoleType[] = [];
  if (set.has("owner")) ordered.push("owner");
  if (set.has("minder")) ordered.push("minder");
  return ordered;
}

function sameRoles(a: RoleType[], b: RoleType[]): boolean {
  const aa = sortRoles(a);
  const bb = sortRoles(b);
  return aa.length === bb.length && aa.every((role, i) => role === bb[i]);
}

function describeRoles(roles: RoleType[]): string {
  const hasOwner = roles.includes("owner");
  const hasMinder = roles.includes("minder");
  if (hasOwner && hasMinder) return "Owner and minder";
  if (hasOwner) return "Owner";
  if (hasMinder) return "Minder";
  return "No role selected";
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (!err || typeof err !== "object") {
    return "Could not update roles. Please try again.";
  }

  const maybe = err as SupabaseLikeError;
  const parts = [maybe.message, maybe.details, maybe.hint]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) => p.trim());

  if (parts.length > 0) return parts.join(" — ");
  return "Could not update roles. Please try again.";
}

export function ProfileRolePreferences({
  initialRoles,
}: ProfileRolePreferencesProps) {
  const router = useRouter();
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>(
    sortRoles(initialRoles),
  );
  const [savedRoles, setSavedRoles] = useState<RoleType[]>(sortRoles(initialRoles));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canSave = useMemo(() => {
    return selectedRoles.length > 0 && !sameRoles(selectedRoles, savedRoles);
  }, [selectedRoles, savedRoles]);

  function toggleRole(role: RoleType) {
    setError(null);
    setSuccess(null);
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : sortRoles([...prev, role]),
    );
  }

  async function handleSave() {
    if (selectedRoles.length === 0) {
      setError("Select at least one role.");
      return;
    }

    const supabase = createClient();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Your session has expired. Please sign in again.");
        setIsSaving(false);
        return;
      }

      const { data: roleRows, error: roleFetchError } = await supabase
        .from("roles")
        .select("role_type")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .in("role_type", ["owner", "minder"]);

      if (roleFetchError) throw roleFetchError;

      const currentRoles = new Set<RoleType>(
        (roleRows ?? [])
          .map((r) => r.role_type)
          .filter((v): v is RoleType => v === "owner" || v === "minder"),
      );
      const desiredRoles = new Set<RoleType>(selectedRoles);

      const toAdd = Array.from(desiredRoles).filter((role) => !currentRoles.has(role));
      const toRemove = Array.from(currentRoles).filter(
        (role) => !desiredRoles.has(role),
      );

      for (const role of toAdd) {
        const { error: insertRoleError } = await supabase
          .from("roles")
          .insert({ user_id: user.id, role_type: role });

        if (insertRoleError) {
          if (insertRoleError.code !== "23505") {
            throw insertRoleError;
          }

          const { error: reviveRoleError } = await supabase
            .from("roles")
            .update({
              deleted_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .eq("role_type", role)
            .not("deleted_at", "is", null);

          if (reviveRoleError) throw reviveRoleError;
        }
      }

      for (const role of toRemove) {
        const { error: removeRoleError } = await supabase
          .from("roles")
          .update({
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("role_type", role)
          .is("deleted_at", null);

        if (removeRoleError) {
          const { error: hardDeleteError } = await supabase
            .from("roles")
            .delete()
            .eq("user_id", user.id)
            .eq("role_type", role)
            .is("deleted_at", null);

          if (hardDeleteError) throw removeRoleError;
        }
      }

      if (desiredRoles.has("minder")) {
        const { data: minderRow, error: minderFetchError } = await supabase
          .from("minder_profiles")
          .select("id, deleted_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (minderFetchError) throw minderFetchError;

        if (!minderRow) {
          const { error: insertMinderError } = await supabase
            .from("minder_profiles")
            .insert({ user_id: user.id });
          if (insertMinderError) throw insertMinderError;
        } else if (minderRow.deleted_at) {
          const { error: reviveMinderError } = await supabase
            .from("minder_profiles")
            .update({
              deleted_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", minderRow.id)
            .eq("user_id", user.id);

          if (reviveMinderError) throw reviveMinderError;
        }
      }

      const { data: refreshedRoleRows, error: refreshedRoleError } = await supabase
        .from("roles")
        .select("role_type")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .in("role_type", ["owner", "minder"]);

      if (refreshedRoleError) throw refreshedRoleError;

      const persistedRoles = sortRoles(
        (refreshedRoleRows ?? [])
          .map((r) => r.role_type)
          .filter((role): role is RoleType => role === "owner" || role === "minder"),
      );

      if (!sameRoles(persistedRoles, selectedRoles)) {
        setSelectedRoles(persistedRoles);
        setSavedRoles(persistedRoles);
        throw new Error(
          "Role change did not persist due account permissions or role policies. Your current roles were reloaded.",
        );
      }

      const nextSaved = persistedRoles;
      setSavedRoles(nextSaved);
      setSuccess(`Saved: ${describeRoles(nextSaved)}.`);
      router.refresh();
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="space-y-1">
        <CardTitle>Roles</CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose how you use PawKeeper. You can be an owner, a minder, or both.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => toggleRole("owner")}
            className={cn(
              "rounded-lg border p-4 text-left shadow-card transition-all duration-150 sm:p-5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selectedRoles.includes("owner")
                ? "border-primary bg-teal-50 dark:bg-teal-900/25"
                : "border-border bg-card hover:border-teal-300 hover:shadow-card-hover",
            )}
          >
            <div className="mb-3 inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
              <PawPrint className="size-6 text-teal-700 dark:text-teal-300" />
            </div>
            <p className="text-lg font-medium text-foreground">Pet Owner</p>
            <p className="mt-1 text-sm text-muted-foreground">
              I need someone to look after my pet
            </p>
          </button>

          <button
            type="button"
            onClick={() => toggleRole("minder")}
            className={cn(
              "rounded-lg border p-4 text-left shadow-card transition-all duration-150 sm:p-5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selectedRoles.includes("minder")
                ? "border-primary bg-teal-50 dark:bg-teal-900/25"
                : "border-border bg-card hover:border-teal-300 hover:shadow-card-hover",
            )}
          >
            <div className="mb-3 inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
              <Home className="size-6 text-teal-700 dark:text-teal-300" />
            </div>
            <p className="text-lg font-medium text-foreground">Pet Minder</p>
            <p className="mt-1 text-sm text-muted-foreground">
              I want to offer pet care services
            </p>
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Current selection: <span className="font-medium text-foreground">{describeRoles(selectedRoles)}</span>
        </p>

        {error ? (
          <p className="text-sm text-danger-500" role="alert">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="text-sm text-teal-700 dark:text-teal-300" role="status">
            {success}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button type="button" onClick={handleSave} disabled={!canSave || isSaving}>
            {isSaving ? "Saving…" : "Save roles"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
