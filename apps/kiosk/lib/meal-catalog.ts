export type MealPreparationType =
  | "lyophilise"
  | "auto_chauffant"
  | "assemblage_sec";

export type MealPresentation = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  preparationType: MealPreparationType;
  accent: string;
};

type DrinkBlendRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  target_goal: string;
  price_eur: number | string | null;
};

export type SelectableMeal = {
  id: string;
  slug: string;
  name: string;
  description: string;
  targetGoal: string;
  priceEur: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  preparationType: MealPreparationType;
  accent: string;
};

const PRESENTATION_BY_SLUG: Record<string, MealPresentation> = {
  "hydration-electrolyte-mix": {
    calories: 180,
    proteinG: 12,
    carbsG: 18,
    fatG: 4,
    preparationType: "assemblage_sec",
    accent: "#6cd3ff",
  },
  "recovery-protein-mix": {
    calories: 340,
    proteinG: 28,
    carbsG: 35,
    fatG: 8,
    preparationType: "auto_chauffant",
    accent: "#ffb86b",
  },
  "endurance-carb-blend": {
    calories: 290,
    proteinG: 14,
    carbsG: 44,
    fatG: 6,
    preparationType: "lyophilise",
    accent: "#9ff58f",
  },
};

const DEFAULT_PRESENTATION: MealPresentation = {
  calories: 250,
  proteinG: 18,
  carbsG: 30,
  fatG: 7,
  preparationType: "assemblage_sec",
  accent: "#c9a646",
};

export function getPreparationLabel(type: MealPreparationType): string {
  switch (type) {
    case "lyophilise":
      return "Lyophilise";
    case "auto_chauffant":
      return "Auto-chauffant";
    case "assemblage_sec":
      return "Assemblage sec";
    default:
      return type;
  }
}

export function hydrateMeal(row: DrinkBlendRow): SelectableMeal {
  const presentation = PRESENTATION_BY_SLUG[row.slug] ?? DEFAULT_PRESENTATION;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    targetGoal: row.target_goal,
    priceEur:
      typeof row.price_eur === "number"
        ? row.price_eur
        : Number(row.price_eur ?? 0),
    calories: presentation.calories,
    proteinG: presentation.proteinG,
    carbsG: presentation.carbsG,
    fatG: presentation.fatG,
    preparationType: presentation.preparationType,
    accent: presentation.accent,
  };
}
