import { Suspense } from "react";
import { PetsPageContent } from "@/components/pets-page-content";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { listPetProfilesForOwner } from "@/lib/pet-profile-service";

function PetsSkeleton() {
  return (
    <div className="max-w-content mx-auto space-y-4">
      <Skeleton className="h-10 w-32" />
      <Skeleton className="h-5 w-full max-w-lg" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

async function PetsPageInner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: initialPets } = await listPetProfilesForOwner(
    supabase,
    user.id,
  );

  return (
    <PetsPageContent
      initialPets={initialPets ?? []}
      ownerUserId={user.id}
    />
  );
}

export default function PetsPage() {
  return (
    <Suspense fallback={<PetsSkeleton />}>
      <PetsPageInner />
    </Suspense>
  );
}
