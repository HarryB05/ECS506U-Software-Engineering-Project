import { Suspense } from "react";
import { MainNav } from "@/components/main-nav";
import { AuthButton } from "@/components/auth-button";
import { createClient } from "@/lib/supabase/server";

export async function HomeNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <MainNav authenticated={!!user}>
      {!user && (
        <Suspense fallback={null}>
          <AuthButton />
        </Suspense>
      )}
    </MainNav>
  );
}
