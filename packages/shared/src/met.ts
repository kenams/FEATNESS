import type {
  ActivityPreset,
  IntensityLevel,
  SportKey,
  UserWorkoutInput,
} from "./types";

export const ACTIVITY_PRESETS: ActivityPreset[] = [
  {
    key: "running",
    label: "Course",
    metValues: { light: 7, moderate: 9.8, intense: 11.8 },
  },
  {
    key: "cycling",
    label: "Cyclisme",
    metValues: { light: 4, moderate: 6.8, intense: 10 },
  },
  {
    key: "strength",
    label: "Musculation",
    metValues: { light: 3.5, moderate: 5, intense: 6 },
  },
  {
    key: "hiit",
    label: "HIIT",
    metValues: { light: 8, moderate: 10, intense: 12 },
  },
  {
    key: "yoga",
    label: "Yoga / Pilates",
    metValues: { light: 2.5, moderate: 3, intense: 4 },
  },
  {
    key: "football",
    label: "Football",
    metValues: { light: 7, moderate: 8.8, intense: 10 },
  },
  {
    key: "basketball",
    label: "Basketball",
    metValues: { light: 6, moderate: 8, intense: 10 },
  },
  {
    key: "swimming",
    label: "Natation",
    metValues: { light: 6, moderate: 8.3, intense: 10 },
  },
  {
    key: "rowing",
    label: "Rameur",
    metValues: { light: 4.8, moderate: 7, intense: 8.5 },
  },
] as const;

const ACTIVITY_MAP = new Map<SportKey, ActivityPreset>(
  ACTIVITY_PRESETS.map((preset) => [preset.key, preset]),
);

export function getMetValue(
  sport: SportKey,
  intensity: IntensityLevel,
): number {
  const preset = ACTIVITY_MAP.get(sport);

  if (!preset) {
    throw new Error(`Unsupported sport: ${sport}`);
  }

  return preset.metValues[intensity];
}

export function calculateCaloriesBurned(input: UserWorkoutInput): number {
  const met = getMetValue(input.sport, input.intensity);
  const caloriesPerMinute = (met * 3.5 * input.weightKg) / 200;

  return Number((caloriesPerMinute * input.durationMin).toFixed(0));
}
