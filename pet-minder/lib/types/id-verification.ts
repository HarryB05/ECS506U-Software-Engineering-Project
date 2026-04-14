// lib/types/id-verification.ts
// Types for the id_verifications table and related UI state.
// "ID verification" is the optional trust-boost feature (Gemini-checked
// document upload). It is separate from the criteria-based
// minder_profiles.is_verified badge.

export type IdVerificationDocType = "identity" | "certificate";

export type IdVerificationStatus = "pending" | "approved" | "rejected" | "revoked";

// ---------------------------------------------------------------------------
// Row shape returned from the DB
// ---------------------------------------------------------------------------
export interface IdVerificationRow {
  id: string;
  user_id: string;
  doc_type: IdVerificationDocType;
  storage_path: string;
  status: IdVerificationStatus;
  ai_reason: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
  revoked_reason: string | null;
  created_at: string;
  approved_at: string | null;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Shape used in the Admin panel (joined with profiles / auth.users)
// ---------------------------------------------------------------------------
export interface AdminIdVerificationRow extends IdVerificationRow {
  fullName: string;       // from profiles or minder_profiles
  email: string;          // from auth.users via admin API
  userRole: string;       // "owner" | "minder"
  revokedByName?: string; // admin who revoked, if applicable
}

// ---------------------------------------------------------------------------
// Per-user summary used in the dashboard banner
// ---------------------------------------------------------------------------
export interface UserVerificationSummary {
  identityStatus: IdVerificationStatus | null;   // null = never submitted
  certificateStatus: IdVerificationStatus | null; // null = never submitted / not required
  isMinder: boolean;
  // Derived helpers
  identityApproved: boolean;
  certificateApproved: boolean;
  fullyVerified: boolean; // true when all required docs are approved
}

// ---------------------------------------------------------------------------
// API response from /api/verify-document
// ---------------------------------------------------------------------------
export interface VerifyDocumentResponse {
  status: IdVerificationStatus;
  reason: string;
}