export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const DAYS_OF_WEEK: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_LABEL: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/** Matches `minder_availability` in the database. */
export type MinderAvailabilitySlot = {
  id: string;
  minder_id: string;
  day_of_week: DayOfWeek;
  /** Postgres `time` — stored as "HH:MM:SS", display as "HH:MM". */
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
};
