"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoutButton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<typeof Button> & { showIcon?: boolean }) {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      onClick={logout}
      className={cn(showIcon && "justify-start gap-3", className)}
      {...props}
    >
      {showIcon && <LogOut className="size-5 shrink-0" />}
      Sign out
    </Button>
  );
}
