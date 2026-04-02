/** Price sort: extract first number from a pricing string, or +Infinity if none. */
export function parsePriceSortValue(servicePricing: string | null): number {
  if (!servicePricing?.trim()) return Number.POSITIVE_INFINITY;
  const match = servicePricing.match(/[\d.]+/);
  if (!match) return Number.POSITIVE_INFINITY;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

export function formatMinderPriceLabel(servicePricing: string | null): string {
  if (!servicePricing?.trim()) return "Rate on request";
  const t = servicePricing.trim();
  if (/[£$€]/u.test(t)) return `From ${t}`;
  return `From £${t}/hour`;
}

export function minderIntroText(serviceDescription: string | null): string {
  const t = serviceDescription?.trim();
  if (t) return t;
  return "This minder has not added a description yet.";
}
