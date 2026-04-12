import {
  DAYS_OF_WEEK,
  DAY_LABEL,
  type MinderAvailabilitySlot,
} from "@/lib/types/availability";
import { toDisplayTime } from "@/lib/availability-service";

type Props = {
  slots: MinderAvailabilitySlot[];
};

/**
 * Read-only weekly availability grid shown on the public minder profile page.
 */
export function MinderAvailabilityDisplay({ slots }: Props) {
  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This minder has not set specific availability hours. Contact them to
        discuss timing.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {DAYS_OF_WEEK.map((day) => {
        const daySlots = slots.filter((s) => s.day_of_week === day);
        return (
          <div key={day} className="flex items-start gap-4 py-2.5 first:pt-0 last:pb-0">
            <span
              className={`w-24 shrink-0 text-sm ${
                daySlots.length > 0
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {DAY_LABEL[day]}
            </span>
            {daySlots.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {daySlots.map((slot) => (
                  <li
                    key={slot.id}
                    className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 tabular-nums"
                  >
                    {toDisplayTime(slot.start_time)}–{toDisplayTime(slot.end_time)}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-muted-foreground">Unavailable</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
