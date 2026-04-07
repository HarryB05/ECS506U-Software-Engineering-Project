/** Stored in DB as `male` | `female`; null when not specified. */
export type PetSex = "male" | "female";

/** Stored in DB as `small` | `medium` | `large` | `x-large`; null when not specified. */
export type PetSize = "small" | "medium" | "large" | "x-large";

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
  /** Present after DB migration adds `pet_profiles.pet_size`. */
  pet_size?: PetSize | null;
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
  pet_size?: PetSize | null;
  medical_info?: string | null;
  dietary_requirements?: string | null;
};

export type PetProfileUpdate = Partial<{
  name: string;
  pet_type: string;
  age: number | null;
  sex: PetSex | null;
  pet_size: PetSize | null;
  medical_info: string | null;
  dietary_requirements: string | null;
}>;
