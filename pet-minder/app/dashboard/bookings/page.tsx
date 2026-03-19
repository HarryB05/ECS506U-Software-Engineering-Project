import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingsPageContent } from "@/components/bookings-page-content";

function BookingsSkeleton() {
  return (
    <div className="max-w-content mx-auto space-y-4">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-5 w-full max-w-lg" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<BookingsSkeleton />}>
      <BookingsPageContent />
    </Suspense>
  );
}
