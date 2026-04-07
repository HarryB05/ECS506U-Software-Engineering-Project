import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AccountSuspendedActions } from "@/components/account-suspended-actions";

export default function AccountSuspendedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-narrow shadow-card">
        <CardHeader className="space-y-1 pb-2">
          <h1 className="font-display text-3xl text-foreground">
            Account suspended
          </h1>
          <p className="text-sm text-muted-foreground">
            Your account is currently suspended. If you think this is a mistake,
            please contact support.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AccountSuspendedActions />
        </CardContent>
      </Card>
    </main>
  );
}
