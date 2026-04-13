import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MinderReviewsBrowser } from "@/components/minder-reviews-browser";
import { createClient } from "@/lib/supabase/server";
import {
  getAverageRatingForUser,
  listPublicReviewsForUser,
} from "@/lib/reviews-service";
import { listPetProfilesForOwner } from "@/lib/pet-profile-service";

function ProfileSkeleton() {
  return (
    <div className="max-w-content mx-auto space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

async function OwnerProfileInner({ userId }: { userId: string }) {
  const supabase = await createClient();
  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  if (!viewer) {
    redirect("/auth/login");
  }

  // Fetch the owner's display name from users table
  const { data: ownerRow, error: ownerErr } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  if (ownerErr || !ownerRow) {
    notFound();
  }

  const ownerName =
    typeof ownerRow.full_name === "string" && ownerRow.full_name.trim().length > 0
      ? ownerRow.full_name.trim()
      : "Pet owner";

  // Fetch reviews and average rating
  const [{ data: reviews }, { data: avgRating }] = await Promise.all([
    listPublicReviewsForUser(supabase, userId, { limit: 200 }),
    getAverageRatingForUser(supabase, userId),
  ]);

  // Fetch pets — may return empty if RLS restricts cross-user reads
  const { data: pets } = await listPetProfilesForOwner(supabase, userId);
  const visiblePets = (pets ?? []).filter((p) => !p.deleted_at);

  return (
    <div className="max-w-content mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground mb-1">
          {ownerName}
        </h1>
        <p className="text-muted-foreground">Pet owner profile</p>
      </div>

      <Card className="shadow-card border-border">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-4">
            {avgRating != null ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-sm text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                <Star className="size-4" />
                {avgRating !== null
                  ? `${avgRating.toFixed(1)} average from ${reviews.length} review${reviews.length === 1 ? "" : "s"}`
                  : "No reviews yet"}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No ratings yet</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-xl font-medium">Pets</CardTitle>
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/pets">My Pets</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {visiblePets.length === 0 ? (
            <p className="text-muted-foreground">No pet profiles available.</p>
          ) : (
            <ul className="space-y-2">
              {visiblePets.map((pet) => (
                <li
                  key={pet.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-foreground">{pet.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pet.pet_type}
                      {pet.age != null ? ` · ${pet.age} yr` : ""}
                      {pet.pet_size ? ` · ${pet.pet_size}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <MinderReviewsBrowser reviews={reviews ?? []} pageSize={6} />
    </div>
  );
}

export default async function OwnerProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <OwnerProfileInner userId={userId} />
    </Suspense>
  );
}
