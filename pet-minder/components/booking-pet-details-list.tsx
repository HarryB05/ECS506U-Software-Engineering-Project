"use client";

import type { BookingPetDetail } from "@/lib/types/booking";

type BookingPetDetailsListProps = {
  pets: BookingPetDetail[];
};

export function BookingPetDetailsList({ pets }: BookingPetDetailsListProps) {
  return (
    <div className="mt-1 space-y-2">
      {pets.map((pet) => (
        <div
          key={pet.id}
          className="rounded-lg border border-border bg-secondary/20 p-3"
        >
          <p className="text-foreground font-medium">
            {pet.name}
            {pet.petType ? (
              <span className="font-normal text-muted-foreground"> · {pet.petType}</span>
            ) : null}
          </p>
          {pet.sex || pet.age != null ? (
            <p className="text-xs text-muted-foreground mt-1">
              {pet.sex ? pet.sex : null}
              {pet.sex && pet.age != null ? " · " : null}
              {pet.age != null ? `${pet.age} year${pet.age === 1 ? "" : "s"} old` : null}
            </p>
          ) : null}
          {pet.medicalInfo ? (
            <p className="text-xs text-foreground mt-2 leading-relaxed">
              <span className="text-muted-foreground">Medical:</span> {pet.medicalInfo}
            </p>
          ) : null}
          {pet.dietaryRequirements ? (
            <p className="text-xs text-foreground mt-1 leading-relaxed">
              <span className="text-muted-foreground">Diet:</span> {pet.dietaryRequirements}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
