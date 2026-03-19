import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";

export default function BookingsPage() {
  return (
    <div className="max-w-content mx-auto">
      <h1 className="font-display text-3xl text-foreground mb-1">
        Bookings
      </h1>
      <p className="text-muted-foreground mb-8">
        Your upcoming and past bookings will appear here.
      </p>
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <CalendarCheck className="mx-auto size-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">
          No bookings yet. When you book a minder, they will appear here.
        </p>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
