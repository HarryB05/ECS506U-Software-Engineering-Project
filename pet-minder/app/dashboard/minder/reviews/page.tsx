import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";

import { MinderWorkspaceGate } from "@/components/minder-workspace-gate";
import { MinderReviewsBrowser } from "@/components/minder-reviews-browser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import {
  getAverageRatingForUser,
  listPublicReviewsForUser,
} from "@/lib/reviews-service";

function MinderReviewsSkeleton() {
  return (
    <div className="max-w-content mx-auto space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

async function MinderReviewsInner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: reviews, error: reviewsError } = await listPublicReviewsForUser(
    supabase,
    user.id,
    { limit: 200 },
  );
  const { data: average } = await getAverageRatingForUser(supabase, user.id);

  return (
    <div className="max-w-content mx-auto space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-4 -ml-2 gap-2">
          <Link href="/dashboard/minder">
            <ArrowLeft className="size-4" />
            Back to minder workspace
          </Link>
        </Button>
        <h1 className="font-display text-2xl text-foreground mb-1 sm:text-3xl">
          Your reviews
        </h1>
        <p className="text-muted-foreground">
          Read what owners are saying about your completed bookings.
        </p>
      </div>

      <Card className="shadow-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Rating summary</CardTitle>
          <CardDescription>
            Public reviews from completed bookings that passed moderation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
            <Star className="size-4" />
            {average !== null
              ? `${average.toFixed(1)} average from ${reviews.length} review${reviews.length === 1 ? "" : "s"}`
              : "No reviews yet"}
          </div>
          {reviewsError ? (
            <p className="mt-3 text-sm text-danger-500" role="alert">
              Could not load reviews: {reviewsError.message}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <MinderReviewsBrowser reviews={reviews} pageSize={6} />
    </div>
  );
}

export default function MinderReviewsPage() {
  return (
    <MinderWorkspaceGate>
      <Suspense fallback={<MinderReviewsSkeleton />}>
        <MinderReviewsInner />
      </Suspense>
    </MinderWorkspaceGate>
  );
}
