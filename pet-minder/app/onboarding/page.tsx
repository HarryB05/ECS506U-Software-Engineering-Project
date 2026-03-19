"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Home, PawPrint } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type RoleType = "owner" | "minder";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [fullName, setFullName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<RoleType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameTrimmed = fullName.trim();
  const canProceedFromStep1 = nameTrimmed.length > 0;
  const canSubmit =
    nameTrimmed.length > 0 && selectedRoles.length > 0;

  function toggleRole(role: RoleType) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const supabase = createClient();
    setIsSubmitting(true);
    setError(null);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Your session has expired. Please sign in again.");
        setIsSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({ full_name: nameTrimmed })
        .eq("id", user.id);

      if (updateError) throw updateError;

      for (const role of selectedRoles) {
        const { error: insertRoleError } = await supabase
          .from("roles")
          .insert({ user_id: user.id, role_type: role });

        if (insertRoleError) throw insertRoleError;
      }

      if (selectedRoles.includes("minder")) {
        const { error: minderError } = await supabase
          .from("minder_profiles")
          .insert({ user_id: user.id });

        if (minderError) throw minderError;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-narrow">
      <div className="mb-8 text-center md:text-left">
        <h1 className="font-display text-3xl text-foreground">
          Tell us about yourself
        </h1>
        <p className="mt-2 text-muted-foreground">
          This helps us personalise your experience
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name">Your full name</Label>
              <Input
                id="full-name"
                name="fullName"
                autoComplete="name"
                placeholder="e.g. Alex Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={!canProceedFromStep1}
              onClick={() => {
                if (canProceedFromStep1) setStep(2);
              }}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-base text-foreground font-medium">
                How will you use Pet Minder?
              </p>
              <p className="text-sm text-muted-foreground">
                You can choose one or both.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => toggleRole("owner")}
                  className={cn(
                    "rounded-lg border p-5 text-left shadow-card transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selectedRoles.includes("owner")
                      ? "border-primary bg-teal-50 dark:bg-teal-900/25"
                      : "border-border bg-card hover:border-teal-300 hover:shadow-card-hover",
                  )}
                >
                  <div className="mb-3 inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
                    <PawPrint className="size-6 text-teal-700 dark:text-teal-300" />
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    Pet Owner
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    I need someone to look after my pet
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => toggleRole("minder")}
                  className={cn(
                    "rounded-lg border p-5 text-left shadow-card transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selectedRoles.includes("minder")
                      ? "border-primary bg-teal-50 dark:bg-teal-900/25"
                      : "border-border bg-card hover:border-teal-300 hover:shadow-card-hover",
                  )}
                >
                  <div className="mb-3 inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
                    <Home className="size-6 text-teal-700 dark:text-teal-300" />
                  </div>
                  <p className="text-lg font-medium text-foreground">
                    Pet Minder
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    I want to offer pet care services
                  </p>
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-danger-500" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Get started"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
