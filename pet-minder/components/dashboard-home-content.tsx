"use client";

import Link from "next/link";
import { CalendarCheck, Home, PawPrint, Search } from "lucide-react";
import { useDashboardRole } from "@/components/dashboard-role-context";

export function DashboardHomeContent() {
  const { activeRole } = useDashboardRole();

  if (activeRole === "minder") {
    return (
      <div className="grid gap-4 md:grid-cols-2 max-w-medium">
        <Link
          href="/dashboard/bookings"
          className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 shadow-card transition-all duration-150 hover:shadow-card-hover hover:border-teal-300"
        >
          <div className="rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
            <CalendarCheck className="size-6 text-teal-700 dark:text-teal-300" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-foreground">Bookings</h2>
            <p className="text-sm text-muted-foreground">
              View requests and confirmed sessions
            </p>
          </div>
        </Link>
        <Link
          href="/dashboard/minder"
          className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 shadow-card transition-all duration-150 hover:shadow-card-hover hover:border-teal-300"
        >
          <div className="rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
            <Home className="size-6 text-teal-700 dark:text-teal-300" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-foreground">
              Minder workspace
            </h2>
            <p className="text-sm text-muted-foreground">
              Your profile, services and availability
            </p>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 max-w-content">
      <Link
        href="/dashboard/bookings"
        className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 shadow-card transition-all duration-150 hover:shadow-card-hover hover:border-teal-300"
      >
        <div className="rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
          <CalendarCheck className="size-6 text-teal-700 dark:text-teal-300" />
        </div>
        <div>
          <h2 className="text-xl font-medium text-foreground">Bookings</h2>
          <p className="text-sm text-muted-foreground">
            View and manage your bookings
          </p>
        </div>
      </Link>
      <Link
        href="/dashboard/pets"
        className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 shadow-card transition-all duration-150 hover:shadow-card-hover hover:border-teal-300"
      >
        <div className="rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
          <PawPrint className="size-6 text-teal-700 dark:text-teal-300" />
        </div>
        <div>
          <h2 className="text-xl font-medium text-foreground">Pets</h2>
          <p className="text-sm text-muted-foreground">
            Manage your pet profiles
          </p>
        </div>
      </Link>
      <Link
        href="/dashboard/search"
        className="flex items-center gap-4 rounded-lg border border-border bg-card p-6 shadow-card transition-all duration-150 hover:shadow-card-hover hover:border-teal-300"
      >
        <div className="rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
          <Search className="size-6 text-teal-700 dark:text-teal-300" />
        </div>
        <div>
          <h2 className="text-xl font-medium text-foreground">Find a minder</h2>
          <p className="text-sm text-muted-foreground">
            Browse nearby minders and compare profiles
          </p>
        </div>
      </Link>
    </div>
  );
}
