/** Controlled input value: DB may return numeric `service_pricing`. */
export function servicePricingToInputString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value);
}

/** Trimmed string or null for updates (empty clears the field). */
export function normalizeServicePricing(value: unknown): string | null {
  const s = servicePricingToInputString(value).trim();
  return s === "" ? null : s;
}

/** Price sort: extract first number from a pricing string, or +Infinity if none. */
export function parsePriceSortValue(servicePricing: unknown): number {
  const raw = servicePricingToInputString(servicePricing).trim();
  if (!raw) return Number.POSITIVE_INFINITY;
  const match = raw.match(/[\d.]+/);
  if (!match) return Number.POSITIVE_INFINITY;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

export function formatMinderPriceLabel(servicePricing: unknown): string {
  const raw = servicePricingToInputString(servicePricing).trim();
  if (!raw) return "Rate on request";
  if (/[£$€]/u.test(raw)) return `From ${raw}`;
  return `From £${raw}/hour`;
}

export type ParsedServiceRate =
  | { unit: "hour"; pounds: number }
  | { unit: "day"; pounds: number };

/**
 * Best-effort parse of free-text `service_pricing` for estimates only.
 * Prefers explicit /day or /hour; otherwise treats the first number as £/hour.
 */
export function parseServiceRate(servicePricing: unknown): ParsedServiceRate | null {
  const raw = servicePricingToInputString(servicePricing).trim();
  if (!raw) return null;

  const dayMatch = raw.match(
    /£?\s*(\d+(?:\.\d+)?)\s*(?:\/|\s)*(?:day|days|daily)\b/i,
  );
  if (dayMatch) {
    const pounds = parseFloat(dayMatch[1]);
    return Number.isFinite(pounds) ? { unit: "day", pounds } : null;
  }

  const hourMatch = raw.match(
    /£?\s*(\d+(?:\.\d+)?)\s*(?:\/|\s)*(?:hour|hours|hr|h)\b/i,
  );
  if (hourMatch) {
    const pounds = parseFloat(hourMatch[1]);
    return Number.isFinite(pounds) ? { unit: "hour", pounds } : null;
  }

  const first = raw.match(/(\d+(?:\.\d+)?)/);
  if (!first) return null;
  const pounds = parseFloat(first[0]);
  return Number.isFinite(pounds) ? { unit: "hour", pounds } : null;
}

export type BookingCostEstimate = {
  /** Rounded for display */
  poundsRounded: number;
  /** Short line for the summary card */
  line: string;
  /** Longer hint under the figure */
  detail: string;
};

const MINUTES_PER_DAY = 24 * 60;
/** For multi-day sits, assume this many billable hours per calendar day at their hourly rate. */
const HOURS_PER_DAY_HEURISTIC = 8;

/**
 * Indicative cost from listing text and booking length (minutes).
 * Not legal or payment advice; final price is always agreed with the minder.
 */
export function estimateBookingCost(
  servicePricing: unknown,
  totalMinutes: number,
): BookingCostEstimate | null {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return null;

  const parsed = parseServiceRate(servicePricing);
  if (!parsed) return null;

  const calendarDays = Math.max(1, Math.ceil(totalMinutes / MINUTES_PER_DAY));
  const hoursExact = totalMinutes / 60;

  if (parsed.unit === "day") {
    const total = parsed.pounds * calendarDays;
    const poundsRounded = Math.round(total);
    return {
      poundsRounded,
      line: `About £${poundsRounded}`,
      detail: `Based on roughly £${parsed.pounds}/day across ${calendarDays} calendar day(s).`,
    };
  }

  if (calendarDays >= 2) {
    const total = parsed.pounds * HOURS_PER_DAY_HEURISTIC * calendarDays;
    const poundsRounded = Math.round(total);
    return {
      poundsRounded,
      line: `About £${poundsRounded}`,
      detail: `Long bookings use an indicative ${HOURS_PER_DAY_HEURISTIC} hours per day at their £${parsed.pounds}/hr rate (${calendarDays} day(s)).`,
    };
  }

  const total = parsed.pounds * hoursExact;
  const poundsRounded = Math.round(total);
  const hoursLabel =
    hoursExact < 10 && hoursExact % 1 !== 0
      ? hoursExact.toFixed(1)
      : String(Math.round(hoursExact * 10) / 10);
  return {
    poundsRounded,
    line: `About £${poundsRounded}`,
    detail: `Based on £${parsed.pounds}/hr × ${hoursLabel} hours.`,
  };
}

export function minderIntroText(serviceDescription: string | null): string {
  const t = serviceDescription?.trim();
  if (t) return t;
  return "This minder has not added a description yet.";
}
