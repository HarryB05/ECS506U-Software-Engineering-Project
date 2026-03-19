import { Clock, Home, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MinderWorkspaceGate } from "@/components/minder-workspace-gate";

export default function MinderWorkspacePage() {
  return (
    <MinderWorkspaceGate>
      <div className="max-w-content mx-auto space-y-8">
        <div>
          <h1 className="font-display text-3xl text-foreground mb-1">
            Minder workspace
          </h1>
          <p className="text-muted-foreground">
            Manage how owners find and book you.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-card">
            <CardHeader>
              <div className="mb-2 inline-flex rounded-lg bg-teal-50 p-2.5 dark:bg-teal-900/30">
                <Home className="size-5 text-teal-700 dark:text-teal-300" />
              </div>
              <CardTitle className="text-lg font-medium">
                Public profile
              </CardTitle>
              <CardDescription>
                Service description and supported pet types will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon.</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader>
              <div className="mb-2 inline-flex rounded-lg bg-teal-50 p-2.5 dark:bg-teal-900/30">
                <Clock className="size-5 text-teal-700 dark:text-teal-300" />
              </div>
              <CardTitle className="text-lg font-medium">Availability</CardTitle>
              <CardDescription>
                Set weekly hours when you are available for bookings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon.</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader>
              <div className="mb-2 inline-flex rounded-lg bg-teal-50 p-2.5 dark:bg-teal-900/30">
                <ShieldCheck className="size-5 text-teal-700 dark:text-teal-300" />
              </div>
              <CardTitle className="text-lg font-medium">Verification</CardTitle>
              <CardDescription>
                Verification status and reviews from completed bookings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MinderWorkspaceGate>
  );
}
