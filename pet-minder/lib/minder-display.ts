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

export function minderIntroText(serviceDescription: string | null): string {
  const t = serviceDescription?.trim();
  if (t) return t;
  return "This minder has not added a description yet.";
}
