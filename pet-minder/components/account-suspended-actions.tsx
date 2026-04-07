"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function AccountSuspendedActions() {
  const router = useRouter();

  async function signOutAndGo(path: string) {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(path);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="default"
        className="w-full"
        onClick={() => void signOutAndGo("/auth/login")}
      >
        Sign out and sign in again
      </Button>
      <Button asChild variant="outline" className="w-full">
        <Link href="/">Back to home</Link>
      </Button>
      <p className="text-xs text-muted-foreground">
        Use &quot;Sign out and sign in again&quot; after an admin reactivates your
        account, or to sign in with a different account.
      </p>
    </div>
  );
}
