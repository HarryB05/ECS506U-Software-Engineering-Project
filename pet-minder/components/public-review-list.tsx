"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { reportReview, type PublicReviewItem } from "@/lib/reviews-service";

function formatWhen(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "Unknown date";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(ms));
}

type PublicReviewListProps = {
  title: string;
  reviews: PublicReviewItem[];
};

export function PublicReviewList({ title, reviews }: PublicReviewListProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportedByMe, setReportedByMe] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;

    async function loadReportedByMe() {
      const ids = reviews.map((review) => review.id).filter(Boolean);
      if (ids.length === 0) {
        if (active) setReportedByMe(new Set());
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;
      if (authError || !user) {
        setReportedByMe(new Set());
        return;
      }

      const { data, error } = await supabase
        .from("review_reports")
        .select("review_id")
        .eq("reporter_id", user.id)
        .in("review_id", ids);

      if (!active) return;
      if (error) {
        setReportedByMe(new Set());
        return;
      }

      setReportedByMe(
        new Set(
          (data ?? [])
            .map((row) => row.review_id)
            .filter((id): id is string => typeof id === "string"),
        ),
      );
    }

    void loadReportedByMe();

    return () => {
      active = false;
    };
  }, [reviews]);

  async function handleReport(reviewId: string) {
    setReportError(null);
    setBusyId(reviewId);

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setBusyId(null);
      setReportError("Please sign in again to report this review.");
      return;
    }

    const { error } = await reportReview(supabase, {
      reviewId,
      reporterId: user.id,
    });

    setBusyId(null);

    if (error) {
      setReportError(error.message);
      return;
    }

    setReportedByMe((prev) => {
      const next = new Set(prev);
      next.add(reviewId);
      return next;
    });
  }

  return (
    <Card className="shadow-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="space-y-2 rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-xs text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                  <Star className="size-3.5" />
                  {review.rating.toFixed(1)}/5.0
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatWhen(review.createdAt)}
                </p>
              </div>

              <p className="text-sm text-foreground leading-relaxed">
                {review.comment && review.comment.trim().length > 0
                  ? review.comment
                  : "No description"}
              </p>

              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {review.reporterCount > 0
                    ? `${review.reporterCount} report${review.reporterCount === 1 ? "" : "s"}`
                    : "No reports"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={busyId === review.id || reportedByMe.has(review.id)}
                  onClick={() => handleReport(review.id)}
                >
                  <AlertTriangle className="size-3.5" />
                  {reportedByMe.has(review.id) ? "Reported" : "Report"}
                </Button>
              </div>
            </div>
          ))
        )}

        {reportError ? (
          <p className="text-sm text-danger-500" role="alert">
            {reportError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
