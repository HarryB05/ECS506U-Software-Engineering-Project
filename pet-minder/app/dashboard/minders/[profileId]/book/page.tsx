import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookMinderRequestForm } from "@/components/book-minder-request-form";
import { createClient } from "@/lib/supabase/server";
import { getMinderProfileById } from "@/lib/minder-profile-service";
import { listOwnerPetsForBooking } from "@/lib/bookings-service";

function BookSkeleton() {
  return (
    <div className="max-w-content mx-auto space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

async function BookMinderInner({ profileId }: { profileId: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: roles } = await supabase
    .from("roles")
    .select("role_type")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  const roleTypes = roles?.map((r) => r.role_type) ?? [];
  if (!roleTypes.includes("owner")) {
    redirect(`/dashboard/minders/${profileId}`);
  }

  const { data: minder, error } = await getMinderProfileById(
    supabase,
    profileId,
  );

  if (error) {
    return (
      <div className="max-w-content mx-auto space-y-4">
        <p className="text-sm text-danger-500" role="alert">
          {error.message}
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard/search">Back to search</Link>
        </Button>
      </div>
    );
  }

  if (!minder) {
    notFound();
  }

  const { data: pets, error: petsError } = await listOwnerPetsForBooking(
    supabase,
    user.id,
  );

  if (petsError) {
    return (
      <div className="max-w-content mx-auto space-y-4">
        <p className="text-sm text-danger-500" role="alert">
          {petsError.message}
        </p>
        <Button asChild variant="outline">
          <Link href={`/dashboard/minders/${profileId}`}>Back to profile</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-4 -ml-2 gap-2">
          <Link href={`/dashboard/minders/${profileId}`}>
            <ArrowLeft className="size-4" />
            Back to profile
          </Link>
        </Button>
        <h1 className="font-display text-2xl text-foreground mb-1 sm:text-3xl">
          Book with {minder.displayName}
        </h1>
        <p className="text-muted-foreground">
          Pick times and pets below. Nothing is confirmed until they accept your
          request.
        </p>
      </div>

      <BookMinderRequestForm
        minderProfileId={minder.profileId}
        minderDisplayName={minder.displayName}
        servicePricing={minder.servicePricing}
        pets={pets}
      />
    </div>
  );
}

export default async function BookMinderPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const { profileId } = await params;

  return (
    <Suspense fallback={<BookSkeleton />}>
      <BookMinderInner profileId={profileId} />
    </Suspense>
  );
}
