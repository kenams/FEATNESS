import { createHash, randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { buildNutritionRecommendation, type GoalKey, type IntensityLevel, type SportKey } from "@featness/shared";
import { z } from "zod";

import { isAuthorizedKioskRequest } from "@/lib/kiosk-internal-auth";
import { getRecommendedMeals } from "@/lib/kiosk-data";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const demoTokenSchema = z.object({
  kiosk_id: z.string().trim().min(1),
});

const DEMO_EMAIL_DOMAIN = "demo.featness.local";
const DEMO_WORKOUT = {
  sport: "strength" as SportKey,
  intensity: "intense" as IntensityLevel,
  goal: "recovery" as GoalKey,
  durationMin: 60,
  weightKg: 80,
};

function logDemoRoute(payload: Record<string, unknown>): void {
  console.info(JSON.stringify(payload));
}

function toDemoEmail(kioskId: string): string {
  const slug = kioskId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `demo+${slug}@${DEMO_EMAIL_DOMAIN}`;
}

async function ensureDemoProfile(kioskId: string): Promise<{
  id: string;
  fullName: string;
}> {
  const client = getSupabaseAdminClient();
  const demoEmail = toDemoEmail(kioskId);

  const { data: existingProfile, error: lookupError } = await client
    .from("profiles")
    .select("id, full_name")
    .eq("email", demoEmail)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existingProfile) {
    return {
      id: String(existingProfile.id),
      fullName: String(existingProfile.full_name ?? "Demo FEATNESS"),
    };
  }

  const passwordSeed = createHash("sha256")
    .update(`featness-demo-${kioskId}`)
    .digest("hex");

  const { data: createdUser, error: createUserError } =
    await client.auth.admin.createUser({
      email: demoEmail,
      password: `Featness!${passwordSeed.slice(0, 18)}`,
      email_confirm: true,
      user_metadata: {
        full_name: "Demo FEATNESS",
      },
    });

  if (createUserError) {
    throw createUserError;
  }

  const profileId = createdUser.user?.id;

  if (!profileId) {
    throw new Error("demo_profile_creation_failed");
  }

  const { error: profileError } = await client.from("profiles").upsert({
    id: profileId,
    email: demoEmail,
    full_name: "Demo FEATNESS",
    weight_kg: DEMO_WORKOUT.weightKg,
    gym_name: "Mode demo",
    onboarding_completed: true,
    role: "user",
  });

  if (profileError) {
    throw profileError;
  }

  return {
    id: profileId,
    fullName: "Demo FEATNESS",
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const parsed = demoTokenSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const kioskId = parsed.data.kiosk_id;

    if (!isAuthorizedKioskRequest(request, kioskId)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const client = getSupabaseAdminClient();
    const { data: kioskRow, error: kioskError } = await client
      .from("kiosks")
      .select("id, is_active")
      .eq("id", kioskId)
      .maybeSingle();

    if (kioskError) {
      throw kioskError;
    }

    if (!kioskRow) {
      return NextResponse.json({ error: "kiosk_not_found" }, { status: 404 });
    }

    const demoProfile = await ensureDemoProfile(kioskId);
    const recommendation = buildNutritionRecommendation(DEMO_WORKOUT);
    const meals = await getRecommendedMeals(DEMO_WORKOUT.goal);

    if (meals.length === 0) {
      return NextResponse.json({ error: "no_meals_available" }, { status: 409 });
    }

    const { data: sessionRow, error: sessionError } = await client
      .from("workout_sessions")
      .insert({
        user_id: demoProfile.id,
        sport: DEMO_WORKOUT.sport,
        intensity: DEMO_WORKOUT.intensity,
        goal: DEMO_WORKOUT.goal,
        duration_min: DEMO_WORKOUT.durationMin,
        weight_kg: DEMO_WORKOUT.weightKg,
        calories_burned: recommendation.caloriesBurned,
        hydration_ml: recommendation.hydrationMl,
        carbs_g: recommendation.carbsG,
        protein_g: recommendation.proteinG,
        electrolytes_mg: recommendation.electrolytesMg,
        recommended_blend: recommendation.recommendedBlend,
        recommendation_summary: recommendation.recommendationSummary,
        preparation_status: "pending",
      })
      .select("id")
      .single();

    if (sessionError) {
      throw sessionError;
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const { data: tokenRow, error: tokenError } = await client
      .from("dispense_tokens")
      .insert({
        user_id: demoProfile.id,
        session_id: sessionRow.id,
        status: "active",
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (tokenError) {
      throw tokenError;
    }

    logDemoRoute({
      timestamp: new Date().toISOString(),
      source: "demo-create-token",
      kiosk_id: kioskId,
      status: "ok",
      token_id: tokenRow.id,
    });

    return NextResponse.json({
      token_id: tokenRow.id,
      token_value: tokenRow.id,
      demo_profile: {
        full_name: demoProfile.fullName,
        objective: DEMO_WORKOUT.goal,
        calories_burned: recommendation.caloriesBurned,
      },
      qr_content: tokenRow.id,
      session_id: sessionRow.id,
      request_id: randomUUID(),
    });
  } catch (error) {
    logDemoRoute({
      timestamp: new Date().toISOString(),
      source: "demo-create-token",
      status: "error",
      error: error instanceof Error ? error.message : "demo_route_failed",
    });

    return NextResponse.json({ error: "demo_route_failed" }, { status: 500 });
  }
}
