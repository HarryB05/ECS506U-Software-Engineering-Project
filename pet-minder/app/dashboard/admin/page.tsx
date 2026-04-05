import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPanelContent } from "@/components/admin-panel-content";

function AdminSkeleton() {
  return (
    <div className="mx-auto max-w-content space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminPanelContent />
    </Suspense>
  );
}
