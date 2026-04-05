"use client";

import Link from "next/link";
import { CalendarCheck, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookingRequestStatusBadge,
  StatusBadge,
} from "@/components/ui/status-badge";
import type { BookingListItem, BookingRequestListItem } from "@/lib/types/booking";
import {
  formatRequestSchedule,
  formatSessionRange,
  sessionBadgeStatus,
} from "@/lib/booking-display";

export type BookingsActivityListProps = {
  role: "owner" | "minder";
  requests: BookingRequestListItem[];
  bookings: BookingListItem[];
};

type ActivityRow =
  | { kind: "session"; sortAt: string; booking: BookingListItem }
  | { kind: "request"; sortAt: string; request: BookingRequestListItem };

function buildActivityRows(
  requests: BookingRequestListItem[],
  bookings: BookingListItem[],
): ActivityRow[] {
  const requestIdsWithSession = new Set(
    bookings
      .map((b) => b.requestId)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const requestRows = requests.filter(
    (r) => r.status !== "accepted" || !requestIdsWithSession.has(r.id),
  );

  const rows: ActivityRow[] = [
    ...bookings.map((booking) => ({
      kind: "session" as const,
      sortAt: booking.startDatetime,
      booking,
    })),
    ...requestRows.map((request) => ({
      kind: "request" as const,
      sortAt: request.createdAt,
      request,
    })),
  ];

  rows.sort((a, b) => Date.parse(b.sortAt) - Date.parse(a.sortAt));
  return rows;
}

export function BookingsActivityList({
  role,
  requests,
  bookings,
}: BookingsActivityListProps) {
  const rows = buildActivityRows(requests, bookings);

  if (rows.length === 0) {
    return (
      <Card className="shadow-card border-border">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <div className="inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
            <CalendarCheck className="size-6 text-teal-700 dark:text-teal-300" />
          </div>
          <div className="max-w-md space-y-2">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {role === "owner"
                ? "No sessions or open requests yet. When you send a request or confirm a session, it will show here. Open an item to see the full timeline."
                : "No sessions or open requests yet. When an owner contacts you, their request appears here. After you accept, the confirmed session is the record you work from."}
            </p>
          </div>
          {role === "owner" ? (
            <Button asChild variant="outline">
              <Link href="/dashboard/search">Find a minder</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        if (row.kind === "session") {
          const { booking } = row;
          return (
            <li key={`session-${booking.id}`}>
              <Link
                href={`/dashboard/bookings/session/${booking.id}`}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="shadow-card border-border transition-colors hover:border-primary/35 hover:bg-primary/5">
                  <CardContent className="flex items-start gap-3 p-4 sm:p-5">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Booking
                      </p>
                      <p className="font-medium text-foreground">
                        {booking.counterpartyName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatSessionRange(
                          booking.startDatetime,
                          booking.endDatetime,
                        )}
                        {" · "}
                        {booking.petCount} pet
                        {booking.petCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <StatusBadge status={sessionBadgeStatus(booking)} />
                      <ChevronRight
                        className="size-4 text-muted-foreground"
                        aria-hidden
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          );
        }

        const { request } = row;
        return (
          <li key={`request-${request.id}`}>
            <Link
              href={`/dashboard/bookings/request/${request.id}`}
              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Card className="shadow-card border-border transition-colors hover:border-primary/35 hover:bg-primary/5">
                <CardContent className="flex items-start gap-3 p-4 sm:p-5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Booking request
                    </p>
                    <p className="font-medium text-foreground">
                      {request.counterpartyName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatRequestSchedule(request)} · {request.petCount} pet
                      {request.petCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <BookingRequestStatusBadge status={request.status} />
                    <ChevronRight
                      className="size-4 text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
