import { notFound, redirect } from "next/navigation";

import { BookingRequestDetailContent } from "@/components/booking-request-detail-content";
import { createClient } from "@/lib/supabase/server";
import { loadBookingRequestDetail } from "@/lib/bookings-service";

export default async function BookingRequestPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await loadBookingRequestDetail(
    supabase,
    user.id,
    requestId,
  );

  if (error) {
    return (
      <div className="max-w-content mx-auto space-y-4">
        <p className="text-sm text-danger-500" role="alert">
          {error.message}
        </p>
      </div>
    );
  }

  if (!data) {
    notFound();
  }

  return <BookingRequestDetailContent detail={data} />;
}
