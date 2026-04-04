"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getMinderProfileByUserId,
  updateMinderProfile,
} from "@/lib/minder-profile-service";
import type { MinderProfile } from "@/lib/types/minder-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Star, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  normalizeServicePricing,
  servicePricingToInputString,
} from "@/lib/minder-display";
import { PRESET_PET_TYPES } from "@/lib/pet-types";

/**
 * Initialise selected chips from existing profile data.
 * Exact case-insensitive match → use the preset label.
 * Anything unrecognised → "Other" (so old free-text data isn't silently dropped).
 */
function initSelectedTypes(types: string[] | null): string[] {
  if (!types?.length) return [];
  const presetMap = new Map(PRESET_PET_TYPES.map((p) => [p.toLowerCase(), p]));
  const result: string[] = [];
  for (const t of types) {
    const match = presetMap.get(t.toLowerCase().trim());
    if (match) result.push(match);
    else if (t.trim()) result.push("Other");
  }
  return [...new Set(result)];
}

type MinderPublicProfileEditorProps = {
  userId: string;
  initialProfile: MinderProfile | null;
};

export function MinderPublicProfileEditor({
  userId,
  initialProfile,
}: MinderPublicProfileEditorProps) {
  const [profile, setProfile] = useState<MinderProfile | null>(initialProfile);
  const [description, setDescription] = useState(
    initialProfile?.service_description ?? "",
  );
  const [selectedTypes, setSelectedTypes] = useState<string[]>(() =>
    initSelectedTypes(initialProfile?.supported_pet_types ?? null),
  );
  const [pricing, setPricing] = useState(() =>
    servicePricingToInputString(initialProfile?.service_pricing),
  );
  const [visibleInSearch, setVisibleInSearch] = useState(
    initialProfile?.visible_in_search ?? false,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(initialProfile);
    setDescription(initialProfile?.service_description ?? "");
    setSelectedTypes(initSelectedTypes(initialProfile?.supported_pet_types ?? null));
    setPricing(servicePricingToInputString(initialProfile?.service_pricing));
    setVisibleInSearch(initialProfile?.visible_in_search ?? false);
  }, [initialProfile]);

  function toggleType(type: string) {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) {
      setError("No minder profile was found for your account.");
      return;
    }
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await updateMinderProfile(
      supabase,
      profile.id,
      userId,
      {
        service_description: description.trim() || null,
        supported_pet_types: selectedTypes,
        service_pricing: normalizeServicePricing(pricing),
      },
    );
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    const { data: next } = await getMinderProfileByUserId(supabase, userId);
    if (next) {
      setProfile(next);
      setPricing(servicePricingToInputString(next.service_pricing));
    }
  }

  async function handleVisibilityToggle(checked: boolean) {
    if (!profile) return;
    setVisibilityLoading(true);
    setVisibilityError(null);
    const supabase = createClient();
    const { error: err } = await updateMinderProfile(supabase, profile.id, userId, {
      visible_in_search: checked,
    });
    setVisibilityLoading(false);
    if (err) {
      setVisibilityError(err.message);
      return;
    }
    setVisibleInSearch(checked);
  }

  if (!profile) {
    return (
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Public profile</CardTitle>
          <CardDescription>
            We could not load your minder profile. Try completing onboarding or
            contact support.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const rating =
    profile.average_rating !== null && Number.isFinite(profile.average_rating)
      ? profile.average_rating
      : null;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Public profile</CardTitle>
        <CardDescription>
          Owners see this information when they search for minders. Keep your
          description and supported pet types up to date.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-4 text-sm">
          {profile.is_verified ? (
            <span className="inline-flex items-center gap-1.5 text-success-500">
              <ShieldCheck className="size-4" />
              Verified minder
            </span>
          ) : (
            <span className="text-muted-foreground">Verification pending</span>
          )}
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Star className="size-4 text-teal-600 dark:text-teal-400" />
            {rating !== null ? `${rating.toFixed(1)} average` : "No reviews yet"}
          </span>
        </div>

        <div className="flex items-start gap-3 rounded-lg border border-border p-4">
          <Checkbox
            id="visible-in-search"
            checked={visibleInSearch}
            disabled={visibilityLoading}
            onCheckedChange={(checked) =>
              handleVisibilityToggle(checked === true)
            }
          />
          <div className="space-y-0.5">
            <Label
              htmlFor="visible-in-search"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              {visibleInSearch ? (
                <Eye className="size-4 text-teal-600 dark:text-teal-400" />
              ) : (
                <EyeOff className="size-4 text-muted-foreground" />
              )}
              {visibleInSearch
                ? "Listed in owner search"
                : "Hidden from owner search"}
            </Label>
            <p className="text-xs text-muted-foreground">
              {visibleInSearch
                ? "Owners can find and view your profile. Uncheck to hide it while you make changes."
                : "Your profile will not appear in search results until you check this."}
            </p>
            {visibilityError && (
              <p className="text-xs text-danger-500" role="alert">
                {visibilityError}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="minder-service-desc">Service description</Label>
            <Textarea
              id="minder-service-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your experience, the services you offer, and what owners can expect."
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>Supported pet types</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_PET_TYPES.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={selectedTypes.includes(type) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleType(type)}
                >
                  {type}
                </Button>
              ))}
            </div>
            {selectedTypes.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Select all pet types you are comfortable caring for.
              </p>
            )}
          </div>

          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="minder-pricing">Hourly rate (optional)</Label>
            <Input
              id="minder-pricing"
              value={pricing}
              onChange={(e) => setPricing(e.target.value)}
              placeholder="e.g. 18 or £18"
              autoComplete="off"
            />
          </div>
          {error && (
            <p className="text-sm text-danger-500" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save profile"}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground border-t border-border pt-4">
          Ratings and verification are updated from completed bookings and admin
          review.{" "}
          <Link
            href="/dashboard/profile"
            className="text-teal-700 underline-offset-4 hover:underline dark:text-teal-400"
          >
            Account settings
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
