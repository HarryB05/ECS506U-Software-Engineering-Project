"use client";

import { useMemo } from "react";
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

type ActivityBucketKey =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "other";

const BUCKET_ORDER: ActivityBucketKey[] = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "other",
];

const BUCKET_LABEL: Record<ActivityBucketKey, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  other: "Other",
};

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
    (r) => r.status !== "confirmed" || !requestIdsWithSession.has(r.id),
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

function bucketForRow(row: ActivityRow): ActivityBucketKey {
  if (row.kind === "request") {
    switch (row.request.status) {
      case "pending":
        return "pending";
      case "confirmed":
        return "confirmed";
      case "cancelled":
      case "declined":
        return "cancelled";
      default:
        return "other";
    }
  }

  switch (sessionBadgeStatus(row.booking)) {
    case "confirmed":
      return "confirmed";
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "other";
  }
}

export function BookingsActivityList({
  role,
  requests,
  bookings,
}: BookingsActivityListProps) {
  const rows = buildActivityRows(requests, bookings);
  const grouped = useMemo(() => {
    const byStatus: Record<ActivityBucketKey, ActivityRow[]> = {
      pending: [],
      confirmed: [],
      completed: [],
      cancelled: [],
      other: [],
    };

    for (const row of rows) {
      byStatus[bucketForRow(row)].push(row);
    }

    return byStatus;
  }, [rows]);

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
    <div className="space-y-3">
      {BUCKET_ORDER.map((bucket) => {
        const bucketRows = grouped[bucket];
        if (bucketRows.length === 0) return null;

        return (
          <details
            key={bucket}
            open={bucket === "pending"}
            className="rounded-xl border border-border bg-card shadow-card"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground marker:content-none sm:px-5">
              <span>{BUCKET_LABEL[bucket]}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {bucketRows.length}
              </span>
            </summary>
            <ul className="space-y-2 border-t border-border p-3 sm:p-4">
              {bucketRows.map((row) => {
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
          </details>
        );
      })}
    </div>
  );
}
