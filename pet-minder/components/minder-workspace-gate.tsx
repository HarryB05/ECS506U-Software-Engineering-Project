"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useDashboardRole } from "@/components/dashboard-role-context";

export function MinderWorkspaceGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { roleTypes, activeRole, setActiveRole, isDualRole } =
    useDashboardRole();

  if (!roleTypes.includes("minder")) {
    return (
      <div className="max-w-narrow mx-auto rounded-lg border border-border bg-card p-6 text-center shadow-card sm:p-8 md:p-10">
        <h1 className="font-display text-xl text-foreground mb-2 sm:text-2xl">
          Minder workspace
        </h1>
        <p className="text-muted-foreground mb-6">
          This area is for pet minders. Your account does not include the
          minder role.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (activeRole === "owner" && isDualRole) {
    return (
      <div className="max-w-narrow mx-auto rounded-lg border border-border bg-card p-6 text-center shadow-card sm:p-8 md:p-10">
        <h1 className="font-display text-xl text-foreground mb-2 sm:text-2xl">
          Wrong mode
        </h1>
        <p className="text-muted-foreground mb-6">
          You are in owner mode. Switch to minder mode to use this workspace.
        </p>
        <Button type="button" onClick={() => setActiveRole("minder")}>
          Switch to minder mode
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
