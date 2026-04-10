import type { SupabaseClient } from "@supabase/supabase-js";

export type BookingReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

export type PublicReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reporterCount: number;
};

function parseRating(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (value != null) {
    const n = Number(value);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return null;
}

function toCleanComment(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, 1000);
}

function averageFromRatings(rows: unknown[]): number | null {
  let total = 0;
  let count = 0;
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rating = parseRating((row as { rating?: unknown }).rating);
    if (rating == null) continue;
    total += rating;
    count += 1;
  }
  if (count === 0) return null;
  return total / count;
}

export async function getAverageRatingForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: number | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating, is_moderated")
    .eq("reviewee_id", userId)
    .eq("is_moderated", true)
    .not("rating", "is", null);

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: averageFromRatings((data ?? []) as unknown[]), error: null };
}

export async function getAverageRatingsForUsers(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<{ data: Map<string, number>; error: Error | null }> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return { data: new Map<string, number>(), error: null };
  }

  const { data, error } = await supabase
    .from("reviews")
    .select("reviewee_id, rating, is_moderated")
    .in("reviewee_id", uniqueIds)
    .eq("is_moderated", true)
    .not("rating", "is", null);

  if (error) {
    return { data: new Map<string, number>(), error: new Error(error.message) };
  }

  const byUser = new Map<string, { total: number; count: number }>();
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const revieweeId = row.reviewee_id;
    if (typeof revieweeId !== "string") continue;
    const rating = parseRating(row.rating);
    if (rating == null) continue;
    const prev = byUser.get(revieweeId) ?? { total: 0, count: 0 };
    prev.total += rating;
    prev.count += 1;
    byUser.set(revieweeId, prev);
  }

  const averages = new Map<string, number>();
  for (const [id, agg] of byUser.entries()) {
    if (agg.count > 0) {
      averages.set(id, agg.total / agg.count);
    }
  }

  return { data: averages, error: null };
}

export async function getExistingReviewForBooking(
  supabase: SupabaseClient,
  reviewerId: string,
  bookingId: string,
): Promise<{ data: BookingReviewRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at")
    .eq("reviewer_id", reviewerId)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  if (!data) {
    return { data: null, error: null };
  }

  const rating = parseRating(data.rating);
  if (rating == null) {
    return { data: null, error: null };
  }

  return {
    data: {
      id: data.id as string,
      rating,
      comment: (data.comment as string | null) ?? null,
      createdAt: data.created_at as string,
    },
    error: null,
  };
}

export async function listPublicReviewsForUser(
  supabase: SupabaseClient,
  revieweeId: string,
  options?: { limit?: number },
): Promise<{ data: PublicReviewItem[]; error: Error | null }> {
  const limit =
    typeof options?.limit === "number" && options.limit > 0
      ? Math.min(options.limit, 50)
      : 10;

  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at")
    .eq("reviewee_id", revieweeId)
    .eq("is_moderated", true)
    .not("rating", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { data: [], error: new Error(error.message) };
  }

  const ids = (data ?? [])
    .map((row) => (typeof row.id === "string" ? row.id : null))
    .filter((id): id is string => id !== null);

  const reportCountByReview = new Map<string, number>();
  if (ids.length > 0) {
    const reportRes = await supabase
      .from("review_reports")
      .select("review_id")
      .in("review_id", ids);
    if (!reportRes.error) {
      for (const row of (reportRes.data ?? []) as Record<string, unknown>[]) {
        const reviewId = row.review_id;
        if (typeof reviewId !== "string") continue;
        reportCountByReview.set(
          reviewId,
          (reportCountByReview.get(reviewId) ?? 0) + 1,
        );
      }
    }
  }

  const rows: PublicReviewItem[] = [];
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const id = row.id;
    const rating = parseRating(row.rating);
    if (typeof id !== "string" || rating == null) continue;
    rows.push({
      id,
      rating,
      comment: (row.comment as string | null) ?? null,
      createdAt: String(row.created_at),
      reporterCount: reportCountByReview.get(id) ?? 0,
    });
  }

  return { data: rows, error: null };
}

export async function reportReview(
  supabase: SupabaseClient,
  input: {
    reviewId: string;
    reporterId: string;
    reason?: string | null;
  },
): Promise<{ error: Error | null }> {
  const reason = toCleanComment(input.reason);

  const { error } = await supabase.from("review_reports").insert({
    review_id: input.reviewId,
    reporter_id: input.reporterId,
    reason,
  });

  if (!error) {
    return { error: null };
  }

  if (error.code === "23505") {
    return { error: new Error("You have already reported this review.") };
  }

  return { error: new Error(error.message) };
}

export async function submitBookingReview(
  supabase: SupabaseClient,
  input: {
    bookingId: string;
    reviewerId: string;
    rating: number;
    comment?: string | null;
  },
): Promise<{ error: Error | null }> {
  const rounded = Math.round(input.rating);
  if (!Number.isFinite(input.rating) || rounded < 1 || rounded > 5) {
    return { error: new Error("Rating must be a whole number from 1 to 5.") };
  }

  const { data: bookingRow, error: bookingErr } = await supabase
    .from("bookings")
    .select("id, owner_id, minder_id, end_datetime, status, cancelled_at, minder_profiles ( user_id )")
    .eq("id", input.bookingId)
    .maybeSingle();

  if (bookingErr) {
    return { error: new Error(bookingErr.message) };
  }
  if (!bookingRow) {
    return { error: new Error("Booking not found.") };
  }

  const ownerId = bookingRow.owner_id as string;
  const mp = bookingRow.minder_profiles as { user_id?: string } | { user_id?: string }[] | null;
  const mpOne = Array.isArray(mp) ? mp[0] : mp;
  const minderUserId =
    mpOne && typeof mpOne.user_id === "string" ? mpOne.user_id : null;

  if (!minderUserId) {
    return { error: new Error("Unable to resolve minder account for this booking.") };
  }

  let revieweeId: string | null = null;
  if (input.reviewerId === ownerId) {
    revieweeId = minderUserId;
  } else if (input.reviewerId === minderUserId) {
    revieweeId = ownerId;
  }

  if (!revieweeId) {
    return { error: new Error("Only booking participants can submit a review.") };
  }

  if (bookingRow.cancelled_at) {
    return { error: new Error("Cancelled bookings cannot be reviewed.") };
  }

  const endMs = Date.parse(String(bookingRow.end_datetime));
  const bookingCompleted = String(bookingRow.status) === "completed";
  if (Number.isNaN(endMs) || (Date.now() < endMs && !bookingCompleted)) {
    return {
      error: new Error(
        "Reviews are available only after the booking end time.",
      ),
    };
  }

  const existing = await getExistingReviewForBooking(
    supabase,
    input.reviewerId,
    input.bookingId,
  );
  if (existing.error) {
    return { error: existing.error };
  }
  if (existing.data) {
    return { error: new Error("You have already reviewed this booking.") };
  }

  const { error } = await supabase.from("reviews").insert({
    reviewer_id: input.reviewerId,
    reviewee_id: revieweeId,
    booking_id: input.bookingId,
    rating: rounded,
    comment: toCleanComment(input.comment),
    is_moderated: false,
  });

  if (error) {
    return { error: new Error(error.message) };
  }

  return { error: null };
}
