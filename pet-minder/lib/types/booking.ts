export type BookingRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled";

export type BookingRowStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export type OwnerPetOption = {
  id: string;
  name: string;
  petType: string;
};

export type BookingRequestListItem = {
  id: string;
  requestedDatetime: string;
  /** Present for multi-day / holiday requests; session end instant. */
  requestedEndDatetime: string | null;
  durationMinutes: number;
  message: string | null;
  careInstructions: string | null;
  /** Type of care requested, e.g. "Walking", "Pet Sitting". */
  serviceType: string | null;
  shortNoticeWarning: boolean;
  autoRejectedAt: string | null;
  status: BookingRequestStatus;
  createdAt: string;
  counterpartyName: string;
  petCount: number;
};

export type BookingListItem = {
  id: string;
  /** Source request when created via accept flow. */
  requestId: string | null;
  startDatetime: string;
  endDatetime: string;
  status: BookingRowStatus;
  cancellationDeadline: string;
  cancelledAt: string | null;
  careInstructions: string | null;
  counterpartyName: string;
  petCount: number;
};

/** Linked request snapshot for session detail timeline. */
export type BookingDetailRequestSnapshot = {
  id: string;
  createdAt: string;
  updatedAt: string | null;
  status: BookingRequestStatus;
  message: string | null;
  requestedDatetime: string;
  requestedEndDatetime: string | null;
  durationMinutes: number;
};

export type BookingSessionReviewSummary = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type BookingSessionReviewState = {
  revieweeId: string;
  revieweeName: string;
  canSubmit: boolean;
  isWindowOpen: boolean;
  reason: string | null;
  existing: BookingSessionReviewSummary | null;
};

export type BookingSessionDetail = {
  id: string;
  requestId: string | null;
  startDatetime: string;
  endDatetime: string;
  status: BookingRowStatus;
  cancellationDeadline: string;
  cancelledAt: string | null;
  careInstructions: string | null;
  counterpartyName: string;
  counterpartyUserId: string | null;
  petCount: number;
  /** Resolved from booking pets; may be empty if names are not readable. */
  petNames: string[];
  /** When the session row was created (if column exists). */
  createdAt: string | null;
  viewerRole: "owner" | "minder";
  request: BookingDetailRequestSnapshot | null;
  review: BookingSessionReviewState;
};

export type BookingRequestDetail = BookingRequestListItem & {
  updatedAt: string | null;
  viewerRole: "owner" | "minder";
  /** Pets currently attached to the request. */
  requestPetIds: string[];
  counterpartyUserId: string | null;
  /** Populated once the minder has accepted (confirmed session). */
  linkedSession: {
    id: string;
    startDatetime: string;
    endDatetime: string;
    status: BookingRowStatus;
    cancelledAt: string | null;
  } | null;
  counterpartyAverageRating: number | null;
};

export type BookingsDashboardPayload = {
  minderProfileId: string | null;
  ownerRequests: BookingRequestListItem[];
  ownerBookings: BookingListItem[];
  minderRequests: BookingRequestListItem[];
  minderBookings: BookingListItem[];
};
