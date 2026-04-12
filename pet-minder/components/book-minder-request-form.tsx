"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange, Clock, Loader2, PawPrint, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingDatePicker } from "@/components/booking-date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import {
  estimateBookingCost,
  formatMinderPriceLabel,
} from "@/lib/minder-display";
import type { OwnerPetOption } from "@/lib/types/booking";
import type { MinderAvailabilitySlot } from "@/lib/types/availability";
import { toDisplayTime } from "@/lib/availability-service";

type BookMinderRequestFormProps = {
  minderProfileId: string;
  minderDisplayName: string;
  servicePricing: string | null;
  pets: OwnerPetOption[];
  availabilitySlots?: MinderAvailabilitySlot[];
};

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

const SERVICE_TYPE_OPTIONS = [
  "Dog Walking",
  "Pet Sitting",
  "Drop-in Visit",
  "Day Care",
  "Overnight Care",
  "Grooming",
] as const;

type BookingMode = "session" | "range";

const ISO_DAY_TO_DOW = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/** Returns "monday" … "sunday" for a "YYYY-MM-DD" string, parsed in local time. */
function isoDateToDayOfWeek(isoDate: string): string | null {
  if (!isoDate) return null;
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return ISO_DAY_TO_DOW[new Date(y, m - 1, d).getDay()] ?? null;
}

function todayLocalISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildScheduleSummary(
  bookingMode: BookingMode,
  date: string,
  time: string,
  endDate: string,
  endTime: string,
  durationMinutes: number,
): string {
  if (!date || !time) return "Choose a start date and time below.";
  const start = new Date(`${date}T${time}:00`);
  if (Number.isNaN(start.getTime())) return "Choose a valid start.";

  const startLabel = start.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (bookingMode === "session") {
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const endLabel = end.toLocaleString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${startLabel} → ${endLabel} (${durationMinutes} min)`;
  }

  if (!endDate || !endTime) return `${startLabel} → add your return time below.`;
  const end = new Date(`${endDate}T${endTime}:00`);
  if (Number.isNaN(end.getTime()) || end <= start) {
    return `${startLabel} → end must be after start.`;
  }
  const endLabel = end.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${startLabel} → ${endLabel}`;
}

function computeTotalMinutes(
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

export function BookMinderRequestForm({
  minderProfileId,
  minderDisplayName,
  servicePricing,
  pets,
  availabilitySlots = [],
}: BookMinderRequestFormProps) {
  const router = useRouter();
  const minSelectableIso = useMemo(() => todayLocalISODate(), []);

  const earliestSelectableDate = useMemo(() => {
    const [y, m, d] = minSelectableIso.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [minSelectableIso]);

  const [bookingMode, setBookingMode] = useState<BookingMode>("session");
  const [selectedPetIds, setSelectedPetIds] = useState<Set<string>>(() => {
    if (pets.length === 1) return new Set([pets[0]!.id]);
    return new Set();
  });
  const [date, setDate] = useState(minSelectableIso);

  const endDateMinimum = useMemo(() => {
    if (!date) return earliestSelectableDate;
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [date, earliestSelectableDate]);
  const [time, setTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("17:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [serviceType, setServiceType] = useState<string>("Pet Sitting");
  const [message, setMessage] = useState("");
  const [careInstructions, setCareInstructions] = useState("");
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pets.length === 1) {
      setSelectedPetIds(new Set([pets[0]!.id]));
    }
  }, [pets]);

  useEffect(() => {
    if (bookingMode === "range" && date) {
      setEndDate((prev) => (prev && prev >= date ? prev : date));
    }
  }, [bookingMode, date]);

  function setMode(next: BookingMode) {
    setBookingMode(next);
    setError(null);
    if (next === "range" && date) {
      setEndDate((ed) => (ed && ed >= date ? ed : date));
      setEndTime((et) => et || "17:00");
    }
  }

  function togglePet(id: string) {
    setSelectedPetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const scheduleSummary = useMemo(
    () =>
      buildScheduleSummary(
        bookingMode,
        date,
        time,
        endDate,
        endTime,
        durationMinutes,
      ),
    [bookingMode, date, time, endDate, endTime, durationMinutes],
  );

  const totalMinutes = useMemo(
    () =>
      computeTotalMinutes(
        bookingMode,
        date,
        time,
        endDate,
        endTime,
        durationMinutes,
      ),
    [bookingMode, date, time, endDate, endTime, durationMinutes],
  );

  const costEstimate = useMemo(() => {
    if (totalMinutes === null) return null;
    return estimateBookingCost(servicePricing, totalMinutes);
  }, [servicePricing, totalMinutes]);

  const rateLabel = useMemo(
    () => formatMinderPriceLabel(servicePricing),
    [servicePricing],
  );

  const dayOfWeek = useMemo(() => isoDateToDayOfWeek(date), [date]);

  const slotsForSelectedDay = useMemo(() => {
    if (!dayOfWeek || availabilitySlots.length === 0) return [];
    return availabilitySlots.filter((s) => s.day_of_week === dayOfWeek);
  }, [availabilitySlots, dayOfWeek]);

  const selectedPetNames = useMemo(() => {
    const names = pets
      .filter((p) => selectedPetIds.has(p.id))
      .map((p) => p.name);
    if (names.length === 0) return "No pets selected yet";
    return names.join(", ");
  }, [pets, selectedPetIds]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedPetIds.size === 0) {
      setError("Choose at least one pet for this booking.");
      return;
    }

    if (!date || !time) {
      setError("Choose when care should start.");
      return;
    }

    const startLocal = `${date}T${time}:00`;
    const requestedDatetime = new Date(startLocal).toISOString();

    if (Number.isNaN(Date.parse(requestedDatetime))) {
      setError("That start date or time is not valid.");
      return;
    }

    if (new Date(requestedDatetime) <= new Date()) {
      setError("Start time must be in the future.");
      return;
    }

    let requestedEndDatetime: string | null = null;
    let durationForRpc = durationMinutes;

    if (bookingMode === "range") {
      if (!endDate || !endTime) {
        setError("Add when care should end (for example when you are home again).");
        return;
      }
      const endLocal = `${endDate}T${endTime}:00`;
      const endIso = new Date(endLocal).toISOString();
      if (Number.isNaN(Date.parse(endIso))) {
        setError("That end date or time is not valid.");
        return;
      }
      if (new Date(endIso) <= new Date(requestedDatetime)) {
        setError("End must be after the start.");
        return;
      }
      requestedEndDatetime = endIso;
      durationForRpc = 60;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc(
      "bookings_create_request",
      {
        p_minder_profile_id: minderProfileId,
        p_requested_datetime: requestedDatetime,
        p_duration_minutes: durationForRpc,
        p_message: message.trim() || null,
        p_care_instructions: careInstructions.trim() || null,
        p_pet_ids: Array.from(selectedPetIds),
        p_requested_end_datetime: requestedEndDatetime,
        p_service_type: serviceType,
      },
    );

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Request could not be created. Please try again.");
      setLoading(false);
      return;
    }

    router.push("/dashboard/bookings");
    router.refresh();
  }

  if (pets.length === 0) {
    return (
      <Card className="shadow-card border-border">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Add a pet first</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You need at least one pet profile before you can request care with{" "}
            {minderDisplayName}.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_min(320px,36%)] lg:items-start lg:gap-8">
      <Card className="order-2 shadow-card border-border lg:order-1">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-lg font-medium">
            When and for whom?
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            You can change anything before you send. The minder confirms later.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="booking-service-type" className="text-foreground">
                Type of care
              </Label>
              <select
                id="booking-service-type"
                value={serviceType}
                onChange={(ev) => setServiceType(ev.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {SERVICE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <Label className="text-foreground">Booking type</Label>
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
                  <span className="mt-1 block text-muted-foreground">
                    Walk, drop-in, or a fixed-length session
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
                  <span className="mt-1 block text-muted-foreground">
                    Holidays or care across multiple days
                  </span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <PawPrint className="size-4 text-teal-700 dark:text-teal-300" />
                <Label className="text-foreground">Pets included</Label>
              </div>
              <ul className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3 dark:bg-secondary/20">
                {pets.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-card">
                      <input
                        type="checkbox"
                        checked={selectedPetIds.has(p.id)}
                        onChange={() => togglePet(p.id)}
                        className="size-4 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      <span>
                        <span className="font-medium text-foreground">
                          {p.name}
                        </span>
                        {p.petType ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {p.petType}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4 border-t border-border pt-6">
              <p className="text-sm font-medium text-foreground">Start</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <BookingDatePicker
                  id="booking-date"
                  label="Date"
                  value={date}
                  onChange={setDate}
                  minDate={earliestSelectableDate}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="booking-time">Time</Label>
                  <Input
                    id="booking-time"
                    type="time"
                    value={time}
                    onChange={(ev) => setTime(ev.target.value)}
                    required
                  />
                </div>
              </div>

              {availabilitySlots.length > 0 && (
                <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Available times
                    {dayOfWeek ? ` on ${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}` : ""}
                  </p>
                  {slotsForSelectedDay.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {slotsForSelectedDay.map((slot) => {
                        const slotStart = toDisplayTime(slot.start_time);
                        const slotEnd = toDisplayTime(slot.end_time);
                        const isSelected = time === slotStart;
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            onClick={() => {
                              setTime(slotStart);
                              if (bookingMode === "range") {
                                setEndDate(date);
                                setEndTime(slotEnd);
                              }
                            }}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 tabular-nums ${
                              isSelected
                                ? "border-teal-600 bg-teal-50 text-teal-700 shadow-sm dark:border-teal-500 dark:bg-teal-900/25 dark:text-teal-300"
                                : "border-border bg-card text-foreground hover:border-teal-300/60 hover:bg-teal-50/50 dark:hover:bg-teal-900/10"
                            }`}
                          >
                            {slotStart}–{slotEnd}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {minderDisplayName} has no set hours for this day. You can
                      still enter a time above — they will confirm availability.
                    </p>
                  )}
                </div>
              )}
            </div>

            {bookingMode === "range" ? (
              <div className="space-y-4 border-t border-border pt-6">
                <div>
                  <p className="text-sm font-medium text-foreground">End</p>
                  <p className="text-sm text-muted-foreground">
                    When you are back or when this period of care should finish.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <BookingDatePicker
                    id="booking-end-date"
                    label="Date"
                    value={endDate}
                    onChange={setEndDate}
                    minDate={endDateMinimum}
                    placeholder="Return date"
                  />
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-end-time">Time</Label>
                    <Input
                      id="booking-end-time"
                      type="time"
                      value={endTime}
                      onChange={(ev) => setEndTime(ev.target.value)}
                      required={bookingMode === "range"}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 border-t border-border pt-6">
                <Label htmlFor="booking-duration">How long?</Label>
                <select
                  id="booking-duration"
                  value={durationMinutes}
                  onChange={(ev) =>
                    setDurationMinutes(Number(ev.target.value))
                  }
                  className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {DURATION_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="border-t border-border pt-6">
              {!showOptionalDetails ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto px-0 text-sm text-primary hover:text-primary"
                  onClick={() => setShowOptionalDetails(true)}
                >
                  Add a message or care notes (optional)
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      Optional details
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-muted-foreground"
                      onClick={() => {
                        setShowOptionalDetails(false);
                        setMessage("");
                        setCareInstructions("");
                      }}
                    >
                      Hide
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-message">Message</Label>
                    <textarea
                      id="booking-message"
                      value={message}
                      onChange={(ev) => setMessage(ev.target.value)}
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Introduce yourself or ask something"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="booking-care">Care instructions</Label>
                    <textarea
                      id="booking-care"
                      value={careInstructions}
                      onChange={(ev) => setCareInstructions(ev.target.value)}
                      rows={4}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Medication, feeding, behaviour"
                    />
                  </div>
                </div>
              )}
            </div>

            {error ? (
              <p className="text-sm text-danger-500" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
              <Button asChild type="button" variant="outline">
                <Link href={`/dashboard/minders/${minderProfileId}`}>
                  Cancel
                </Link>
              </Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="size-4" aria-hidden />
                    Send request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <aside className="order-1 lg:order-2 lg:sticky lg:top-24">
        <Card className="overflow-hidden border border-primary/45 bg-card shadow-sm ring-1 ring-inset ring-primary/10 dark:border-primary/50 dark:ring-primary/15">
          <CardHeader className="space-y-1 border-b border-border bg-primary/[0.04] pb-4 dark:bg-primary/[0.07]">
            <CardTitle className="text-base font-semibold tracking-tight text-foreground">
              Summary
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              With {minderDisplayName}
            </p>
          </CardHeader>
          <CardContent className="space-y-0 px-6 pb-6 pt-0 text-sm">
            <div className="space-y-1 border-b border-border py-4">
              <p className="text-xs font-medium text-muted-foreground">
                Pets
              </p>
              <p className="text-foreground leading-relaxed">{selectedPetNames}</p>
            </div>
            <div className="space-y-1 border-b border-border py-4">
              <p className="text-xs font-medium text-muted-foreground">
                Schedule
              </p>
              <p className="text-foreground leading-relaxed">{scheduleSummary}</p>
            </div>
            <div className="space-y-1.5 border-b border-border py-4">
              <p className="text-xs font-medium text-muted-foreground">
                Estimated cost
              </p>
              {costEstimate ? (
                <>
                  <p className="text-sm font-medium leading-relaxed text-foreground">
                    {costEstimate.line}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {costEstimate.detail} Indicative only: agree the final price
                    with {minderDisplayName}. More than one pet may change what
                    they charge.
                  </p>
                </>
              ) : (
                <p className="leading-relaxed text-foreground">
                  {totalMinutes === null
                    ? "Finish your dates above to see an estimate."
                    : `We could not work out a figure from their listing (${rateLabel}).`}
                </p>
              )}
            </div>
            <p className="pt-4 text-xs leading-relaxed text-muted-foreground">
              Nothing is confirmed until {minderDisplayName} accepts. You can
              cancel a pending request from your bookings page.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
