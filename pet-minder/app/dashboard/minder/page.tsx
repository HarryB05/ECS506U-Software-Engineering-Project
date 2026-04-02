import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Clock, Home, ShieldCheck } from "lucide-react";
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
import { getMinderProfileByUserId } from "@/lib/minder-profile-service";

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

  const { data: minderProfile } = await getMinderProfileByUserId(
    supabase,
    user.id,
  );

  return (
    <div className="max-w-content mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl text-foreground mb-1">
          Minder workspace
        </h1>
        <p className="text-muted-foreground">
          Manage how owners find and book you.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <MinderPublicProfileEditor
            userId={user.id}
            initialProfile={minderProfile}
          />
        </div>
        <Card className="shadow-card">
          <CardHeader>
            <div className="mb-2 inline-flex rounded-lg bg-teal-50 p-2.5 dark:bg-teal-900/30">
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
        <Card className="shadow-card">
          <CardHeader>
            <div className="mb-2 inline-flex rounded-lg bg-teal-50 p-2.5 dark:bg-teal-900/30">
              <ShieldCheck className="size-5 text-teal-700 dark:text-teal-300" />
            </div>
            <CardTitle className="text-lg font-medium">Verification</CardTitle>
            <CardDescription>
              Verification status and reviews from completed bookings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Coming soon.</p>
          </CardContent>
        </Card>
        <Card className="shadow-card opacity-80">
          <CardHeader>
            <div className="mb-2 inline-flex rounded-lg bg-teal-50 p-2.5 dark:bg-teal-900/30">
              <Home className="size-5 text-teal-700 dark:text-teal-300" />
            </div>
            <CardTitle className="text-lg font-medium">Quick tips</CardTitle>
            <CardDescription>
              Clear pricing and pet types help owners book with confidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use the profile card above to describe your services. Availability
              scheduling will appear here in a future update.
            </p>
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
