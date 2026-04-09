import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminDisputeBookingRow,
  AdminLogAction,
  AdminMinderRow,
  AdminReviewRow,
  AdminStats,
  AdminUserRow,
} from "@/lib/types/admin";

export async function logAction(
  supabase: SupabaseClient,
  adminId: string,
  action: AdminLogAction,
  description: string,
): Promise<void> {
  const { error } = await supabase.from("admin_logs").insert({
    admin_id: adminId,
    action,
    description,
  });
  if (error) {
    throw new Error(error.message);
  }
}

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

export async function fetchAdminStats(
  supabase: SupabaseClient,
): Promise<{ data: AdminStats; error: Error | null }> {
  const [
    { count: userCount, error: uErr },
    { count: minderCount, error: mErr },
    { count: disputeCount, error: dErr },
    { count: reviewCount, error: rErr },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("minder_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_verified", false)
      .is("deleted_at", null),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "disputed"),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("is_moderated", false),
  ]);

  const err = uErr || mErr || dErr || rErr;
  if (err) {
    return {
      data: {
        userCount: 0,
        mindersPendingVerification: 0,
        disputedBookings: 0,
        unmoderatedReviews: 0,
      },
      error: new Error(err.message),
    };
  }

  return {
    data: {
      userCount: userCount ?? 0,
      mindersPendingVerification: minderCount ?? 0,
      disputedBookings: disputeCount ?? 0,
      unmoderatedReviews: reviewCount ?? 0,
    },
    error: null,
  };
}

export async function fetchAdminUsers(
  supabase: SupabaseClient,
): Promise<{ data: AdminUserRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("users")
    .select(
      `
      id,
      full_name,
      email,
      is_active,
      created_at,
      deleted_at,
      roles ( role_type, deleted_at )
    `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows: AdminUserRow[] = (data ?? []).map((row) => {
    const rolesRaw = row.roles as
      | { role_type?: string; deleted_at?: string | null }[]
      | null;
    const role_types = (rolesRaw ?? [])
      .filter((r) => r.deleted_at == null)
      .map((r) => String(r.role_type ?? ""))
      .filter(Boolean);
    return {
      id: row.id as string,
      full_name: (row.full_name as string | null) ?? null,
      email: (row.email as string | null) ?? null,
      is_active: (row.is_active as boolean | null) ?? null,
      created_at: row.created_at as string,
      deleted_at: (row.deleted_at as string | null) ?? null,
      role_types,
    };
  });

  return { data: rows, error: null };
}

export async function setUserSuspended(
  supabase: SupabaseClient,
  adminId: string,
  targetUserId: string,
  suspended: boolean,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("users")
    .update({ is_active: !suspended })
    .eq("id", targetUserId);

  if (error) {
    return { error: new Error(error.message) };
  }

  try {
    await logAction(
      supabase,
      adminId,
      suspended ? "USER_SUSPENDED" : "USER_REACTIVATED",
      suspended
        ? `Suspended user ${targetUserId}`
        : `Reactivated user ${targetUserId}`,
    );
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }

  return { error: null };
}

export async function fetchAdminMinders(
  supabase: SupabaseClient,
): Promise<{ data: AdminMinderRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("minder_profiles")
    .select(
      `
      id,
      user_id,
      service_description,
      supported_pet_types,
      is_verified,
      users ( full_name, email )
    `,
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows: AdminMinderRow[] = (data ?? []).map((row) => {
    const u = row.users as
      | { full_name?: string | null; email?: string | null }
      | { full_name?: string | null; email?: string | null }[]
      | null;
    const uOne = Array.isArray(u) ? u[0] : u;
    const types = row.supported_pet_types as string[] | null;
    return {
      profileId: row.id as string,
      userId: row.user_id as string,
      fullName: displayNameFromUsersJoin(uOne, "Unknown"),
      email: typeof uOne?.email === "string" ? uOne.email : "",
      serviceDescription: (row.service_description as string | null) ?? null,
      supportedPetTypes: Array.isArray(types) ? types : [],
      isVerified: Boolean(row.is_verified),
    };
  });

  return { data: rows, error: null };
}

export async function setMinderVerified(
  supabase: SupabaseClient,
  adminId: string,
  profileId: string,
  verified: boolean,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("minder_profiles")
    .update({ is_verified: verified })
    .eq("id", profileId)
    .is("deleted_at", null);

  if (error) {
    return { error: new Error(error.message) };
  }

  try {
    await logAction(
      supabase,
      adminId,
      verified ? "MINDER_VERIFIED" : "MINDER_UNVERIFIED",
      verified
        ? `Verified minder profile ${profileId}`
        : `Removed verification for minder profile ${profileId}`,
    );
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }

  return { error: null };
}

export async function fetchDisputedBookings(
  supabase: SupabaseClient,
): Promise<{ data: AdminDisputeBookingRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      owner_id,
      minder_id,
      start_datetime,
      end_datetime,
      status,
      care_instructions,
      minder_profiles ( users ( full_name ) ),
      users!bookings_owner_id_fkey ( full_name )
    `,
    )
    .eq("status", "disputed")
    .order("start_datetime", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const rows: AdminDisputeBookingRow[] = (data ?? []).map((row) => {
    const mp = row.minder_profiles as
      | { users?: unknown }
      | { users?: unknown }[]
      | null;
    const mpOne = Array.isArray(mp) ? mp[0] : mp;
    return {
      id: row.id as string,
      ownerId: row.owner_id as string,
      minderProfileId: row.minder_id as string,
      startDatetime: row.start_datetime as string,
      endDatetime: row.end_datetime as string,
      status: String(row.status),
      careInstructions: (row.care_instructions as string | null) ?? null,
      ownerName: displayNameFromUsersJoin(row.users, "Owner"),
      minderName: displayNameFromUsersJoin(mpOne?.users, "Minder"),
    };
  });

  return { data: rows, error: null };
}

export async function resolveBookingDispute(
  supabase: SupabaseClient,
  adminId: string,
  bookingId: string,
  newStatus: "confirmed" | "completed" | "cancelled",
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("bookings")
    .update({ status: newStatus })
    .eq("id", bookingId)
    .eq("status", "disputed");

  if (error) {
    return { error: new Error(error.message) };
  }

  try {
    await logAction(
      supabase,
      adminId,
      "DISPUTE_RESOLVED",
      `Resolved dispute for booking ${bookingId} as ${newStatus}`,
    );
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }

  return { error: null };
}

export async function fetchAdminReviews(
  supabase: SupabaseClient,
): Promise<{ data: AdminReviewRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      `
      id,
      reviewer_id,
      reviewee_id,
      rating,
      comment,
      is_moderated,
      created_at,
      reviewer:users!reviews_reviewer_id_fkey ( full_name, email ),
      reviewee:users!reviews_reviewee_id_fkey ( full_name, email )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    const { data: fallback, error: err2 } = await supabase
      .from("reviews")
      .select(
        `
        id,
        reviewer_id,
        reviewee_id,
        rating,
        comment,
        is_moderated,
        created_at
      `,
      )
      .order("created_at", { ascending: false });

    if (err2) {
      return { data: [], error: new Error(err2.message) };
    }

    const rowsFbBase: AdminReviewRow[] = (fallback ?? []).map((row) => ({
      id: row.id as string,
      reviewerId: row.reviewer_id as string,
      revieweeId: row.reviewee_id as string,
      rating:
        row.rating != null && !Number.isNaN(Number(row.rating))
          ? Number(row.rating)
          : null,
      comment: (row.comment as string | null) ?? null,
      isModerated: Boolean(row.is_moderated),
      reportCount: 0,
      createdAt: row.created_at as string,
      reviewerName: "User",
      revieweeName: "User",
    }));
    const rowsFb = await withReportCounts(supabase, rowsFbBase);
    return { data: rowsFb, error: null };
  }

  const rowsBase: AdminReviewRow[] = (data ?? []).map((row) => ({
    id: row.id as string,
    reviewerId: row.reviewer_id as string,
    revieweeId: row.reviewee_id as string,
    rating:
      row.rating != null && !Number.isNaN(Number(row.rating))
        ? Number(row.rating)
        : null,
    comment: (row.comment as string | null) ?? null,
    isModerated: Boolean(row.is_moderated),
    reportCount: 0,
    createdAt: row.created_at as string,
    reviewerName: displayNameFromUsersJoin(row.reviewer, "Reviewer"),
    revieweeName: displayNameFromUsersJoin(row.reviewee, "Reviewee"),
  }));

  const rows = await withReportCounts(supabase, rowsBase);

  return { data: rows, error: null };
}

async function withReportCounts(
  supabase: SupabaseClient,
  rows: AdminReviewRow[],
): Promise<AdminReviewRow[]> {
  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return rows;

  const { data, error } = await supabase
    .from("review_reports")
    .select("review_id")
    .in("review_id", ids);

  if (error) {
    return rows;
  }

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const reviewId = row.review_id;
    if (typeof reviewId !== "string") continue;
    counts.set(reviewId, (counts.get(reviewId) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...row,
    reportCount: counts.get(row.id) ?? 0,
  }));
}

export async function moderateReview(
  supabase: SupabaseClient,
  adminId: string,
  reviewId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("reviews")
    .update({ is_moderated: true })
    .eq("id", reviewId);

  if (error) {
    return { error: new Error(error.message) };
  }

  try {
    await logAction(
      supabase,
      adminId,
      "REVIEW_MODERATED",
      `Marked review ${reviewId} as moderated`,
    );
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }

  return { error: null };
}

export async function removeReview(
  supabase: SupabaseClient,
  adminId: string,
  reviewId: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);

  if (error) {
    return { error: new Error(error.message) };
  }

  try {
    await logAction(
      supabase,
      adminId,
      "REVIEW_REMOVED",
      `Removed review ${reviewId}`,
    );
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }

  return { error: null };
}
