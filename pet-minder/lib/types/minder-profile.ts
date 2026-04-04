/**
 * Matches `minder_profiles` in design.md (Supabase).
 */
export type MinderProfile = {
  id: string;
  user_id: string;
  service_description: string | null;
  supported_pet_types: string[] | null;
  service_pricing: string | null;
  is_verified: boolean;
  average_rating: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MinderProfileUpdate = Partial<{
  service_description: string | null;
  supported_pet_types: string[] | null;
  service_pricing: string | null;
}>;

/** Row joined with `users` for owner search and public cards. */
export type PublicMinderListItem = {
  profileId: string;
  userId: string;
  displayName: string;
  serviceDescription: string | null;
  supportedPetTypes: string[];
  servicePricing: string | null;
  isVerified: boolean;
  averageRating: number | null;
};
