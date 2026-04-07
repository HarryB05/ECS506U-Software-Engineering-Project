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
import type { PetProfile, PetSex, PetSize } from "@/lib/types/pet-profile";
import { cn } from "@/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bird,
  Cat,
  ChevronDown,
  Dog,
  Fish,
  PawPrint,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";

type SexSelectValue = "" | PetSex;
type PetSizeValue = "" | PetSize;
type PetTypeSelectValue = "dog" | "cat" | "bird" | "fish" | "other";
type AgeRangeValue = "" | "0-1" | "2-4" | "5-8" | "9-12" | "13+";

function preventEnterSubmit(e: React.KeyboardEvent) {
  if (e.key !== "Enter") return;
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const tag = target.tagName;
  if (tag === "TEXTAREA") return;
  // Prevent accidental form submit when pressing Enter in an input/select.
  e.preventDefault();
}

function petSexFromRow(sex: PetSex | null | undefined): SexSelectValue {
  return sex === "male" || sex === "female" ? sex : "";
}

function petSizeFromRow(size: PetSize | null | undefined): PetSizeValue {
  return size === "small" || size === "medium" || size === "large" || size === "x-large"
    ? size
    : "";
}

const SEX_LABEL: Record<SexSelectValue, string> = {
  "": "Not specified",
  male: "Male",
  female: "Female",
};

const PET_SIZE_LABEL: Record<PetSizeValue, string> = {
  "": "Not specified",
  small: "Small (0-10kg)",
  medium: "Medium (10-25kg)",
  large: "Large (25-40kg)",
  "x-large": "X-large (40+kg)",
};

const PET_TYPE_LABEL: Record<PetTypeSelectValue, string> = {
  dog: "Dog",
  cat: "Cat",
  bird: "Bird",
  fish: "Fish",
  other: "Other",
};

const AGE_RANGE_LABEL: Record<AgeRangeValue, string> = {
  "": "Not specified",
  "0-1": "0-1 years",
  "2-4": "2-4 years",
  "5-8": "5-8 years",
  "9-12": "9-12 years",
  "13+": "13+ years",
};

function getPetTypeSelection(rawType: string): PetTypeSelectValue {
  const normalised = rawType.trim().toLowerCase();
  switch (normalised) {
    case "dog":
      return "dog";
    case "cat":
      return "cat";
    case "bird":
      return "bird";
    case "fish":
      return "fish";
    default:
      return "other";
  }
}

function getPetTypeFromSelection(
  selectedType: PetTypeSelectValue | "",
  otherType: string,
): string {
  if (selectedType === "") return "";
  if (selectedType === "other") return otherType.trim();
  return selectedType;
}

function getPetTypeIcon(rawType: string): LucideIcon {
  const selectedType = getPetTypeSelection(rawType);
  switch (selectedType) {
    case "dog":
      return Dog;
    case "cat":
      return Cat;
    case "bird":
      return Bird;
    case "fish":
      return Fish;
    case "other":
      return PawPrint;
    default: {
      const exhaustiveCheck: never = selectedType;
      return exhaustiveCheck;
    }
  }
}

function ageRangeFromNumber(age: number | null): AgeRangeValue {
  if (age === null) return "";
  if (age <= 1) return "0-1";
  if (age <= 4) return "2-4";
  if (age <= 8) return "5-8";
  if (age <= 12) return "9-12";
  return "13+";
}

function ageNumberFromRange(ageRange: AgeRangeValue): number | null {
  switch (ageRange) {
    case "":
      return null;
    case "0-1":
      return 1;
    case "2-4":
      return 3;
    case "5-8":
      return 6;
    case "9-12":
      return 10;
    case "13+":
      return 13;
    default: {
      const exhaustiveCheck: never = ageRange;
      return exhaustiveCheck;
    }
  }
}

function PetSexSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: SexSelectValue;
  onChange: (v: SexSelectValue) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm",
            "text-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            value === "" && "text-muted-foreground",
          )}
        >
          <span className="truncate text-left">{SEX_LABEL[value]}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        <DropdownMenuItem className="cursor-pointer" onSelect={() => onChange("")}>
          Not specified
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onSelect={() => onChange("male")}>
          Male
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onSelect={() => onChange("female")}>
          Female
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PetTypeSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: PetTypeSelectValue | "";
  onChange: (v: PetTypeSelectValue) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm",
            "text-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            value === "" && "text-muted-foreground",
          )}
        >
          <span className="truncate text-left">
            {value === "" ? "Select pet type" : PET_TYPE_LABEL[value]}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {(Object.keys(PET_TYPE_LABEL) as PetTypeSelectValue[]).map((type) => (
          <DropdownMenuItem
            key={type}
            className="cursor-pointer"
            onSelect={() => onChange(type)}
          >
            {PET_TYPE_LABEL[type]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AgeRangeSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: AgeRangeValue;
  onChange: (v: AgeRangeValue) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm",
            "text-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            value === "" && "text-muted-foreground",
          )}
        >
          <span className="truncate text-left">{AGE_RANGE_LABEL[value]}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {(Object.keys(AGE_RANGE_LABEL) as AgeRangeValue[]).map((range) => (
          <DropdownMenuItem
            key={range === "" ? "unspecified" : range}
            className="cursor-pointer"
            onSelect={() => onChange(range)}
          >
            {AGE_RANGE_LABEL[range]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PetSizeSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: PetSizeValue;
  onChange: (v: PetSizeValue) => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm",
            "text-foreground transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            value === "" && "text-muted-foreground",
          )}
        >
          <span className="truncate text-left">{PET_SIZE_LABEL[value]}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {(Object.keys(PET_SIZE_LABEL) as PetSizeValue[]).map((size) => (
          <DropdownMenuItem
            key={size === "" ? "unspecified" : size}
            className="cursor-pointer"
            onSelect={() => onChange(size)}
          >
            {PET_SIZE_LABEL[size]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
          <PawPrint className="mx-auto mb-4 size-12 text-muted-foreground/50" />
          <p className="mb-4 text-muted-foreground">
            No pets added yet. Add a pet to get started.
          </p>
          <Button type="button" onClick={() => setShowAdd(true)}>
            <Plus className="size-4" />
            Add a pet
          </Button>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
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
  const [petType, setPetType] = useState<PetTypeSelectValue | "">("");
  const [otherPetType, setOtherPetType] = useState("");
  const [ageRange, setAgeRange] = useState<AgeRangeValue>("");
  const [petSize, setPetSize] = useState<PetSizeValue>("");
  const [sex, setSex] = useState<SexSelectValue>("");
  const [medical, setMedical] = useState("");
  const [dietary, setDietary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ageNum = ageNumberFromRange(ageRange);
    const resolvedPetType = getPetTypeFromSelection(petType, otherPetType);
    if (resolvedPetType === "") {
      setError("Please choose a pet type.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await createPetProfile(supabase, ownerUserId, {
      name,
      pet_type: resolvedPetType,
      age: ageNum,
      sex: sex === "" ? null : sex,
      pet_size: petSize === "" ? null : petSize,
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
    <Card className="border-border shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-2xl text-foreground">
          New pet
        </CardTitle>
        <CardDescription>
          Add name, species, and optional care details.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          onKeyDown={preventEnterSubmit}
          className="max-w-medium space-y-4"
        >
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
            <PetTypeSelect
              id="new-type"
              value={petType}
              onChange={setPetType}
              disabled={loading}
            />
          </div>
          {petType === "other" && (
            <div className="space-y-1.5">
              <Label htmlFor="new-type-other">Other type</Label>
              <Input
                id="new-type-other"
                placeholder="e.g. rabbit, lizard"
                value={otherPetType}
                onChange={(e) => setOtherPetType(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="new-age">Age (years)</Label>
            <AgeRangeSelect
              id="new-age"
              value={ageRange}
              onChange={setAgeRange}
              disabled={loading}
            />
          </div>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="new-size">
              Size{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <PetSizeSelect
              id="new-size"
              value={petSize}
              onChange={setPetSize}
              disabled={loading}
            />
          </div>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="new-sex">
              Sex{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <PetSexSelect
              id="new-sex"
              value={sex}
              onChange={setSex}
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-medical">Medical information</Label>
            <Textarea
              id="new-medical"
              value={medical}
              onChange={(e) => setMedical(e.target.value)}
              placeholder="Allergies, medications, vet notes..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-dietary">Dietary requirements</Label>
            <Textarea
              id="new-dietary"
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="Feeding schedule, restrictions..."
            />
          </div>
          {error && (
            <p className="text-sm text-danger-500" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create profile"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="w-full sm:w-auto"
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
  const initialPetType = getPetTypeSelection(pet.pet_type);
  const [name, setName] = useState(pet.name);
  const [petType, setPetType] = useState<PetTypeSelectValue>(initialPetType);
  const [otherPetType, setOtherPetType] = useState(
    initialPetType === "other" ? pet.pet_type : "",
  );
  const [ageRange, setAgeRange] = useState<AgeRangeValue>(() =>
    ageRangeFromNumber(pet.age),
  );
  const [petSize, setPetSize] = useState<PetSizeValue>(() =>
    petSizeFromRow(pet.pet_size),
  );
  const [sex, setSex] = useState<SexSelectValue>(() =>
    petSexFromRow(pet.sex),
  );
  const [medical, setMedical] = useState(pet.medical_info ?? "");
  const [dietary, setDietary] = useState(pet.dietary_requirements ?? "");

  const [profileDirty, setProfileDirty] = useState(false);
  const [medicalDirty, setMedicalDirty] = useState(false);
  const [dietaryDirty, setDietaryDirty] = useState(false);

  useEffect(() => {
    if (!profileDirty) {
      const nextType = getPetTypeSelection(pet.pet_type);
      setName(pet.name);
      setPetType(nextType);
      setOtherPetType(nextType === "other" ? pet.pet_type : "");
      setAgeRange(ageRangeFromNumber(pet.age));
      setPetSize(petSizeFromRow(pet.pet_size));
      setSex(petSexFromRow(pet.sex));
    }
    if (!medicalDirty) {
      setMedical(pet.medical_info ?? "");
    }
    if (!dietaryDirty) {
      setDietary(pet.dietary_requirements ?? "");
    }
  }, [pet, dietaryDirty, medicalDirty, profileDirty]);

  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingMedical, setSavingMedical] = useState(false);
  const [savingDietary, setSavingDietary] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ageNum = ageNumberFromRange(ageRange);
    const resolvedPetType = getPetTypeFromSelection(petType, otherPetType);
    if (resolvedPetType === "") {
      setError("Please choose a pet type.");
      return;
    }
    setSavingProfile(true);
    const supabase = createClient();
    const { error: err } = await updateProfile(supabase, pet.id, {
      name,
      pet_type: resolvedPetType,
      age: ageNum,
      sex: sex === "" ? null : sex,
      pet_size: petSize === "" ? null : petSize,
    });
    setSavingProfile(false);
    if (err) {
      setError(err.message);
      return;
    }
    setProfileDirty(false);
    setExpanded(false);
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
    setMedicalDirty(false);
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
    setDietaryDirty(false);
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

  const PetTypeIcon = getPetTypeIcon(pet.pet_type);

  return (
    <Card className="border-border shadow-card">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full border border-border bg-teal-50 p-2 text-teal-700">
            <PetTypeIcon className="size-5" aria-hidden />
          </div>
          <div>
            <CardTitle className="font-display text-2xl text-foreground">
              {pet.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {pet.pet_type}
              {pet.age !== null ? ` • ${pet.age} years` : ""}
              {pet.pet_size ? ` • ${PET_SIZE_LABEL[pet.pet_size]}` : ""}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
          >
            <Pencil className="size-4" />
            {expanded ? "Close" : "Edit"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-danger-500 hover:text-danger-500"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="size-4" />
            {deleting ? "Removing..." : "Remove"}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-6 border-t border-border pt-6">
          <form
            onSubmit={handleSaveProfile}
            onKeyDown={preventEnterSubmit}
            className="max-w-medium space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`name-${pet.id}`}>Name</Label>
                <Input
                  id={`name-${pet.id}`}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setProfileDirty(true);
                  }}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`type-${pet.id}`}>Type</Label>
                <PetTypeSelect
                  id={`type-${pet.id}`}
                  value={petType}
                  onChange={(v) => {
                    setPetType(v);
                    if (v !== "other") {
                      setOtherPetType("");
                    }
                    setProfileDirty(true);
                  }}
                  disabled={savingProfile}
                />
              </div>
            </div>
            {petType === "other" && (
              <div className="max-w-medium space-y-1.5">
                <Label htmlFor={`type-other-${pet.id}`}>Other type</Label>
                <Input
                  id={`type-other-${pet.id}`}
                  value={otherPetType}
                  onChange={(e) => {
                    setOtherPetType(e.target.value);
                    setProfileDirty(true);
                  }}
                  placeholder="e.g. rabbit, lizard"
                />
              </div>
            )}
            <div className="max-w-medium grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor={`age-${pet.id}`}>Age (years)</Label>
                <AgeRangeSelect
                  id={`age-${pet.id}`}
                  value={ageRange}
                  onChange={(v) => {
                    setAgeRange(v);
                    setProfileDirty(true);
                  }}
                  disabled={savingProfile}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`size-${pet.id}`}>
                  Size{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <PetSizeSelect
                  id={`size-${pet.id}`}
                  value={petSize}
                  onChange={(v) => {
                    setPetSize(v);
                    setProfileDirty(true);
                  }}
                  disabled={savingProfile}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`sex-${pet.id}`}>
                  Sex{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <PetSexSelect
                  id={`sex-${pet.id}`}
                  value={sex}
                  onChange={(v) => {
                    setSex(v);
                    setProfileDirty(true);
                  }}
                  disabled={savingProfile}
                />
              </div>
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save profile"}
            </Button>
          </form>

          <div className="max-w-medium space-y-2 border-t border-border pt-6">
            <Label htmlFor={`medical-${pet.id}`}>Medical information</Label>
            <Textarea
              id={`medical-${pet.id}`}
              value={medical}
              onChange={(e) => {
                setMedical(e.target.value);
                setMedicalDirty(true);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveMedical}
              disabled={savingMedical}
            >
              {savingMedical ? "Saving..." : "Save medical information"}
            </Button>
          </div>

          <div className="max-w-medium space-y-2 border-t border-border pt-6">
            <Label htmlFor={`dietary-${pet.id}`}>Dietary requirements</Label>
            <Textarea
              id={`dietary-${pet.id}`}
              value={dietary}
              onChange={(e) => {
                setDietary(e.target.value);
                setDietaryDirty(true);
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveDietary}
              disabled={savingDietary}
            >
              {savingDietary ? "Saving..." : "Save dietary requirements"}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-danger-500" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
