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
  status: BookingRequestStatus;
  createdAt: string;
  counterpartyName: string;
  petCount: number;
};

export type BookingListItem = {
  id: string;
  startDatetime: string;
  endDatetime: string;
  status: BookingRowStatus;
  cancellationDeadline: string;
  cancelledAt: string | null;
  careInstructions: string | null;
  counterpartyName: string;
  petCount: number;
};

export type BookingsDashboardPayload = {
  minderProfileId: string | null;
  ownerRequests: BookingRequestListItem[];
  ownerBookings: BookingListItem[];
  minderRequests: BookingRequestListItem[];
  minderBookings: BookingListItem[];
};
