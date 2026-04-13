import { Suspense } from "react";
import { MainNav } from "@/components/main-nav";
import { AuthButton } from "@/components/auth-button";
import { DashboardRoleProvider } from "@/components/dashboard-role-context";
import { createClient } from "@/lib/supabase/server";

export async function HomeNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: roles } = await supabase
      .from("roles")
      .select("role_type")
      .eq("user_id", user.id)
      .is("deleted_at", null);

    const roleTypes = (roles ?? []).map((r) => String(r.role_type));

    return (
      <DashboardRoleProvider roleTypes={roleTypes} userId={user.id}>
        <MainNav authenticated />
      </DashboardRoleProvider>
    );
  }

  return (
    <MainNav authenticated={false}>
      <Suspense fallback={null}>
        <AuthButton />
      </Suspense>
    </MainNav>
  );
}
