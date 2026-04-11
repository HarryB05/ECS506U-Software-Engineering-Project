import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Clock, EyeOff, Home, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MinderWorkspaceGate } from "@/components/minder-workspace-gate";
import { MinderPublicProfileEditor } from "@/components/minder-public-profile-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { ensureMinderProfileForUser } from "@/lib/minder-profile-service";

function MinderWorkspaceSkeleton() {
  return (
    <div className="max-w-content mx-auto space-y-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 w-full" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

async function MinderWorkspaceInner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: minderProfile, error: profileEnsureError } =
    await ensureMinderProfileForUser(supabase, user.id);

  return (
    <div className="max-w-content mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl text-foreground mb-1 sm:text-3xl">
          Minder workspace
        </h1>
        <p className="text-muted-foreground">
          Manage how owners find and book you.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="md:col-span-2 xl:col-span-3">
          {profileEnsureError && (
            <Card className="shadow-card border-border mb-4">
              <CardHeader>
                <CardTitle className="text-lg font-medium">
                  Could not restore minder profile
                </CardTitle>
                <CardDescription>
                  {profileEnsureError.message}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Check that your Supabase project allows inserts on{" "}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                    minder_profiles
                  </code>{" "}
                  for users with the minder role, or add a row manually in the
                  Table Editor with your user ID.
                </p>
              </CardContent>
            </Card>
          )}
          {minderProfile && !minderProfile.visible_in_search && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-warning-500/40 bg-warning-100/60 px-4 py-3 dark:bg-warning-900/20">
              <EyeOff className="mt-0.5 size-5 shrink-0 text-warning-500" />
              <div>
                <p className="text-sm font-medium text-warning-700 dark:text-warning-400">
                  Your profile is hidden from owner search
                </p>
                <p className="text-xs text-warning-600 dark:text-warning-500 mt-0.5">
                  Owners cannot find you until you enable &ldquo;Listed in owner search&rdquo; in your public profile below.
                </p>
              </div>
            </div>
          )}
          <MinderPublicProfileEditor
            userId={user.id}
            initialProfile={minderProfile}
          />
        </div>
        <Card className="shadow-card md:col-span-2 xl:col-span-3">
          <CardHeader>
            <div className="mb-2 inline-flex rounded-lg bg-teal-50 p-2.5 dark:bg-teal-900/30 w-full">
              <Clock className="size-5 text-teal-700 dark:text-teal-300" />
            </div>
            <CardTitle className="text-lg font-medium">Availability</CardTitle>
            <CardDescription>
              Set weekly hours when you are available for bookings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MinderWorkspacePage() {
  return (
    <MinderWorkspaceGate>
      <Suspense fallback={<MinderWorkspaceSkeleton />}>
        <MinderWorkspaceInner />
      </Suspense>
    </MinderWorkspaceGate>
  );
}
