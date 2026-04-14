import type { PetSize } from "@/lib/types/pet-profile";
import type { MinderAvailabilitySlot } from "@/lib/types/availability";

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
  availability_note: string | null;
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
  availability_note: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
}>;

export type MinderVerificationChecklist = {
  minder_profile_id: string;
  is_verified: boolean;
  email_confirmed: boolean;
  profile_complete: boolean;
  account_age_ok: boolean;
  rating_ok: boolean;
  completed_bookings_ok: boolean;
  recent_cancellations_ok: boolean;
  visible_in_search_ok: boolean;
  completed_bookings_count: number;
  recent_minder_cancellations_count: number;
  average_rating: number | null;
};

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
  availabilityNote: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Weekly availability slots — populated by listPublicMindersForSearch. */
  availabilitySlots: MinderAvailabilitySlot[];
};
