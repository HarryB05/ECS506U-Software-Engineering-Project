import { notFound, redirect } from "next/navigation";

import { BookingSessionDetailContent } from "@/components/booking-session-detail-content";
import { createClient } from "@/lib/supabase/server";
import { loadBookingSessionDetail } from "@/lib/bookings-service";

export default async function BookingSessionPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await loadBookingSessionDetail(
    supabase,
    user.id,
    bookingId,
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

  return <BookingSessionDetailContent detail={data} />;
}
