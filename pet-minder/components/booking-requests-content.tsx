"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  listBookingRequestsForMinder,
  acceptBookingRequest,
  declineBookingRequest,
  hasConflict,
} from "@/lib/booking-minder-services";
import type { BookingRequest } from "@/lib/types/booking";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardRole } from "@/components/dashboard-role-context";
import {
  CalendarCheck,
  Clock,
  PawPrint,
  NotebookPen,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

function RequestCard({
  request,
  onAccept,
  onDecline,
  acting,
  hasConflictFlag,
}: {
  request: BookingRequest;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  acting: string | null;
  hasConflictFlag: boolean;
}) {
  const pets = request.booking_pets?.map((bp) => bp.pet_profiles) ?? [];
  const isActing = acting === request.id;

  return (
    <div>
      {hasConflictFlag && (
        <div className="flex items-start gap-2 rounded-lg bg-warning-100 text-warning-500 px-4 py-3 text-sm mb-2">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <span>
            You already have a booking at this time. Decline this request or
            return to your requests list.
          </span>
        </div>
      )}

      <Card className="shadow-card hover:shadow-card-hover hover:border-teal-300 transition-all duration-150">
        <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
          <div>
            <p className="text-xl font-medium text-foreground">
              {request.owner?.full_name ?? "Pet Owner"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Booking request
            </p>
          </div>
          <StatusBadge status="pending" />
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarCheck className="size-4" />
              {format(new Date(request.requested_date_time), "EEE d MMM yyyy")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" />
              {format(new Date(request.requested_date_time), "HH:mm")}
              {" · "}
              {request.duration_minutes} min
            </span>
          </div>

          {pets.length > 0 && (
            <div className="rounded-lg bg-teal-50 dark:bg-teal-900/30 p-3 space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                Pets
              </p>
              {pets.map((pet) => (
                <div key={pet.id} className="flex items-center gap-2">
                  <PawPrint className="size-4 text-teal-700 dark:text-teal-300 shrink-0" />
                  <span className="text-base text-foreground">
                    {pet.name}
                    <span className="text-muted-foreground">
                      {" "}
                      · {pet.pet_type}
                    </span>
                  </span>
                </div>
              ))}
              {pets.some((p) => p.medical_info) && (
                <p className="text-sm text-warning-500 pt-1">
                  One or more pets have medical notes — review before accepting.
                </p>
              )}
            </div>
          )}

          {request.care_instructions && (
            <div className="rounded-lg border border-border p-3">
              <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
                <NotebookPen className="size-4" />
                Care instructions
              </p>
              <p className="text-base text-foreground">
                {request.care_instructions}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              className="flex-1"
              onClick={() => onAccept(request.id)}
              disabled={isActing}
            >
              {isActing ? "Accepting…" : "Accept"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onDecline(request.id)}
              disabled={isActing}
            >
              {isActing ? "Declining…" : "Decline"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function BookingRequestsContent() {
  const { activeRole } = useDashboardRole();
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [conflictId, setConflictId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const getMinderId = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from("minder_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    return profile?.id ?? null;
  }, []);

  const load = useCallback(async () => {
    const minderId = await getMinderId();
    if (!minderId) return;
    const supabase = createClient();
    const { data } = await listBookingRequestsForMinder(supabase, minderId);
    setRequests(data);
    setLoading(false);
  }, [getMinderId]);

  useEffect(() => {
    load();
  }, [load]);

  if (activeRole !== "minder") {
    return (
      <div className="max-w-content mx-auto text-center">
        <h1 className="font-display text-2xl text-foreground mb-2 sm:text-3xl">
          Requests
        </h1>
        <p className="text-muted-foreground">
          This page is only available to minders. Switch to your minder role
          to access booking requests.
        </p>
      </div>
    );
  }

  const handleAccept = async (requestId: string) => {
    const request = requests.find((r) => r.id === requestId);
    if (!request) return;

    setActing(requestId);
    setConflictId(null);

    const minderId = await getMinderId();
    if (!minderId) return;

    const supabase = createClient();

    const conflictFound = await hasConflict(
      supabase,
      minderId,
      request.requested_date_time,
      request.duration_minutes,
    );

    if (conflictFound) {
      setConflictId(requestId);
      setActing(null);
      return;
    }

    const { error } = await acceptBookingRequest(supabase, requestId, minderId);
    setActing(null);

    if (error) {
      showToast("error", "Could not accept booking. Please try again.");
    } else {
      showToast("success", "Booking confirmed. The owner has been notified.");
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
  };

  const handleDecline = async (requestId: string) => {
    setActing(requestId);
    const minderId = await getMinderId();
    if (!minderId) return;
    const supabase = createClient();
    const { error } = await declineBookingRequest(
      supabase,
      requestId,
      minderId,
    );
    setActing(null);

    if (error) {
      showToast("error", "Could not decline booking. Please try again.");
    } else {
      showToast("success", "Request declined.");
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
  };

  return (
    <div className="max-w-content mx-auto">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm shadow-card ${
            toast.type === "success"
              ? "bg-success-100 text-success-500"
              : "bg-danger-100 text-danger-500"
          }`}
        >
          {toast.message}
        </div>
      )}

      <h1 className="font-display text-2xl text-foreground mb-1 sm:text-3xl">
        Booking requests
      </h1>
      <p className="text-muted-foreground mb-8">
        Review and respond to incoming requests from pet owners.
      </p>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="shadow-card">
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="p-6 text-center sm:p-12">
            <div className="mx-auto mb-4 inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
              <CalendarCheck className="size-6 text-teal-700 dark:text-teal-300" />
            </div>
            <p className="text-muted-foreground">
              No pending requests. When an owner books you, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onAccept={handleAccept}
              onDecline={handleDecline}
              acting={acting}
              hasConflictFlag={conflictId === request.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}