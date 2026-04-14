import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccountSection } from "@/components/delete-account-section";
import { ProfileRolePreferences } from "@/components/profile-role-preferences";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";

type RoleType = "owner" | "minder";

async function ProfileContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/auth/login");
  }

<<<<<<< HEAD
  // Get verification status
  const { data: verification } = await supabase
    .from('verification_records')
    .select('status, verified_at, revoked_at')
    .eq('user_id', user.id)
    .single();

  const getVerificationDisplay = () => {
    if (!verification) {
      return {
        status: 'Not Verified',
        icon: <XCircle className="h-4 w-4" />,
        variant: 'destructive' as const,
        description: 'Complete verification to access all features'
      };
    }

    if (verification.revoked_at) {
      return {
        status: 'Revoked',
        icon: <XCircle className="h-4 w-4" />,
        variant: 'destructive' as const,
        description: 'Verification was revoked. Please re-verify.'
      };
    }

    if (verification.status === 'verified') {
      return {
        status: 'Verified',
        icon: <CheckCircle className="h-4 w-4" />,
        variant: 'default' as const,
        description: `Verified on ${new Date(verification.verified_at).toLocaleDateString()}`
      };
    }

    return {
      status: 'Pending',
      icon: <Clock className="h-4 w-4" />,
      variant: 'secondary' as const,
      description: 'Verification in progress'
    };
  };

  const verificationInfo = getVerificationDisplay();
=======
  const { data: roleRows } = await supabase
    .from("roles")
    .select("role_type")
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .in("role_type", ["owner", "minder"]);

  const initialRoles: RoleType[] = (roleRows ?? [])
    .map((r) => r.role_type)
    .filter((role): role is RoleType => role === "owner" || role === "minder");
>>>>>>> a628c4d14e4cd527b3b7a626c353329eb52bfcfe

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

<<<<<<< HEAD
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
          <CardDescription>Your identity verification status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={verificationInfo.variant} className="flex items-center gap-1">
              {verificationInfo.icon}
              {verificationInfo.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{verificationInfo.description}</p>
        </CardContent>
      </Card>
=======
      <ProfileRolePreferences initialRoles={initialRoles} />
>>>>>>> a628c4d14e4cd527b3b7a626c353329eb52bfcfe

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
