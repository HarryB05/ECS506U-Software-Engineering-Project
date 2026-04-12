export const PRESET_PET_TYPES = [
  "Dog",
  "Cat",
  "Rabbit",
  "Bird",
  "Fish",
  "Small pets",
  "Reptile",
  "Other",
] as const;

export type PresetPetType = (typeof PRESET_PET_TYPES)[number];
