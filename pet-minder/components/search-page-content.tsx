"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useDashboardRole } from "@/components/dashboard-role-context";
import { Search, ShieldCheck, Star } from "lucide-react";
import type { PublicMinderListItem } from "@/lib/types/minder-profile";
import {
  formatMinderPriceLabel,
  minderIntroText,
  parsePriceSortValue,
} from "@/lib/minder-display";
import { filterMindersForOwnerSearch } from "@/lib/minder-search-match";

type SearchPageContentProps = {
  initialMinders: PublicMinderListItem[];
  loadError?: string | null;
};

export function SearchPageContent({
  initialMinders,
  loadError = null,
}: SearchPageContentProps) {
  const { activeRole, setActiveRole, isDualRole, roleTypes } = useDashboardRole();
  const [search, setSearch] = useState("");
  const [petType, setPetType] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"rating" | "price">("rating");

  function togglePetType(nextType: string) {
    setPetType((current) =>
      current.trim().toLowerCase() === nextType.toLowerCase() ? "" : nextType,
    );
  }

  const filtered = useMemo(() => {
    const results = filterMindersForOwnerSearch(initialMinders, {
      search,
      petType,
      verifiedOnly,
    });

    return [...results].sort((a, b) => {
      if (sortBy === "rating") {
        const ar = a.averageRating ?? 0;
        const br = b.averageRating ?? 0;
        if (br !== ar) return br - ar;
        return a.displayName.localeCompare(b.displayName, undefined, {
          sensitivity: "base",
        });
      }
      const pa = parsePriceSortValue(a.servicePricing);
      const pb = parsePriceSortValue(b.servicePricing);
      if (pa !== pb) return pa - pb;
      return a.displayName.localeCompare(b.displayName, undefined, {
        sensitivity: "base",
      });
    });
  }, [initialMinders, petType, search, sortBy, verifiedOnly]);

  if (activeRole === "minder") {
    return (
      <div className="max-w-content mx-auto">
        <h1 className="font-display text-2xl text-foreground mb-1 sm:text-3xl">
          Find a pet minder
        </h1>
        <p className="text-muted-foreground mb-8">
          Search is part of the owner journey. Switch to owner mode to browse
          available minders.
        </p>
        <Card className="shadow-card">
          <CardContent className="p-6 text-center sm:p-8 md:p-12">
            <div className="mx-auto mb-4 inline-flex rounded-lg bg-teal-50 p-3 dark:bg-teal-900/30">
              <Search className="size-6 text-teal-700 dark:text-teal-300" />
            </div>
            {isDualRole ? (
              <div className="flex flex-col items-center gap-4">
                <p className="text-muted-foreground max-w-md">
                  You are currently in minder mode. Switch to owner mode to use
                  minder search.
                </p>
                <Button type="button" onClick={() => setActiveRole("owner")}>
                  Switch to owner mode
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">
                This section is for pet owners and is not enabled for minder-only
                accounts.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!roleTypes.includes("owner")) {
    return (
      <div className="max-w-content mx-auto">
        <h1 className="font-display text-2xl text-foreground mb-1 sm:text-3xl">
          Find a pet minder
        </h1>
        <p className="text-muted-foreground mb-8">
          Minder search is available when your account includes the pet owner
          role.
        </p>
        <Card className="shadow-card">
          <CardContent className="p-6 text-center sm:p-8 md:p-12">
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Your account is set up as a pet minder only. Owner features such as
              minder search are not enabled for this account.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-content mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground mb-1 sm:text-3xl">
          Find a pet minder
        </h1>
        <p className="text-muted-foreground">
          Explore available minders and narrow results with quick filters.
        </p>
      </div>

      {loadError && (
        <p className="text-sm text-danger-500" role="alert">
          Could not load minders: {loadError}
        </p>
      )}

      <Card className="shadow-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-medium">Search filters</CardTitle>
          <CardDescription>
            Keywords match name, description, and pet types (all words must
            match somewhere). Pet type accepts singular or plural, e.g. dogs
            matches dog. Small pets includes rabbits, rodents, birds, reptiles,
            and fish when listed in the profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="minder-search">Name or keywords</Label>
            <Input
              id="minder-search"
              placeholder="e.g. Stratford, dogs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-type-search">Pet type</Label>
            <Input
              id="pet-type-search"
              placeholder="e.g. dogs"
              value={petType}
              onChange={(e) => setPetType(e.target.value)}
            />
          </div>
          <div className="flex items-center md:items-end">
            <div className="flex items-center gap-2 pt-1 md:pb-2">
              <Checkbox
                id="verified-only"
                checked={verifiedOnly}
                onCheckedChange={(checked) => setVerifiedOnly(checked === true)}
              />
              <Label htmlFor="verified-only" className="text-sm font-normal">
                Verified minders only
              </Label>
            </div>
          </div>
        </CardContent>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={petType.toLowerCase() === "dogs" ? "default" : "outline"}
              size="sm"
              onClick={() => togglePetType("dogs")}
            >
              Dogs
            </Button>
            <Button
              type="button"
              variant={petType.toLowerCase() === "cats" ? "default" : "outline"}
              size="sm"
              onClick={() => togglePetType("cats")}
            >
              Cats
            </Button>
            <Button
              type="button"
              variant={
                petType.toLowerCase() === "small pets" ? "default" : "outline"
              }
              size="sm"
              onClick={() => togglePetType("small pets")}
            >
              Small pets
            </Button>
            <span className="mx-1 h-4 w-px bg-border" aria-hidden />
            <Label className="text-sm text-muted-foreground">Sort by</Label>
            <Button
              type="button"
              variant={sortBy === "rating" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("rating")}
            >
              Rating
            </Button>
            <Button
              type="button"
              variant={sortBy === "price" ? "default" : "outline"}
              size="sm"
              onClick={() => setSortBy("price")}
            >
              Price
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} result{filtered.length === 1 ? "" : "s"}.
          </p>
          {filtered.length === 0 ? (
            <Card className="shadow-card border-border">
              <CardContent className="p-6 text-center text-muted-foreground sm:p-8 md:p-10">
                No minders match your current filters. Try widening your search.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map((minder) => (
                <MinderSearchCard key={minder.profileId} minder={minder} />
              ))}
            </div>
          )}
        </div>
        <Card className="shadow-card border-border h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-medium">Map preview</CardTitle>
            <CardDescription>
              Planned listing + map split-view for location-first search.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-40 rounded-lg border border-border bg-teal-50 dark:bg-teal-900/20 sm:h-44" />
            <p className="text-sm text-muted-foreground">
              Placeholder map area. Future version will show pin clusters based on
              minders that match active filters.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MinderSearchCard({ minder }: { minder: PublicMinderListItem }) {
  const rating = minder.averageRating ?? 0;
  const priceLabel = formatMinderPriceLabel(minder.servicePricing);
  const intro = minderIntroText(minder.serviceDescription);
  const typesLine =
    minder.supportedPetTypes.length > 0
      ? minder.supportedPetTypes.join(", ")
      : "Pet types not specified";

  return (
    <Card className="shadow-card border-border">
      <CardHeader className="space-y-2">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
          <div>
            <CardTitle className="text-xl font-medium">
              {minder.displayName}
            </CardTitle>
            <CardDescription>{typesLine}</CardDescription>
          </div>
          <div className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-1 text-xs text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
            <Star className="size-3.5" />
            {rating.toFixed(1)}
          </div>
        </div>
        {minder.isVerified ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-success-500">
            <ShieldCheck className="size-3.5" />
            Verified minder
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            Verification pending
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{intro}</p>
        <p className="text-sm text-foreground">Supports: {typesLine}</p>
        <div className="flex flex-col items-start justify-between gap-3 pt-1 sm:flex-row sm:items-center">
          <p className="text-sm text-muted-foreground">{priceLabel}</p>
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/dashboard/minders/${minder.profileId}`}>
              View profile
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
