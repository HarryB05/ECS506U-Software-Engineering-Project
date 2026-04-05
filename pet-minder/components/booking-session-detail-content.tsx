"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { BookingLifecycleTimeline } from "@/components/booking-lifecycle-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { BookingSessionDetail } from "@/lib/types/booking";
import {
  formatBookingInstant,
  formatBookingWithPetsTitle,
  formatSessionRange,
  sessionBadgeStatus,
} from "@/lib/booking-display";
import { createClient } from "@/lib/supabase/client";

function buildSessionTimeline(detail: BookingSessionDetail) {
  const steps: {
    id: string;
    title: string;
    timestamp?: string;
    body?: string;
  }[] = [];

  const minderLabel = detail.viewerRole === "owner" ? detail.counterpartyName : "You";
  const ownerLabel = detail.viewerRole === "owner" ? "You" : detail.counterpartyName;

  if (detail.request) {
    steps.push({
      id: "sent",
      title: "Request sent",
      timestamp: formatBookingInstant(detail.request.createdAt),
      body:
        detail.viewerRole === "owner"
          ? `You sent this to ${detail.counterpartyName}. They could accept or decline before it became a session.`
          : `${ownerLabel} sent this request for you to accept or decline.`,
    });

    steps.push({
      id: "accepted",
      title: "Accepted",
      timestamp: detail.request.updatedAt
        ? formatBookingInstant(detail.request.updatedAt)
        : undefined,
      body: `${minderLabel} accepted. This page is the confirmed booking: use it for cancellations and the agreed time window.`,
    });
  } else {
    steps.push({
      id: "record",
      title: "Booking on your calendar",
      body: "This row is the confirmed booking. The original request record is not attached, but the care window and notes below are what matter now.",
    });
  }

  steps.push({
    id: "window",
    title: "Agreed care window",
    timestamp: formatSessionRange(detail.startDatetime, detail.endDatetime),
  });

  if (detail.cancelledAt) {
    steps.push({
      id: "cancelled",
      title: "Booking cancelled",
      timestamp: formatBookingInstant(detail.cancelledAt),
      body: "This booking is no longer going ahead in the app.",
    });
  } else if (detail.status === "completed") {
    steps.push({
      id: "completed",
      title: "Completed",
      body: "This booking has been marked complete.",
    });
  }

  return steps;
}

type BookingSessionDetailContentProps = {
  detail: BookingSessionDetail;
};

export function BookingSessionDetailContent({
  detail,
}: BookingSessionDetailContentProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeline = useMemo(() => buildSessionTimeline(detail), [detail]);

  const canCancel =
    (detail.status === "confirmed" || detail.status === "pending") &&
    !detail.cancelledAt;
  const deadline = Date.parse(detail.cancellationDeadline);
  const withinCancelWindow =
    !Number.isNaN(deadline) && Date.now() < deadline;

  async function cancelSession() {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("bookings_cancel_booking", {
      p_booking_id: detail.id,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
    router.push("/dashboard/bookings");
  }

  const otherParty =
    detail.viewerRole === "owner" ? "minder" : "owner";

  return (
    <div className="max-w-content mx-auto space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ms-2 mb-4 gap-2">
          <Link href="/dashboard/bookings">
            <ArrowLeft className="size-4" />
            All bookings
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-foreground sm:text-3xl">
              {formatBookingWithPetsTitle(
                detail.petNames ?? [],
                detail.petCount ?? 0,
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              {detail.viewerRole === "owner"
                ? `Minder: ${detail.counterpartyName}`
                : `Owner: ${detail.counterpartyName}`}
            </p>
          </div>
          <StatusBadge status={sessionBadgeStatus(detail)} />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-danger-500" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="shadow-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">How this fits together</CardTitle>
          <p className="text-sm text-muted-foreground">
            A <strong className="font-medium text-foreground">request</strong>{" "}
            is the message you send or receive. After acceptance, the{" "}
            <strong className="font-medium text-foreground">booking</strong>{" "}
            (this page) is the agreed appointment you cancel or complete.
          </p>
        </CardHeader>
        <CardContent>
          <BookingLifecycleTimeline steps={timeline} />
        </CardContent>
      </Card>

      <Card className="shadow-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              Free cancellation deadline
            </p>
            <p className="text-foreground">
              {formatBookingInstant(detail.cancellationDeadline)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              You can cancel without charge before this time (see product rules).
              After that, speak to the {otherParty} directly.
            </p>
          </div>
          {detail.careInstructions ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Care notes
              </p>
              <p className="text-foreground leading-relaxed">
                {detail.careInstructions}
              </p>
            </div>
          ) : null}
          {detail.request?.message ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Original message on the request
              </p>
              <p className="text-foreground leading-relaxed">
                {detail.request.message}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {canCancel && withinCancelWindow ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={cancelSession}
          >
            {busy ? "Working…" : "Cancel booking"}
          </Button>
        ) : null}
        {canCancel && !withinCancelWindow && !detail.cancelledAt ? (
          <p className="text-sm text-muted-foreground">
            The free cancellation window has passed. Contact the {otherParty}{" "}
            if you need to change this booking.
          </p>
        ) : null}
        {detail.request ? (
          <Button asChild variant="ghost">
            <Link href={`/dashboard/bookings/request/${detail.request.id}`}>
              View linked request
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
