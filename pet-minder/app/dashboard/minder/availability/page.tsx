import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MinderWorkspaceGate } from "@/components/minder-workspace-gate";
import { AvailabilityScheduleEditor } from "@/components/availability-schedule-editor";
import { createClient } from "@/lib/supabase/server";
import { ensureMinderProfileForUser } from "@/lib/minder-profile-service";
import { getMinderAvailability } from "@/lib/availability-service";

function AvailabilitySkeleton() {
  return (
    <div className="max-w-medium mx-auto space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

async function AvailabilityPageInner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: minderProfile, error: profileError } =
    await ensureMinderProfileForUser(supabase, user.id);

  const { data: slots } = minderProfile
    ? await getMinderAvailability(supabase, minderProfile.id)
    : { data: [] };

  return (
    <div className="max-w-medium mx-auto space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-4 -ml-2 gap-2">
          <Link href="/dashboard/minder">
            <ArrowLeft className="size-4" />
            Back to workspace
          </Link>
        </Button>
        <h1 className="font-display text-2xl text-foreground mb-1 sm:text-3xl">
          Availability schedule
        </h1>
        <p className="text-muted-foreground">
          Set the hours you accept bookings. Owners see this when browsing your
          profile and choosing a time.
        </p>
      </div>

      {profileError && (
        <Card className="shadow-card border-danger-500/30 bg-danger-100">
          <CardContent className="pt-6">
            <p className="text-sm text-danger-500">{profileError.message}</p>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <div className="mb-2 inline-flex rounded-lg bg-teal-50 p-2.5 dark:bg-teal-900/30">
            <Clock className="size-5 text-teal-700 dark:text-teal-300" />
          </div>
          <CardTitle className="text-lg font-medium">Weekly hours</CardTitle>
          <CardDescription>
            Add one or more time windows for each day you are available. Owners
            will be able to pick from these when booking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {minderProfile ? (
            <AvailabilityScheduleEditor
              minderProfileId={minderProfile.id}
              initialSlots={slots ?? []}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Your minder profile could not be loaded. Try refreshing the page.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        Changes are saved immediately when you add or remove a slot. There is no
        separate save button.
      </p>
    </div>
  );
}

export default function MinderAvailabilityPage() {
  return (
    <MinderWorkspaceGate>
      <Suspense fallback={<AvailabilitySkeleton />}>
        <AvailabilityPageInner />
      </Suspense>
    </MinderWorkspaceGate>
  );
}
