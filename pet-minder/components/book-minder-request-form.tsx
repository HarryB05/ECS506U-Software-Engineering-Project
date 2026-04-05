"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { OwnerPetOption } from "@/lib/types/booking";

type BookMinderRequestFormProps = {
  minderProfileId: string;
  minderDisplayName: string;
  pets: OwnerPetOption[];
};

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

type BookingMode = "session" | "range";

export function BookMinderRequestForm({
  minderProfileId,
  minderDisplayName,
  pets,
}: BookMinderRequestFormProps) {
  const router = useRouter();
  const [bookingMode, setBookingMode] = useState<BookingMode>("session");
  const [selectedPetIds, setSelectedPetIds] = useState<Set<string>>(new Set());
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [message, setMessage] = useState("");
  const [careInstructions, setCareInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function togglePet(id: string) {
    setSelectedPetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectedPetIds.size === 0) {
      setError("Select at least one pet.");
      return;
    }

    if (!date || !time) {
      setError("Choose a start date and time.");
      return;
    }

    const startLocal = `${date}T${time}:00`;
    const requestedDatetime = new Date(startLocal).toISOString();

    if (Number.isNaN(Date.parse(requestedDatetime))) {
      setError("Invalid start date or time.");
      return;
    }

    let requestedEndDatetime: string | null = null;
    let durationForRpc = durationMinutes;

    if (bookingMode === "range") {
      if (!endDate || !endTime) {
        setError("Choose an end date and time for your trip.");
        return;
      }
      const endLocal = `${endDate}T${endTime}:00`;
      const endIso = new Date(endLocal).toISOString();
      if (Number.isNaN(Date.parse(endIso))) {
        setError("Invalid end date or time.");
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
      },
    );

    if (rpcError) {
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setError("Request could not be created.");
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
            You need at least one pet profile to request a booking with{" "}
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
    <Card className="shadow-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-medium">
          Request care with {minderDisplayName}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Book a single visit or a date range (for example a holiday). The minder
          will accept or decline your request.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-foreground mb-2">
              Type of booking
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="booking-mode"
                  checked={bookingMode === "session"}
                  onChange={() => setBookingMode("session")}
                  className="size-4 border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
                />
                Single session
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="booking-mode"
                  checked={bookingMode === "range"}
                  onChange={() => setBookingMode("range")}
                  className="size-4 border-border text-primary focus-visible:ring-2 focus-visible:ring-ring"
                />
                Date range (e.g. holiday)
              </label>
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label>Pets covered</Label>
            <ul className="space-y-2 rounded-lg border border-border bg-card p-3">
              {pets.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-3 text-sm">
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

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Start</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="booking-date">Date</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={date}
                  onChange={(ev) => setDate(ev.target.value)}
                  required
                />
              </div>
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
          </div>

          {bookingMode === "range" ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">End</p>
              <p className="text-xs text-muted-foreground">
                When you return or when care should finish (can be on a later
                day).
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="booking-end-date">Date</Label>
                  <Input
                    id="booking-end-date"
                    type="date"
                    value={endDate}
                    onChange={(ev) => setEndDate(ev.target.value)}
                    required={bookingMode === "range"}
                  />
                </div>
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
            <div className="space-y-1.5">
              <Label htmlFor="booking-duration">Duration</Label>
              <select
                id="booking-duration"
                value={durationMinutes}
                onChange={(ev) => setDurationMinutes(Number(ev.target.value))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {DURATION_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="booking-message">Message to the minder (optional)</Label>
            <textarea
              id="booking-message"
              value={message}
              onChange={(ev) => setMessage(ev.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Introduce yourself or ask a question"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="booking-care">Care instructions (optional)</Label>
            <textarea
              id="booking-care"
              value={careInstructions}
              onChange={(ev) => setCareInstructions(ev.target.value)}
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Medication, feeding, behaviour notes"
            />
          </div>

          {error ? (
            <p className="text-sm text-danger-500" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button asChild type="button" variant="outline">
              <Link href={`/dashboard/minders/${minderProfileId}`}>
                Cancel
              </Link>
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send request"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
