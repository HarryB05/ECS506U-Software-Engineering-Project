"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { BookingLifecycleTimeline } from "@/components/booking-lifecycle-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookingRequestStatusBadge,
  StatusBadge,
} from "@/components/ui/status-badge";
import type { BookingRequestDetail } from "@/lib/types/booking";
import {
  formatBookingInstant,
  formatRequestSchedule,
  formatSessionRange,
  sessionBadgeStatus,
} from "@/lib/booking-display";
import { createClient } from "@/lib/supabase/client";

function buildRequestTimeline(detail: BookingRequestDetail) {
  const steps: {
    id: string;
    title: string;
    timestamp?: string;
    body?: string;
  }[] = [];

  const name = detail.counterpartyName;

  steps.push({
    id: "sent",
    title: "Request sent",
    timestamp: formatBookingInstant(detail.createdAt),
    body:
      detail.viewerRole === "owner"
        ? `You asked ${name} for: ${formatRequestSchedule(detail)}.`
        : `${name} asked you for: ${formatRequestSchedule(detail)}.`,
  });

  switch (detail.status) {
    case "pending":
      steps.push({
        id: "waiting",
        title:
          detail.viewerRole === "owner"
            ? "Waiting for the minder"
            : "Waiting for your response",
        body:
          detail.viewerRole === "owner"
            ? `${name} has not accepted or declined yet. You can cancel while it is pending.`
            : "Accept to create a confirmed session, or decline if you cannot help.",
      });
      break;
    case "accepted":
      steps.push({
        id: "accepted",
        title: "Accepted",
        timestamp: detail.updatedAt
          ? formatBookingInstant(detail.updatedAt)
          : undefined,
        body:
          "The minder accepted and a session was created. Open the linked session for cancellation rules and the final time window.",
      });
      break;
    case "declined":
      steps.push({
        id: "declined",
        title: "Declined",
        timestamp: detail.updatedAt
          ? formatBookingInstant(detail.updatedAt)
          : undefined,
        body:
          detail.viewerRole === "minder"
            ? "You declined this request. No session was created."
            : `${name} declined. No session was created. Try another minder or different dates.`,
      });
      break;
    case "cancelled":
      steps.push({
        id: "cancelled",
        title: "Request cancelled",
        timestamp: detail.updatedAt
          ? formatBookingInstant(detail.updatedAt)
          : undefined,
        body:
          "This request was withdrawn before it became a session, or was cancelled while still pending.",
      });
      break;
    default:
      break;
  }

  return steps;
}

type BookingRequestDetailContentProps = {
  detail: BookingRequestDetail;
};

export function BookingRequestDetailContent({
  detail,
}: BookingRequestDetailContentProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeline = useMemo(() => buildRequestTimeline(detail), [detail]);

  async function callRpc(name: string, args: Record<string, string>) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { data: rpcData, error: rpcError } = await supabase.rpc(name, args);
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    if (name === "bookings_accept_request" && rpcData != null) {
      router.push(`/dashboard/bookings/session/${String(rpcData)}`);
      router.refresh();
      return;
    }
    router.refresh();
    router.push("/dashboard/bookings");
  }

  const showMinderActions =
    detail.viewerRole === "minder" && detail.status === "pending";
  const showOwnerCancel =
    detail.viewerRole === "owner" && detail.status === "pending";

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
              Booking request
            </h1>
            <p className="text-muted-foreground mt-1">
              With {detail.counterpartyName} · {detail.petCount} pet
              {detail.petCount === 1 ? "" : "s"}
            </p>
          </div>
          <BookingRequestStatusBadge status={detail.status} />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-danger-500" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="shadow-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            This is only the <strong className="font-medium text-foreground">request</strong>{" "}
            thread. After acceptance, open the{" "}
            <strong className="font-medium text-foreground">session</strong> for
            cancellation deadlines and the final time window.
          </p>
        </CardHeader>
        <CardContent>
          <BookingLifecycleTimeline steps={timeline} />
        </CardContent>
      </Card>

      {detail.linkedSession ? (
        <Card className="shadow-card border-border">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base font-medium">
                Linked session
              </CardTitle>
              <StatusBadge status={sessionBadgeStatus(detail.linkedSession)} />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatSessionRange(
                detail.linkedSession.startDatetime,
                detail.linkedSession.endDatetime,
              )}
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/dashboard/bookings/session/${detail.linkedSession.id}`}>
                Open session
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Schedule</p>
            <p className="text-foreground">{formatRequestSchedule(detail)}</p>
          </div>
          {detail.message ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Message
              </p>
              <p className="text-foreground leading-relaxed">{detail.message}</p>
            </div>
          ) : null}
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
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {showMinderActions ? (
          <>
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                callRpc("bookings_accept_request", { p_request_id: detail.id })
              }
            >
              {busy ? "Working…" : "Accept"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() =>
                callRpc("bookings_decline_request", { p_request_id: detail.id })
              }
            >
              Decline
            </Button>
          </>
        ) : null}
        {showOwnerCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              callRpc("bookings_cancel_request", { p_request_id: detail.id })
            }
          >
            {busy ? "Working…" : "Cancel request"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
