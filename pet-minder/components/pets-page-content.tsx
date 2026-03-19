"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PawPrint } from "lucide-react";
import { useDashboardRole } from "@/components/dashboard-role-context";

export function PetsPageContent() {
  const { activeRole, setActiveRole, isDualRole } = useDashboardRole();

  if (activeRole === "minder") {
    return (
      <div className="max-w-content mx-auto">
        <h1 className="font-display text-3xl text-foreground mb-1">Pets</h1>
        <p className="text-muted-foreground mb-8">
          Pet profiles are part of the owner experience. Switch to owner mode
          to add and manage pets.
        </p>
        <div className="rounded-lg border border-border bg-card p-12 text-center shadow-card">
          <PawPrint className="mx-auto size-12 text-muted-foreground/50 mb-4" />
          {isDualRole ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground max-w-md">
                You are currently in minder mode. Switch to owner mode to use
                this section.
              </p>
              <Button type="button" onClick={() => setActiveRole("owner")}>
                Switch to owner mode
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              This section is for pet owners. Use the dashboard to open
              minder tools.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto">
      <h1 className="font-display text-3xl text-foreground mb-1">Pets</h1>
      <p className="text-muted-foreground mb-8">
        Add and manage your pet profiles for bookings.
      </p>
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <PawPrint className="mx-auto size-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">
          No pets added yet. Add a pet to get started.
        </p>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
