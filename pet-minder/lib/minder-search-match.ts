import type { PublicMinderListItem } from "@/lib/types/minder-profile";
import type { PetSize } from "@/lib/types/pet-profile";

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
  return words.some((w) => stringsLooselyMatch(w, t));
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

export function filterMindersForOwnerSearch(
  minders: PublicMinderListItem[],
  options: {
    search: string;
    petType: string;
    petSize: string;
    verifiedOnly: boolean;
    nearLocation?: { latitude: number; longitude: number; radiusKm: number } | null;
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
    return true;
  });
}
