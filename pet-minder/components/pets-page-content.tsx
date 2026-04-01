"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PawPrint } from "lucide-react";
import { useDashboardRole } from "@/components/dashboard-role-context";
import { PetProfilesManager } from "@/components/pet-profiles-manager";
import type { PetProfile } from "@/lib/types/pet-profile";

type PetsPageContentProps = {
  initialPets: PetProfile[];
  ownerUserId: string;
};

export function PetsPageContent({
  initialPets,
  ownerUserId,
}: PetsPageContentProps) {
  const { activeRole, setActiveRole, isDualRole, roleTypes } =
    useDashboardRole();

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

  if (!roleTypes.includes("owner")) {
    return (
      <div className="max-w-content mx-auto">
        <h1 className="font-display text-3xl text-foreground mb-1">Pets</h1>
        <p className="text-muted-foreground mb-8">
          Pet profiles are available when your account includes the pet owner
          role.
        </p>
        <div className="rounded-lg border border-border bg-card p-12 text-center shadow-card">
          <PawPrint className="mx-auto size-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Your account is set up as a pet minder only. Owner features such as
            pet profiles are not enabled for this account.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
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
      <PetProfilesManager
        initialPets={initialPets}
        ownerUserId={ownerUserId}
      />
    </div>
  );
}
