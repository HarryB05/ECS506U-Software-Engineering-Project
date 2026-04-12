export type AdminTab = "users" | "minders" | "verifications" | "disputes" | "reviews";

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
  reportCount: number;
  createdAt: string;
  reviewerName: string;
  revieweeName: string;
};

export type AdminVerificationRow = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  type: string;
  status: string;
  verifiedAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  createdAt: string;
};

export type AdminStats = {
  userCount: number;
  mindersPendingVerification: number;
  disputedBookings: number;
  reportedReviews: number;
};
