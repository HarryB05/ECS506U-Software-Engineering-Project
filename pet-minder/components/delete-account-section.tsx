"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DeleteAccountSection({ email }: { email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      "This will permanently delete your account and sign you out. This cannot be undone. Continue?",
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      await supabase.auth.signOut({ scope: "local" });
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Card className="border-danger-500/30 shadow-card">
      <CardHeader>
        <CardTitle className="text-destructive">Delete account</CardTitle>
        <CardDescription>
          Permanently remove your account ({email}). Your bookings and profile
          data may remain subject to your database rules; contact support if you
          need full data removal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-danger-500" role="alert">
            {error}
          </p>
        )}
        <Button
          type="button"
          variant="destructive"
          disabled={loading}
          onClick={handleDelete}
          className="w-full sm:w-auto"
        >
          {loading ? "Deleting…" : "Delete my account"}
        </Button>
      </CardContent>
    </Card>
  );
}
