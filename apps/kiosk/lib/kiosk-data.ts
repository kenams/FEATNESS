import "server-only";

import { redirect } from "next/navigation";

import {
  isExpired,
  type DispenseTokenRecord,
  type WorkoutSessionRecord,
} from "@featness/shared";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { hydrateMeal, type SelectableMeal } from "@/lib/meal-catalog";

type TokenRow = {
  id: string;
  user_id: string;
  session_id: string;
  status: DispenseTokenRecord["status"];
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  sport: WorkoutSessionRecord["workout"]["sport"];
  intensity: WorkoutSessionRecord["workout"]["intensity"];
  goal: WorkoutSessionRecord["workout"]["goal"];
  duration_min: number;
  weight_kg: number;
  calories_burned: number;
  hydration_ml: number;
  carbs_g: number;
  protein_g: number;
  electrolytes_mg: number;
  recommended_blend: string;
  recommendation_summary: string;
  preparation_status: WorkoutSessionRecord["preparationStatus"];
  selected_meal_blend_id: string | null;
  is_favorite?: boolean | null;
};

type BlendRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  target_goal: string;
  price_eur: number | string | null;
  is_available?: boolean;
};

export function mapTokenRow(row: TokenRow): DispenseTokenRecord {
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
  };
}

export function mapSessionRow(row: SessionRow): WorkoutSessionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    workout: {
      sport: row.sport,
      intensity: row.intensity,
      goal: row.goal,
      durationMin: Number(row.duration_min),
      weightKg: Number(row.weight_kg),
    },
    recommendation: {
      caloriesBurned: Number(row.calories_burned),
      hydrationMl: Number(row.hydration_ml),
      carbsG: Number(row.carbs_g),
      proteinG: Number(row.protein_g),
      electrolytesMg: Number(row.electrolytes_mg),
      recommendedBlend: row.recommended_blend,
      recommendationSummary: row.recommendation_summary,
    },
    preparationStatus: row.preparation_status,
    selectedMealBlendId: row.selected_meal_blend_id,
    isFavorite: Boolean(row.is_favorite),
  };
}

export async function getTokenAndSessionOrRedirect(
  tokenId: string,
  expectedStatuses: DispenseTokenRecord["status"][],
): Promise<{
  token: DispenseTokenRecord;
  session: WorkoutSessionRecord;
}> {
  const client = getSupabaseAdminClient();
  const { data: tokenRow, error: tokenError } = await client
    .from("dispense_tokens")
    .select("*")
    .eq("id", tokenId)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    redirect("/");
  }

  const token = mapTokenRow(tokenRow as TokenRow);

  if (!expectedStatuses.includes(token.status) || isExpired(token.expiresAt)) {
    redirect("/");
  }

  const { data: sessionRow, error: sessionError } = await client
    .from("workout_sessions")
    .select("*")
    .eq("id", token.sessionId)
    .maybeSingle();

  if (sessionError || !sessionRow) {
    redirect("/");
  }

  return {
    token,
    session: mapSessionRow(sessionRow as SessionRow),
  };
}

export async function getRecommendedMeals(goal: string): Promise<SelectableMeal[]> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("drink_blends")
    .select("id, slug, name, description, target_goal, price_eur, is_available")
    .eq("is_available", true)
    .order("name");

  if (error || !data) {
    return [];
  }

  return (data as BlendRow[])
    .map((row) => hydrateMeal(row))
    .sort((a, b) => {
      if (a.targetGoal === goal && b.targetGoal !== goal) {
        return -1;
      }

      if (a.targetGoal !== goal && b.targetGoal === goal) {
        return 1;
      }

      return a.priceEur - b.priceEur;
    })
    .slice(0, 3);
}

export async function getMealById(mealId: string): Promise<SelectableMeal | null> {
  const client = getSupabaseAdminClient();
  const { data, error } = await client
    .from("drink_blends")
    .select("id, slug, name, description, target_goal, price_eur, is_available")
    .eq("id", mealId)
    .eq("is_available", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return hydrateMeal(data as BlendRow);
}
