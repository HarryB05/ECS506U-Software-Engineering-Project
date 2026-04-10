"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Inbox,
  MessageSquare,
  Scale,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchAdminMinders,
  fetchAdminReviews,
  fetchAdminStats,
  fetchAdminUsers,
  fetchDisputedBookings,
  moderateReview,
  removeReview,
  resolveBookingDispute,
  setMinderVerified,
  setUserSuspended,
} from "@/lib/admin";
import type {
  AdminDisputeBookingRow,
  AdminMinderRow,
  AdminReviewRow,
  AdminStats,
  AdminTab,
  AdminUserRow,
} from "@/lib/types/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ToastItem = { id: number; type: "success" | "error"; message: string };

function useAdminToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const ids = useRef(0);

  const pushToast = useCallback(
    (type: "success" | "error", message: string) => {
      const id = ++ids.current;
      setToasts((t) => [...t, { id, type, message }]);
      window.setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 4000);
    },
    [],
  );

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  return { toasts, pushToast, dismiss };
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 p-0"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-card",
            t.type === "success" && "bg-success-100 text-success-500",
            t.type === "error" && "bg-danger-100 text-danger-500",
          )}
        >
          <p className="min-w-0 flex-1 font-medium leading-snug">{t.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="shrink-0 rounded-md p-1 text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function formatWhen(iso: string): string {
  try {
    return format(parseISO(iso), "dd MMM yyyy, HH:mm");
  } catch {
    return iso;
  }
}

function UsersTab({
  rows,
  adminId,
  onRefresh,
  pushToast,
}: {
  rows: AdminUserRow[];
  adminId: string;
  onRefresh: () => Promise<void>;
  pushToast: (type: "success" | "error", message: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleSuspend(userId: string, suspend: boolean) {
    if (userId === adminId) {
      pushToast("error", "You cannot change your own account status.");
      return;
    }
    setBusyId(userId);
    const supabase = createClient();
    const { error } = await setUserSuspended(supabase, adminId, userId, suspend);
    setBusyId(null);
    if (error) {
      pushToast("error", error.message);
      return;
    }
    pushToast(
      "success",
      suspend ? "User account suspended." : "User account reactivated.",
    );
    await onRefresh();
  }

  if (rows.length === 0) {
    return (
      <Card className="border-border bg-card shadow-card transition-all duration-150 hover:border-teal-300 hover:shadow-card-hover">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Users className="size-12 text-muted-foreground" aria-hidden />
          <p className="font-medium text-muted-foreground">
            No registered users match this view.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((u) => {
        const active = u.is_active !== false;
        const rolesLabel =
          u.role_types.length > 0 ? u.role_types.join(", ") : "No roles";
        return (
          <Card
            key={u.id}
            className="border-border bg-card shadow-card transition-all duration-150 hover:border-teal-300 hover:shadow-card-hover"
          >
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-display text-lg font-medium">
                    {u.full_name?.trim() || "Unnamed user"}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {u.email ?? "No email"} · Joined {formatWhen(u.created_at)}
                  </CardDescription>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                    active
                      ? "bg-success-100 text-success-500"
                      : "bg-danger-100 text-danger-500",
                  )}
                >
                  {active ? "Active" : "Suspended"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Roles: {rolesLabel}</p>
              <div className="flex flex-wrap gap-2">
                {active ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyId === u.id || u.id === adminId}
                    onClick={() => handleSuspend(u.id, true)}
                  >
                    <Ban className="size-4" />
                    Suspend
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    disabled={busyId === u.id}
                    onClick={() => handleSuspend(u.id, false)}
                  >
                    <UserCheck className="size-4" />
                    Reactivate
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MindersTab({
  rows,
  adminId,
  onRefresh,
  pushToast,
}: {
  rows: AdminMinderRow[];
  adminId: string;
  onRefresh: () => Promise<void>;
  pushToast: (type: "success" | "error", message: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleVerify(profileId: string, verified: boolean) {
    setBusyId(profileId);
    const supabase = createClient();
    const { error } = await setMinderVerified(
      supabase,
      adminId,
      profileId,
      verified,
    );
    setBusyId(null);
    if (error) {
      pushToast("error", error.message);
      return;
    }
    pushToast(
      "success",
      verified ? "Minder profile verified." : "Verification removed.",
    );
    await onRefresh();
  }

  if (rows.length === 0) {
    return (
      <Card className="border-border bg-card shadow-card transition-all duration-150 hover:border-teal-300 hover:shadow-card-hover">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Inbox className="size-12 text-muted-foreground" aria-hidden />
          <p className="font-medium text-muted-foreground">
            No minder profiles to show.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((m) => (
        <Card
          key={m.profileId}
          className="border-border bg-card shadow-card transition-all duration-150 hover:border-teal-300 hover:shadow-card-hover"
        >
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="font-display text-lg font-medium">
                  {m.fullName}
                </CardTitle>
                <CardDescription className="text-xs">{m.email}</CardDescription>
              </div>
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                  m.isVerified
                    ? "bg-success-100 text-success-500"
                    : "bg-warning-100 text-warning-500",
                )}
              >
                {m.isVerified ? "Verified" : "Pending verification"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {m.serviceDescription ? (
              <p className="text-xs text-muted-foreground line-clamp-3">
                {m.serviceDescription}
              </p>
            ) : null}
            {m.supportedPetTypes.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Pets: {m.supportedPetTypes.join(", ")}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {!m.isVerified ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={busyId === m.profileId}
                  onClick={() => handleVerify(m.profileId, true)}
                >
                  <CheckCircle2 className="size-4" />
                  Verify profile
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busyId === m.profileId}
                  onClick={() => handleVerify(m.profileId, false)}
                >
                  Remove verification
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DisputesTab({
  rows,
  adminId,
  onRefresh,
  pushToast,
}: {
  rows: AdminDisputeBookingRow[];
  adminId: string;
  onRefresh: () => Promise<void>;
  pushToast: (type: "success" | "error", message: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleResolve(
    bookingId: string,
    status: "confirmed" | "completed" | "cancelled",
  ) {
    setBusyId(bookingId);
    const supabase = createClient();
    const { error } = await resolveBookingDispute(
      supabase,
      adminId,
      bookingId,
      status,
    );
    setBusyId(null);
    if (error) {
      pushToast("error", error.message);
      return;
    }
    pushToast("success", "Dispute resolved.");
    await onRefresh();
  }

  if (rows.length === 0) {
    return (
      <Card className="border-border bg-card shadow-card transition-all duration-150 hover:border-teal-300 hover:shadow-card-hover">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Scale className="size-12 text-muted-foreground" aria-hidden />
          <p className="font-medium text-muted-foreground">
            No bookings are currently in dispute.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((b) => (
        <Card
          key={b.id}
          className="border-border bg-card shadow-card transition-all duration-150 hover:border-teal-300 hover:shadow-card-hover"
        >
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="font-display text-lg font-medium">
                  Booking dispute
                </CardTitle>
                <CardDescription className="text-xs">
                  {formatWhen(b.startDatetime)} – {formatWhen(b.endDatetime)}
                </CardDescription>
              </div>
              <span className="inline-flex items-center rounded-md bg-danger-100 px-2 py-1 text-xs font-medium text-danger-500">
                Disputed
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Owner: </span>
                {b.ownerName}
              </p>
              <p>
                <span className="text-muted-foreground">Minder: </span>
                {b.minderName}
              </p>
            </div>
            {b.careInstructions ? (
              <p className="text-xs text-muted-foreground">
                Care notes: {b.careInstructions}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={busyId === b.id}
                onClick={() => handleResolve(b.id, "confirmed")}
              >
                Resolve as confirmed
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyId === b.id}
                onClick={() => handleResolve(b.id, "completed")}
              >
                Resolve as completed
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyId === b.id}
                onClick={() => handleResolve(b.id, "cancelled")}
              >
                Resolve as cancelled
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ReviewsTab({
  rows,
  adminId,
  onRefresh,
  onResolveFromQueue,
  pushToast,
}: {
  rows: AdminReviewRow[];
  adminId: string;
  onRefresh: () => Promise<void>;
  onResolveFromQueue: (reviewId: string) => void;
  pushToast: (type: "success" | "error", message: string) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleModerate(reviewId: string) {
    setBusyId(reviewId);
    const supabase = createClient();
    const { error } = await moderateReview(supabase, adminId, reviewId);
    setBusyId(null);
    if (error) {
      pushToast("error", error.message);
      return;
    }
    onResolveFromQueue(reviewId);
    pushToast("success", "Review approved and republished.");
    await onRefresh();
  }

  async function handleRemove(reviewId: string) {
    setBusyId(reviewId);
    const supabase = createClient();
    const { error } = await removeReview(supabase, adminId, reviewId);
    setBusyId(null);
    if (error) {
      pushToast("error", error.message);
      return;
    }
    onResolveFromQueue(reviewId);
    pushToast("success", "Review removed.");
    await onRefresh();
  }

  if (rows.length === 0) {
    return (
      <Card className="border-border bg-card shadow-card transition-all duration-150 hover:border-teal-300 hover:shadow-card-hover">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <MessageSquare className="size-12 text-muted-foreground" aria-hidden />
          <p className="font-medium text-muted-foreground">
            No reported reviews to moderate.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <Card
          key={r.id}
          className="border-border bg-card shadow-card transition-all duration-150 hover:border-teal-300 hover:shadow-card-hover"
        >
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="font-display text-lg font-medium">
                  Review
                </CardTitle>
                <CardDescription className="text-xs">
                  {formatWhen(r.createdAt)}
                </CardDescription>
              </div>
              <span
                className="inline-flex items-center rounded-md bg-warning-100 px-2 py-1 text-xs font-medium text-warning-500"
              >
                Reported
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-xs sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">From: </span>
                {r.reviewerName}
              </p>
              <p>
                <span className="text-muted-foreground">About: </span>
                {r.revieweeName}
              </p>
            </div>
            {r.rating != null ? (
              <p className="text-xs text-muted-foreground">
                Rating: {r.rating} / 5
              </p>
            ) : null}
            {r.comment ? (
              <p className="text-xs text-foreground">{r.comment}</p>
            ) : (
              <p className="text-xs text-muted-foreground">No comment text.</p>
            )}
            {r.reportCount > 0 ? (
              <p className="text-xs text-warning-500">
                Reported by {r.reportCount} user{r.reportCount === 1 ? "" : "s"}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={busyId === r.id}
                onClick={() => handleModerate(r.id)}
              >
                Resolve report (keep review)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busyId === r.id}
                onClick={() => handleRemove(r.id)}
              >
                Remove review
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdminPanelSkeleton() {
  return (
    <div className="mx-auto max-w-content space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export function AdminPanelContent() {
  const router = useRouter();
  const { toasts, pushToast, dismiss } = useAdminToasts();

  const [forbidden, setForbidden] = useState(false);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [initialReady, setInitialReady] = useState(false);

  const [tab, setTab] = useState<AdminTab>("users");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [minders, setMinders] = useState<AdminMinderRow[]>([]);
  const [disputes, setDisputes] = useState<AdminDisputeBookingRow[]>([]);
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);

  const handleReviewResolvedFromQueue = useCallback((reviewId: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    setStats((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reportedReviews: Math.max(0, prev.reportedReviews - 1),
      };
    });
  }, []);

  const loadAll = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    const { data: roleRows } = await supabase
      .from("roles")
      .select("role_type")
      .eq("user_id", user.id)
      .is("deleted_at", null);

    const isAdmin = (roleRows ?? []).some((r) => r.role_type === "admin");
    if (!isAdmin) {
      setForbidden(true);
      setInitialReady(true);
      return;
    }

    setAdminId(user.id);
    setForbidden(false);

    const [sRes, uRes, mRes, dRes, rRes] = await Promise.all([
      fetchAdminStats(supabase),
      fetchAdminUsers(supabase),
      fetchAdminMinders(supabase),
      fetchDisputedBookings(supabase),
      fetchAdminReviews(supabase),
    ]);

    if (sRes.error) pushToast("error", sRes.error.message);
    setStats(sRes.data);

    if (uRes.error) pushToast("error", uRes.error.message);
    setUsers(uRes.data);

    if (mRes.error) pushToast("error", mRes.error.message);
    setMinders(mRes.data);

    if (dRes.error) pushToast("error", dRes.error.message);
    setDisputes(dRes.data);

    if (rRes.error) pushToast("error", rRes.error.message);
    setReviews(rRes.data);

    setInitialReady(true);
  }, [pushToast, router]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const statCards = useMemo(() => {
    const s = stats ?? {
      userCount: 0,
      mindersPendingVerification: 0,
      disputedBookings: 0,
      reportedReviews: 0,
    };
    return [
      {
        id: "users" as const,
        label: "Users",
        value: s.userCount,
        hint: "Registered accounts",
        icon: Users,
      },
      {
        id: "minders" as const,
        label: "Verify",
        value: s.mindersPendingVerification,
        hint: "Minders pending verification",
        icon: ShieldCheck,
      },
      {
        id: "disputes" as const,
        label: "Disputes",
        value: s.disputedBookings,
        hint: "Bookings in dispute",
        icon: Scale,
      },
      {
        id: "reviews" as const,
        label: "Reported",
        value: s.reportedReviews,
        hint: "Reviews awaiting admin action",
        icon: MessageSquare,
      },
    ];
  }, [stats]);

  if (!initialReady && !forbidden) {
    return (
      <>
        <AdminPanelSkeleton />
        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </>
    );
  }

  if (forbidden) {
    return (
      <>
        <div className="mx-auto max-w-content">
          <Card className="border-border bg-card shadow-card">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <AlertTriangle className="size-12 text-warning-500" aria-hidden />
              <div className="space-y-1">
                <h1 className="font-display text-2xl font-medium text-foreground">
                  Access restricted
                </h1>
                <p className="text-sm text-muted-foreground">
                  You need an administrator role to open this page.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Back to dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </>
    );
  }

  if (!adminId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-content space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-3xl font-medium text-foreground">
          Admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage users, minder verification, booking disputes, and reviews.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((c) => {
          const Icon = c.icon;
          const active = tab === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setTab(c.id)}
              className={cn(
                "rounded-xl border border-border bg-card p-4 text-left shadow-card transition-all duration-150 hover:border-teal-300 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                active && "border-teal-300 ring-1 ring-teal-300",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {c.label}
                </span>
                <Icon className="size-6 shrink-0 text-teal-500" aria-hidden />
              </div>
              <p className="mt-2 font-display text-2xl font-medium text-foreground">
                {c.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
            </button>
          );
        })}
      </div>

      <section aria-label="Admin workspace">
        {tab === "users" ? (
          <UsersTab
            rows={users}
            adminId={adminId}
            onRefresh={loadAll}
            pushToast={pushToast}
          />
        ) : tab === "minders" ? (
          <MindersTab
            rows={minders}
            adminId={adminId}
            onRefresh={loadAll}
            pushToast={pushToast}
          />
        ) : tab === "disputes" ? (
          <DisputesTab
            rows={disputes}
            adminId={adminId}
            onRefresh={loadAll}
            pushToast={pushToast}
          />
        ) : (
          <ReviewsTab
            rows={reviews}
            adminId={adminId}
            onRefresh={loadAll}
            onResolveFromQueue={handleReviewResolvedFromQueue}
            pushToast={pushToast}
          />
        )}
      </section>

      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
