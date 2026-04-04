import { Suspense } from "react";
import { SearchPageContent } from "@/components/search-page-content";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { listPublicMindersForSearch } from "@/lib/minder-profile-service";

function SearchSkeleton() {
  return (
    <div className="max-w-content mx-auto space-y-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

async function SearchInner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await listPublicMindersForSearch(supabase, {
    excludeUserId: user?.id,
  });

  return (
    <SearchPageContent
      initialMinders={data ?? []}
      loadError={error?.message ?? null}
    />
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchSkeleton />}>
      <SearchInner />
    </Suspense>
  );
}
