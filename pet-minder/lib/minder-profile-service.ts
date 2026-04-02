import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MinderProfile,
  MinderProfileUpdate,
  PublicMinderListItem,
} from "@/lib/types/minder-profile";

const TABLE = "minder_profiles";

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

  const avg = row.average_rating;
  let averageRating: number | null = null;
  if (typeof avg === "number" && Number.isFinite(avg)) {
    averageRating = avg;
  } else if (avg !== null && avg !== undefined) {
    const n = Number(avg);
    averageRating = Number.isFinite(n) ? n : null;
  }

  return {
    profileId: id,
    userId,
    displayName,
    serviceDescription:
      typeof row.service_description === "string"
        ? row.service_description
        : null,
    supportedPetTypes,
    servicePricing:
      typeof row.service_pricing === "string" ? row.service_pricing : null,
    isVerified: row.is_verified === true,
    averageRating,
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
  return { data: data as MinderProfile | null, error: null };
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
      service_pricing,
      is_verified,
      average_rating,
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
  if (fields.service_pricing !== undefined) {
    payload.service_pricing = fields.service_pricing?.trim() || null;
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
      service_pricing,
      is_verified,
      average_rating,
      users!inner (
        full_name
      )
    `,
    )
    .is("deleted_at", null)
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
  return { data: mapped, error: null };
}
