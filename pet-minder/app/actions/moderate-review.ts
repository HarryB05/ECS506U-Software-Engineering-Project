"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moderateReview } from "@/lib/admin";

export async function serverRemoveReview(
  adminId: string,
  reviewId: string,
  revieweeId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // Soft delete the review by marking deleted_at
  const { error: updateError } = await supabase
    .from("reviews")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", reviewId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Log the action
  try {
    await supabase.from("admin_logs").insert({
      admin_id: adminId,
      action: "REVIEW_REMOVED",
      description: `Removed review ${reviewId}`,
    });
  } catch {
    // Logging should not fail the operation
  }

  // Get the minder profile ID for the reviewee to revalidate the correct path
  try {
    const { data: profiles, error: profileError } = await supabase
      .from("minder_profiles")
      .select("id")
      .eq("user_id", revieweeId)
      .is("deleted_at", null)
      .limit(1);

    if (!profileError && profiles && profiles.length > 0) {
      const profileId = profiles[0].id;
      // Revalidate the minder profile page so the review disappears from public view
      revalidatePath(`/dashboard/minders/${profileId}`);
    }
  } catch {
    // If revalidation fails, don't fail the whole operation
    // The review is already deleted from the database
  }

  return { error: null };
}

export async function serverModerateReview(
  adminId: string,
  reviewId: string,
  revieweeId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // Moderate the review (approve it)
  const { error: moderateError } = await moderateReview(
    supabase,
    adminId,
    reviewId,
  );

  if (moderateError) {
    return { error: moderateError.message };
  }

  // Revalidate the minder profile page to show the now-approved review
  try {
    const { data: profiles, error: profileError } = await supabase
      .from("minder_profiles")
      .select("id")
      .eq("user_id", revieweeId)
      .is("deleted_at", null)
      .limit(1);

    if (!profileError && profiles && profiles.length > 0) {
      const profileId = profiles[0].id;
      revalidatePath(`/dashboard/minders/${profileId}`);
    }
  } catch {
    // If revalidation fails, don't fail the whole operation
    // The review is already moderated in the database
  }

  return { error: null };
}
