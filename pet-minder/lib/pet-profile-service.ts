import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PetProfile,
  PetProfileInsert,
  PetProfileUpdate,
} from "@/lib/types/pet-profile";

const TABLE = "pet_profiles";

export async function listPetProfilesForOwner(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<{ data: PetProfile[]; error: Error | null }> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  return { data: (data ?? []) as PetProfile[], error: null };
}

/** Create a new pet profile for the current user (must have owner role; enforced by RLS). */
export async function createPetProfile(
  supabase: SupabaseClient,
  ownerId: string,
  input: PetProfileInsert,
): Promise<{ data: PetProfile | null; error: Error | null }> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      owner_id: ownerId,
      name: input.name.trim(),
      pet_type: input.pet_type.trim(),
      age: input.age ?? null,
      medical_info: input.medical_info?.trim() || null,
      dietary_requirements: input.dietary_requirements?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  return { data: data as PetProfile, error: null };
}

/** Class diagram: updateProfile — update core profile fields. */
export async function updateProfile(
  supabase: SupabaseClient,
  petId: string,
  fields: PetProfileUpdate,
): Promise<{ error: Error | null }> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.name !== undefined) payload.name = fields.name.trim();
  if (fields.pet_type !== undefined) payload.pet_type = fields.pet_type.trim();
  if (fields.age !== undefined) payload.age = fields.age;
  if (fields.medical_info !== undefined) {
    payload.medical_info = fields.medical_info?.trim() || null;
  }
  if (fields.dietary_requirements !== undefined) {
    payload.dietary_requirements = fields.dietary_requirements?.trim() || null;
  }

  const { error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq("id", petId)
    .is("deleted_at", null);

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

/** Class diagram: deleteProfile — soft delete. */
export async function deleteProfile(
  supabase: SupabaseClient,
  petId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from(TABLE)
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", petId)
    .is("deleted_at", null);

  if (error) {
    return { error: new Error(error.message) };
  }
  return { error: null };
}

/** Class diagram: addMedicalInfo — update medical info only. */
export async function addMedicalInfo(
  supabase: SupabaseClient,
  petId: string,
  medicalInfo: string,
): Promise<{ error: Error | null }> {
  return updateProfile(supabase, petId, {
    medical_info: medicalInfo,
  });
}

/** Class diagram: addDietaryRequirements — update dietary requirements only. */
export async function addDietaryRequirements(
  supabase: SupabaseClient,
  petId: string,
  dietaryRequirements: string,
): Promise<{ error: Error | null }> {
  return updateProfile(supabase, petId, {
    dietary_requirements: dietaryRequirements,
  });
}
