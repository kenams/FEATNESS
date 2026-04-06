import { calculateCaloriesBurned } from "./met";
import type { EffortCategory } from "./meal-catalog";
import type {
  BmiInsight,
  GoalKey,
  NutritionRecommendation,
  PrimaryObjectiveKey,
  WorkoutSessionRecord,
  SessionSuggestion,
  UserWorkoutInput,
} from "./types";

type MealCandidate = {
  id: string;
  name: string;
  priceEur: number;
  targetGoal: string;
  effortCategory: EffortCategory;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type WorkoutRecoveryInsight = {
  caloriesBurnedEstimate: number;
  effortCategory: EffortCategory;
  focusTitle: string;
  focusCopy: string;
  focusTags: string[];
};

export type WorkoutRecoveryNeeds = {
  caloriesBurned: number;
  hydrationMl: number;
  carbsTargetG: number;
  proteinTargetG: number;
  fatTargetG: number;
  effortCategory: EffortCategory;
  focusTitle: string;
  focusCopy: string;
};

export type RankedMeal<T extends MealCandidate> = T & {
  score: number;
  matchPercent: number;
  rank: number;
  fitLabel: "ideal" | "solide" | "leger";
  fitReason: string;
  fitChips: string[];
  isRecommended: boolean;
  needs: WorkoutRecoveryNeeds;
};

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function getBlendLabel(goal: GoalKey, durationMin: number, calories: number): string {
  if (goal === "performance") {
    if (durationMin >= 75 || calories >= 700) {
      return "Poulet teriyaki maison + nouilles de riz";
    }

    if (durationMin >= 60 || calories >= 550) {
      return "Poke bowl thon-riz-mangue";
    }

    return "Burrito bowl dinde-riz";
  }

  if (goal === "recovery" || calories >= 450) {
    if (durationMin >= 60 || calories >= 600) {
      return "Poulet, patate douce, brocoli";
    }

    if (durationMin >= 45) {
      return "Chili leger recuperation";
    }

    return "Bowl poulet, riz, courgette";
  }

  if (durationMin >= 45 || calories >= 350) {
    return "Porridge proteine post-cardio";
  }

  return "Skyr bowl banane-flocons d'avoine";
}

export function getWorkoutEffortCategory(
  input: Pick<UserWorkoutInput, "intensity" | "durationMin">,
  caloriesBurned: number,
): EffortCategory {
  if (
    input.intensity === "intense" ||
    input.durationMin >= 75 ||
    caloriesBurned >= 650
  ) {
    return "intense";
  }

  if (
    input.intensity === "moderate" ||
    input.durationMin >= 40 ||
    caloriesBurned >= 320
  ) {
    return "medium";
  }

  return "light";
}

function getFocusTitle(goal: GoalKey, objective: PrimaryObjectiveKey | null): string {
  if (goal === "performance") {
    return "Recharger en glucides";
  }

  if (goal === "recovery") {
    return objective === "gain_muscle" ? "Recuperer et reconstruire" : "Recuperer musculairement";
  }

  if (objective === "lose_weight") {
    return "Hydrater sans surcharger";
  }

  return "Hydrater et repartir proprement";
}

function getFocusCopy(
  goal: GoalKey,
  objective: PrimaryObjectiveKey | null,
  effortCategory: EffortCategory,
): string {
  if (goal === "performance") {
    return effortCategory === "intense"
      ? "Ta seance a vide une bonne partie du glycogene. Priorite aux glucides utiles, avec assez de proteines pour repartir vite."
      : "L'objectif principal est de remettre de l'energie rapidement, sans oublier une base proteique propre.";
  }

  if (goal === "recovery") {
    return objective === "gain_muscle"
      ? "Tu privilegies la recuperation musculaire. On pousse les proteines, puis assez de glucides pour absorber la seance."
      : "La priorite est de recuperer sans lourdeur : proteines maigres, glucides clairs et bonne rehydratation.";
  }

  return objective === "lose_weight"
    ? "On vise un repas plus propre et digeste, avec hydration et proteines, sans remonter trop haut en calories."
    : "L'hydratation reste prioritaire, avec juste ce qu'il faut de glucides et de proteines pour stabiliser la recuperation.";
}

export function buildWorkoutRecoveryInsight(
  input: UserWorkoutInput,
  objective: PrimaryObjectiveKey | null = null,
): WorkoutRecoveryInsight {
  const caloriesBurnedEstimate = calculateCaloriesBurned(input);
  const effortCategory = getWorkoutEffortCategory(input, caloriesBurnedEstimate);

  return {
    caloriesBurnedEstimate,
    effortCategory,
    focusTitle: getFocusTitle(input.goal, objective),
    focusCopy: getFocusCopy(input.goal, objective, effortCategory),
    focusTags: [
      `${caloriesBurnedEstimate} kcal estimees`,
      effortCategory === "light"
        ? "Effort leger"
        : effortCategory === "medium"
          ? "Effort moyen"
          : "Effort intense",
      input.goal === "performance"
        ? "Priorite glucides"
        : input.goal === "recovery"
          ? "Priorite proteines"
          : "Priorite hydratation",
    ],
  };
}

function getMealReason(
  meal: MealCandidate,
  input: UserWorkoutInput,
  objective: PrimaryObjectiveKey | null,
): { reason: string; chips: string[] } {
  const chips: string[] = [];

  if (meal.targetGoal === input.goal) {
    chips.push(
      input.goal === "performance"
        ? "Bon niveau de glucides"
        : input.goal === "recovery"
          ? "Bon soutien recovery"
          : "Bon pour l'hydratation",
    );
  }

  if (input.sport === "strength" || objective === "gain_muscle") {
    if (meal.proteinG >= 32) {
      chips.push("Proteines solides");
    }
  } else if (
    ["running", "cycling", "swimming", "rowing", "football", "basketball"].includes(input.sport)
  ) {
    if (meal.carbsG >= 55) {
      chips.push("Recharge glucidique");
    }
  }

  if (objective === "lose_weight" && meal.calories <= 560) {
    chips.push("Plus leger");
  }

  if (meal.effortCategory === "intense") {
    chips.push("Repas complet");
  }

  const reason =
    chips[0] ??
    (meal.targetGoal === input.goal
      ? "Bien cale sur la seance."
      : "Alternative acceptable pour cette seance.");

  return {
    reason,
    chips: chips.slice(0, 3),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateHydrationNeeds(
  caloriesBurned: number,
  weightKg: number,
): number {
  return Math.round((caloriesBurned / 1000) * 750 + weightKg * 30);
}

export function getOptimalConsumptionWindow(
  intensity: UserWorkoutInput["intensity"],
  _sport: UserWorkoutInput["sport"],
): string {
  if (intensity === "intense") {
    return "A consommer dans les 20 min (fenetre anabolique)";
  }

  if (intensity === "moderate") {
    return "A consommer dans les 45 min";
  }

  return "A consommer dans l'heure";
}

export function buildWorkoutRecoveryNeeds(
  input: UserWorkoutInput,
  objective: PrimaryObjectiveKey | null = null,
): WorkoutRecoveryNeeds {
  const caloriesBurned = calculateCaloriesBurned(input);
  const effortCategory = getWorkoutEffortCategory(input, caloriesBurned);
  const hydrationMl = calculateHydrationNeeds(caloriesBurned, input.weightKg);
  const carbsTargetG =
    effortCategory === "light" ? 40 : effortCategory === "medium" ? 58 : 76;
  const proteinTargetG =
    effortCategory === "light" ? 24 : effortCategory === "medium" ? 32 : 38;
  const fatTargetG =
    objective === "lose_weight"
      ? 18
      : effortCategory === "intense"
        ? 24
        : effortCategory === "medium"
          ? 20
          : 16;

  return {
    caloriesBurned,
    hydrationMl,
    carbsTargetG,
    proteinTargetG,
    fatTargetG,
    effortCategory,
    focusTitle: getFocusTitle(input.goal, objective),
    focusCopy: getFocusCopy(input.goal, objective, effortCategory),
  };
}

function calculateMealMatchPercent(
  meal: MealCandidate,
  needs: WorkoutRecoveryNeeds,
): number {
  const safeCarbsTarget = Math.max(needs.carbsTargetG, 1);
  const safeProteinTarget = Math.max(needs.proteinTargetG, 1);
  const safeFatTarget = Math.max(needs.fatTargetG, 1);

  const carbsDistance = (meal.carbsG - needs.carbsTargetG) / safeCarbsTarget;
  const proteinDistance = (meal.proteinG - needs.proteinTargetG) / safeProteinTarget;
  const fatDistance = (meal.fatG - needs.fatTargetG) / safeFatTarget;

  const euclidianDistance = Math.sqrt(
    carbsDistance * carbsDistance +
      proteinDistance * proteinDistance +
      fatDistance * fatDistance,
  );

  return Math.round(clamp(100 - euclidianDistance * 35, 0, 100));
}

export function getMealRecommendationReason<T extends MealCandidate>(
  meal: T,
  needs: WorkoutRecoveryNeeds,
  session: UserWorkoutInput,
  objective: PrimaryObjectiveKey | null,
): string {
  if (session.goal === "recovery" && meal.proteinG >= needs.proteinTargetG * 0.9) {
    return `Recommande car ta seance demande +${Math.round(
      needs.proteinTargetG,
    )}g de proteines`;
  }

  if (
    session.goal === "performance" &&
    meal.carbsG >= needs.carbsTargetG * 0.9
  ) {
    return "Recommande pour recharger vite en glucides";
  }

  if (objective === "lose_weight" && meal.calories <= 560) {
    return "Option legere adaptee a ton objectif seche";
  }

  if (session.goal === "hydration") {
    return "Option legere adaptee a ta recuperation";
  }

  if (meal.effortCategory === needs.effortCategory) {
    return `Bon choix pour un effort ${needs.effortCategory}`;
  }

  return "Bon equilibre post-effort pour ta seance";
}

export function calculateWeeklyRecoveryScore(
  sessions: Array<Pick<WorkoutSessionRecord, "createdAt" | "workout" | "recommendation">>,
): number {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);

  const recentSessions = sessions.filter((session) => {
    const sessionDate = new Date(session.createdAt);
    return sessionDate >= weekStart;
  });

  let score = 100;
  let veryHighCount = 0;

  for (const session of recentSessions) {
    const calories = session.recommendation.caloriesBurned;
    const effort = getWorkoutEffortCategory(session.workout, calories);

    if (effort === "light" || effort === "medium") {
      score += 10;
    } else {
      score += 5;
      veryHighCount += 1;
    }
  }

  if (veryHighCount > 2) {
    score -= 5;
  }

  return clamp(score, 0, 100);
}

export function rankMealsForWorkout<T extends MealCandidate>(
  meals: T[],
  input: UserWorkoutInput,
  objective: PrimaryObjectiveKey | null = null,
  recommendedBlend: string | null = null,
): RankedMeal<T>[] {
  const needs = buildWorkoutRecoveryNeeds(input, objective);

  const ranked = meals
    .map((meal) => {
      let score = 0;

      if (recommendedBlend && meal.name === recommendedBlend) {
        score += 8;
      }

      if (meal.targetGoal === input.goal) {
        score += 5;
      }

      if (meal.effortCategory === needs.effortCategory) {
        score += 4;
      } else if (
        (needs.effortCategory === "medium" && meal.effortCategory !== "intense") ||
        (needs.effortCategory === "intense" && meal.effortCategory === "medium")
      ) {
        score += 2;
      }

      score += Math.max(0, 6 - Math.abs(meal.carbsG - needs.carbsTargetG) / 8);
      score += Math.max(0, 6 - Math.abs(meal.proteinG - needs.proteinTargetG) / 5);

      if (objective === "lose_weight") {
        if (meal.calories <= 580) score += 4;
        if (meal.proteinG >= 28) score += 2;
      } else if (objective === "gain_muscle") {
        if (meal.proteinG >= 35) score += 4;
        if (meal.calories >= 600) score += 3;
        if (meal.carbsG >= 55) score += 2;
      } else if (objective === "improve_endurance") {
        if (meal.carbsG >= 60) score += 4;
        if (meal.targetGoal === "performance") score += 3;
      } else {
        if (meal.calories >= 430 && meal.calories <= 720) score += 2;
      }

      if (["running", "cycling", "swimming", "rowing"].includes(input.sport)) {
        if (meal.carbsG >= 55) score += 2;
      }

      if (input.sport === "strength" && meal.proteinG >= 32) {
        score += 2;
      }

      const matchPercent = calculateMealMatchPercent(meal, needs);
      const { chips } = getMealReason(meal, input, objective);
      const reason = getMealRecommendationReason(meal, needs, input, objective);

      return {
        ...meal,
        score: Number(score.toFixed(1)),
        matchPercent,
        fitReason: reason,
        fitChips: chips,
        needs,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.priceEur - right.priceEur;
    });

  const topScore = ranked[0]?.score ?? 0;

  return ranked.map((meal, index) => ({
    ...meal,
    rank: index + 1,
      fitLabel:
        meal.score >= topScore - 1.5
          ? "ideal"
          : meal.score >= topScore - 4
          ? "solide"
          : "leger",
      isRecommended: index < 3,
    }));
}

export function calculateBmi(weightKg: number, heightCm: number): BmiInsight | null {
  if (weightKg <= 0 || heightCm <= 0) {
    return null;
  }

  const heightMeters = heightCm / 100;
  const bmi = Number((weightKg / (heightMeters * heightMeters)).toFixed(1));

  if (bmi < 18.5) {
    return { bmi, category: "underweight", label: "Poids insuffisant" };
  }

  if (bmi < 25) {
    return { bmi, category: "healthy", label: "Zone sante" };
  }

  if (bmi < 30) {
    return { bmi, category: "overweight", label: "Surpoids" };
  }

  return { bmi, category: "obesity", label: "Obesite" };
}

type SuggestionInput = {
  age: number;
  weightKg: number;
  heightCm: number;
  primaryObjective: PrimaryObjectiveKey;
};

export function buildSessionSuggestions(input: SuggestionInput): SessionSuggestion[] {
  const bmiInsight = calculateBmi(input.weightKg, input.heightCm);
  const bmiCategory = bmiInsight?.category ?? "healthy";

  const enrichSuggestions = (suggestions: SessionSuggestion[]): SessionSuggestion[] =>
    suggestions.map((suggestion) => {
      const insight = buildWorkoutRecoveryInsight(
        {
          sport: suggestion.sport,
          intensity: suggestion.intensity,
          durationMin: suggestion.durationMin,
          weightKg: input.weightKg,
          goal: suggestion.goal,
        },
        input.primaryObjective,
      );

      return {
        ...suggestion,
        estimatedCaloriesBurned: insight.caloriesBurnedEstimate,
        effortCategory: insight.effortCategory,
        focusTitle: insight.focusTitle,
        focusCopy: insight.focusCopy,
      };
    });

  if (input.primaryObjective === "lose_weight") {
    return enrichSuggestions([
      {
        key: "lean-burn",
        title: "Seance brule-graisse",
        description: "Cardio progressif pour lancer la depense sans t'epuiser.",
        why:
          bmiCategory === "obesity" || bmiCategory === "overweight"
            ? "Priorite a une depense calorique reguliere et tolerable."
            : "Bon levier pour baisser la masse grasse tout en gardant du rythme.",
        sport: "cycling",
        intensity: "moderate",
        durationMin: 40,
        goal: "hydration",
      },
      {
        key: "metabolic-strength",
        title: "Renforcement metabolique",
        description: "Circuit force + cardio court pour stimuler le metabolisme.",
        why: "Aide a proteger la masse musculaire pendant la perte de poids.",
        sport: "strength",
        intensity: "moderate",
        durationMin: 35,
        goal: "recovery",
      },
      {
        key: "reset-recovery",
        title: "Mobilite active",
        description: "Session douce pour garder la frequence sans surcharge.",
        why: "Utile les jours de fatigue ou de reprise progressive.",
        sport: "yoga",
        intensity: "light",
        durationMin: 30,
        goal: "hydration",
      },
    ]);
  }

  if (input.primaryObjective === "gain_muscle") {
    return enrichSuggestions([
      {
        key: "muscle-builder",
        title: "Construction musculaire",
        description: "Travail de force principal pour stimuler l'hypertrophie.",
        why: "Le meilleur point d'entree pour prendre du muscle proprement.",
        sport: "strength",
        intensity: "intense",
        durationMin: 50,
        goal: "recovery",
      },
      {
        key: "hybrid-power",
        title: "Puissance hybride",
        description: "Bloc explosif pour volume et intensite.",
        why: "Renforce l'explosivite et maintient une bonne densite d'effort.",
        sport: "hiit",
        intensity: "moderate",
        durationMin: 28,
        goal: "performance",
      },
      {
        key: "support-recovery",
        title: "Recuperation active",
        description: "Flux de mobilite pour mieux absorber les cycles de force.",
        why: "Ameliore la regularite sans ajouter une vraie fatigue.",
        sport: "yoga",
        intensity: "light",
        durationMin: 25,
        goal: "hydration",
      },
    ]);
  }

  if (input.primaryObjective === "improve_endurance") {
    return enrichSuggestions([
      {
        key: "aerobic-base",
        title: "Base endurance",
        description: "Travail cardio long et propre pour monter le volume utile.",
        why: "Le socle le plus rentable pour progresser en endurance.",
        sport: "running",
        intensity: "moderate",
        durationMin: 55,
        goal: "performance",
      },
      {
        key: "tempo-engine",
        title: "Tempo cardio",
        description: "Bloc soutenu pour gagner en capacite et en tolerance.",
        why: "Augmente la qualite d'effort sans passer sur un format extreme.",
        sport: "cycling",
        intensity: "intense",
        durationMin: 42,
        goal: "performance",
      },
      {
        key: "swim-support",
        title: "Recuperation cardio",
        description: "Cardio controle pour enchainer plus souvent.",
        why: "Parfait entre deux grosses seances ou en phase de reprise.",
        sport: "swimming",
        intensity: "light",
        durationMin: 35,
        goal: "hydration",
      },
    ]);
  }

  return enrichSuggestions([
    {
      key: "balanced-rhythm",
      title: "Rythme equilibre",
      description: "Format simple pour entretenir la forme et la regularite.",
      why: "Ideal pour maintenir le niveau sans trop complexifier le planning.",
      sport: "running",
      intensity: "moderate",
      durationMin: 35,
      goal: "hydration",
    },
    {
      key: "strength-balance",
      title: "Tonicite musculaire",
      description: "Renforcement general pour garder une base physique propre.",
      why: "Soutient la posture, la tonicite et l'entretien global.",
      sport: "strength",
      intensity: "moderate",
      durationMin: 30,
      goal: "recovery",
    },
    {
      key: "mobility-balance",
      title: "Mobilite et relance",
      description: "Session legere pour rester mobile et disponible.",
      why: "Utile pour garder la frequence sans fatigue additionnelle.",
      sport: "yoga",
      intensity: "light",
      durationMin: 25,
      goal: "hydration",
    },
  ]);
}

export function buildNutritionRecommendation(
  input: UserWorkoutInput,
): NutritionRecommendation {
  const caloriesBurned = calculateCaloriesBurned(input);
  const hydrationMl = roundToNearest(
    Math.max(450, calculateHydrationNeeds(caloriesBurned, input.weightKg)),
    25,
  );
  const carbsG = Number(
    Math.max(12, caloriesBurned * (input.goal === "performance" ? 0.24 : 0.18)).toFixed(1),
  );
  const proteinG = Number(
    Math.max(
      12,
      input.weightKg * (input.goal === "recovery" ? 0.28 : 0.2) + caloriesBurned / 300,
    ).toFixed(1),
  );
  const electrolytesMg = roundToNearest(
    Math.max(220, input.durationMin * 10 + caloriesBurned * 0.35),
    10,
  );
  const recommendedBlend = getBlendLabel(input.goal, input.durationMin, caloriesBurned);

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
