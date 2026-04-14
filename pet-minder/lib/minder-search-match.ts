import type { PublicMinderListItem } from "@/lib/types/minder-profile";
import type { PetSize } from "@/lib/types/pet-profile";
import type { DayOfWeek } from "@/lib/types/availability";

/**
 * Case-insensitive overlap check so e.g. filter "dogs" matches stored "dog"
 * and vice versa.
 */
export function stringsLooselyMatch(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || !y) return false;
  return x.includes(y) || y.includes(x);
}

/** Broad match for the "Small pets" quick filter and similar wording. */
const SMALL_PET_PATTERN =
  /\b(rabbit|bunny|bunnies|hamster|hamsters|guinea\s*pig|guinea\s*pigs|gerbil|gerbils|mouse|mice|rat|rats|ferret|ferrets|chinchilla|hedgehog)\b/i;

/** Broad match for the "Reptile" quick filter. */
const REPTILE_PATTERN =
  /\b(reptile|reptiles|gecko|geckos|lizard|lizards|snake|snakes|bearded\s*dragon|iguana|chameleon|turtle|turtles|tortoise|tortoises)\b/i;

export function matchesSmallPetsCategory(
  supportedTypes: string[],
  serviceDescription: string | null,
): boolean {
  const desc = serviceDescription ?? "";
  if (SMALL_PET_PATTERN.test(desc)) return true;
  return supportedTypes.some((t) => SMALL_PET_PATTERN.test(t));
}

export function matchesReptileCategory(
  supportedTypes: string[],
  serviceDescription: string | null,
): boolean {
  const desc = serviceDescription ?? "";
  if (REPTILE_PATTERN.test(desc)) return true;
  return supportedTypes.some((t) => REPTILE_PATTERN.test(t));
}

/**
 * Pet type field or quick chip: minder matches if any supported type overlaps
 * the filter, or (for "small pets") if profile looks like small-animal care.
 */
export function minderMatchesPetTypeFilter(
  supportedTypes: string[],
  filter: string,
  serviceDescription: string | null,
): boolean {
  const f = filter.trim().toLowerCase();
  if (!f) return true;
  if (f === "small pets" || f === "small pet") {
    return matchesSmallPetsCategory(supportedTypes, serviceDescription);
  }
  if (f === "reptile" || f === "reptiles") {
    return matchesReptileCategory(supportedTypes, serviceDescription);
  }
  return supportedTypes.some((t) => stringsLooselyMatch(t, f));
}

export function minderMatchesPetSizeFilter(
  supportedSizes: PetSize[],
  filter: string,
): boolean {
  const f = filter.trim().toLowerCase();
  if (!f) return true;
  if (supportedSizes.length === 0) return true;
  return supportedSizes.some((size) => size === f);
}

function haystackMatchesToken(haystack: string, token: string): boolean {
  const t = token.trim().toLowerCase();
  if (!t) return true;
  if (haystack.includes(t)) return true;
  const words = haystack.split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((w) => w.includes(t));
}

/**
 * Keyword box: every whitespace-separated term must match somewhere in
 * name, description, or supported pet types (word-aware + loose type match).
 */
export function minderMatchesKeywordQuery(
  displayName: string,
  serviceDescription: string | null,
  supportedTypes: string[],
  query: string,
): boolean {
  const raw = query.trim().toLowerCase();
  if (!raw) return true;
  const tokens = raw.split(/\s+/).filter(Boolean);
  const haystack = [
    displayName,
    serviceDescription ?? "",
    ...supportedTypes,
  ]
    .join(" ")
    .toLowerCase();

  return tokens.every((token) => haystackMatchesToken(haystack, token));
}

export function getSimpleMinderSearchRank(
  minder: Pick<PublicMinderListItem, "displayName" | "serviceDescription" | "supportedPetTypes">,
  query: string,
): number {
  const raw = query.trim().toLowerCase();
  if (!raw) return 0;
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;

  const name = minder.displayName.trim().toLowerCase();
  if (name === raw) return 4;
  if (tokens.some((token) => name.startsWith(token))) return 3;
  if (tokens.every((token) => name.includes(token))) return 2;
  if (
    minderMatchesKeywordQuery(
      minder.displayName,
      minder.serviceDescription,
      minder.supportedPetTypes,
      query,
    )
  ) {
    return 1;
  }
  return 0;
}

/** Haversine great-circle distance in kilometres. */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ISO_DAY_TO_DOW: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * Returns true if the minder has at least one availability slot on the given
 * day of week that covers the (optional) requested time window.
 *
 * If no slots exist for the minder we assume they haven't configured
 * availability yet and treat them as available (don't filter them out) unless
 * the caller explicitly only wants minders with confirmed slots.
 */
export function minderAvailableForDateRange(
  minder: PublicMinderListItem,
  isoDate: string,
  startHhmm: string,
  endHhmm: string,
): boolean {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return true;

  const dow = ISO_DAY_TO_DOW[new Date(y, m - 1, d).getDay()];
  if (!dow) return true;

  const { availabilitySlots } = minder;
  // No slots configured → treat as available (minder hasn't set up schedule).
  if (availabilitySlots.length === 0) return true;

  const slotsForDay = availabilitySlots.filter((s) => s.day_of_week === dow);
  // No slots on that day → minder is unavailable.
  if (slotsForDay.length === 0) return false;

  if (!startHhmm) return true; // Day-only filter: has any slot that day.

  // Normalise "HH:MM" to "HH:MM:SS" for comparison with DB times.
  const startNorm = startHhmm.length === 5 ? `${startHhmm}:00` : startHhmm;
  const endNorm =
    endHhmm && (endHhmm.length === 5 ? `${endHhmm}:00` : endHhmm);

  return slotsForDay.some((slot) => {
    if (slot.start_time > startNorm) return false; // slot starts too late
    if (endNorm && slot.end_time < endNorm) return false; // slot ends too early
    return true;
  });
}

export function filterMindersForOwnerSearch(
  minders: PublicMinderListItem[],
  options: {
    search: string;
    petType: string;
    petSize: string;
    verifiedOnly: boolean;
    nearLocation?: { latitude: number; longitude: number; radiusKm: number } | null;
    availabilityDate?: string;
    availabilityStartTime?: string;
    availabilityEndTime?: string;
  },
): PublicMinderListItem[] {
  return minders.filter((m) => {
    if (options.verifiedOnly && !m.isVerified) return false;
    if (
      !minderMatchesPetTypeFilter(
        m.supportedPetTypes,
        options.petType,
        m.serviceDescription,
      )
    ) {
      return false;
    }
    if (!minderMatchesPetSizeFilter(m.supportedPetSizes, options.petSize)) {
      return false;
    }
    if (
      !minderMatchesKeywordQuery(
        m.displayName,
        m.serviceDescription,
        m.supportedPetTypes,
        options.search,
      )
    ) {
      return false;
    }
    if (options.nearLocation && m.latitude !== null && m.longitude !== null) {
      const dist = haversineKm(
        options.nearLocation.latitude,
        options.nearLocation.longitude,
        m.latitude,
        m.longitude,
      );
      if (dist > options.nearLocation.radiusKm) return false;
    }
    if (options.availabilityDate) {
      if (
        !minderAvailableForDateRange(
          m,
          options.availabilityDate,
          options.availabilityStartTime ?? "",
          options.availabilityEndTime ?? "",
        )
      ) {
        return false;
      }
    }
    return true;
  });
}
