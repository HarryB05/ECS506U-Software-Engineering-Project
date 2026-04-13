import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MinderProfile,
  MinderVerificationChecklist,
  MinderProfileUpdate,
  PublicMinderListItem,
} from "@/lib/types/minder-profile";
import type { PetSize } from "@/lib/types/pet-profile";
import { normalizeServicePricing } from "@/lib/minder-display";
import { getAverageRatingsForUsers } from "@/lib/reviews-service";

const TABLE = "minder_profiles";
const VALID_PET_SIZES = ["small", "medium", "large", "x-large"] as const;

/**
 * Round a coordinate to 2 decimal places (~1 km precision) so that minder
 * profiles never expose an exact home address.
 */
function approxCoord(coord: number): number {
  return Math.round(coord * 100) / 100;
}

type UsersJoin = { full_name: string | null } | null;

function usersFromRow(users: unknown): UsersJoin {
  if (!users || typeof users !== "object") return null;
  if (Array.isArray(users)) {
    const first = users[0];
    return first && typeof first === "object"
      ? (first as { full_name: string | null })
      : null;
  }
  return users as { full_name: string | null };
}

function mapToPublicItem(
  row: Record<string, unknown>,
): PublicMinderListItem | null {
  const id = row.id;
  const userId = row.user_id;
  if (typeof id !== "string" || typeof userId !== "string") return null;

  const u = usersFromRow(row.users);
  const displayName =
    typeof u?.full_name === "string" && u.full_name.trim().length > 0
      ? u.full_name.trim()
      : "Pet minder";

  const rawTypes = row.supported_pet_types;
  const supportedPetTypes = Array.isArray(rawTypes)
    ? rawTypes.filter((t): t is string => typeof t === "string")
    : [];

  const rawSizes = row.supported_pet_sizes;
  const supportedPetSizes: PetSize[] = Array.isArray(rawSizes)
    ? rawSizes.filter(
        (s): s is PetSize =>
          typeof s === "string" &&
          (VALID_PET_SIZES as readonly string[]).includes(s),
      )
    : [];

  const avg = row.average_rating;
  let averageRating: number | null = null;
  if (typeof avg === "number" && Number.isFinite(avg)) {
    averageRating = avg;
  } else if (avg !== null && avg !== undefined) {
    const n = Number(avg);
    averageRating = Number.isFinite(n) ? n : null;
  }

  const lat = row.latitude;
  const lng = row.longitude;

  return {
    profileId: id,
    userId,
    displayName,
    serviceDescription:
      typeof row.service_description === "string"
        ? row.service_description
        : null,
    supportedPetTypes,
    supportedPetSizes,
    servicePricing: normalizeServicePricing(row.service_pricing),
    isVerified: row.is_verified === true,
    averageRating,
    availabilityNote:
      typeof row.availability_note === "string" ? row.availability_note : null,
    locationName:
      typeof row.location_name === "string" ? row.location_name : null,
    latitude: typeof lat === "number" && Number.isFinite(lat) ? lat : null,
    longitude: typeof lng === "number" && Number.isFinite(lng) ? lng : null,
  };
}

export async function getMinderProfileByUserId(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: MinderProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  if (!data) {
    return { data: null, error: null };
  }
  const row = data as Record<string, unknown>;
  const profile = data as MinderProfile;
  const hydrated: MinderProfile = {
    ...profile,
    service_pricing: normalizeServicePricing(row.service_pricing),
  };

  const avgRes = await getAverageRatingsForUsers(supabase, [userId]);
  if (!avgRes.error) {
    hydrated.average_rating = avgRes.data.get(userId) ?? null;
  }

  return {
    data: hydrated,
    error: null,
  };
}

/**
 * Ensures a `minder_profiles` row exists for this user (same as onboarding insert).
 * Use when the row was removed or soft-deleted so the workspace can load again.
 */
export async function ensureMinderProfileForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: MinderProfile | null; error: Error | null }> {
  const existing = await getMinderProfileByUserId(supabase, userId);
  if (existing.error) return existing;
  if (existing.data) return existing;

  const { error: insertError } = await supabase
    .from(TABLE)
    .insert({ user_id: userId });

  if (!insertError) {
    return getMinderProfileByUserId(supabase, userId);
  }

  // Likely a soft-deleted row still holding unique(user_id).
  if (insertError.code !== "23505") {
    return { data: null, error: new Error(insertError.message) };
  }

  const { error: reviveError } = await supabase
    .from(TABLE)
    .update({
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (reviveError) {
    return { data: null, error: new Error(reviveError.message) };
  }

  return getMinderProfileByUserId(supabase, userId);
}

export async function getMinderProfileById(
  supabase: SupabaseClient,
  profileId: string,
): Promise<{ data: PublicMinderListItem | null; error: Error | null }> {
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      `
      id,
      user_id,
      service_description,
      supported_pet_types,
      supported_pet_sizes,
      service_pricing,
      is_verified,
      average_rating,
      availability_note,
      location_name,
      latitude,
      longitude,
      users!inner (
        full_name
      )
    `,
    )
    .eq("id", profileId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  if (!data) {
    return { data: null, error: null };
  }
  const mapped = mapToPublicItem(data as Record<string, unknown>);
  if (mapped) {
    const avgRes = await getAverageRatingsForUsers(supabase, [mapped.userId]);
    if (!avgRes.error) {
      const computed = avgRes.data.get(mapped.userId);
      if (computed != null) {
        mapped.averageRating = computed;
      }
    }
  }
  return { data: mapped, error: null };
}

/** Updates the signed-in minder's row (RLS should restrict to own `user_id`). */
export async function updateMinderProfile(
  supabase: SupabaseClient,
  profileId: string,
  userId: string,
  fields: MinderProfileUpdate,
): Promise<{ error: Error | null }> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.service_description !== undefined) {
    payload.service_description = fields.service_description?.trim() || null;
  }
  if (fields.supported_pet_types !== undefined) {
    payload.supported_pet_types = fields.supported_pet_types;
  }
  if (fields.supported_pet_sizes !== undefined) {
    payload.supported_pet_sizes = fields.supported_pet_sizes;
  }
  if (fields.service_pricing !== undefined) {
    payload.service_pricing = normalizeServicePricing(fields.service_pricing);
  }
  if (fields.visible_in_search !== undefined) {
    payload.visible_in_search = fields.visible_in_search;
  }
  if (fields.availability_note !== undefined) {
    payload.availability_note = fields.availability_note?.trim() || null;
  }
  if (fields.location_name !== undefined) {
    payload.location_name = fields.location_name?.trim() || null;
  }
  if (fields.latitude !== undefined) {
    payload.latitude =
      fields.latitude !== null ? approxCoord(fields.latitude) : null;
  }
  if (fields.longitude !== undefined) {
    payload.longitude =
      fields.longitude !== null ? approxCoord(fields.longitude) : null;
  }

  const { error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", profileId)
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

/**
 * All minder profiles for owner search (excluding soft-deleted).
 * Requires RLS to allow authenticated pet owners to read these rows.
 */
export async function listPublicMindersForSearch(
  supabase: SupabaseClient,
  options?: { excludeUserId?: string },
): Promise<{ data: PublicMinderListItem[]; error: Error | null }> {
  let query = supabase
    .from(TABLE)
    .select(
      `
      id,
      user_id,
      service_description,
      supported_pet_types,
      supported_pet_sizes,
      service_pricing,
      is_verified,
      average_rating,
      availability_note,
      location_name,
      latitude,
      longitude,
      users!inner (
        full_name
      )
    `,
    )
    .is("deleted_at", null)
    .eq("visible_in_search", true)
    .order("created_at", { ascending: false });

  if (options?.excludeUserId) {
    query = query.neq("user_id", options.excludeUserId);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const mapped: PublicMinderListItem[] = [];
  for (const row of rows) {
    const item = mapToPublicItem(row);
    if (item) mapped.push(item);
  }

  const avgRes = await getAverageRatingsForUsers(
    supabase,
    mapped.map((m) => m.userId),
  );
  if (!avgRes.error) {
    for (const item of mapped) {
      const computed = avgRes.data.get(item.userId);
      if (computed != null) {
        item.averageRating = computed;
      }
    }
  }

  return { data: mapped, error: null };
}

export async function getMinderVerificationChecklist(
  supabase: SupabaseClient,
  profileId: string,
  userId: string,
): Promise<{ data: MinderVerificationChecklist | null; error: Error | null }> {
  const { data, error } = await supabase.rpc(
    "get_minder_verification_checklist",
    {
      p_minder_profile_id: profileId,
    },
  );

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") {
    return { data: null, error: null };
  }

  const raw = row as Record<string, unknown>;

  // The stored average_rating on minder_profiles may be stale or null if the
  // review trigger has not yet run for this profile. Compute it live from the
  // reviews table so the checklist always reflects the real current value.
  const avgRes = await getAverageRatingsForUsers(supabase, [userId]);
  const liveRating = avgRes.error ? null : (avgRes.data.get(userId) ?? null);
  const averageRating =
    liveRating !== null ? liveRating : raw.average_rating == null ? null : Number(raw.average_rating);
  const ratingOk = averageRating !== null && averageRating >= 4.0;

  return {
    data: {
      minder_profile_id: String(raw.minder_profile_id ?? ""),
      is_verified: raw.is_verified === true,
      email_confirmed: raw.email_confirmed === true,
      profile_complete: raw.profile_complete === true,
      account_age_ok: raw.account_age_ok === true,
      rating_ok: ratingOk,
      completed_bookings_ok: raw.completed_bookings_ok === true,
      recent_cancellations_ok: raw.recent_cancellations_ok === true,
      visible_in_search_ok: raw.visible_in_search_ok === true,
      completed_bookings_count: Number(raw.completed_bookings_count ?? 0),
      recent_minder_cancellations_count: Number(
        raw.recent_minder_cancellations_count ?? 0,
      ),
      average_rating: averageRating,
    },
    error: null,
  };
}
