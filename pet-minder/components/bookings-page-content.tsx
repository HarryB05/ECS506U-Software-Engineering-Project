"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, Home } from "lucide-react";
import { useDashboardRole } from "@/components/dashboard-role-context";

export function BookingsPageContent() {
  const { activeRole } = useDashboardRole();

  if (activeRole === "minder") {
    return (
      <div className="max-w-content mx-auto">
        <h1 className="font-display text-3xl text-foreground mb-1">
          Minder bookings
        </h1>
        <p className="text-muted-foreground mb-8">
          Owner booking requests and upcoming sessions will appear here.
        </p>

        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-4 inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
              <CalendarCheck className="size-6 text-teal-700 dark:text-teal-300" />
            </div>
            <p className="text-muted-foreground mb-6">
              No requests yet. When an owner books you, it will show up here.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/minder">Go to minder workspace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto">
      <h1 className="font-display text-3xl text-foreground mb-1">Bookings</h1>
      <p className="text-muted-foreground mb-8">
        Your upcoming and past bookings will appear here.
      </p>

      <Card className="shadow-card">
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-4 inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
            <CalendarCheck className="size-6 text-teal-700 dark:text-teal-300" />
          </div>
          <p className="text-muted-foreground mb-6">
            No bookings yet. When you book a minder, they will appear here.
          </p>
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <span className="inline-flex items-center gap-2">
                <Home className="size-4" />
                Back to dashboard
              </span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

