import type { BookingListItem, BookingRequestListItem } from "@/lib/types/booking";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateOnlyFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatWhen(iso: string): string {
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return iso;
  return dateFmt.format(new Date(d));
}

/** Full date and time for timelines and detail headers. */
export function formatBookingInstant(iso: string): string {
  return formatWhen(iso);
}

/** Page title: "Booking with {name}" / multiple pets with natural English list. */
export function formatBookingWithPetsTitle(
  petNames: string[] | null | undefined,
  petCount: number | null | undefined,
): string {
  const names = Array.isArray(petNames) ? petNames : [];
  const count =
    typeof petCount === "number" && Number.isFinite(petCount) ? petCount : 0;

  if (names.length === 1) {
    return `Booking with ${names[0]}`;
  }
  if (names.length === 2) {
    return `Booking with ${names[0]} and ${names[1]}`;
  }
  if (names.length > 2) {
    const rest = names.slice(0, -1).join(", ");
    const last = names[names.length - 1];
    return `Booking with ${rest}, and ${last}`;
  }
  if (count > 0) {
    return "Booking with your pets";
  }
  return "Booking";
}

/** Maps a booking row to the session status badge variant. */
export function sessionBadgeStatus(
  item: Pick<BookingListItem, "status" | "cancelledAt">,
): "pending" | "confirmed" | "completed" | "cancelled" {
  if (item.status === "cancelled" || item.cancelledAt) return "cancelled";
  if (item.status === "completed") return "completed";
  if (item.status === "confirmed") return "confirmed";
  return "pending";
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Compact session window: same calendar day uses one date + time range;
 * multi-day uses date+time → date+time with less repetition where possible.
 */
export function formatSessionRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startIso} – ${endIso}`;
  }
  if (sameCalendarDay(start, end)) {
    return `${dateOnlyFmt.format(start)}, ${timeFmt.format(start)}–${timeFmt.format(end)}`;
  }
  return `${formatWhen(startIso)} → ${formatWhen(endIso)}`;
}

/** Human-readable schedule for a booking request (single session or date range). */
export function formatRequestSchedule(item: BookingRequestListItem): string {
  if (item.requestedEndDatetime) {
    return formatSessionRange(item.requestedDatetime, item.requestedEndDatetime);
  }
  return `${formatWhen(item.requestedDatetime)} · ${item.durationMinutes} minutes`;
}
