"use client";

import { useDashboardRole } from "@/components/dashboard-role-context";

export function DashboardPageIntro() {
  const { activeRole } = useDashboardRole();

  if (activeRole === "minder") {
    return (
      <>
        <h1 className="font-display text-3xl text-foreground mb-1">
          Minder dashboard
        </h1>
        <p className="text-muted-foreground mb-8">
          Your bookings and minder tools in one place.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl text-foreground mb-1">Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Welcome back. Here you can manage your bookings and pets.
      </p>
    </>
  );
}
