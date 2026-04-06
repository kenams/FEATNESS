import { NextResponse } from "next/server";

import {
  isExpired,
  isUuid,
  type DispenseTokenRecord,
  type KioskScanPayload,
  type UserProfile,
  type WorkoutSessionRecord,
} from "@featness/shared";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

function mapProfileRow(row: Record<string, unknown> | null): KioskScanPayload["profile"] {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    email: String(row.email ?? ""),
    fullName: (row.full_name as string | null) ?? null,
    gymName: (row.gym_name as string | null) ?? null,
  };
}

function mapSessionRow(row: Record<string, unknown>): WorkoutSessionRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    workout: {
      sport: row.sport as WorkoutSessionRecord["workout"]["sport"],
      intensity: row.intensity as WorkoutSessionRecord["workout"]["intensity"],
      goal: row.goal as WorkoutSessionRecord["workout"]["goal"],
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

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const { tokenId } = (await request.json()) as { tokenId?: string };
    const normalizedToken = tokenId?.trim() || "";

    if (!isUuid(normalizedToken)) {
      return NextResponse.json(
        { error: "Token QR invalide. Le format UUID est requis." },
        { status: 400 },
      );
    }

    const client = getSupabaseAdminClient();
    const { data: tokenRow, error: tokenError } = await client
      .from("dispense_tokens")
      .select("*")
      .eq("id", normalizedToken)
      .maybeSingle();

    if (tokenError) {
      throw tokenError;
    }

    if (!tokenRow) {
      return NextResponse.json(
        { error: "Aucun token FEATNESS correspondant." },
        { status: 404 },
      );
    }

    const token = mapTokenRow(tokenRow);

    if (token.status !== "active") {
      return NextResponse.json(
        { error: `Token inutilisable. Statut actuel : ${token.status}.` },
        { status: 409 },
      );
    }

    if (isExpired(token.expiresAt)) {
      await client
        .from("dispense_tokens")
        .update({ status: "expired" })
        .eq("id", token.id);

      return NextResponse.json(
        { error: "Le QR code FEATNESS a expire. Validite : 30 minutes." },
        { status: 410 },
      );
    }

    const { data: sessionRow, error: sessionError } = await client
      .from("workout_sessions")
      .select("*")
      .eq("id", token.sessionId)
      .maybeSingle();

    if (sessionError) {
      throw sessionError;
    }

    if (!sessionRow) {
      return NextResponse.json(
        { error: "La seance associee a ce token est introuvable." },
        { status: 404 },
      );
    }

    const { data: profileRow, error: profileError } = await client
      .from("profiles")
      .select("*")
      .eq("id", token.userId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const nextPreparationStatus =
      sessionRow.preparation_status === "pending"
        ? "scanned"
        : sessionRow.preparation_status;

    const { data: updatedSessionRow, error: updateError } = await client
      .from("workout_sessions")
      .update({ preparation_status: nextPreparationStatus })
      .eq("id", token.sessionId)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    const payload: KioskScanPayload = {
      token,
      session: mapSessionRow(updatedSessionRow),
      profile: mapProfileRow(profileRow),
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Le scan FEATNESS a echoue.",
      },
      { status: 500 },
    );
  }
}
