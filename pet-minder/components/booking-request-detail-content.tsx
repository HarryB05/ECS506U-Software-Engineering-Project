"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarRange, Clock, Loader2, PawPrint, Star } from "lucide-react";

import { BookingLifecycleTimeline } from "@/components/booking-lifecycle-timeline";
import { BookingDatePicker } from "@/components/booking-date-picker";
import { PublicReviewList } from "@/components/public-review-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BookingRequestStatusBadge,
  StatusBadge,
} from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import type { BookingRequestDetail, OwnerPetOption } from "@/lib/types/booking";
import type { PublicReviewItem } from "@/lib/reviews-service";
import {
  formatBookingInstant,
  formatRequestSchedule,
  formatSessionRange,
  sessionBadgeStatus,
} from "@/lib/booking-display";
import { createClient } from "@/lib/supabase/client";

function buildRequestTimeline(detail: BookingRequestDetail) {
  const steps: {
    id: string;
    title: string;
    timestamp?: string;
    body?: string;
  }[] = [];

  const name = detail.counterpartyName;

  steps.push({
    id: "sent",
    title: "Request sent",
    timestamp: formatBookingInstant(detail.createdAt),
    body:
      detail.viewerRole === "owner"
        ? `You asked ${name} for: ${formatRequestSchedule(detail)}.`
        : `${name} asked you for: ${formatRequestSchedule(detail)}.`,
  });

  switch (detail.status) {
    case "pending":
      steps.push({
        id: "waiting",
        title:
          detail.viewerRole === "owner"
            ? "Waiting for the minder"
            : "Waiting for your response",
        body:
          detail.viewerRole === "owner"
            ? `${name} has not accepted or declined yet. You can cancel while it is pending.`
            : "Accept to create a confirmed session, or decline if you cannot help.",
      });
      break;
    case "confirmed":
      steps.push({
        id: "confirmed",
        title: "Confirmed",
        timestamp: detail.updatedAt
          ? formatBookingInstant(detail.updatedAt)
          : undefined,
        body:
          "The minder confirmed and a session was created. Open the linked session for cancellation rules and the final time window.",
      });
      break;
    case "declined":
      steps.push({
        id: detail.autoRejectedAt ? "expired" : "declined",
        title: detail.autoRejectedAt ? "Request expired" : "Declined",
        timestamp: detail.updatedAt
          ? formatBookingInstant(detail.updatedAt)
          : undefined,
        body:
          detail.autoRejectedAt
            ? detail.viewerRole === "minder"
              ? "This request expired after 24 hours with no response."
              : "This request was automatically declined after 24 hours with no response. Try another minder or different dates."
            : detail.viewerRole === "minder"
              ? "You declined this request. No session was created."
              : `${name} declined. No session was created. Try another minder or different dates.`,
      });
      break;
    case "cancelled":
      steps.push({
        id: "cancelled",
        title: "Request cancelled",
        timestamp: detail.updatedAt
          ? formatBookingInstant(detail.updatedAt)
          : undefined,
        body:
          "This request was withdrawn before it became a session, or was cancelled while still pending.",
      });
      break;
    default:
      break;
  }

  return steps;
}

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

type BookingMode = "session" | "range";

function toLocalInputParts(isoInstant: string): { date: string; time: string } {
  const d = new Date(isoInstant);
  if (Number.isNaN(d.getTime())) {
    return { date: "", time: "" };
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
  };
}

function parseDateToLocal(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function computeDurationMinutes(
  bookingMode: BookingMode,
  date: string,
  time: string,
  endDate: string,
  endTime: string,
  durationMinutes: number,
): number | null {
  if (!date || !time) return null;
  const start = new Date(`${date}T${time}:00`);
  if (Number.isNaN(start.getTime())) return null;

  if (bookingMode === "session") {
    return durationMinutes > 0 ? durationMinutes : null;
  }

  if (!endDate || !endTime) return null;
  const end = new Date(`${endDate}T${endTime}:00`);
  if (Number.isNaN(end.getTime()) || end <= start) return null;

  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

type BookingRequestDetailContentProps = {
  detail: BookingRequestDetail;
  ownerPets: OwnerPetOption[] | null;
  counterpartyReviews: PublicReviewItem[];
};

export function BookingRequestDetailContent({
  detail,
  ownerPets,
  counterpartyReviews,
}: BookingRequestDetailContentProps) {
  const router = useRouter();

  const isOwnerPending =
    detail.viewerRole === "owner" && detail.status === "pending";
  const initialStart = useMemo(
    () => toLocalInputParts(detail.requestedDatetime),
    [detail.requestedDatetime],
  );
  const initialEnd = useMemo(
    () =>
      detail.requestedEndDatetime
        ? toLocalInputParts(detail.requestedEndDatetime)
        : { date: "", time: "17:00" },
    [detail.requestedEndDatetime],
  );

  const [bookingMode, setBookingMode] = useState<BookingMode>(
    detail.requestedEndDatetime ? "range" : "session",
  );
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(initialStart.date);
  const [rescheduleTime, setRescheduleTime] = useState(initialStart.time || "09:00");
  const [rescheduleEndDate, setRescheduleEndDate] = useState(initialEnd.date);
  const [rescheduleEndTime, setRescheduleEndTime] = useState(initialEnd.time || "17:00");
  const [rescheduleDuration, setRescheduleDuration] = useState(
    detail.durationMinutes,
  );
  const [rescheduleCareInstructions, setRescheduleCareInstructions] = useState(
    detail.careInstructions ?? "",
  );
  const [selectedPetIds, setSelectedPetIds] = useState<Set<string>>(
    () => new Set(detail.requestPetIds),
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minderActionError, setMinderActionError] = useState<string | null>(null);

  const timeline = useMemo(() => buildRequestTimeline(detail), [detail]);

  const minSelectableDate = useMemo(() => new Date(), []);
  const endDateMin = useMemo(() => {
    if (!rescheduleDate) return minSelectableDate;
    return parseDateToLocal(rescheduleDate);
  }, [minSelectableDate, rescheduleDate]);

  async function callRpc(name: string, args: Record<string, string>) {
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { data: rpcData, error: rpcError } = await supabase.rpc(name, args);
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    if (name === "bookings_accept_request" && rpcData != null) {
      router.push(`/dashboard/bookings/session/${String(rpcData)}`);
      router.refresh();
      return;
    }
    if (name === "bookings_reschedule_request") {
      router.refresh();
      setShowRescheduleForm(false);
      return;
    }
    router.refresh();
    router.push("/dashboard/bookings");
  }

  function togglePet(id: string) {
    setSelectedPetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function setMode(next: BookingMode) {
    setBookingMode(next);
    if (next === "range") {
      setRescheduleEndDate((prev) => prev || rescheduleDate);
      setRescheduleEndTime((prev) => prev || "17:00");
    }
  }

  const [showLateRescheduleWarning, setShowLateRescheduleWarning] = useState(false);

  function isWithin48Hours(isoDatetime: string): boolean {
    const ms = Date.parse(isoDatetime);
    if (Number.isNaN(ms)) return false;
    return ms - Date.now() < 48 * 60 * 60 * 1000;
  }

  async function handleRescheduleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isOwnerPending) return;

    setError(null);

    if (!rescheduleDate || !rescheduleTime) {
      setError("Choose when care should start.");
      return;
    }

    // Warn if the original booking is within 48 hours and user hasn't confirmed
    if (isWithin48Hours(detail.requestedDatetime) && !showLateRescheduleWarning) {
      setShowLateRescheduleWarning(true);
      return;
    }
    setShowLateRescheduleWarning(false);

    const startIso = new Date(
      `${rescheduleDate}T${rescheduleTime}:00`,
    ).toISOString();

    if (Number.isNaN(Date.parse(startIso))) {
      setError("That start date or time is not valid.");
      return;
    }

    let endIso: string | null = null;
    let durationForRpc = rescheduleDuration;

    if (bookingMode === "range") {
      if (!rescheduleEndDate || !rescheduleEndTime) {
        setError("Add when care should end.");
        return;
      }
      endIso = new Date(
        `${rescheduleEndDate}T${rescheduleEndTime}:00`,
      ).toISOString();

      if (Number.isNaN(Date.parse(endIso))) {
        setError("That end date or time is not valid.");
        return;
      }
      if (new Date(endIso) <= new Date(startIso)) {
        setError("End must be after the start.");
        return;
      }
      durationForRpc = 60;
    }

    const computedDuration = computeDurationMinutes(
      bookingMode,
      rescheduleDate,
      rescheduleTime,
      rescheduleEndDate,
      rescheduleEndTime,
      rescheduleDuration,
    );

    if (computedDuration == null || computedDuration <= 0) {
      setError("Choose a valid time window.");
      return;
    }

    if (selectedPetIds.size === 0) {
      setError("Choose at least one pet for this booking.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("bookings_reschedule_request", {
      p_request_id: detail.id,
      p_requested_datetime: startIso,
      p_duration_minutes: durationForRpc,
      p_care_instructions: rescheduleCareInstructions.trim() || null,
      p_pet_ids: Array.from(selectedPetIds),
      p_requested_end_datetime: bookingMode === "range" ? endIso : null,
    });
    setBusy(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    router.refresh();
    setShowRescheduleForm(false);
  }

  const showMinderActions =
    detail.viewerRole === "minder" && detail.status === "pending";
  const showOwnerCancel =
    detail.viewerRole === "owner" && detail.status === "pending";
  const counterpartyRating = detail.counterpartyAverageRating;

  async function handleMinderAccept() {
    setMinderActionError(null);
    const requestedStartMs = Date.parse(detail.requestedDatetime);
    if (!Number.isNaN(requestedStartMs) && requestedStartMs <= Date.now()) {
      setMinderActionError(
        "This request cannot be accepted because its start time has already passed.",
      );
      return;
    }

    await callRpc("bookings_accept_request", { p_request_id: detail.id });
  }

  return (
    <div className="max-w-content mx-auto space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ms-2 mb-4 gap-2">
          <Link href="/dashboard/bookings">
            <ArrowLeft className="size-4" />
            All bookings
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-foreground sm:text-3xl">
              Booking request
            </h1>
            <p className="text-muted-foreground mt-1">
              {detail.viewerRole === "minder" && detail.counterpartyUserId ? (
                <Link
                  href={`/dashboard/owners/${detail.counterpartyUserId}`}
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                >
                  {detail.counterpartyName}
                </Link>
              ) : (
                detail.counterpartyName
              )}{" "}
              · {detail.petCount} pet
              {detail.petCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="text-right">
            <BookingRequestStatusBadge status={detail.status} />
            {detail.autoRejectedAt ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Auto-declined after 24 hours with no response.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-danger-500" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="shadow-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Timeline</CardTitle>
          <p className="text-sm text-muted-foreground">
            This is only the <strong className="font-medium text-foreground">request</strong>{" "}
            thread. After acceptance, open the{" "}
            <strong className="font-medium text-foreground">session</strong> for
            cancellation deadlines and the final time window.
          </p>
        </CardHeader>
        <CardContent>
          <BookingLifecycleTimeline steps={timeline} />
        </CardContent>
      </Card>

      {detail.linkedSession ? (
        <Card className="shadow-card border-border">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base font-medium">
                Linked session
              </CardTitle>
              <StatusBadge status={sessionBadgeStatus(detail.linkedSession)} />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatSessionRange(
                detail.linkedSession.startDatetime,
                detail.linkedSession.endDatetime,
              )}
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/dashboard/bookings/session/${detail.linkedSession.id}`}>
                Open session
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {detail.pets && detail.pets.length > 0 ? (
        <Card className="shadow-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PawPrint className="size-4 text-teal-700 dark:text-teal-300" />
              <CardTitle className="text-base font-medium">
                {detail.pets.length === 1 ? "Pet" : "Pets"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {detail.pets.map((pet) => (
                <li key={pet.id} className="text-sm space-y-1.5">
                  <p className="font-medium text-foreground">
                    {pet.name}
                    {pet.petType ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {pet.petType}
                      </span>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {pet.age != null ? (
                      <span>Age: {pet.age} yr{pet.age === 1 ? "" : "s"}</span>
                    ) : null}
                    {pet.sex ? (
                      <span>{pet.sex.charAt(0).toUpperCase() + pet.sex.slice(1)}</span>
                    ) : null}
                    {pet.petSize ? (
                      <span>Size: {pet.petSize.charAt(0).toUpperCase() + pet.petSize.slice(1)}</span>
                    ) : null}
                  </div>
                  {pet.medicalInfo ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Medical info</p>
                      <p className="text-foreground leading-relaxed">{pet.medicalInfo}</p>
                    </div>
                  ) : null}
                  {pet.dietaryRequirements ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Dietary requirements</p>
                      <p className="text-foreground leading-relaxed">{pet.dietaryRequirements}</p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card className="shadow-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {detail.serviceType ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Type of care
              </p>
              <p className="text-foreground">{detail.serviceType}</p>
            </div>
          ) : null}
          <div>
            <p className="text-xs font-medium text-muted-foreground">Schedule</p>
            <p className="text-foreground">{formatRequestSchedule(detail)}</p>
          </div>
          {detail.message ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Message
              </p>
              <p className="text-foreground leading-relaxed">{detail.message}</p>
            </div>
          ) : null}
          {detail.careInstructions ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Care notes
              </p>
              <p className="text-foreground leading-relaxed">
                {detail.careInstructions}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isOwnerPending ? (
        <Card className="shadow-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Reschedule</CardTitle>
            <p className="text-sm text-muted-foreground">
              Update this pending request before the minder confirms.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showRescheduleForm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRescheduleForm(true)}
              >
                Reschedule
              </Button>
            ) : (
              <form className="space-y-6" onSubmit={handleRescheduleSubmit}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setMode("session")}
                    className={`rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150 ${
                      bookingMode === "session"
                        ? "border-teal-600 bg-teal-50 shadow-sm dark:border-teal-500 dark:bg-teal-900/25"
                        : "border-border bg-card hover:border-teal-300/60"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <Clock className="size-4 text-teal-700 dark:text-teal-300" />
                      Single visit
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("range")}
                    className={`rounded-lg border px-4 py-3 text-left text-sm transition-all duration-150 ${
                      bookingMode === "range"
                        ? "border-teal-600 bg-teal-50 shadow-sm dark:border-teal-500 dark:bg-teal-900/25"
                        : "border-border bg-card hover:border-teal-300/60"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <CalendarRange className="size-4 text-teal-700 dark:text-teal-300" />
                      Several days
                    </span>
                  </button>
                </div>

                {ownerPets && ownerPets.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <PawPrint className="size-4 text-teal-700 dark:text-teal-300" />
                      <Label className="text-foreground">Pets included</Label>
                    </div>
                    <ul className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3 dark:bg-secondary/20">
                      {ownerPets.map((pet) => (
                        <li key={pet.id}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-card">
                            <input
                              type="checkbox"
                              checked={selectedPetIds.has(pet.id)}
                              onChange={() => togglePet(pet.id)}
                              className="size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <span>
                              <span className="font-medium text-foreground">{pet.name}</span>
                              {pet.petType ? (
                                <span className="text-muted-foreground"> · {pet.petType}</span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <BookingDatePicker
                    id="reschedule-date"
                    label="Date"
                    value={rescheduleDate}
                    onChange={setRescheduleDate}
                    minDate={minSelectableDate}
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="reschedule-time">Time</Label>
                    <Input
                      id="reschedule-time"
                      type="time"
                      value={rescheduleTime}
                      onChange={(ev) => setRescheduleTime(ev.target.value)}
                      required
                    />
                  </div>
                </div>

                {bookingMode === "session" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="reschedule-duration">Duration</Label>
                    <select
                      id="reschedule-duration"
                      value={String(rescheduleDuration)}
                      onChange={(ev) =>
                        setRescheduleDuration(Number(ev.target.value))
                      }
                      className="border-border bg-background text-foreground h-10 w-full rounded-md border px-3 text-sm shadow-sm"
                    >
                      {DURATION_OPTIONS.map((mins) => (
                        <option key={mins} value={mins}>
                          {mins} minutes
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <BookingDatePicker
                      id="reschedule-end-date"
                      label="End date"
                      value={rescheduleEndDate}
                      onChange={setRescheduleEndDate}
                      minDate={endDateMin}
                    />
                    <div className="space-y-1.5">
                      <Label htmlFor="reschedule-end-time">End time</Label>
                      <Input
                        id="reschedule-end-time"
                        type="time"
                        value={rescheduleEndTime}
                        onChange={(ev) => setRescheduleEndTime(ev.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="reschedule-care">Care notes</Label>
                  <Textarea
                    id="reschedule-care"
                    value={rescheduleCareInstructions}
                    onChange={(ev) => setRescheduleCareInstructions(ev.target.value)}
                    rows={4}
                    placeholder="Medication, feeding, routines and safety notes"
                  />
                </div>

                {showLateRescheduleWarning ? (
                  <div className="rounded-lg border border-warning-500/40 bg-warning-100/60 px-4 py-3 text-sm dark:bg-warning-900/20">
                    <p className="font-medium text-warning-700 dark:text-warning-400">
                      Within 48-hour window
                    </p>
                    <p className="text-warning-600 dark:text-warning-500 mt-1">
                      The original booking is less than 48 hours away. Late
                      changes may incur a deposit penalty agreed with the minder.
                      Submit anyway?
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy}>
                    {busy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving…
                      </>
                    ) : showLateRescheduleWarning ? (
                      "Confirm reschedule"
                    ) : (
                      "Save reschedule"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setShowRescheduleForm(false);
                      setShowLateRescheduleWarning(false);
                    }}
                  >
                    Close
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      {detail.viewerRole === "minder" ? (
        <>
          <Card className="shadow-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Owner rating</CardTitle>
              <p className="text-sm text-muted-foreground">
                From completed booking reviews.
              </p>
            </CardHeader>
            <CardContent>
              {counterpartyRating != null ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-sm font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                  <Star className="size-4" />
                  {counterpartyRating.toFixed(1)}/5.0
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No ratings yet.</p>
              )}
            </CardContent>
          </Card>

          <PublicReviewList
            title="Owner reviews"
            reviews={counterpartyReviews}
          />
        </>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {showMinderActions ? (
          <>
            <Button
              type="button"
              disabled={busy}
              onClick={handleMinderAccept}
            >
              {busy ? "Working…" : "Accept"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() =>
                callRpc("bookings_decline_request", { p_request_id: detail.id })
              }
            >
              Decline
            </Button>
            {minderActionError ? (
              <p className="self-center text-sm text-danger-500" role="alert">
                {minderActionError}
              </p>
            ) : null}
          </>
        ) : null}
        {showOwnerCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              callRpc("bookings_cancel_request", { p_request_id: detail.id })
            }
          >
            {busy ? "Working…" : "Cancel request"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}