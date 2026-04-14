"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";

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
  const [submittingReview, setSubmittingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

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
