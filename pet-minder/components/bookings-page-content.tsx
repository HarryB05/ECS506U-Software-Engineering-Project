"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Home } from "lucide-react";

import { BookingsActivityList } from "@/components/bookings-activity-list";
import { Button } from "@/components/ui/button";
import { useDashboardRole } from "@/components/dashboard-role-context";
import type { BookingsDashboardPayload } from "@/lib/types/booking";

type BookingsPageContentProps = {
  initialData: BookingsDashboardPayload;
  loadError: string | null;
};

export function BookingsPageContent({
  initialData,
  loadError,
}: BookingsPageContentProps) {
  const { activeRole } = useDashboardRole();
  const [data, setData] = useState(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  if (loadError) {
    return (
      <div className="max-w-content mx-auto space-y-4">
        <h1 className="font-display text-2xl text-foreground sm:text-3xl">
          Bookings
        </h1>
        <p className="text-sm text-danger-500" role="alert">
          {loadError}
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const isMinder = activeRole === "minder";
  const requests = isMinder ? data.minderRequests : data.ownerRequests;
  const bookings = isMinder ? data.minderBookings : data.ownerBookings;

  return (
    <div className="max-w-content mx-auto space-y-8">
      <div>
        <h1 className="font-display mb-1 text-2xl text-foreground sm:text-3xl">
          {isMinder ? "Minder bookings" : "Bookings"}
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
          {isMinder
            ? "Everything in one list, newest first. A booking request is a message waiting for your answer. After you accept, the session is the agreed appointment (open it for cancellation rules and the exact time window)."
            : "Everything in one list, newest first. Requests you have sent show until they are declined, cancelled, or replaced by a session after acceptance. Open any row for the full timeline and actions."}
        </p>
      </div>

      <BookingsActivityList
        role={isMinder ? "minder" : "owner"}
        requests={requests}
        bookings={bookings}
      />

      <Button asChild variant="outline">
        <Link href={isMinder ? "/dashboard/minder" : "/dashboard"}>
          <span className="inline-flex items-center gap-2">
            <Home className="size-4" />
            {isMinder ? "Minder workspace" : "Back to dashboard"}
          </span>
        </Link>
      </Button>
    </div>
  );
}
