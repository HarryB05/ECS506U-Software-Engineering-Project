export type BookingLeadTimeRule = {
  minimumNoticeHours: number;
  warningNoticeHours: number | null;
  hardBlock: boolean;
  label: string;
};

const DEFAULT_RULE: BookingLeadTimeRule = {
  minimumNoticeHours: 0,
  warningNoticeHours: null,
  hardBlock: true,
  label: "General care",
};

export const BOOKING_LEAD_TIME_RULES: Record<string, BookingLeadTimeRule> = {
  walking: {
    minimumNoticeHours: 3,
    warningNoticeHours: null,
    hardBlock: true,
    label: "Walking",
  },
  dogwalking: {
    minimumNoticeHours: 3,
    warningNoticeHours: null,
    hardBlock: true,
    label: "Walking",
  },
  petsitting: {
    minimumNoticeHours: 0,
    warningNoticeHours: 48,
    hardBlock: false,
    label: "Pet sitting",
  },
  dropinvisit: {
    minimumNoticeHours: 2,
    warningNoticeHours: null,
    hardBlock: true,
    label: "Drop-in visit",
  },
  daycare: {
    minimumNoticeHours: 24,
    warningNoticeHours: null,
    hardBlock: true,
    label: "Daycare",
  },
};

export type BookingLeadTimeAssessment = {
  rule: BookingLeadTimeRule;
  hoursUntilStart: number;
  isBelowMinimum: boolean;
  showWarning: boolean;
  missingWholeHours: number;
};

export function normalizeServiceTypeKey(serviceType: string): string {
  return serviceType.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getBookingLeadTimeRule(serviceType: string): BookingLeadTimeRule {
  const key = normalizeServiceTypeKey(serviceType);
  return BOOKING_LEAD_TIME_RULES[key] ?? DEFAULT_RULE;
}

export function assessBookingLeadTime(
  serviceType: string,
  requestedDatetimeIso: string,
  now: Date = new Date(),
): BookingLeadTimeAssessment | null {
  const startMs = Date.parse(requestedDatetimeIso);
  const nowMs = now.getTime();
  if (Number.isNaN(startMs)) return null;

  const hoursUntilStart = (startMs - nowMs) / 3_600_000;
  const rule = getBookingLeadTimeRule(serviceType);
  const isBelowMinimum =
    rule.hardBlock && hoursUntilStart < rule.minimumNoticeHours;
  const showWarning =
    rule.warningNoticeHours !== null &&
    hoursUntilStart < rule.warningNoticeHours &&
    hoursUntilStart >= rule.minimumNoticeHours;

  return {
    rule,
    hoursUntilStart,
    isBelowMinimum,
    showWarning,
    missingWholeHours: Math.max(
      0,
      Math.ceil(rule.minimumNoticeHours - hoursUntilStart),
    ),
  };
}