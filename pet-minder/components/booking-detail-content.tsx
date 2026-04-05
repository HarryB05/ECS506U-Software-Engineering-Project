    "use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  startSession,
  endSession,
  submitLog,
} from "@/lib/booking-minder-services";
import type { Booking, Activity } from "@/lib/types/booking";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  Clock,
  PawPrint,
  NotebookPen,
  MapPin,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

function LiveSessionCard({
  activity,
  bookingId,
  onSessionEnd,
}: {
  activity: Activity;
  bookingId: string;
  onSessionEnd: () => void;
}) {
  const [ending, setEnding] = useState(false);
  const [logText, setLogText] = useState(activity.session_log ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [logSaved, setLogSaved] = useState(false);

  const isLive = activity.session_status === "ongoing";
  const isCompleted = activity.session_status === "completed";

  const handleEnd = async () => {
    setEnding(true);
    const supabase = createClient();
    await endSession(supabase, bookingId);
    setEnding(false);
    onSessionEnd();
  };

  const handleSubmitLog = async () => {
    if (!logText.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    const { error } = await submitLog(supabase, bookingId, logText);
    setSubmitting(false);
    if (!error) setLogSaved(true);
  };

  return (
    <Card
      className={cn(
        "shadow-card transition-all duration-150",
        isLive && "border-amber-500/50 animate-card-glow",
      )}
    >
      <CardHeader className="flex flex-row items-center gap-3 pb-3">
        <StatusBadge
          status={isLive ? "active" : isCompleted ? "completed" : "confirmed"}
        />
        <span className="text-sm text-muted-foreground">
          {isLive
            ? "Session in progress"
            : isCompleted
              ? "Session completed"
              : "Session not started"}
        </span>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* GPS map area — design.md section 13 */}
        <div className="h-48 rounded-lg bg-teal-50 dark:bg-teal-900/30 relative overflow-hidden flex items-center justify-center">
          {isLive ? (
            <>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center">
                <span className="absolute h-6 w-6 rounded-full bg-amber-500/40 animate-live-pulse" />
                <span className="relative z-10 h-3 w-3 rounded-full bg-amber-500" />
              </div>
              <MapPin className="size-6 text-teal-300 opacity-20" />
            </>
          ) : (
            <div className="text-center">
              <MapPin className="size-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-sm text-muted-foreground">
                {isCompleted
                  ? "Session ended"
                  : "Live tracking will appear here"}
              </p>
            </div>
          )}
        </div>

        {/* End session — URF 3.10 */}
        {!isCompleted && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleEnd}
            disabled={ending || !isLive}
          >
            {ending
              ? "Ending session…"
              : isLive
                ? "End session"
                : "Session not started yet"}
          </Button>
        )}

        {/* Activity log — URF 3.11 */}
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <ClipboardList className="size-4" />
            Activity log
          </p>

          {isCompleted && logSaved ? (
            <div className="flex items-center gap-2 rounded-lg bg-success-100 text-success-500 px-3 py-2 text-sm">
              <CheckCircle2 className="size-4" />
              Activity log submitted.
            </div>
          ) : (
            <>
              <textarea
                className="w-full rounded-md border border-border bg-input px-3 py-2 text-base text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={4}
                placeholder="Summarise the session — route taken, behaviour, anything notable…"
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                disabled={!isCompleted && !isLive}
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSubmitLog}
                disabled={submitting || !logText.trim()}
              >
                {submitting ? "Saving…" : "Submit activity log"}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function BookingDetailContent() {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(
        `
        *,
        owner:users!owner_id(full_name),
        booking_pets(pet_profiles(id, name, pet_type, medical_info, dietary_requirements)),
        activity:activities(*)
      `,
      )
      .eq("id", id)
      .single();

    if (!error && data) setBooking(data as Booking);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription — design.md section 13
  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`activity:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "activities",
          filter: `booking_id=eq.${id}`,
        },
        (payload) => {
          setBooking((prev) => {
            if (!prev) return prev;
            return { ...prev, activity: payload.new as Activity };
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleStartSession = async () => {
    if (!booking) return;
    setStarting(true);
    const supabase = createClient();
    await startSession(supabase, booking.id);
    setStarting(false);
    load();
  };

  if (loading) {
    return (
      <div className="max-w-medium mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-medium mx-auto">
        <p className="text-muted-foreground">Booking not found.</p>
      </div>
    );
  }

  const pets = booking.booking_pets?.map((bp) => bp.pet_profiles) ?? [];
  const activity = Array.isArray(booking.activity)
    ? booking.activity[0]
    : booking.activity;
  const sessionNotStarted =
    !activity || activity.session_status === "started";

  return (
    <div className="max-w-medium mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-foreground sm:text-3xl">
            Booking with {booking.owner?.full_name ?? "Owner"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(
              new Date(booking.start_date_time),
              "EEE d MMM yyyy · HH:mm",
            )}
          </p>
        </div>
        <StatusBadge
          status={
            booking.status === "completed"
              ? "completed"
              : activity?.session_status === "ongoing"
                ? "active"
                : "confirmed"
          }
        />
      </div>

      {/* Booking details card */}
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarCheck className="size-4" />
              {format(new Date(booking.start_date_time), "EEE d MMM yyyy")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" />
              {format(new Date(booking.start_date_time), "HH:mm")}
              {" – "}
              {format(new Date(booking.end_date_time), "HH:mm")}
            </span>
          </div>

          {pets.length > 0 && (
            <div className="rounded-lg bg-teal-50 dark:bg-teal-900/30 p-3 space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Pets
              </p>
              {pets.map((pet) => (
                <div key={pet.id} className="flex items-start gap-2">
                  <PawPrint className="size-4 text-teal-700 dark:text-teal-300 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-base text-foreground">
                      {pet.name}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {pet.pet_type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {booking.care_instructions && (
            <div className="rounded-lg border border-border p-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                <NotebookPen className="size-4" />
                Care instructions
              </p>
              <p className="text-base text-foreground">
                {booking.care_instructions}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Start session — URF 3.9 */}
      {sessionNotStarted && booking.status === "confirmed" && (
        <Button
          variant="live"
          className="w-full"
          onClick={handleStartSession}
          disabled={starting}
        >
          {starting ? "Starting session…" : "Start session"}
        </Button>
      )}

      {/* Live session card — shown once activity row exists */}
      {activity && (
        <LiveSessionCard
          activity={activity}
          bookingId={booking.id}
          onSessionEnd={load}
        />
      )}
    </div>
  );
}