export const PRESET_PET_TYPES = [
  "Dog",
  "Cat",
  "Bird",
  "Fish",
  "Other",
] as const;

export type PresetPetType = (typeof PRESET_PET_TYPES)[number];
