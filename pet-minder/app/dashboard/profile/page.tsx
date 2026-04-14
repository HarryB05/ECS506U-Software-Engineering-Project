import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccountSection } from "@/components/delete-account-section";
import { RoleManagementSection } from "@/components/role-management-section";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

async function ProfileContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/auth/login");
  }

  const { data: rolesData } = await supabase
    .from("roles")
    .select("role_type")
    .eq("user_id", user.id)
    .is("deleted_at", null);

  const currentRoles = (rolesData ?? [])
    .map((r) => r.role_type)
    .filter((r): r is "owner" | "minder" => r === "owner" || r === "minder");

  return (
    <div className="max-w-narrow mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl text-foreground sm:text-3xl">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Your account details and preferences.
        </p>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Email linked to your Pet Minder account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Email</Label>
          <p className="text-base text-foreground">{user.email}</p>
        </CardContent>
      </Card>

      <RoleManagementSection currentRoles={currentRoles} />

      <DeleteAccountSection email={user.email} />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-narrow mx-auto space-y-8">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
