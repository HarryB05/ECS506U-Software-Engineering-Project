"use client";

import Link from "next/link";
import { CalendarCheck, Clock, Home, PawPrint, Search } from "lucide-react";
import { useDashboardRole } from "@/components/dashboard-role-context";

const cardClass =
  "flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6 shadow-card transition-all duration-150 hover:shadow-card-hover hover:border-teal-300";

const iconWrapClass =
  "rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30 shrink-0";

export function DashboardHomeContent() {
  const { activeRole } = useDashboardRole();

  if (activeRole === "minder") {
    return (
      <div className="grid gap-4 md:grid-cols-3 max-w-content">
        <Link href="/dashboard/bookings" className={cardClass}>
          <div className={iconWrapClass}>
            <CalendarCheck className="size-6 text-teal-700 dark:text-teal-300" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-foreground">Bookings</h2>
            <p className="text-sm text-muted-foreground">
              View requests and confirmed sessions
            </p>
          </div>
        </Link>
        <Link href="/dashboard/minder" className={cardClass}>
          <div className={iconWrapClass}>
            <Home className="size-6 text-teal-700 dark:text-teal-300" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-foreground">
              Minder profile
            </h2>
            <p className="text-sm text-muted-foreground">
              Your services, pricing and location
            </p>
          </div>
        </Link>
        <Link href="/dashboard/minder/availability" className={cardClass}>
          <div className={iconWrapClass}>
            <Clock className="size-6 text-teal-700 dark:text-teal-300" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-foreground">
              Availability
            </h2>
            <p className="text-sm text-muted-foreground">
              Set weekly hours when you accept bookings
            </p>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 max-w-content">
      <Link href="/dashboard/bookings" className={cardClass}>
        <div className={iconWrapClass}>
          <CalendarCheck className="size-6 text-teal-700 dark:text-teal-300" />
        </div>
        <div>
          <h2 className="text-xl font-medium text-foreground">Bookings</h2>
          <p className="text-sm text-muted-foreground">
            View and manage your bookings
          </p>
        </div>
      </Link>
      <Link href="/dashboard/pets" className={cardClass}>
        <div className={iconWrapClass}>
          <PawPrint className="size-6 text-teal-700 dark:text-teal-300" />
        </div>
        <div>
          <h2 className="text-xl font-medium text-foreground">Pets</h2>
          <p className="text-sm text-muted-foreground">
            Manage your pet profiles
          </p>
        </div>
      </Link>
      <Link href="/dashboard/search" className={cardClass}>
        <div className={iconWrapClass}>
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
