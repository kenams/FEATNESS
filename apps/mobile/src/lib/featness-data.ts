import type { SupabaseClient, User } from "@supabase/supabase-js";

import {
  addMinutesToIso,
  type DispenseTokenRecord,
  type NutritionRecommendation,
  type UserProfile,
  type UserWorkoutInput,
  type WorkoutSessionRecord,
} from "@featness/shared";

function mapProfileRow(row: Record<string, unknown>): UserProfile {
  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    fullName: (row.full_name as string | null) ?? null,
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    gymName: (row.gym_name as string | null) ?? null,
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
    weightKg: number;
    gymName: string;
  },
): Promise<UserProfile> {
  const { data, error } = await client
    .from("profiles")
    .upsert({
      id: userId,
      email: payload.email,
      full_name: payload.fullName,
      weight_kg: payload.weightKg,
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
    .insert({
      user_id: userId,
      session_id: sessionId,
      status: "active",
      expires_at: addMinutesToIso(new Date(), 30),
    })
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
