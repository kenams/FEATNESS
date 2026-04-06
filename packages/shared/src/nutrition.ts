import { calculateCaloriesBurned } from "./met";
import type {
  BmiInsight,
  GoalKey,
  NutritionRecommendation,
  PrimaryObjectiveKey,
  SessionSuggestion,
  UserWorkoutInput,
} from "./types";

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

  if (input.primaryObjective === "lose_weight") {
    return [
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
    ];
  }

  if (input.primaryObjective === "gain_muscle") {
    return [
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
    ];
  }

  if (input.primaryObjective === "improve_endurance") {
    return [
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
    ];
  }

  return [
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
  ];
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
