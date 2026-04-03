import { calculateCaloriesBurned } from "./met";
import type { GoalKey, NutritionRecommendation, UserWorkoutInput } from "./types";

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function getBlendLabel(goal: GoalKey, durationMin: number, calories: number): string {
  if (goal === "performance" || durationMin >= 60) {
    return "Endurance Carb Blend";
  }

  if (goal === "recovery" || calories >= 450) {
    return "Recovery Protein Mix";
  }

  return "Hydration Electrolyte Mix";
}

export function buildNutritionRecommendation(
  input: UserWorkoutInput,
): NutritionRecommendation {
  const caloriesBurned = calculateCaloriesBurned(input);
  const hydrationMl = roundToNearest(
    Math.max(450, input.durationMin * 12 + caloriesBurned * 1.4),
    25,
  );
  const carbsG = Number(
    Math.max(12, caloriesBurned * (input.goal === "performance" ? 0.24 : 0.18)).toFixed(1),
  );
  const proteinG = Number(
    Math.max(12, input.weightKg * (input.goal === "recovery" ? 0.28 : 0.2) + caloriesBurned / 300).toFixed(1),
  );
  const electrolytesMg = roundToNearest(
    Math.max(220, input.durationMin * 10 + caloriesBurned * 0.35),
    10,
  );
  const recommendedBlend = getBlendLabel(
    input.goal,
    input.durationMin,
    caloriesBurned,
  );

  return {
    caloriesBurned,
    hydrationMl,
    carbsG,
    proteinG,
    electrolytesMg,
    recommendedBlend,
    recommendationSummary:
      `${recommendedBlend} pour ${caloriesBurned} kcal estimees, ` +
      `${hydrationMl} ml, ${carbsG} g glucides, ${proteinG} g proteines.`,
  };
}
