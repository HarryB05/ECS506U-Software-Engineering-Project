import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingsPageContent } from "@/components/bookings-page-content";
import { createClient } from "@/lib/supabase/server";
import { loadBookingsDashboard } from "@/lib/bookings-service";

function BookingsSkeleton() {
  return (
    <div className="max-w-content mx-auto space-y-4">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-5 w-full max-w-lg" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

async function BookingsInner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await loadBookingsDashboard(supabase, user.id);

  return (
    <BookingsPageContent
      initialData={data}
      loadError={error?.message ?? null}
    />
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<BookingsSkeleton />}>
      <BookingsInner />
    </Suspense>
  );
}
