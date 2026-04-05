import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  BookingListItem,
  BookingRequestListItem,
  BookingRequestStatus,
  BookingRowStatus,
  BookingsDashboardPayload,
  OwnerPetOption,
} from "@/lib/types/booking";

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
