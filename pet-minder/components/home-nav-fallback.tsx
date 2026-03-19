import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder header while session is resolved (Cache Components / Suspense). */
export function HomeNavFallback() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="grid h-16 w-full grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 items-center justify-start">
          <Link
            href="/"
            className="font-display text-xl text-foreground shrink-0"
          >
            Pet Minder
          </Link>
        </div>
        <Skeleton className="h-8 w-28" />
        <div className="flex shrink-0 items-center justify-end gap-1">
          <Skeleton className="size-11 rounded-md" />
          <Skeleton className="size-11 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </header>
  );
}
