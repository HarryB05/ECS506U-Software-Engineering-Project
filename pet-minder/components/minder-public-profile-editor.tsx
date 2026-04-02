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
import { Star, ShieldCheck } from "lucide-react";

function typesToInput(types: string[] | null): string {
  if (!types?.length) return "";
  return types.join(", ");
}

function inputToTypes(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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
  const [typesInput, setTypesInput] = useState(
    typesToInput(initialProfile?.supported_pet_types ?? null),
  );
  const [pricing, setPricing] = useState(initialProfile?.service_pricing ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setProfile(initialProfile);
    setDescription(initialProfile?.service_description ?? "");
    setTypesInput(typesToInput(initialProfile?.supported_pet_types ?? null));
    setPricing(initialProfile?.service_pricing ?? "");
  }, [initialProfile]);

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
        supported_pet_types: inputToTypes(typesInput),
        service_pricing: pricing.trim() || null,
      },
    );
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    const { data: next } = await getMinderProfileByUserId(supabase, userId);
    if (next) setProfile(next);
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
          <div className="space-y-1.5">
            <Label htmlFor="minder-pet-types">Supported pet types</Label>
            <Input
              id="minder-pet-types"
              value={typesInput}
              onChange={(e) => setTypesInput(e.target.value)}
              placeholder="e.g. dogs, cats, rabbits"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list. These power search filters for owners.
            </p>
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
