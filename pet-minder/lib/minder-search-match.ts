import type { PublicMinderListItem } from "@/lib/types/minder-profile";

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
  /\b(rabbit|bunny|bunnies|hamster|hamsters|guinea\s*pig|guinea\s*pigs|gerbil|gerbils|mouse|mice|rat|rats|ferret|ferrets|chinchilla|hedgehog|gecko|geckos|turtle|turtles|tortoise|tortoises|snake|snakes|lizard|lizards|parakeet|budgie|budgies|parrot|parrots|cockatiel|cockatiels|bird|birds|fish)\b/i;

export function matchesSmallPetsCategory(
  supportedTypes: string[],
  serviceDescription: string | null,
): boolean {
  const desc = serviceDescription ?? "";
  if (SMALL_PET_PATTERN.test(desc)) return true;
  return supportedTypes.some((t) => SMALL_PET_PATTERN.test(t));
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
  return supportedTypes.some((t) => stringsLooselyMatch(t, f));
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

export function filterMindersForOwnerSearch(
  minders: PublicMinderListItem[],
  options: {
    search: string;
    petType: string;
    verifiedOnly: boolean;
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
    return true;
  });
}
