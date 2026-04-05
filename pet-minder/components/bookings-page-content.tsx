"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookingRequestStatusBadge,
  StatusBadge,
} from "@/components/ui/status-badge";
import { useDashboardRole } from "@/components/dashboard-role-context";
import { createClient } from "@/lib/supabase/client";
import type {
  BookingListItem,
  BookingRequestListItem,
  BookingsDashboardPayload,
} from "@/lib/types/booking";
import { formatRequestSchedule } from "@/lib/booking-display";
import { CalendarCheck, Home } from "lucide-react";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatWhen(iso: string): string {
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return iso;
  return dateFmt.format(new Date(d));
}

type BookingsPageContentProps = {
  initialData: BookingsDashboardPayload;
  loadError: string | null;
};

export function BookingsPageContent({
  initialData,
  loadError,
}: BookingsPageContentProps) {
  const router = useRouter();
  const { activeRole } = useDashboardRole();
  const [data, setData] = useState(initialData);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  async function callRpc(
    name: string,
    arg: Record<string, string>,
    requestId?: string,
  ) {
    setActionError(null);
    setBusyId(requestId ?? name);
    const supabase = createClient();
    const { error } = await supabase.rpc(name, arg);
    setBusyId(null);
    if (error) {
      setActionError(error.message);
      return;
    }
    router.refresh();
  }

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

  if (activeRole === "minder") {
    return (
      <div className="max-w-content mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl text-foreground mb-1 sm:text-3xl">
            Minder bookings
          </h1>
          <p className="text-muted-foreground">
            Respond to requests and manage upcoming sessions.
          </p>
        </div>

        {actionError ? (
          <p className="text-sm text-danger-500" role="alert">
            {actionError}
          </p>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            Incoming requests
          </h2>
          {data.minderRequests.filter((r) => r.status === "pending").length ===
          0 ? (
            <Card className="shadow-card border-border">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No pending requests.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {data.minderRequests
                .filter((r) => r.status === "pending")
                .map((r) => (
                  <RequestCardMinder
                    key={r.id}
                    item={r}
                    busy={busyId === r.id}
                    onAccept={() =>
                      callRpc("bookings_accept_request", {
                        p_request_id: r.id,
                      }, r.id)
                    }
                    onDecline={() =>
                      callRpc("bookings_decline_request", {
                        p_request_id: r.id,
                      }, r.id)
                    }
                  />
                ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">
            Other requests
          </h2>
          {data.minderRequests.filter((r) => r.status !== "pending").length ===
          0 ? (
            <Card className="shadow-card border-border">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No past requests yet.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {data.minderRequests
                .filter((r) => r.status !== "pending")
                .map((r) => (
                  <RequestCardReadOnly key={r.id} item={r} />
                ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium text-foreground">Sessions</h2>
          {data.minderBookings.length === 0 ? (
            <Card className="shadow-card border-border">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                No confirmed sessions yet.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-3">
              {data.minderBookings.map((b) => (
                <BookingCard
                  key={b.id}
                  item={b}
                  role="minder"
                  busy={busyId === b.id}
                  onCancel={() =>
                    callRpc("bookings_cancel_booking", {
                      p_booking_id: b.id,
                    }, b.id)
                  }
                />
              ))}
            </ul>
          )}
        </section>

        <Button asChild variant="outline">
          <Link href="/dashboard/minder">Go to minder workspace</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl text-foreground mb-1 sm:text-3xl">
          Bookings
        </h1>
        <p className="text-muted-foreground">
          Track requests you have sent and confirmed sessions.
        </p>
      </div>

      {actionError ? (
        <p className="text-sm text-danger-500" role="alert">
          {actionError}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">
          Your requests
        </h2>
        {data.ownerRequests.length === 0 ? (
          <Card className="shadow-card border-border">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
                <CalendarCheck className="size-6 text-teal-700 dark:text-teal-300" />
              </div>
              <p className="text-muted-foreground max-w-md">
                No booking requests yet. Find a minder and send a request to get
                started.
              </p>
              <Button asChild variant="outline">
                <Link href="/dashboard/search">Find a minder</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {data.ownerRequests.map((r) => (
              <RequestCardOwner
                key={r.id}
                item={r}
                busy={busyId === r.id}
                onCancel={() =>
                  callRpc("bookings_cancel_request", {
                    p_request_id: r.id,
                  }, r.id)
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium text-foreground">
          Confirmed sessions
        </h2>
        {data.ownerBookings.length === 0 ? (
          <Card className="shadow-card border-border">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              When a minder accepts your request, the session appears here.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {data.ownerBookings.map((b) => (
              <BookingCard
                key={b.id}
                item={b}
                role="owner"
                busy={busyId === b.id}
                onCancel={() =>
                  callRpc("bookings_cancel_booking", {
                    p_booking_id: b.id,
                  }, b.id)
                }
              />
            ))}
          </ul>
        )}
      </section>

      <Button asChild variant="outline">
        <Link href="/dashboard">
          <span className="inline-flex items-center gap-2">
            <Home className="size-4" />
            Back to dashboard
          </span>
        </Link>
      </Button>
    </div>
  );
}

function RequestCardMinder({
  item,
  busy,
  onAccept,
  onDecline,
}: {
  item: BookingRequestListItem;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <li>
      <Card className="shadow-card border-border">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">
              {item.counterpartyName}
            </CardTitle>
            <BookingRequestStatusBadge status={item.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatRequestSchedule(item)} · {item.petCount} pet
            {item.petCount === 1 ? "" : "s"}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {item.message ? (
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Message: </span>
              {item.message}
            </p>
          ) : null}
          {item.careInstructions ? (
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Care notes: </span>
              {item.careInstructions}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={onAccept}
            >
              {busy ? "Working…" : "Accept"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onDecline}
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

function RequestCardOwner({
  item,
  busy,
  onCancel,
}: {
  item: BookingRequestListItem;
  busy: boolean;
  onCancel: () => void;
}) {
  return (
    <li>
      <Card className="shadow-card border-border">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">
              {item.counterpartyName}
            </CardTitle>
            <BookingRequestStatusBadge status={item.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatRequestSchedule(item)} · {item.petCount} pet
            {item.petCount === 1 ? "" : "s"}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {item.message ? (
            <p className="text-sm text-foreground">{item.message}</p>
          ) : null}
          {item.careInstructions ? (
            <p className="text-sm text-muted-foreground">
              Care: {item.careInstructions}
            </p>
          ) : null}
          {item.status === "pending" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onCancel}
            >
              {busy ? "Working…" : "Cancel request"}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}

function RequestCardReadOnly({ item }: { item: BookingRequestListItem }) {
  return (
    <li>
      <Card className="shadow-card border-border">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">
              {item.counterpartyName}
            </CardTitle>
            <BookingRequestStatusBadge status={item.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatRequestSchedule(item)} · {item.petCount} pet
            {item.petCount === 1 ? "" : "s"}
          </p>
        </CardHeader>
      </Card>
    </li>
  );
}

function BookingCard({
  item,
  role,
  busy,
  onCancel,
}: {
  item: BookingListItem;
  role: "owner" | "minder";
  busy: boolean;
  onCancel: () => void;
}) {
  const canCancel =
    (item.status === "confirmed" || item.status === "pending") &&
    !item.cancelledAt;
  const deadline = Date.parse(item.cancellationDeadline);
  const withinCancelWindow =
    !Number.isNaN(deadline) && Date.now() < deadline;

  const statusForBadge =
    item.status === "cancelled" || item.cancelledAt
      ? "cancelled"
      : item.status === "completed"
        ? "completed"
        : item.status === "confirmed"
          ? "confirmed"
          : "pending";

  return (
    <li>
      <Card className="shadow-card border-border">
        <CardHeader className="space-y-2 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-medium">
              {item.counterpartyName}
            </CardTitle>
            <StatusBadge status={statusForBadge} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatWhen(item.startDatetime)} – {formatWhen(item.endDatetime)}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.petCount} pet{item.petCount === 1 ? "" : "s"} · Cancel by{" "}
            {formatWhen(item.cancellationDeadline)}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {item.careInstructions ? (
            <p className="text-sm text-foreground">
              <span className="text-muted-foreground">Care: </span>
              {item.careInstructions}
            </p>
          ) : null}
          {canCancel && withinCancelWindow ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onCancel}
            >
              {busy ? "Working…" : "Cancel session"}
            </Button>
          ) : null}
          {canCancel && !withinCancelWindow ? (
            <p className="text-xs text-muted-foreground">
              The free cancellation window has passed. Contact the{" "}
              {role === "owner" ? "minder" : "owner"} if you need to change this
              session.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}
