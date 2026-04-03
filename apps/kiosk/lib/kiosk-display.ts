import { ACTIVITY_PRESETS, type GoalKey, type IntensityLevel, type SportKey } from "@featness/shared";

import type { MealPreparationType } from "@/lib/meal-catalog";

const SPORT_LABELS = new Map<SportKey, string>(
  ACTIVITY_PRESETS.map((preset) => [preset.key, preset.label]),
);

export function getSportLabel(sport: SportKey): string {
  return SPORT_LABELS.get(sport) ?? sport;
}

export function getIntensityLabel(intensity: IntensityLevel): string {
  switch (intensity) {
    case "light":
      return "Legere";
    case "moderate":
      return "Moderee";
    case "intense":
      return "Intense";
    default:
      return intensity;
  }
}

export function getGoalLabel(goal: GoalKey): string {
  switch (goal) {
    case "hydration":
      return "Hydratation";
    case "recovery":
      return "Recuperation";
    case "performance":
      return "Performance";
    default:
      return goal;
  }
}

export function getGoalBadgeColor(goal: GoalKey): string {
  switch (goal) {
    case "recovery":
      return "#10b981";
    case "hydration":
      return "#3b82f6";
    case "performance":
      return "#f59e0b";
    default:
      return "#6b7280";
  }
}

export function getPreparationTypeLabel(type: MealPreparationType): string {
  switch (type) {
    case "lyophilise":
      return "Lyophilise · eau chaude";
    case "auto_chauffant":
      return "Auto-chauffant";
    case "assemblage_sec":
      return "Assemblage a sec";
    default:
      return type;
  }
}

export function getPreparationAccent(type: MealPreparationType): string {
  switch (type) {
    case "lyophilise":
      return "#f59e0b";
    case "auto_chauffant":
      return "#ef4444";
    case "assemblage_sec":
      return "#3b82f6";
    default:
      return "#10b981";
  }
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function getFirstName(fullName: string | null | undefined): string {
  if (!fullName) {
    return "Membre FEATNESS";
  }

  return fullName.trim().split(/\s+/)[0] || "Membre FEATNESS";
}
