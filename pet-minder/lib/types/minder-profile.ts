import type { PetSize } from "@/lib/types/pet-profile";

/**
 * Matches `minder_profiles` in design.md (Supabase).
 */
export type MinderProfile = {
  id: string;
  user_id: string;
  service_description: string | null;
  supported_pet_types: string[] | null;
  supported_pet_sizes: PetSize[] | null;
  service_pricing: string | null;
  is_verified: boolean;
  average_rating: number | null;
  visible_in_search: boolean;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MinderProfileUpdate = Partial<{
  service_description: string | null;
  supported_pet_types: string[] | null;
  supported_pet_sizes: PetSize[] | null;
  service_pricing: string | null;
  visible_in_search: boolean;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
}>;

/** Row joined with `users` for owner search and public cards. */
export type PublicMinderListItem = {
  profileId: string;
  userId: string;
  displayName: string;
  serviceDescription: string | null;
  supportedPetTypes: string[];
  supportedPetSizes: PetSize[];
  servicePricing: string | null;
  isVerified: boolean;
  averageRating: number | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
};
