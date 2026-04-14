"use client";

import dynamic from "next/dynamic";
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
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import type { PublicMinderListItem } from "@/lib/types/minder-profile";
import {
  formatMinderPriceLabel,
  minderIntroText,
  parsePriceSortValue,
} from "@/lib/minder-display";
import {
  filterMindersForOwnerSearch,
  getSimpleMinderSearchRank,
} from "@/lib/minder-search-match";
import { PRESET_PET_TYPES, type PresetPetType } from "@/lib/pet-types";
import type { PetSize } from "@/lib/types/pet-profile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MinderMap = dynamic(
  () => import("@/components/minder-map").then((m) => m.MinderMap),
  { ssr: false, loading: () => <div className="h-[340px] w-full rounded-lg border border-border bg-muted animate-pulse sm:h-[420px]" /> },
);

type SearchPageContentProps = {
  initialMinders: PublicMinderListItem[];
  loadError?: string | null;
};

type SearchPetTypeValue = "" | PresetPetType;
type SearchPetSizeValue = "" | PetSize;

const PET_SIZE_LABEL: Record<PetSize, string> = {
  small: "Small (0-10kg)",
  medium: "Medium (10-25kg)",
  large: "Large (25-40kg)",
  "x-large": "X-large (40+kg)",
};

const SELECT_TRIGGER_CLASSES =
  "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export function SearchPageContent({
  initialMinders,
  loadError = null,
}: SearchPageContentProps) {
  const { activeRole, setActiveRole, isDualRole, roleTypes } = useDashboardRole();
  const [search, setSearch] = useState("");
  const [petType, setPetType] = useState<SearchPetTypeValue>("");
  const [petSize, setPetSize] = useState<SearchPetSizeValue>("");
  const [otherPetType, setOtherPetType] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"rating" | "price">("rating");
  // desc = highest first for rating, highest first for price
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // Availability date/time filter state
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [availabilityStartTime, setAvailabilityStartTime] = useState("");
  const [availabilityEndTime, setAvailabilityEndTime] = useState("");

  // Location proximity filter state
  const [locationInput, setLocationInput] = useState("");
  const [nearLocation, setNearLocation] = useState<{
    latitude: number;
    longitude: number;
    label: string;
    radiusKm: number;
  } | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  function handleSortClick(field: "rating" | "price") {
    if (sortBy === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(field);
      // Natural defaults: rating → highest first, price → lowest first
      setSortDir(field === "rating" ? "desc" : "asc");
    }
  }

  async function handleLocationSearch() {
    const q = locationInput.trim();
    if (!q) return;
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } },
      );
      const results = await res.json();
      if (results.length > 0) {
        setNearLocation({
          latitude: parseFloat(results[0].lat),
          longitude: parseFloat(results[0].lon),
          label: results[0].display_name.split(",").slice(0, 2).join(",").trim(),
          radiusKm,
        });
      } else {
        setGeocodeError("Location not found — try a more specific place name.");
      }
    } catch {
      setGeocodeError("Could not reach geocoding service. Check your connection.");
    } finally {
      setGeocoding(false);
    }
  }

  function clearLocationFilter() {
    setNearLocation(null);
    setLocationInput("");
    setGeocodeError(null);
  }

  // Re-apply radius when it changes while a location is already pinned.
  const activeNearLocation = nearLocation
    ? { ...nearLocation, radiusKm }
    : null;

  const filtered = useMemo(() => {
    const selectedPetType =
      petType === "Other" ? otherPetType.trim() : petType;

    const results = filterMindersForOwnerSearch(initialMinders, {
      search,
      petType: selectedPetType,
      petSize,
      verifiedOnly,
      nearLocation: activeNearLocation,
      availabilityDate: availabilityDate || undefined,
      availabilityStartTime: availabilityStartTime || undefined,
      availabilityEndTime: availabilityEndTime || undefined,
    });

    return [...results].sort((a, b) => {
      if (search.trim()) {
        const rankDiff =
          getSimpleMinderSearchRank(b, search) -
          getSimpleMinderSearchRank(a, search);
        if (rankDiff !== 0) return rankDiff;
      }

      let diff = 0;
      if (sortBy === "rating") {
        const ar = a.averageRating ?? 0;
        const br = b.averageRating ?? 0;
        diff = br - ar; // desc by default
      } else {
        const pa = parsePriceSortValue(a.servicePricing);
        const pb = parsePriceSortValue(b.servicePricing);
        diff = pa - pb; // asc by default (cheapest first)
      }
      if (diff !== 0) return sortDir === "desc" ? diff : -diff;
      return a.displayName.localeCompare(b.displayName, undefined, {
        sensitivity: "base",
      });
    });
  }, [initialMinders, otherPetType, petSize, petType, search, sortBy, sortDir, verifiedOnly, activeNearLocation?.latitude, activeNearLocation?.longitude, activeNearLocation?.radiusKm, availabilityDate, availabilityStartTime, availabilityEndTime]);

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
            Search by name or keywords. Filter by pet type, pet size, location, or
            verification status.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="minder-search">Name or keywords</Label>
            <Input
              id="minder-search"
              placeholder="e.g. experienced, caring"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-type-search">Pet type</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  id="pet-type-search"
                  type="button"
                  className={`${SELECT_TRIGGER_CLASSES} ${
                    petType === ""
                      ? "text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  <span className="truncate text-left">
                    {petType === ""
                      ? "Any pet type"
                      : petType === "Other"
                        ? otherPetType.trim() || "Other"
                        : petType}
                  </span>
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => {
                    setPetType("");
                    setOtherPetType("");
                  }}
                >
                  Any pet type
                </DropdownMenuItem>
                {PRESET_PET_TYPES.map((type) => (
                  <DropdownMenuItem
                    key={type}
                    className="cursor-pointer"
                    onSelect={() => {
                      setPetType(type);
                      if (type !== "Other") {
                        setOtherPetType("");
                      }
                    }}
                  >
                    {type}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {petType === "Other" && (
              <div className="space-y-1.5">
                <Label htmlFor="pet-type-other-search">Other type</Label>
                <Input
                  id="pet-type-other-search"
                  placeholder="e.g. rabbit, lizard"
                  value={otherPetType}
                  onChange={(e) => setOtherPetType(e.target.value)}
                  autoComplete="off"
                />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pet-size-search">Pet size</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  id="pet-size-search"
                  type="button"
                  className={`${SELECT_TRIGGER_CLASSES} ${
                    petSize === ""
                      ? "text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  <span className="truncate text-left">
                    {petSize === "" ? "Any pet size" : PET_SIZE_LABEL[petSize]}
                  </span>
                  <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={() => setPetSize("")}
                >
                  Any pet size
                </DropdownMenuItem>
                {(Object.keys(PET_SIZE_LABEL) as PetSize[]).map((size) => (
                  <DropdownMenuItem
                    key={size}
                    className="cursor-pointer"
                    onSelect={() => setPetSize(size)}
                  >
                    {PET_SIZE_LABEL[size]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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

        {/* Availability date/time filter row */}
        <CardContent className="pt-0">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm">
              <Calendar className="size-3.5 text-muted-foreground" />
              Available on date
            </Label>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Date</span>
                <Input
                  type="date"
                  className="h-9 w-auto"
                  value={availabilityDate}
                  onChange={(e) => setAvailabilityDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
              {availabilityDate && (
                <>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      From (optional)
                    </span>
                    <Input
                      type="time"
                      className="h-9 w-auto"
                      value={availabilityStartTime}
                      onChange={(e) => setAvailabilityStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" />
                      Until (optional)
                    </span>
                    <Input
                      type="time"
                      className="h-9 w-auto"
                      value={availabilityEndTime}
                      onChange={(e) => setAvailabilityEndTime(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-muted-foreground self-end"
                    onClick={() => {
                      setAvailabilityDate("");
                      setAvailabilityStartTime("");
                      setAvailabilityEndTime("");
                    }}
                  >
                    <X className="size-3.5" />
                    <span className="ml-1">Clear</span>
                  </Button>
                </>
              )}
            </div>
            {availabilityDate && (
              <p className="text-xs text-success-500">
                Showing minders available on{" "}
                {new Date(`${availabilityDate}T12:00:00`).toLocaleDateString(
                  undefined,
                  { weekday: "long", month: "short", day: "numeric" },
                )}
                {availabilityStartTime ? ` from ${availabilityStartTime}` : ""}
                {availabilityEndTime ? ` until ${availabilityEndTime}` : ""}
                {". Minders without a configured schedule are also shown."}
              </p>
            )}
          </div>
        </CardContent>

        {/* Location proximity row */}
        <CardContent className="pt-0">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-sm">
              <MapPin className="size-3.5 text-muted-foreground" />
              Near location
            </Label>
            <div className="flex flex-wrap gap-2">
              <Input
                className="max-w-56"
                placeholder="e.g. Stratford, London"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleLocationSearch(); }}
                disabled={geocoding}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-base text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  >
                    <span className="truncate text-left">Within {radiusKm} km</span>
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
                >
                  {[5, 10, 25, 50].map((radius) => (
                    <DropdownMenuItem
                      key={radius}
                      className="cursor-pointer"
                      onSelect={() => setRadiusKm(radius)}
                    >
                      Within {radius} km
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleLocationSearch}
                disabled={geocoding || !locationInput.trim()}
              >
                {geocoding ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Search className="size-3.5" />
                )}
                <span className="ml-1.5">Search</span>
              </Button>
              {nearLocation && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-muted-foreground"
                  onClick={clearLocationFilter}
                >
                  <X className="size-3.5" />
                  <span className="ml-1">Clear</span>
                </Button>
              )}
            </div>
            {nearLocation && (
              <p className="text-xs text-success-500">
                Showing minders within {radiusKm} km of {nearLocation.label}
              </p>
            )}
            {geocodeError && (
              <p className="text-xs text-danger-500" role="alert">{geocodeError}</p>
            )}
          </div>
        </CardContent>

        {/* Sort row */}
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="text-sm text-muted-foreground">Sort by</Label>
            <Button
              type="button"
              variant={sortBy === "rating" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortClick("rating")}
              className="gap-1"
            >
              Rating
              {sortBy === "rating" ? (
                sortDir === "desc" ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />
              ) : null}
            </Button>
            <Button
              type="button"
              variant={sortBy === "price" ? "default" : "outline"}
              size="sm"
              onClick={() => handleSortClick("price")}
              className="gap-1"
            >
              Price
              {sortBy === "price" ? (
                sortDir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
              ) : null}
            </Button>
            <span className="text-xs text-muted-foreground">
              {sortBy === "rating"
                ? sortDir === "desc" ? "Highest first" : "Lowest first"
                : sortDir === "asc" ? "Cheapest first" : "Most expensive first"}
            </span>
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
              <CardContent className="p-6 text-center sm:p-8 md:p-10 space-y-2">
                <p className="text-muted-foreground">
                  No minders match your current filters.
                </p>
                <p className="text-xs text-muted-foreground">
                  Try widening your search or clearing filters. Minders must enable &ldquo;Listed in owner search&rdquo; in their workspace to appear here.
                </p>
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
            <CardTitle className="text-xl font-medium">Map</CardTitle>
            <CardDescription>
              Minders with a set location appear as pins. Pins update as you
              filter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MinderMap minders={filtered} />
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
  const sizesLine =
    minder.supportedPetSizes.length > 0
      ? minder.supportedPetSizes.map((size) => PET_SIZE_LABEL[size]).join(", ")
      : "Pet sizes not specified";

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
            {rating.toFixed(1)}/5.0
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
        <p className="text-sm text-foreground">Sizes: {sizesLine}</p>
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
