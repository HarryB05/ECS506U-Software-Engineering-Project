import { Suspense } from "react";
import { redirect } from "next/navigation";
import { EyeOff } from "lucide-react";
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
import {
  ensureMinderProfileForUser,
  getMinderVerificationChecklist,
} from "@/lib/minder-profile-service";

function MinderProfileSkeleton() {
  return (
    <div className="max-w-content mx-auto space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

async function MinderProfileInner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: minderProfile, error: profileEnsureError } =
    await ensureMinderProfileForUser(supabase, user.id);
  const checklistRes = minderProfile
    ? await getMinderVerificationChecklist(supabase, minderProfile.id, user.id)
    : { data: null };

  return (
    <div className="max-w-content mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground mb-1 sm:text-3xl">
          Minder profile
        </h1>
        <p className="text-muted-foreground">
          Manage how owners find and book you.
        </p>
      </div>

      {profileEnsureError && (
        <Card className="shadow-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              Could not restore minder profile
            </CardTitle>
            <CardDescription>{profileEnsureError.message}</CardDescription>
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
        <div className="flex items-start gap-3 rounded-lg border border-warning-500/40 bg-warning-100/60 px-4 py-3 dark:bg-warning-900/20">
          <EyeOff className="mt-0.5 size-5 shrink-0 text-warning-500" />
          <div>
            <p className="text-sm font-medium text-warning-700 dark:text-warning-400">
              Your profile is hidden from owner search
            </p>
            <p className="text-xs text-warning-600 dark:text-warning-500 mt-0.5">
              Owners cannot find you until you enable &ldquo;Listed in owner
              search&rdquo; in your public profile below.
            </p>
          </div>
        </div>
      )}

      <MinderPublicProfileEditor
        userId={user.id}
        initialProfile={minderProfile}
        verificationChecklist={checklistRes.data}
      />
    </div>
  );
}

export default function MinderProfilePage() {
  return (
    <MinderWorkspaceGate>
      <Suspense fallback={<MinderProfileSkeleton />}>
        <MinderProfileInner />
      </Suspense>
    </MinderWorkspaceGate>
  );
}
