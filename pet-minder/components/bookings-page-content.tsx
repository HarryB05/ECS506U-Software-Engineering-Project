"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
<<<<<<< HEAD
      <div className="max-w-content mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl text-foreground mb-1 sm:text-3xl">
            Bookings
          </h1>
          <p className="text-muted-foreground mb-8">
            Confirmed sessions will appear here. Incoming booking requests are
            managed on the requests page.
          </p>
        </div>

        <Card className="shadow-card">
          <CardContent className="p-6 text-center sm:p-8 md:p-12 space-y-6">
            <div className="mx-auto mb-4 inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
              <CalendarCheck className="size-6 text-teal-700 dark:text-teal-300" />
            </div>
            <p className="text-muted-foreground mb-6">
              This page shows your confirmed bookings. To review new requests,
              go to the requests page.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/requests">View requests</Link>
            </Button>
          </CardContent>
        </Card>
=======
      <div className="max-w-content mx-auto space-y-4">
        <h1 className="font-display text-2xl text-foreground sm:text-3xl">
          Bookings
        </h1>
        <p className="text-sm text-danger-500" role="alert">
          {loadError}
        </p>
>>>>>>> 61c006a400918339246884431f387c491a215552
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
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed sm:text-base">
            {isMinder
              ? "Everything in one list, newest first. A booking request is a message waiting for your answer. After you accept, the session is the agreed appointment (open it for cancellation rules and the exact time window)."
              : "Everything in one list, newest first. Requests you have sent show until they are declined, cancelled, or replaced by a session after acceptance. Open any row for the full timeline and actions."}
          </p>
          {!isMinder ? (
            <Button asChild className="sm:shrink-0">
              <Link href="/dashboard/search">Search for Minder</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <BookingsActivityList
        role={isMinder ? "minder" : "owner"}
        requests={requests}
        bookings={bookings}
      />
    </div>
  );
}
