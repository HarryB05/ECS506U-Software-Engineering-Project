import { Suspense } from "react";
import { PetsPageContent } from "@/components/pets-page-content";
import { Skeleton } from "@/components/ui/skeleton";

function PetsSkeleton() {
  return (
    <div className="max-w-content mx-auto space-y-4">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-5 w-full max-w-lg" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function PetsPage() {
  return (
    <Suspense fallback={<PetsSkeleton />}>
      <PetsPageContent />
    </Suspense>
  );
}
