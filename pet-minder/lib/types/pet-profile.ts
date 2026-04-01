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
  medical_info?: string | null;
  dietary_requirements?: string | null;
};

export type PetProfileUpdate = Partial<{
  name: string;
  pet_type: string;
  age: number | null;
  medical_info: string | null;
  dietary_requirements: string | null;
}>;
