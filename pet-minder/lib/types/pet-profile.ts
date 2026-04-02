/** Stored in DB as `male` | `female`; null when not specified. */
export type PetSex = "male" | "female";

/**
 * Matches `pet_profiles` in design.md (Supabase).
 * `petID` in the class diagram maps to `id`.
 */
export type PetProfile = {
  id: string;
  owner_id: string;
  name: string;
  pet_type: string;
  age: number | null;
  /** Present after DB migration adds `pet_profiles.sex`. */
  sex?: PetSex | null;
  medical_info: string | null;
  dietary_requirements: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PetProfileInsert = {
  name: string;
  pet_type: string;
  age?: number | null;
  sex?: PetSex | null;
  medical_info?: string | null;
  dietary_requirements?: string | null;
};

export type PetProfileUpdate = Partial<{
  name: string;
  pet_type: string;
  age: number | null;
  sex: PetSex | null;
  medical_info: string | null;
  dietary_requirements: string | null;
}>;
