import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BookingListItem,
  BookingRequestDetail,
  BookingRequestListItem,
  BookingRequestStatus,
  BookingRowStatus,
  BookingSessionDetail,
  BookingsDashboardPayload,
  OwnerPetOption,
} from "@/lib/types/booking";
import {
  getAverageRatingForUser,
  getExistingReviewForBooking,
} from "@/lib/reviews-service";

function displayNameFromUsersJoin(
  users: unknown,
  fallback: string,
): string {
  if (!users || typeof users !== "object") return fallback;
  const row = Array.isArray(users) ? users[0] : users;
  if (!row || typeof row !== "object") return fallback;
  const name = (row as { full_name?: string | null }).full_name;
  if (typeof name === "string" && name.trim().length > 0) return name.trim();
  return fallback;
}

function mapRequestStatus(s: string): BookingRequestStatus {
  if (
    s === "pending" ||
    s === "accepted" ||
    s === "declined" ||
    s === "cancelled"
  ) {
    return s;
  }
  return "pending";
}

function mapBookingStatus(s: string): BookingRowStatus {
  if (
    s === "pending" ||
    s === "confirmed" ||
    s === "cancelled" ||
    s === "completed"
  ) {
    return s;
  }
  return "pending";
}

export async function getMinderProfileIdForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("minder_profiles")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  return data?.id ?? null;
}

export async function listOwnerPetsForBooking(
  supabase: SupabaseClient,
  ownerId: string,
): Promise<{ data: OwnerPetOption[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("pet_profiles")
    .select("id, name, pet_type")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows = (data ?? []).map((r) => ({
    id: r.id as string,
    name: typeof r.name === "string" ? r.name : "Pet",
    petType: typeof r.pet_type === "string" ? r.pet_type : "",
  }));

  return { data: rows, error: null };
}

export async function loadBookingsDashboard(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: BookingsDashboardPayload; error: Error | null }> {
  const minderProfileId = await getMinderProfileIdForUser(supabase, userId);

  const { data: ownerReqRows, error: ownerReqErr } = await supabase
    .from("booking_requests")
    .select(
      `
      id,
      requested_datetime,
      requested_end_datetime,
      duration_minutes,
      message,
      care_instructions,
      service_type,
      status,
      created_at,
      minder_profiles (
        users ( full_name )
      ),
      booking_request_pets ( pet_id )
    `,
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (ownerReqErr) {
    return {
      data: emptyPayload(minderProfileId),
      error: new Error(ownerReqErr.message),
    };
  }

  const ownerRequests: BookingRequestListItem[] = (ownerReqRows ?? []).map(
    (row) => {
      const mp = row.minder_profiles as
        | { users?: unknown }
        | { users?: unknown }[]
        | null;
      const mpOne = Array.isArray(mp) ? mp[0] : mp;
      const reqPets = row.booking_request_pets as
        | { pet_id?: string }[]
        | null;
      return {
        id: row.id as string,
        requestedDatetime: row.requested_datetime as string,
        requestedEndDatetime:
          (row.requested_end_datetime as string | null) ?? null,
        durationMinutes: row.duration_minutes as number,
        message: (row.message as string | null) ?? null,
        careInstructions: (row.care_instructions as string | null) ?? null,
        serviceType: (row.service_type as string | null) ?? null,
        status: mapRequestStatus(String(row.status)),
        createdAt: row.created_at as string,
        counterpartyName: displayNameFromUsersJoin(
          mpOne?.users,
          "Pet minder",
        ),
        petCount: Array.isArray(reqPets) ? reqPets.length : 0,
      };
    },
  );

  const { data: ownerBookRows, error: ownerBookErr } = await supabase
    .from("bookings")
    .select(
      `
      id,
      request_id,
      start_datetime,
      end_datetime,
      status,
      cancellation_deadline,
      cancelled_at,
      care_instructions,
      minder_profiles (
        users ( full_name )
      ),
      booking_pets ( pet_id )
    `,
    )
    .eq("owner_id", userId)
    .order("start_datetime", { ascending: false });

  if (ownerBookErr) {
    return {
      data: emptyPayload(minderProfileId),
      error: new Error(ownerBookErr.message),
    };
  }

  const ownerBookings: BookingListItem[] = (ownerBookRows ?? []).map((row) => {
    const mp = row.minder_profiles as
      | { users?: unknown }
      | { users?: unknown }[]
      | null;
    const mpOne = Array.isArray(mp) ? mp[0] : mp;
    const pets = row.booking_pets as { pet_id?: string }[] | null;
    return {
      id: row.id as string,
      requestId: (row.request_id as string | null) ?? null,
      startDatetime: row.start_datetime as string,
      endDatetime: row.end_datetime as string,
      status: mapBookingStatus(String(row.status)),
      cancellationDeadline: row.cancellation_deadline as string,
      cancelledAt: (row.cancelled_at as string | null) ?? null,
      careInstructions: (row.care_instructions as string | null) ?? null,
      counterpartyName: displayNameFromUsersJoin(mpOne?.users, "Pet minder"),
      petCount: Array.isArray(pets) ? pets.length : 0,
    };
  });

  let minderRequests: BookingRequestListItem[] = [];
  let minderBookings: BookingListItem[] = [];

  if (minderProfileId) {
    const { data: minderReqRows, error: minderReqErr } = await supabase
      .from("booking_requests")
      .select(
        `
        id,
        requested_datetime,
        requested_end_datetime,
        duration_minutes,
        message,
        care_instructions,
        service_type,
        status,
        created_at,
        users!booking_requests_owner_id_fkey ( full_name ),
        booking_request_pets ( pet_id )
      `,
      )
      .eq("minder_id", minderProfileId)
      .order("created_at", { ascending: false });

    if (minderReqErr) {
      return {
        data: emptyPayload(minderProfileId),
        error: new Error(minderReqErr.message),
      };
    }

    minderRequests = (minderReqRows ?? []).map((row) => {
      const reqPets = row.booking_request_pets as
        | { pet_id?: string }[]
        | null;
      return {
        id: row.id as string,
        requestedDatetime: row.requested_datetime as string,
        requestedEndDatetime:
          (row.requested_end_datetime as string | null) ?? null,
        durationMinutes: row.duration_minutes as number,
        message: (row.message as string | null) ?? null,
        careInstructions: (row.care_instructions as string | null) ?? null,
        serviceType: (row.service_type as string | null) ?? null,
        status: mapRequestStatus(String(row.status)),
        createdAt: row.created_at as string,
        counterpartyName: displayNameFromUsersJoin(row.users, "Pet owner"),
        petCount: Array.isArray(reqPets) ? reqPets.length : 0,
      };
    });

    const { data: minderBookRows, error: minderBookErr } = await supabase
      .from("bookings")
      .select(
        `
        id,
        request_id,
        start_datetime,
        end_datetime,
        status,
        cancellation_deadline,
        cancelled_at,
        care_instructions,
        users!bookings_owner_id_fkey ( full_name ),
        booking_pets ( pet_id )
      `,
      )
      .eq("minder_id", minderProfileId)
      .order("start_datetime", { ascending: false });

    if (minderBookErr) {
      return {
        data: emptyPayload(minderProfileId),
        error: new Error(minderBookErr.message),
      };
    }

    minderBookings = (minderBookRows ?? []).map((row) => {
      const pets = row.booking_pets as { pet_id?: string }[] | null;
      return {
        id: row.id as string,
        requestId: (row.request_id as string | null) ?? null,
        startDatetime: row.start_datetime as string,
        endDatetime: row.end_datetime as string,
        status: mapBookingStatus(String(row.status)),
        cancellationDeadline: row.cancellation_deadline as string,
        cancelledAt: (row.cancelled_at as string | null) ?? null,
        careInstructions: (row.care_instructions as string | null) ?? null,
        counterpartyName: displayNameFromUsersJoin(
          row.users,
          "Pet owner",
        ),
        petCount: Array.isArray(pets) ? pets.length : 0,
      };
    });
  }

  return {
    data: {
      minderProfileId,
      ownerRequests,
      ownerBookings,
      minderRequests,
      minderBookings,
    },
    error: null,
  };
}

function emptyPayload(
  minderProfileId: string | null,
): BookingsDashboardPayload {
  return {
    minderProfileId,
    ownerRequests: [],
    ownerBookings: [],
    minderRequests: [],
    minderBookings: [],
  };
}

function firstRelationRow<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

export async function loadBookingSessionDetail(
  supabase: SupabaseClient,
  userId: string,
  bookingId: string,
): Promise<{ data: BookingSessionDetail | null; error: Error | null }> {
  const { data: row, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      request_id,
      start_datetime,
      end_datetime,
      status,
      cancellation_deadline,
      cancelled_at,
      care_instructions,
      owner_id,
      minder_id,
      minder_profiles ( user_id, users ( full_name ) ),
      users!bookings_owner_id_fkey ( full_name ),
      booking_pets (
        pet_id,
        pet_profiles ( name )
      ),
      booking_requests (
        id,
        created_at,
        updated_at,
        status,
        message,
        requested_datetime,
        requested_end_datetime,
        duration_minutes
      )
    `,
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  if (!row) {
    return { data: null, error: null };
  }

  const ownerId = row.owner_id as string;
  const viewerRole: "owner" | "minder" = ownerId === userId ? "owner" : "minder";

  const mp = row.minder_profiles as
    | { user_id?: string; users?: unknown }
    | { user_id?: string; users?: unknown }[]
    | null;
  const mpOne = Array.isArray(mp) ? mp[0] : mp;
  const minderName = displayNameFromUsersJoin(mpOne?.users, "Pet minder");
  const minderUserId =
    mpOne && typeof mpOne.user_id === "string" ? mpOne.user_id : null;
  const ownerName = displayNameFromUsersJoin(row.users, "Pet owner");

  const counterpartyName =
    viewerRole === "owner" ? minderName : ownerName;

  const pets = row.booking_pets as
    | {
        pet_id?: string;
        pet_profiles?:
          | { name?: string | null }
          | { name?: string | null }[]
          | null;
      }[]
    | null;

  const petNames: string[] = [];
  for (const bp of pets ?? []) {
    const rel = bp.pet_profiles;
    const profile = Array.isArray(rel) ? rel[0] : rel;
    const raw = profile?.name;
    if (typeof raw === "string" && raw.trim().length > 0) {
      petNames.push(raw.trim());
    }
  }

  const reqRaw = firstRelationRow(
    row.booking_requests as Record<string, unknown> | Record<string, unknown>[] | null,
  );

  let request: BookingSessionDetail["request"] = null;
  if (reqRaw && typeof reqRaw === "object") {
    request = {
      id: String(reqRaw.id),
      createdAt: String(reqRaw.created_at),
      updatedAt:
        reqRaw.updated_at != null ? String(reqRaw.updated_at) : null,
      status: mapRequestStatus(String(reqRaw.status)),
      message: (reqRaw.message as string | null) ?? null,
      requestedDatetime: String(reqRaw.requested_datetime),
      requestedEndDatetime:
        (reqRaw.requested_end_datetime as string | null) ?? null,
      durationMinutes: Number(reqRaw.duration_minutes),
    };
  }

  const revieweeId = viewerRole === "owner" ? minderUserId : ownerId;
  const revieweeName = viewerRole === "owner" ? minderName : ownerName;

  let existingReview: BookingSessionDetail["review"]["existing"] = null;
  const existingReviewRes = await getExistingReviewForBooking(
    supabase,
    userId,
    bookingId,
  );
  if (existingReviewRes.error) {
    return { data: null, error: existingReviewRes.error };
  }
  existingReview = existingReviewRes.data;

  const endMs = Date.parse(String(row.end_datetime));
  const isWindowOpen =
    !Number.isNaN(endMs) &&
    (Date.now() >= endMs || String(row.status) === "completed") &&
    row.cancelled_at == null;

  let reason: string | null = null;
  if (!revieweeId) {
    reason = "Cannot review this booking because the counterparty account is unavailable.";
  } else if (existingReview) {
    reason = "You have already reviewed this booking.";
  } else if (row.cancelled_at != null) {
    reason = "Cancelled bookings cannot be reviewed.";
  } else if (!isWindowOpen) {
    reason = "Reviews unlock after the booking end time.";
  }

  const canSubmit =
    Boolean(revieweeId) &&
    existingReview == null &&
    isWindowOpen &&
    row.cancelled_at == null;

  return {
    data: {
      id: row.id as string,
      requestId: (row.request_id as string | null) ?? null,
      startDatetime: row.start_datetime as string,
      endDatetime: row.end_datetime as string,
      status: mapBookingStatus(String(row.status)),
      cancellationDeadline: row.cancellation_deadline as string,
      cancelledAt: (row.cancelled_at as string | null) ?? null,
      careInstructions: (row.care_instructions as string | null) ?? null,
      counterpartyName,
      petCount: Array.isArray(pets) ? pets.length : 0,
      petNames,
      createdAt: null,
      viewerRole,
      request,
      review: {
        revieweeId: revieweeId ?? "",
        revieweeName,
        canSubmit,
        isWindowOpen,
        reason,
        existing: existingReview,
      },
    },
    error: null,
  };
}

export async function loadBookingRequestDetail(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
): Promise<{ data: BookingRequestDetail | null; error: Error | null }> {
  const { data: row, error } = await supabase
    .from("booking_requests")
    .select(
      `
      id,
      requested_datetime,
      requested_end_datetime,
      duration_minutes,
      message,
      care_instructions,
      service_type,
      status,
      created_at,
      updated_at,
      owner_id,
      minder_id,
      minder_profiles ( user_id, users ( full_name ) ),
      users!booking_requests_owner_id_fkey ( full_name ),
      booking_request_pets ( pet_id ),
      bookings (
        id,
        start_datetime,
        end_datetime,
        status,
        cancelled_at
      )
    `,
    )
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  if (!row) {
    return { data: null, error: null };
  }

  const ownerId = row.owner_id as string;
  const isOwner = ownerId === userId;
  const mp = row.minder_profiles as
    | { user_id?: string; users?: unknown }
    | { user_id?: string; users?: unknown }[]
    | null;
  const mpOne = Array.isArray(mp) ? mp[0] : mp;
  const minderUserId =
    mpOne && typeof mpOne.user_id === "string" ? mpOne.user_id : null;
  const minderName = displayNameFromUsersJoin(mpOne?.users, "Pet minder");
  const ownerName = displayNameFromUsersJoin(row.users, "Pet owner");
  const counterpartyName = isOwner ? minderName : ownerName;
  const counterpartyUserId = isOwner ? minderUserId : ownerId;

  const reqPets = row.booking_request_pets as
    | { pet_id?: string }[]
    | null;
  const requestPetIds = (reqPets ?? [])
    .map((p) => p.pet_id)
    .filter((id): id is string => typeof id === "string");

  const bookRaw = firstRelationRow(
    row.bookings as Record<string, unknown> | Record<string, unknown>[] | null,
  );

  let linkedSession: BookingRequestDetail["linkedSession"] = null;
  if (bookRaw && typeof bookRaw === "object") {
    linkedSession = {
      id: String(bookRaw.id),
      startDatetime: String(bookRaw.start_datetime),
      endDatetime: String(bookRaw.end_datetime),
      status: mapBookingStatus(String(bookRaw.status)),
      cancelledAt: (bookRaw.cancelled_at as string | null) ?? null,
    };
  }

  let counterpartyAverageRating: number | null = null;
  if (counterpartyUserId) {
    const avgRes = await getAverageRatingForUser(supabase, counterpartyUserId);
    if (!avgRes.error) {
      counterpartyAverageRating = avgRes.data;
    }
  }

  return {
    data: {
      id: row.id as string,
      requestedDatetime: row.requested_datetime as string,
      requestedEndDatetime:
        (row.requested_end_datetime as string | null) ?? null,
      durationMinutes: row.duration_minutes as number,
      message: (row.message as string | null) ?? null,
      careInstructions: (row.care_instructions as string | null) ?? null,
      serviceType: (row.service_type as string | null) ?? null,
      status: mapRequestStatus(String(row.status)),
      createdAt: row.created_at as string,
      updatedAt: (row.updated_at as string | null) ?? null,
      counterpartyName,
      petCount: Array.isArray(reqPets) ? reqPets.length : 0,
      viewerRole: isOwner ? "owner" : "minder",
      requestPetIds,
      counterpartyUserId: counterpartyUserId ?? null,
      linkedSession,
      counterpartyAverageRating,
    },
    error: null,
  };
}
