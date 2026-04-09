export type AdminTab = "users" | "minders" | "disputes" | "reviews";

export type AdminLogAction =
  | "USER_SUSPENDED"
  | "USER_REACTIVATED"
  | "MINDER_VERIFIED"
  | "MINDER_UNVERIFIED"
  | "DISPUTE_RESOLVED"
  | "REVIEW_MODERATED"
  | "REVIEW_REMOVED";

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_active: boolean | null;
  created_at: string;
  deleted_at: string | null;
  role_types: string[];
};

export type AdminMinderRow = {
  profileId: string;
  userId: string;
  fullName: string;
  email: string;
  serviceDescription: string | null;
  supportedPetTypes: string[];
  isVerified: boolean;
};

export type AdminDisputeBookingRow = {
  id: string;
  ownerId: string;
  minderProfileId: string;
  startDatetime: string;
  endDatetime: string;
  status: string;
  careInstructions: string | null;
  ownerName: string;
  minderName: string;
};

export type AdminReviewRow = {
  id: string;
  reviewerId: string;
  revieweeId: string;
  rating: number | null;
  comment: string | null;
  isModerated: boolean;
  createdAt: string;
  reviewerName: string;
  revieweeName: string;
};

export type AdminStats = {
  userCount: number;
  mindersPendingVerification: number;
  disputedBookings: number;
  unmoderatedReviews: number;
};
