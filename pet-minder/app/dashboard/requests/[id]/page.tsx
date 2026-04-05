import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BookingDetailContent } from "@/components/booking-detail-content";

function BookingDetailSkeleton() {
  return (
    <div className="max-w-medium mx-auto space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <Suspense fallback={<BookingDetailSkeleton />}>
      <BookingDetailContent />
    </Suspense>
  );
}