import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { HomeNav } from "@/components/home-nav";
import { HomeNavFallback } from "@/components/home-nav-fallback";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Footprints,
  MapPin,
  ShieldCheck,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Suspense fallback={<HomeNavFallback />}>
        <HomeNav />
      </Suspense>

      <section className="flex-1 w-full max-w-content mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="flex flex-col items-center text-center gap-8 max-w-medium mx-auto">
          <h1 className="font-display text-4xl text-foreground md:text-5xl">
            Find trusted pet care, near you
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Book verified minders for walks, sitting and day care. See where your pet is with live tracking when a session is in progress.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">Get started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </div>
        </div>

        <div
          id="features"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 md:mt-28 scroll-mt-20"
        >
          <article className="bg-card rounded-lg shadow-card p-6 transition-all duration-150 hover:shadow-card-hover hover:border-teal-300 border border-transparent">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-teal-50 p-2.5 dark:bg-teal-900/30">
                <Footprints className="size-6 text-teal-700 dark:text-teal-300" />
              </div>
              <h2 className="text-xl font-medium text-foreground">
                Book a minder
              </h2>
            </div>
            <p className="text-base text-muted-foreground">
              Choose from local minders, set dates and which pets are included. Confirm and pay in one place.
            </p>
          </article>
          <article className="bg-card rounded-lg shadow-card p-6 transition-all duration-150 hover:shadow-card-hover hover:border-teal-300 border border-transparent">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-teal-50 p-2.5 dark:bg-teal-900/30">
                <MapPin className="size-6 text-teal-700 dark:text-teal-300" />
              </div>
              <h2 className="text-xl font-medium text-foreground">
                Live tracking
              </h2>
            </div>
            <p className="text-base text-muted-foreground">
              When a walk or session is in progress, see your pet&apos;s location on a map. Status is always visible.
            </p>
          </article>
          <article className="bg-card rounded-lg shadow-card p-6 transition-all duration-150 hover:shadow-card-hover hover:border-teal-300 border border-transparent">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-teal-50 p-2.5 dark:bg-teal-900/30">
                <ShieldCheck className="size-6 text-teal-700 dark:text-teal-300" />
              </div>
              <h2 className="text-xl font-medium text-foreground">
                Verified minders
              </h2>
            </div>
            <p className="text-base text-muted-foreground">
              Minder profiles show verification and reviews. Book with confidence.
            </p>
          </article>
        </div>
      </section>

      <footer className="w-full border-t border-border py-8">
        <div className="max-w-content mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Pet Minder. Find trusted pet care, near you.
          </p>
          <ThemeToggle />
        </div>
      </footer>
    </main>
  );
}
