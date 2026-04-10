import { Suspense } from "react";
import { DashboardAppShell } from "@/components/dashboard-app-shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardLayoutFallback() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 border-b border-border bg-card">
        <div className="mx-auto flex h-full max-w-content items-center px-4 md:px-6">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <main className="min-h-[calc(100vh-4rem)] p-4 md:p-6">
        <Skeleton className="mx-auto h-40 max-w-content w-full" />
      </main>
    </div>
  );
}

async function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (userRow?.is_active === false) {
    redirect("/account-suspended");
  }

  const { data: roles } = await supabase
    .from("roles")
    .select("role_type")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  if (!roles || roles.length === 0) {
    redirect("/onboarding");
  }

  const roleTypes = roles.map((r) => r.role_type);

  return (
    <DashboardAppShell roleTypes={roleTypes}>{children}</DashboardAppShell>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<DashboardLayoutFallback />}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
