import type { BookingRequestListItem } from "@/lib/types/booking";

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatWhen(iso: string): string {
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return iso;
  return dateFmt.format(new Date(d));
}

/** Human-readable schedule for a booking request (single session or date range). */
export function formatRequestSchedule(item: BookingRequestListItem): string {
  if (item.requestedEndDatetime) {
    return `${formatWhen(item.requestedDatetime)} – ${formatWhen(item.requestedEndDatetime)}`;
  }
  return `${formatWhen(item.requestedDatetime)} · ${item.durationMinutes} minutes`;
}
