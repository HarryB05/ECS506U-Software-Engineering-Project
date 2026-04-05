import { Suspense } from "react";
import { BookingRequestsContent } from "@/components/booking-requests-content";

export default function BookingRequestsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingRequestsContent />
    </Suspense>
  );
}