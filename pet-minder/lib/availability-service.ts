import type { SupabaseClient } from "@supabase/supabase-js";
import type { DayOfWeek, MinderAvailabilitySlot } from "@/lib/types/availability";

const TABLE = "minder_availability";

/** Normalises "HH:MM" from a time input to "HH:MM:SS" for Postgres. */
export function toDbTime(hhmm: string): string {
  return hhmm.length === 5 ? `${hhmm}:00` : hhmm;
}

/** Strips the seconds component for display: "HH:MM:SS" → "HH:MM". */
export function toDisplayTime(dbTime: string): string {
  return dbTime.slice(0, 5);
}

/**
 * Fetches all availability slots for a given minder profile.
 * Returns slots ordered by day and start_time.
 */
export async function getMinderAvailability(
  supabase: SupabaseClient,
  minderProfileId: string,
): Promise<{ data: MinderAvailabilitySlot[]; error: Error | null }> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("minder_id", minderProfileId)
    .order("day_of_week")
    .order("start_time");

  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  return { data: (data ?? []) as MinderAvailabilitySlot[], error: null };
}

/**
 * Adds a new availability slot for the signed-in minder.
 * The caller must ensure start_time < end_time before calling.
 */
export async function addAvailabilitySlot(
  supabase: SupabaseClient,
  minderProfileId: string,
  day: DayOfWeek,
  startHhmm: string,
  endHhmm: string,
): Promise<{ data: MinderAvailabilitySlot | null; error: Error | null }> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      minder_id: minderProfileId,
      day_of_week: day,
      start_time: toDbTime(startHhmm),
      end_time: toDbTime(endHhmm),
    })
    .select("*")
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  return { data: data as MinderAvailabilitySlot, error: null };
}

/**
 * Removes an availability slot.
 * RLS ensures only the owning minder can delete.
 */
export async function deleteAvailabilitySlot(
  supabase: SupabaseClient,
  slotId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from(TABLE).delete().eq("id", slotId);
  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}
