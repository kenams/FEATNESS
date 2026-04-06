import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  addMinutesToIso,
  DEFAULT_MEAL_PRESENTATION,
  getEffortCategoryForSlug,
  MEAL_PRESENTATION_BY_SLUG,
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
  const presentation = MEAL_PRESENTATION_BY_SLUG[String(row.slug)] ?? DEFAULT_MEAL_PRESENTATION;

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

export async function clearSelectedMealChoice(
  client: SupabaseClient,
  userId: string,
  sessionId: string,
): Promise<WorkoutSessionRecord> {
  const { data, error } = await client
    .from("workout_sessions")
    .update({
      selected_meal_blend_id: null,
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
