import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  addMinutesToIso,
  type DispenseTokenRecord,
  type GoalKey,
  type NutritionRecommendation,
  type PrimaryObjectiveKey,
  type SportKey,
  type UserProfile,
  type UserWorkoutInput,
  type WorkoutSessionRecord,
} from "@featness/shared";

export type DrinkBlendRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  targetGoal: string;
  effortCategory: "light" | "medium" | "intense";
  priceEur: number;
  isAvailable: boolean;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  preparationType: "lyophilise" | "auto_chauffant" | "assemblage_sec";
  accent: string;
  ingredients: string[];
  allergens: string[];
  ingredientNotes: string;
};

export type KioskRecord = {
  id: string;
  name: string;
  locationCity: string | null;
  isActive: boolean;
  stockUnits: number;
  stockAlertThreshold: number;
  lastHeartbeatAt: string | null;
};

export type UserPreferencesPayload = {
  preferredSport: SportKey | null;
  preferredGoal: GoalKey | null;
  favoriteMealIds: string[];
};

type DrinkBlendPresentation = Pick<
  DrinkBlendRecord,
  | "calories"
  | "proteinG"
  | "carbsG"
  | "fatG"
  | "preparationType"
  | "accent"
  | "ingredients"
  | "allergens"
  | "ingredientNotes"
>;

const PRESENTATION_BY_SLUG: Record<string, DrinkBlendPresentation> = {
  "bowl-poulet-riz-courgette": {
    calories: 520,
    proteinG: 38,
    carbsG: 54,
    fatG: 14,
    preparationType: "auto_chauffant",
    accent: "#7bd39c",
    ingredients: [
      "Blanc de poulet",
      "Riz basmati",
      "Courgette",
      "Huile d'olive",
      "Sel",
      "Poivre",
      "Herbes de Provence",
    ],
    allergens: [],
    ingredientNotes:
      "Recette recovery simple et digeste, ideale apres un effort leger a moyen avec glucides et proteines maigres.",
  },
  "omelette-sport-tartines-completes": {
    calories: 460,
    proteinG: 31,
    carbsG: 29,
    fatG: 22,
    preparationType: "auto_chauffant",
    accent: "#f3c76a",
    ingredients: [
      "Oeufs",
      "Blancs d'oeufs",
      "Pain complet",
      "Tomates",
      "Epinards",
      "Fromage frais leger",
      "Huile d'olive",
    ],
    allergens: ["Oeufs", "Gluten", "Lait"],
    ingredientNotes:
      "Bon compromis post-seance courte avec proteines rapides et tartines completes pour recharger sans lourdeur.",
  },
  "skyr-bowl-banane-flocons-davoine": {
    calories: 390,
    proteinG: 26,
    carbsG: 46,
    fatG: 8,
    preparationType: "assemblage_sec",
    accent: "#6cd3ff",
    ingredients: [
      "Skyr",
      "Banane",
      "Flocons d'avoine",
      "Myrtilles",
      "Graines de chia",
      "Miel",
    ],
    allergens: ["Lait", "Gluten"],
    ingredientNotes:
      "Option hydratation et recuperation legere, pratique dans l'heure suivant un cardio ou une seance moderee.",
  },
  "wrap-dinde-avocat": {
    calories: 470,
    proteinG: 33,
    carbsG: 34,
    fatG: 18,
    preparationType: "assemblage_sec",
    accent: "#82c9ad",
    ingredients: [
      "Tortilla complete",
      "Blanc de dinde",
      "Avocat",
      "Salade",
      "Tomate",
      "Fromage blanc",
      "Citron",
      "Poivre",
    ],
    allergens: ["Gluten", "Lait"],
    ingredientNotes:
      "Wrap recovery rapide pour une faim moderee avec bon apport proteique et lipides utiles via l'avocat.",
  },
  "saumon-pommes-de-terre-haricots-verts": {
    calories: 560,
    proteinG: 34,
    carbsG: 40,
    fatG: 24,
    preparationType: "auto_chauffant",
    accent: "#9ad0ff",
    ingredients: [
      "Pave de saumon",
      "Pommes de terre",
      "Haricots verts",
      "Huile d'olive",
      "Citron",
      "Ail",
      "Sel",
      "Poivre",
    ],
    allergens: ["Poisson"],
    ingredientNotes:
      "Plat complet recovery avec omega-3, pommes de terre digestes et legumes simples apres seance technique ou moderee.",
  },
  "porridge-proteine-post-cardio": {
    calories: 430,
    proteinG: 24,
    carbsG: 49,
    fatG: 13,
    preparationType: "assemblage_sec",
    accent: "#f0be73",
    ingredients: [
      "Flocons d'avoine",
      "Lait",
      "Banane",
      "Beurre de cacahuete",
      "Cannelle",
      "Skyr",
    ],
    allergens: ["Lait", "Gluten", "Arachides"],
    ingredientNotes:
      "Base hydratation et glucides pour post-cardio avec texture simple a consommer juste apres effort.",
  },
  "poulet-patate-douce-brocoli": {
    calories: 610,
    proteinG: 42,
    carbsG: 58,
    fatG: 16,
    preparationType: "auto_chauffant",
    accent: "#8cc97f",
    ingredients: [
      "Blanc de poulet",
      "Patate douce",
      "Brocoli",
      "Huile d'olive",
      "Paprika",
      "Ail",
      "Sel",
      "Poivre",
    ],
    allergens: [],
    ingredientNotes:
      "Reference FEATNESS pour recuperation serieuse apres muscu ou circuit training avec glucides lents et proteines maigres.",
  },
  "bowl-quinoa-thon-avocat": {
    calories: 540,
    proteinG: 32,
    carbsG: 41,
    fatG: 22,
    preparationType: "assemblage_sec",
    accent: "#7fd1d8",
    ingredients: [
      "Quinoa",
      "Thon au naturel",
      "Avocat",
      "Concombre",
      "Tomates cerises",
      "Mais",
      "Jus de citron",
      "Huile d'olive",
    ],
    allergens: ["Poisson"],
    ingredientNotes:
      "Bowl tres pratique pour recuperer sans lourdeur avec bon equilibre entre glucides, proteines et hydration vegetale.",
  },
  "pates-completes-au-poulet": {
    calories: 690,
    proteinG: 39,
    carbsG: 78,
    fatG: 16,
    preparationType: "auto_chauffant",
    accent: "#f0a86e",
    ingredients: [
      "Pates completes",
      "Blanc de poulet",
      "Sauce tomate nature",
      "Courgette",
      "Parmesan",
      "Ail",
      "Basilic",
      "Huile d'olive",
    ],
    allergens: ["Gluten", "Lait"],
    ingredientNotes:
      "Plat performance pour remonter le stock de glycogene apres effort moyen a intense avec base glucidique genereuse.",
  },
  "riz-boeuf-maigre-poivrons": {
    calories: 660,
    proteinG: 37,
    carbsG: 63,
    fatG: 19,
    preparationType: "auto_chauffant",
    accent: "#d88b74",
    ingredients: [
      "Riz jasmin",
      "Boeuf maigre",
      "Poivrons",
      "Oignon",
      "Sauce soja legere",
      "Ail",
      "Huile d'olive",
    ],
    allergens: ["Soja"],
    ingredientNotes:
      "Version plus dense pour efforts moyens, utile quand il faut remonter l'energie tout en gardant des proteines solides.",
  },
  "chili-leger-recuperation": {
    calories: 640,
    proteinG: 36,
    carbsG: 61,
    fatG: 17,
    preparationType: "auto_chauffant",
    accent: "#c97768",
    ingredients: [
      "Haricots rouges",
      "Dinde hachee",
      "Riz",
      "Tomate concassee",
      "Oignon",
      "Ail",
      "Cumin",
      "Paprika",
    ],
    allergens: [],
    ingredientNotes:
      "Plat recovery complet et rassasiant, tres pertinent apres musculation ou cardio boxing de duree moyenne.",
  },
  "salade-lentilles-oeufs-feta": {
    calories: 510,
    proteinG: 28,
    carbsG: 36,
    fatG: 22,
    preparationType: "assemblage_sec",
    accent: "#a5c98a",
    ingredients: [
      "Lentilles cuites",
      "Oeufs",
      "Feta",
      "Concombre",
      "Tomates",
      "Roquette",
      "Huile d'olive",
      "Vinaigre balsamique",
    ],
    allergens: ["Oeufs", "Lait"],
    ingredientNotes:
      "Option recovery froide et pratique, avec bonnes fibres et proteines pour les jours de seance moyenne ou reprise.",
  },
  "burrito-bowl-dinde-riz": {
    calories: 700,
    proteinG: 40,
    carbsG: 75,
    fatG: 18,
    preparationType: "auto_chauffant",
    accent: "#f2b464",
    ingredients: [
      "Riz",
      "Dinde hachee",
      "Haricots noirs",
      "Mais",
      "Avocat",
      "Salsa tomate",
      "Salade",
      "Coriandre",
    ],
    allergens: [],
    ingredientNotes:
      "Recette performance simple pour remonter haut les glucides apres une seance exigeante sans perdre le focus proteique.",
  },
  "cabillaud-semoule-legumes-rotis": {
    calories: 570,
    proteinG: 35,
    carbsG: 53,
    fatG: 14,
    preparationType: "auto_chauffant",
    accent: "#8fc7d9",
    ingredients: [
      "Cabillaud",
      "Semoule complete",
      "Carottes",
      "Courgettes",
      "Poivrons",
      "Huile d'olive",
      "Citron",
      "Epices douces",
    ],
    allergens: ["Poisson", "Gluten"],
    ingredientNotes:
      "Plat tres propre pour recuperation ou performance moderee avec poisson maigre et semoule complete digeste.",
  },
  "saumon-riz-complet-avocat": {
    calories: 760,
    proteinG: 39,
    carbsG: 66,
    fatG: 30,
    preparationType: "assemblage_sec",
    accent: "#6fb4ff",
    ingredients: [
      "Saumon",
      "Riz complet",
      "Avocat",
      "Epinards",
      "Concombre",
      "Huile d'olive",
      "Citron",
      "Graines de sesame",
    ],
    allergens: ["Poisson", "Sesame"],
    ingredientNotes:
      "Format intense avec bon volume glucidique et lipides utiles, pense pour course longue ou grosse seance jambes.",
  },
  "poulet-teriyaki-maison-nouilles-de-riz": {
    calories: 780,
    proteinG: 42,
    carbsG: 88,
    fatG: 14,
    preparationType: "auto_chauffant",
    accent: "#f3a95f",
    ingredients: [
      "Blanc de poulet",
      "Nouilles de riz",
      "Carottes",
      "Brocoli",
      "Sauce soja reduite en sel",
      "Miel",
      "Gingembre",
      "Ail",
    ],
    allergens: ["Soja"],
    ingredientNotes:
      "Choix performance fort pour recharger vite apres effort intense ou sortie longue, avec gros focus glucides.",
  },
  "poke-bowl-thon-riz-mangue": {
    calories: 720,
    proteinG: 36,
    carbsG: 81,
    fatG: 17,
    preparationType: "assemblage_sec",
    accent: "#7fd8c0",
    ingredients: [
      "Riz",
      "Thon",
      "Mangue",
      "Concombre",
      "Avocat",
      "Edamame",
      "Sauce soja legere",
      "Citron vert",
      "Graines de sesame",
    ],
    allergens: ["Poisson", "Soja", "Sesame"],
    ingredientNotes:
      "Poke performance tres lisible pour une recuperation haute en glucides tout en restant frais et digeste.",
  },
  "gnocchis-dinde-sauce-tomate": {
    calories: 740,
    proteinG: 38,
    carbsG: 86,
    fatG: 15,
    preparationType: "auto_chauffant",
    accent: "#e1937e",
    ingredients: [
      "Gnocchis",
      "Dinde hachee",
      "Sauce tomate nature",
      "Courgette",
      "Parmesan",
      "Ail",
      "Basilic",
      "Huile d'olive",
    ],
    allergens: ["Gluten", "Lait"],
    ingredientNotes:
      "Recette performance genereuse pour les grosses depenses, avec dinde maigre et grosse base glucidique.",
  },
  "curry-de-poulet-riz-coco-leger": {
    calories: 760,
    proteinG: 39,
    carbsG: 79,
    fatG: 20,
    preparationType: "auto_chauffant",
    accent: "#e7b56d",
    ingredients: [
      "Blanc de poulet",
      "Riz basmati",
      "Lait de coco leger",
      "Carottes",
      "Courgette",
      "Pois chiches",
      "Curry",
      "Ail",
      "Oignon",
    ],
    allergens: [],
    ingredientNotes:
      "Plat performance confortable et rassasiant quand la seance a ete tres exigeante et qu'il faut recharger fort.",
  },
  "bol-recovery-yaourt-granola-fruits-toast-oeufs": {
    calories: 610,
    proteinG: 32,
    carbsG: 65,
    fatG: 20,
    preparationType: "assemblage_sec",
    accent: "#d9c47c",
    ingredients: [
      "Yaourt grec",
      "Granola",
      "Banane",
      "Fruits rouges",
      "Miel",
      "Pain complet",
      "Oeufs",
      "Avocat",
    ],
    allergens: ["Lait", "Gluten", "Oeufs"],
    ingredientNotes:
      "Format recovery complet et pratique, ideal quand il faut glucides, proteines et hydration douce sans plat chaud lourd.",
  },
  "hydration-electrolyte-mix": {
    calories: 180,
    proteinG: 12,
    carbsG: 18,
    fatG: 4,
    preparationType: "assemblage_sec",
    accent: "#6cd3ff",
    ingredients: [
      "Eau purifiee",
      "Poudre de coco",
      "Dextrose",
      "Jus de citron",
      "Citrate de sodium",
      "Citrate de magnesium",
      "Chlorure de potassium",
      "Arome naturel citron",
    ],
    allergens: [],
    ingredientNotes:
      "Ancien melange FEATNESS conserve pour l'historique produit.",
  },
  "recovery-protein-mix": {
    calories: 340,
    proteinG: 28,
    carbsG: 35,
    fatG: 8,
    preparationType: "auto_chauffant",
    accent: "#ffb86b",
    ingredients: [
      "Isolat de whey",
      "Farine d'avoine",
      "Banane dehydratee",
      "Cacao maigre",
      "Lecithine de tournesol",
      "Arome naturel vanille",
    ],
    allergens: ["Lait", "Gluten"],
    ingredientNotes:
      "Ancien melange FEATNESS conserve pour l'historique produit.",
  },
  "endurance-carb-blend": {
    calories: 290,
    proteinG: 14,
    carbsG: 44,
    fatG: 6,
    preparationType: "lyophilise",
    accent: "#9ff58f",
    ingredients: [
      "Flocons d'avoine",
      "Maltodextrine",
      "Poudre de datte",
      "Puree d'amande",
      "Sel marin",
      "Arome naturel fruits rouges",
    ],
    allergens: ["Fruits a coque", "Gluten"],
    ingredientNotes:
      "Ancien melange FEATNESS conserve pour l'historique produit.",
  },
};

const DEFAULT_PRESENTATION: DrinkBlendPresentation = {
  calories: 250,
  proteinG: 18,
  carbsG: 30,
  fatG: 7,
  preparationType: "assemblage_sec",
  accent: "#c9a646",
  ingredients: ["Base nutrition FEATNESS"],
  allergens: [],
  ingredientNotes: "Fiche ingredient detaillee a completer.",
};

const SIMULATED_KIOSKS: KioskRecord[] = [
  {
    id: "KIOSK-SALLE-1",
    name: "Borne FEATNESS · Salle 1",
    locationCity: "Salle 1",
    isActive: true,
    stockUnits: 18,
    stockAlertThreshold: 6,
    lastHeartbeatAt: new Date().toISOString(),
  },
  {
    id: "KIOSK-SALLE-2",
    name: "Borne FEATNESS · Salle 2",
    locationCity: "Salle 2",
    isActive: true,
    stockUnits: 9,
    stockAlertThreshold: 6,
    lastHeartbeatAt: new Date().toISOString(),
  },
  {
    id: "KIOSK-SALLE-3",
    name: "Borne FEATNESS · Salle 3",
    locationCity: "Salle 3",
    isActive: true,
    stockUnits: 4,
    stockAlertThreshold: 5,
    lastHeartbeatAt: new Date().toISOString(),
  },
];

const LIGHT_EFFORT_SLUGS = new Set([
  "bowl-poulet-riz-courgette",
  "omelette-sport-tartines-completes",
  "skyr-bowl-banane-flocons-davoine",
  "wrap-dinde-avocat",
  "saumon-pommes-de-terre-haricots-verts",
  "porridge-proteine-post-cardio",
]);

const MEDIUM_EFFORT_SLUGS = new Set([
  "poulet-patate-douce-brocoli",
  "bowl-quinoa-thon-avocat",
  "pates-completes-au-poulet",
  "riz-boeuf-maigre-poivrons",
  "chili-leger-recuperation",
  "salade-lentilles-oeufs-feta",
  "burrito-bowl-dinde-riz",
  "cabillaud-semoule-legumes-rotis",
]);

function getEffortCategoryForSlug(slug: string): "light" | "medium" | "intense" {
  if (LIGHT_EFFORT_SLUGS.has(slug)) {
    return "light";
  }

  if (MEDIUM_EFFORT_SLUGS.has(slug)) {
    return "medium";
  }

  return "intense";
}

function mapProfileRow(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    fullName: (row.full_name as string | null) ?? null,
    age: row.age == null ? null : Number(row.age),
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    heightCm: row.height_cm == null ? null : Number(row.height_cm),
    primaryObjective: (row.primary_objective as PrimaryObjectiveKey | null) ?? null,
    gymName: (row.gym_name as string | null) ?? null,
    preferredSport: (row.preferred_sport as SportKey | null) ?? null,
    preferredGoal: (row.preferred_goal as GoalKey | null) ?? null,
    favoriteMealIds: Array.isArray(row.favorite_meal_ids)
      ? (row.favorite_meal_ids as string[])
      : [],
    onboardingCompleted: Boolean(row.onboarding_completed),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapSessionRow(row: Record<string, unknown>): WorkoutSessionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    workout: {
      sport: row.sport as UserWorkoutInput["sport"],
      intensity: row.intensity as UserWorkoutInput["intensity"],
      goal: row.goal as UserWorkoutInput["goal"],
      durationMin: Number(row.duration_min),
      weightKg: Number(row.weight_kg),
    },
    recommendation: {
      caloriesBurned: Number(row.calories_burned),
      hydrationMl: Number(row.hydration_ml),
      carbsG: Number(row.carbs_g),
      proteinG: Number(row.protein_g),
      electrolytesMg: Number(row.electrolytes_mg),
      recommendedBlend: String(row.recommended_blend),
      recommendationSummary: String(row.recommendation_summary),
    },
    preparationStatus: row.preparation_status as WorkoutSessionRecord["preparationStatus"],
    selectedMealBlendId: (row.selected_meal_blend_id as string | null) ?? null,
  };
}

function mapTokenRow(row: Record<string, unknown>): DispenseTokenRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    sessionId: String(row.session_id),
    status: row.status as DispenseTokenRecord["status"],
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
    consumedAt: (row.consumed_at as string | null) ?? null,
  };
}

function mapDrinkBlendRow(row: Record<string, unknown>): DrinkBlendRecord {
  const presentation = PRESENTATION_BY_SLUG[String(row.slug)] ?? DEFAULT_PRESENTATION;

  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description ?? ""),
    targetGoal: String(row.target_goal ?? ""),
    effortCategory: getEffortCategoryForSlug(String(row.slug)),
    priceEur:
      typeof row.price_eur === "number"
        ? row.price_eur
        : Number(row.price_eur ?? 0),
    isAvailable: Boolean(row.is_available),
    calories: presentation.calories,
    proteinG: presentation.proteinG,
    carbsG: presentation.carbsG,
    fatG: presentation.fatG,
    preparationType: presentation.preparationType,
    accent: presentation.accent,
    ingredients: presentation.ingredients,
    allergens: presentation.allergens,
    ingredientNotes: presentation.ingredientNotes,
  };
}

function mapKioskRow(row: Record<string, unknown>): KioskRecord {
  return {
    id: String(row.id),
    name: String(row.name ?? row.id),
    locationCity: (row.location_city as string | null) ?? null,
    isActive: Boolean(row.is_active),
    stockUnits: Number(row.stock_units ?? 0),
    stockAlertThreshold: Number(row.stock_alert_threshold ?? 0),
    lastHeartbeatAt: (row.last_heartbeat_at as string | null) ?? null,
  };
}

export async function fetchProfile(
  client: SupabaseClient,
  user: User,
): Promise<UserProfile | null> {
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const { data: inserted, error: insertError } = await client
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email ?? "",
      })
      .select("*")
      .single();

    if (insertError) {
      throw insertError;
    }

    return mapProfileRow(inserted);
  }

  return mapProfileRow(data);
}

export async function saveProfile(
  client: SupabaseClient,
  userId: string,
  payload: {
    email: string;
    fullName: string;
    age: number;
    weightKg: number;
    heightCm: number;
    primaryObjective: PrimaryObjectiveKey;
    gymName: string;
  },
): Promise<UserProfile> {
  const { data, error } = await client
    .from("profiles")
    .upsert({
      id: userId,
      email: payload.email,
      full_name: payload.fullName,
      age: payload.age,
      weight_kg: payload.weightKg,
      height_cm: payload.heightCm,
      primary_objective: payload.primaryObjective,
      gym_name: payload.gymName,
      onboarding_completed: true,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapProfileRow(data);
}

export async function createWorkoutSession(
  client: SupabaseClient,
  userId: string,
  workout: UserWorkoutInput,
  recommendation: NutritionRecommendation,
): Promise<WorkoutSessionRecord> {
  const { data, error } = await client
    .from("workout_sessions")
    .insert({
      user_id: userId,
      sport: workout.sport,
      intensity: workout.intensity,
      goal: workout.goal,
      duration_min: workout.durationMin,
      weight_kg: workout.weightKg,
      calories_burned: recommendation.caloriesBurned,
      hydration_ml: recommendation.hydrationMl,
      carbs_g: recommendation.carbsG,
      protein_g: recommendation.proteinG,
      electrolytes_mg: recommendation.electrolytesMg,
      recommended_blend: recommendation.recommendedBlend,
      recommendation_summary: recommendation.recommendationSummary,
      preparation_status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapSessionRow(data);
}

export async function saveUserPreferences(
  client: SupabaseClient,
  userId: string,
  payload: UserPreferencesPayload,
): Promise<UserProfile> {
  const { data, error } = await client
    .from("profiles")
    .update({
      preferred_sport: payload.preferredSport,
      preferred_goal: payload.preferredGoal,
      favorite_meal_ids: payload.favoriteMealIds,
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapProfileRow(data);
}

export async function cancelActiveTokens(
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from("dispense_tokens")
    .update({ status: "cancelled" })
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    throw error;
  }
}

export async function createDispenseToken(
  client: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<DispenseTokenRecord> {
  const { data, error } = await client
    .from("dispense_tokens")
    .upsert(
      {
        user_id: userId,
        session_id: sessionId,
        status: "active",
        expires_at: addMinutesToIso(new Date(), 30),
        consumed_at: null,
      },
      { onConflict: "session_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapTokenRow(data);
}

export async function fetchWorkoutHistory(
  client: SupabaseClient,
  userId: string,
): Promise<WorkoutSessionRecord[]> {
  const { data, error } = await client
    .from("workout_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapSessionRow(row));
}

export async function saveSelectedMealChoice(
  client: SupabaseClient,
  userId: string,
  sessionId: string,
  mealId: string,
): Promise<WorkoutSessionRecord> {
  const { data, error } = await client
    .from("workout_sessions")
    .update({
      selected_meal_blend_id: mealId,
    })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapSessionRow(data);
}

export async function fetchActiveToken(
  client: SupabaseClient,
  userId: string,
): Promise<DispenseTokenRecord | null> {
  const { data, error } = await client
    .from("dispense_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapTokenRow(data) : null;
}

export async function fetchAvailableDrinkBlends(
  client: SupabaseClient,
): Promise<DrinkBlendRecord[]> {
  const { data, error } = await client
    .from("drink_blends")
    .select("id, slug, name, description, target_goal, price_eur, is_available")
    .eq("is_available", true)
    .order("name");

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapDrinkBlendRow(row));
}

export async function fetchAvailableKiosks(
  client: SupabaseClient,
): Promise<KioskRecord[]> {
  const { data, error } = await client
    .from("kiosks")
    .select("id, name, location_city, is_active, stock_units, stock_alert_threshold, last_heartbeat_at")
    .order("name");

  if (error) {
    return SIMULATED_KIOSKS;
  }

  const kiosks = (data ?? []).map((row) => mapKioskRow(row));

  if (kiosks.length === 0) {
    return SIMULATED_KIOSKS;
  }

  const existingIds = new Set(kiosks.map((kiosk) => kiosk.id));
  const simulatedFallbacks = SIMULATED_KIOSKS.filter((kiosk) => !existingIds.has(kiosk.id));

  return [...simulatedFallbacks, ...kiosks];
}
