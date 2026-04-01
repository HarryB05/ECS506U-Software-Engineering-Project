"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addDietaryRequirements,
  addMedicalInfo,
  createPetProfile,
  deleteProfile,
  listPetProfilesForOwner,
  updateProfile,
} from "@/lib/pet-profile-service";
import type { PetProfile } from "@/lib/types/pet-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PawPrint, Plus, Trash2 } from "lucide-react";

type PetProfilesManagerProps = {
  initialPets: PetProfile[];
  ownerUserId: string;
};

export function PetProfilesManager({
  initialPets,
  ownerUserId,
}: PetProfilesManagerProps) {
  const [pets, setPets] = useState<PetProfile[]>(initialPets);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(initialPets.length === 0);

  useEffect(() => {
    setPets(initialPets);
  }, [initialPets]);

  async function refreshList() {
    const supabase = createClient();
    const { data, error } = await listPetProfilesForOwner(
      supabase,
      ownerUserId,
    );
    if (error) {
      setLoadError(error.message);
      return;
    }
    setLoadError(null);
    setPets(data);
  }

  return (
    <div className="space-y-8">
      {loadError && (
        <p className="text-sm text-danger-500" role="alert">
          {loadError}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Profiles are only editable while you are in pet owner mode.
        </p>
        {!showAdd && (
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="size-4" />
            Add a pet
          </Button>
        )}
      </div>

      {showAdd && (
        <AddPetForm
          ownerUserId={ownerUserId}
          onCancel={() => setShowAdd(false)}
          onCreated={async () => {
            await refreshList();
            setShowAdd(false);
          }}
        />
      )}

      {pets.length === 0 && !showAdd ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center shadow-card">
          <PawPrint className="mx-auto size-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">
            No pets added yet. Add a pet to get started.
          </p>
          <Button type="button" onClick={() => setShowAdd(true)}>
            <Plus className="size-4" />
            Add a pet
          </Button>
        </div>
      ) : (
        <ul className="space-y-6">
          {pets.map((pet) => (
            <li key={pet.id}>
              <PetCard
                pet={pet}
                onChanged={refreshList}
                onDeleted={refreshList}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddPetForm({
  ownerUserId,
  onCancel,
  onCreated,
}: {
  ownerUserId: string;
  onCancel: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [petType, setPetType] = useState("");
  const [age, setAge] = useState("");
  const [medical, setMedical] = useState("");
  const [dietary, setDietary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ageNum = age.trim() === "" ? null : Number.parseInt(age, 10);
    if (age.trim() !== "" && (Number.isNaN(ageNum) || ageNum! < 0)) {
      setError("Age must be a valid non-negative number.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await createPetProfile(supabase, ownerUserId, {
      name,
      pet_type: petType,
      age: ageNum,
      medical_info: medical || null,
      dietary_requirements: dietary || null,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    await onCreated();
  }

  return (
    <Card className="shadow-card border-border">
      <CardHeader>
        <CardTitle className="font-display text-2xl text-foreground">
          New pet
        </CardTitle>
        <CardDescription>
          Add name, species, and optional care details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-medium">
          <div className="space-y-1.5">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-type">Type</Label>
            <Input
              id="new-type"
              placeholder="e.g. dog, cat"
              value={petType}
              onChange={(e) => setPetType(e.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-age">Age (years)</Label>
            <Input
              id="new-age"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-medical">Medical information</Label>
            <Textarea
              id="new-medical"
              value={medical}
              onChange={(e) => setMedical(e.target.value)}
              placeholder="Allergies, medications, vet notes…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-dietary">Dietary requirements</Label>
            <Textarea
              id="new-dietary"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="Feeding schedule, restrictions…"
            />
          </div>
          {error && (
            <p className="text-sm text-danger-500" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Create profile"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PetCard({
  pet,
  onChanged,
  onDeleted,
}: {
  pet: PetProfile;
  onChanged: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
}) {
  const [name, setName] = useState(pet.name);
  const [petType, setPetType] = useState(pet.pet_type);
  const [age, setAge] = useState(
    pet.age === null ? "" : String(pet.age),
  );
  const [medical, setMedical] = useState(pet.medical_info ?? "");
  const [dietary, setDietary] = useState(pet.dietary_requirements ?? "");

  useEffect(() => {
    setName(pet.name);
    setPetType(pet.pet_type);
    setAge(pet.age === null ? "" : String(pet.age));
    setMedical(pet.medical_info ?? "");
    setDietary(pet.dietary_requirements ?? "");
  }, [pet]);

  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingMedical, setSavingMedical] = useState(false);
  const [savingDietary, setSavingDietary] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ageNum = age.trim() === "" ? null : Number.parseInt(age, 10);
    if (age.trim() !== "" && (Number.isNaN(ageNum) || ageNum! < 0)) {
      setError("Age must be a valid non-negative number.");
      return;
    }
    setSavingProfile(true);
    const supabase = createClient();
    const { error: err } = await updateProfile(supabase, pet.id, {
      name,
      pet_type: petType,
      age: ageNum,
    });
    setSavingProfile(false);
    if (err) {
      setError(err.message);
      return;
    }
    await onChanged();
  }

  async function handleSaveMedical() {
    setError(null);
    setSavingMedical(true);
    const supabase = createClient();
    const { error: err } = await addMedicalInfo(supabase, pet.id, medical);
    setSavingMedical(false);
    if (err) {
      setError(err.message);
      return;
    }
    await onChanged();
  }

  async function handleSaveDietary() {
    setError(null);
    setSavingDietary(true);
    const supabase = createClient();
    const { error: err } = await addDietaryRequirements(
      supabase,
      pet.id,
      dietary,
    );
    setSavingDietary(false);
    if (err) {
      setError(err.message);
      return;
    }
    await onChanged();
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Remove this pet profile? You can add a new profile later.",
      )
    ) {
      return;
    }
    setError(null);
    setDeleting(true);
    const supabase = createClient();
    const { error: err } = await deleteProfile(supabase, pet.id);
    setDeleting(false);
    if (err) {
      setError(err.message);
      return;
    }
    await onDeleted();
  }

  return (
    <Card className="shadow-card border-border">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="font-display text-2xl text-foreground">
            {pet.name}
          </CardTitle>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-danger-500 hover:text-danger-500"
          onClick={handleDelete}
          disabled={deleting}
        >
          <Trash2 className="size-4" />
          {deleting ? "Removing…" : "Remove"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-medium">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`name-${pet.id}`}>Name</Label>
              <Input
                id={`name-${pet.id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`type-${pet.id}`}>Type</Label>
              <Input
                id={`type-${pet.id}`}
                value={petType}
                onChange={(e) => setPetType(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor={`age-${pet.id}`}>Age (years)</Label>
            <Input
              id={`age-${pet.id}`}
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </form>

        <div className="space-y-2 max-w-medium border-t border-border pt-6">
          <Label htmlFor={`medical-${pet.id}`}>Medical information</Label>
          <Textarea
            id={`medical-${pet.id}`}
            value={medical}
            onChange={(e) => setMedical(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveMedical}
            disabled={savingMedical}
          >
            {savingMedical ? "Saving…" : "Save medical information"}
          </Button>
        </div>

        <div className="space-y-2 max-w-medium border-t border-border pt-6">
          <Label htmlFor={`dietary-${pet.id}`}>Dietary requirements</Label>
          <Textarea
            id={`dietary-${pet.id}`}
            value={dietary}
            onChange={(e) => setDietary(e.target.value)}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveDietary}
            disabled={savingDietary}
          >
            {savingDietary ? "Saving…" : "Save dietary requirements"}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-danger-500" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
