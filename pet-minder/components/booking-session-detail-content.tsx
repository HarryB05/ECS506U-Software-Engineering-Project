"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, Star } from "lucide-react";

import { BookingLifecycleTimeline } from "@/components/booking-lifecycle-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import type { BookingSessionDetail } from "@/lib/types/booking";
import { submitBookingReview } from "@/lib/reviews-service";
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
      id: "confirmed",
      title: "Confirmed",
      timestamp: detail.request.updatedAt
        ? formatBookingInstant(detail.request.updatedAt)
        : undefined,
      body: `${minderLabel} confirmed. This page is the confirmed booking: use it for cancellations and the agreed time window.`,
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
  } else if (detail.status === "disputed") {
    const raisedBy =
      detail.disputedBySelf === true
        ? "You raised a dispute"
        : detail.disputedBySelf === false
          ? `${detail.counterpartyName} raised a dispute`
          : "A dispute was raised";
    steps.push({
      id: "disputed",
      title: "Dispute raised",
      timestamp: detail.disputedAt
        ? formatBookingInstant(detail.disputedAt)
        : undefined,
      body: `${raisedBy}. An administrator will review this and reach a resolution. No further changes can be made until it is resolved.`,
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
  const [submittingReview, setSubmittingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  // Dispute state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeBusy, setDisputeBusy] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const timeline = useMemo(() => buildSessionTimeline(detail), [detail]);

  const canCancel =
    (detail.status === "confirmed" || detail.status === "pending") &&
    !detail.cancelledAt;
  const deadline = Date.parse(detail.cancellationDeadline);
  const withinCancelWindow =
    !Number.isNaN(deadline) && Date.now() < deadline;

  // A dispute can be raised on any confirmed or completed booking that has
  // not been cancelled and is not already disputed.
  const canDispute =
    (detail.status === "confirmed" || detail.status === "completed") &&
    !detail.cancelledAt;

  async function handleRaiseDispute(e: React.FormEvent) {
    e.preventDefault();
    setDisputeError(null);
    if (!disputeReason.trim()) {
      setDisputeError("Please describe the issue before submitting.");
      return;
    }
    setDisputeBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("bookings_raise_dispute", {
      p_booking_id: detail.id,
      p_reason: disputeReason.trim(),
    });
    setDisputeBusy(false);
    if (rpcError) {
      setDisputeError(rpcError.message);
      return;
    }
    setShowDisputeForm(false);
    router.refresh();
  }

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

  async function handleSubmitReview() {
    setReviewError(null);
    setSubmittingReview(true);
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setSubmittingReview(false);
      setReviewError("Sign in again to submit your review.");
      return;
    }

    const { error: submitError } = await submitBookingReview(supabase, {
      bookingId: detail.id,
      reviewerId: user.id,
      rating,
      comment,
    });

    setSubmittingReview(false);
    if (submitError) {
      setReviewError(submitError.message);
      return;
    }

    setComment("");
    router.refresh();
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
              {detail.viewerRole === "minder" && detail.counterpartyUserId ? (
                <>
                  Owner:{" "}
                  <Link
                    href={`/dashboard/owners/${detail.counterpartyUserId}`}
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    {detail.counterpartyName}
                  </Link>
                </>
              ) : (
                detail.viewerRole === "owner"
                  ? `Minder: ${detail.counterpartyName}`
                  : `Owner: ${detail.counterpartyName}`
              )}
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

      <Card className="shadow-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Review {detail.review.revieweeName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ratings are unlocked only after the booking end time.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.review.existing ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="text-foreground">
                You rated this booking{" "}
                <strong>
                  {detail.review.existing.rating.toFixed(0)}/5
                </strong>
                .
              </p>
              {detail.review.existing.comment ? (
                <p className="text-muted-foreground leading-relaxed">
                  {detail.review.existing.comment}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Submitted {formatBookingInstant(detail.review.existing.createdAt)}
              </p>
            </div>
          ) : null}

          {detail.review.canSubmit ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="booking-review-rating">Star rating</Label>
                <div
                  id="booking-review-rating"
                  className="flex flex-wrap items-center gap-2"
                >
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = value <= rating;
                    return (
                      <Button
                        key={value}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        className="gap-1"
                        onClick={() => setRating(value)}
                      >
                        <Star className="size-3.5" />
                        {value}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-review-comment">Written review (optional)</Label>
                <Textarea
                  id="booking-review-comment"
                  placeholder="Share details that could help other users."
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  maxLength={1000}
                />
              </div>

              {reviewError ? (
                <p className="text-sm text-danger-500" role="alert">
                  {reviewError}
                </p>
              ) : null}

              <Button
                type="button"
                disabled={submittingReview}
                onClick={handleSubmitReview}
              >
                {submittingReview ? "Submitting..." : "Submit review"}
              </Button>
            </div>
          ) : null}

          {!detail.review.canSubmit && !detail.review.existing ? (
            <p className="text-sm text-muted-foreground">
              {detail.review.reason ??
                "Reviews become available after this booking ends."}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Dispute section */}
      {detail.status === "disputed" ? (
        <Card className="shadow-card border-danger-500/30 bg-danger-100/30 dark:bg-danger-900/10">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-danger-500 shrink-0" />
              <CardTitle className="text-base font-medium text-danger-700 dark:text-danger-400">
                Dispute under review
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detail.disputeReason ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Reason provided
                </p>
                <p className="text-foreground leading-relaxed mt-0.5">
                  {detail.disputeReason}
                </p>
              </div>
            ) : null}
            <p className="text-muted-foreground text-xs">
              An administrator will review this dispute and contact both
              parties. This booking cannot be modified until it is resolved.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {canDispute ? (
        <Card className="shadow-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Raise a dispute</CardTitle>
            <p className="text-sm text-muted-foreground">
              If there is a problem with this booking that you cannot resolve
              directly with the {otherParty}, you can flag it for admin review.
            </p>
          </CardHeader>
          <CardContent>
            {!showDisputeForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDisputeForm(true)}
              >
                <AlertTriangle className="size-4" />
                Raise dispute
              </Button>
            ) : (
              <form className="space-y-4" onSubmit={handleRaiseDispute}>
                <div className="space-y-1.5">
                  <Label htmlFor="dispute-reason">
                    Describe the issue <span className="text-danger-500">*</span>
                  </Label>
                  <Textarea
                    id="dispute-reason"
                    placeholder="Explain what went wrong and what outcome you are seeking."
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    rows={4}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground">
                    {disputeReason.length}/1000 characters
                  </p>
                </div>

                <div className="rounded-lg border border-warning-500/40 bg-warning-100/60 px-4 py-3 text-sm dark:bg-warning-900/20">
                  <p className="font-medium text-warning-700 dark:text-warning-400">
                    Before you submit
                  </p>
                  <p className="text-warning-600 dark:text-warning-500 mt-0.5">
                    Raising a dispute flags this booking for admin review. Once
                    raised it cannot be undone. Please try to resolve the issue
                    directly first.
                  </p>
                </div>

                {disputeError ? (
                  <p className="text-sm text-danger-500" role="alert">
                    {disputeError}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" variant="destructive" disabled={disputeBusy}>
                    {disputeBusy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Submit dispute"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={disputeBusy}
                    onClick={() => {
                      setShowDisputeForm(false);
                      setDisputeReason("");
                      setDisputeError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

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
