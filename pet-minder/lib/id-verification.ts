// lib/id-verification.ts
// All DB operations for the id_verifications table.
// API routes use the service-role client; client components pass their
// own Supabase client so RLS is enforced correctly.

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdminIdVerificationRow,
  IdVerificationDocType,
  IdVerificationRow,
  IdVerificationStatus,
  UserVerificationSummary,
} from "@/lib/types/id-verification";

// ---------------------------------------------------------------------------
// User-facing: fetch their own latest record per doc_type
// ---------------------------------------------------------------------------
export async function fetchUserVerificationSummary(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ data: UserVerificationSummary; error: null } | { data: null; error: Error }> {
  try {
    // Get most-recent record for each doc_type
    const { data: rows, error } = await supabase
      .from("id_verifications")
      .select("doc_type, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return { data: null, error: new Error(error.message) };

    // Get user roles
    const { data: roleRows } = await supabase
      .from("roles")
      .select("role_type")
      .eq("user_id", userId)
      .is("deleted_at", null);

    const isMinder = (roleRows ?? []).some((r) => r.role_type === "minder");

    // Latest per type (rows are newest-first so first match wins)
    const latestIdentity = (rows ?? []).find((r) => r.doc_type === "identity");
    const latestCert = (rows ?? []).find((r) => r.doc_type === "certificate");

    const identityStatus = (latestIdentity?.status as IdVerificationStatus) ?? null;
    const certificateStatus = (latestCert?.status as IdVerificationStatus) ?? null;

    const identityApproved = identityStatus === "approved";
    const certificateApproved = !isMinder || certificateStatus === "approved";
    const fullyVerified = identityApproved && certificateApproved;

    return {
      data: {
        identityStatus,
        certificateStatus,
        isMinder,
        identityApproved,
        certificateApproved,
        fullyVerified,
      },
      error: null,
    };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

// ---------------------------------------------------------------------------
// User-facing: insert a new pending row (called from API route after upload)
// Always uses service-role client since we write from the server.
// ---------------------------------------------------------------------------
export async function insertPendingVerification(
  supabase: SupabaseClient,
  userId: string,
  docType: IdVerificationDocType,
  storagePath: string,
): Promise<{ data: IdVerificationRow | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("id_verifications")
    .insert({
      user_id: userId,
      doc_type: docType,
      storage_path: storagePath,
      status: "pending",
    })
    .select()
    .single();

  if (error) return { data: null, error: new Error(error.message) };
  return { data: data as IdVerificationRow, error: null };
}

// ---------------------------------------------------------------------------
// Server-only: write Gemini result back (called from API route)
// ---------------------------------------------------------------------------
export async function updateVerificationResult(
  supabase: SupabaseClient,
  id: string,
  status: "approved" | "rejected",
  aiReason: string,
  geminiRaw: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("id_verifications")
    .update({
      status,
      ai_reason: aiReason,
      gemini_raw: geminiRaw,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", id);

  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ---------------------------------------------------------------------------
// Admin: fetch all verification rows joined with user display info
// ---------------------------------------------------------------------------
export async function fetchAdminVerifications(
  supabase: SupabaseClient,
): Promise<{ data: AdminIdVerificationRow[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("id_verifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: new Error(error.message) };

  const baseRows = (data ?? []) as IdVerificationRow[];
  const userIds = Array.from(new Set(baseRows.map((row) => row.user_id)));

  const { data: userRows } = userIds.length
    ? await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", userIds)
    : { data: [] as { id: string; full_name: string | null; email: string | null }[] };

  const usersById = new Map(
    (userRows ?? []).map((u) => [u.id, { fullName: u.full_name, email: u.email }]),
  );

  const rows: AdminIdVerificationRow[] = baseRows.map((row) => ({
    ...row,
    fullName: usersById.get(row.user_id)?.fullName ?? "Unknown user",
    email: usersById.get(row.user_id)?.email ?? row.user_id,
    userRole: "unknown",   // enriched in component if needed
  }));

  return { data: rows, error: null };
}

// ---------------------------------------------------------------------------
// Admin: revoke a verification
// ---------------------------------------------------------------------------
export async function revokeIdVerification(
  supabase: SupabaseClient,
  adminId: string,
  verificationId: string,
  reason: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("id_verifications")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: adminId,
      revoked_reason: reason,
    })
    .eq("id", verificationId)
    .eq("status", "approved"); // safety: only revoke approved ones

  if (error) return { error: new Error(error.message) };
  return { error: null };
}

// ---------------------------------------------------------------------------
// Storage: generate a short-lived signed URL for admin to view a document
// ---------------------------------------------------------------------------
export async function getVerificationDocSignedUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 300,
): Promise<{ url: string | null; error: Error | null }> {
  const { data, error } = await supabase.storage
    .from("id-verification-docs")
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) return { url: null, error: new Error(error.message) };
  return { url: data.signedUrl, error: null };
}