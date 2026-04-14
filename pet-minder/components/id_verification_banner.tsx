"use client";
// components/id-verification-banner.tsx
// Shown on the dashboard for owners and minders only.
// Displays the current verification status and a button to open
// the upload modal. Admin users see nothing (handled by caller).

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, ShieldX, ShieldQuestion, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchUserVerificationSummary } from "@/lib/id-verification";
import type { UserVerificationSummary } from "@/lib/types/id-verification";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { IdVerificationModal } from "@/components/id_verification_modal";

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------
type StatusKey = "approved" | "pending" | "rejected" | "revoked" | "not_started";

function statusMeta(key: StatusKey) {
  return {
    approved: {
      label: "ID Verified",
      icon: ShieldCheck,
      color: "text-success-500",
      bg: "bg-success-100",
    },
    pending: {
      label: "Under Review",
      icon: Loader2,
      color: "text-warning-500",
      bg: "bg-warning-100",
    },
    rejected: {
      label: "Rejected — re-upload",
      icon: ShieldX,
      color: "text-danger-500",
      bg: "bg-danger-100",
    },
    revoked: {
      label: "Revoked by admin",
      icon: ShieldAlert,
      color: "text-danger-500",
      bg: "bg-danger-100",
    },
    not_started: {
      label: "Not verified",
      icon: ShieldQuestion,
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
  }[key];
}

function deriveKey(
  summary: UserVerificationSummary,
): StatusKey {
  // Overall banner key is based on the "worst" or "most actionable" state
  const all = [summary.identityStatus];
  if (summary.isMinder) all.push(summary.certificateStatus);

  if (all.every((s) => s === "approved")) return "approved";
  if (all.some((s) => s === "revoked")) return "revoked";
  if (all.some((s) => s === "rejected")) return "rejected";
  if (all.some((s) => s === "pending")) return "pending";
  return "not_started";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function IdVerificationBanner() {
  const [summary, setSummary] = useState<UserVerificationSummary | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;
    setUserId(user.id);

    // Don't show banner for admins
    const { data: roleRows } = await supabase
      .from("roles")
      .select("role_type")
      .eq("user_id", user.id)
      .is("deleted_at", null);

    const roles = (roleRows ?? []).map((r) => r.role_type);
    if (roles.includes("admin") && !roles.includes("owner") && !roles.includes("minder")) {
      setLoading(false);
      return;
    }

    const { data } = await fetchUserVerificationSummary(supabase, user.id);
    setSummary(data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  // Reload summary after modal closes
  function handleModalClose(submitted: boolean) {
    setModalOpen(false);
    if (submitted) void load();
  }

  if (loading) {
    return (
      <Card className="border-border bg-card shadow-card">
        <CardContent className="flex items-center gap-3 py-4">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading verification status…</span>
        </CardContent>
      </Card>
    );
  }

  // Admin-only users — render nothing
  if (!summary) return null;

  const key = deriveKey(summary);
  const meta = statusMeta(key);
  const Icon = meta.icon;
  const isFullyVerified = key === "approved";

  // Text for the banner body
  const bodyText = summary.isMinder
    ? isFullyVerified
      ? "Your government ID and certificates have been verified. Owners can see your verified badge."
      : "Upload your government ID and any professional certificates to boost owner trust."
    : isFullyVerified
    ? "Your government ID has been verified."
    : "Upload your government ID to build trust with minders.";

  // Button label
  const btnLabel =
    key === "not_started"
      ? "Verify ID"
      : key === "rejected" || key === "revoked"
      ? "Re-upload documents"
      : key === "pending"
      ? "View status"
      : "View verification";

  return (
    <>
      <Card
        className={cn(
          "border-border bg-card shadow-card transition-all duration-150 hover:border-teal-300 hover:shadow-card-hover",
        )}
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", meta.bg)}>
              <Icon
                className={cn("size-5", meta.color, key === "pending" && "animate-spin")}
                aria-hidden
              />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{meta.label}</p>
              <p className="text-xs text-muted-foreground">{bodyText}</p>
            </div>
          </div>

          {!isFullyVerified && (
            <Button
              type="button"
              size="sm"
              variant={key === "rejected" || key === "revoked" ? "default" : "outline"}
              onClick={() => setModalOpen(true)}
            >
              {btnLabel}
            </Button>
          )}
        </CardContent>
      </Card>

      {modalOpen && userId && summary && (
        <IdVerificationModal
          userId={userId}
          isMinder={summary.isMinder}
          currentSummary={summary}
          onClose={handleModalClose}
        />
      )}
    </>
  );
}