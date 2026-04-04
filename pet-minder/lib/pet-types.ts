export const PRESET_PET_TYPES = [
  "Dogs",
  "Cats",
  "Rabbits",
  "Guinea Pigs",
  "Hamsters",
  "Birds",
  "Fish",
  "Reptiles",
  "Horses",
  "Ferrets",
  "Other",
] as const;

export type PresetPetType = (typeof PRESET_PET_TYPES)[number];
