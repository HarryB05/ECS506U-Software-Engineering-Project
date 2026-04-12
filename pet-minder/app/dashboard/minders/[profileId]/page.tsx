import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PublicReviewList } from "@/components/public-review-list";
import { MinderAvailabilityDisplay } from "@/components/minder-availability-display";
import { createClient } from "@/lib/supabase/server";
import { getMinderProfileById } from "@/lib/minder-profile-service";
import { getMinderAvailability } from "@/lib/availability-service";
import { listPublicReviewsForUser } from "@/lib/reviews-service";
import {
  formatMinderPriceLabel,
  minderIntroText,
} from "@/lib/minder-display";
import type { PetSize } from "@/lib/types/pet-profile";

const PET_SIZE_LABEL: Record<PetSize, string> = {
  small: "Small (0-10kg)",
  medium: "Medium (10-25kg)",
  large: "Large (25-40kg)",
  "x-large": "X-large (40+kg)",
};

function ProfileSkeleton() {
  return (
    <div className="max-w-content mx-auto space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

async function MinderProfileInner({
  profileId,
}: {
  profileId: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: roleRows } = await supabase
    .from("roles")
    .select("role_type")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  const canBookAsOwner =
    (roleRows ?? []).some((r) => r.role_type === "owner");

  const { data, error } = await getMinderProfileById(supabase, profileId);

  if (error) {
    return (
      <div className="max-w-content mx-auto space-y-4">
        <p className="text-sm text-danger-500" role="alert">
          Could not load this profile: {error.message}
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/search">Back to search</Link>
        </Button>
      </div>
    );
  }

  if (!data) {
    notFound();
  }

  const { data: reviews } = await listPublicReviewsForUser(
    supabase,
    data.userId,
    { limit: 10 },
  );

  const { data: availabilitySlots } = await getMinderAvailability(
    supabase,
    data.profileId,
  );

  const rating = data.averageRating ?? 0;
  const typesLine =
    data.supportedPetTypes.length > 0
      ? data.supportedPetTypes.join(", ")
      : "Pet types not specified";
  const sizesLine =
    data.supportedPetSizes.length > 0
      ? data.supportedPetSizes.map((size) => PET_SIZE_LABEL[size]).join(", ")
      : "Pet sizes not specified";

  return (
    <div className="max-w-content mx-auto space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-4 -ml-2 gap-2">
          <Link href="/dashboard/search">
            <ArrowLeft className="size-4" />
            Back to search
          </Link>
        </Button>
        <h1 className="font-display text-3xl text-foreground mb-1">
          {data.displayName}
        </h1>
        <p className="text-muted-foreground">{typesLine}</p>
      </div>

      <Card className="shadow-card border-border">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-sm text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
              <Star className="size-4" />
              {rating.toFixed(1)} average rating
            </div>
            {data.isVerified ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-success-500">
                <ShieldCheck className="size-4" />
                Verified minder
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Verification pending
              </span>
            )}
          </div>
          <CardTitle className="text-xl font-medium">About</CardTitle>
          <CardDescription>How this minder describes their services.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-base text-foreground leading-relaxed">
            {minderIntroText(data.serviceDescription)}
          </p>
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground mb-1">Supports</p>
            <p className="text-foreground">{typesLine}</p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground mb-1">Supported sizes</p>
            <p className="text-foreground">{sizesLine}</p>
          </div>
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground mb-1">Pricing</p>
            <p className="text-foreground">
              {formatMinderPriceLabel(data.servicePricing)}
            </p>
          </div>
          {canBookAsOwner && data.userId !== user.id ? (
            <div className="border-t border-border pt-4">
              <Button asChild className="w-full sm:w-auto">
                <Link href={`/dashboard/minders/${profileId}/book`}>
                  Request a booking
                </Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Clock className="size-4 text-teal-700 dark:text-teal-300" />
            <CardTitle className="text-xl font-medium">Availability</CardTitle>
          </div>
          <CardDescription>
            Weekly hours when {data.displayName} accepts bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MinderAvailabilityDisplay slots={availabilitySlots ?? []} />
        </CardContent>
      </Card>

      <PublicReviewList
        title="Recent reviews"
        reviews={reviews}
      />
    </div>
  );
}

export default async function MinderPublicProfilePage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <MinderProfileInner profileId={profileId} />
    </Suspense>
  );
}
