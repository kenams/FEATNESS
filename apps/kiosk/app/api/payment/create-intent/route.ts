import { NextResponse } from "next/server";
import { z } from "zod";

import { isExpired } from "@featness/shared";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getStripeServerClient } from "@/lib/stripe";

const createIntentSchema = z.object({
  dispense_token_id: z.string().trim().min(1),
  meal_blend_id: z.string().trim().min(1),
  kiosk_id: z.string().trim().min(1),
});

function logPaymentError(payload: Record<string, unknown>): void {
  console.error(JSON.stringify(payload));
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsedBody = createIntentSchema.safeParse(await request.json());

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "invalid_body", details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const { dispense_token_id, meal_blend_id, kiosk_id } = parsedBody.data;
  const supabase = getSupabaseAdminClient();
  const stripe = getStripeServerClient();

  try {
    const { data: tokenRow, error: tokenError } = await supabase
      .from("dispense_tokens")
      .select("*")
      .eq("id", dispense_token_id)
      .maybeSingle();

    if (tokenError) {
      throw tokenError;
    }

    if (
      !tokenRow ||
      tokenRow.status !== "active" ||
      isExpired(String(tokenRow.expires_at))
    ) {
      return NextResponse.json(
        { error: "token_invalid_or_expired" },
        { status: 422 },
      );
    }

    const { data: kioskRow, error: kioskError } = await supabase
      .from("kiosks")
      .select("stock_units, stock_alert_threshold")
      .eq("id", kiosk_id)
      .maybeSingle();

    if (kioskError) {
      throw kioskError;
    }

    if (!kioskRow) {
      return NextResponse.json(
        { error: "kiosk_not_found" },
        { status: 404 },
      );
    }

    if (Number(kioskRow.stock_units ?? 0) === 0) {
      return NextResponse.json(
        { error: "out_of_stock" },
        { status: 409 },
      );
    }

    const { data: mealRow, error: mealError } = await supabase
      .from("drink_blends")
      .select("id, price_eur")
      .eq("id", meal_blend_id)
      .maybeSingle();

    if (mealError) {
      throw mealError;
    }

    if (!mealRow || mealRow.price_eur == null) {
      return NextResponse.json(
        { error: "meal_not_found" },
        { status: 404 },
      );
    }

    const amountEur =
      typeof mealRow.price_eur === "number"
        ? mealRow.price_eur
        : Number(mealRow.price_eur);
    const amountCents = Math.round(amountEur * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "eur",
      metadata: {
        dispense_token_id,
        meal_blend_id,
        kiosk_id,
        featness_env: "test",
      },
      automatic_payment_methods: { enabled: true },
    });

    const { error: insertError } = await supabase.from("kiosk_payments").insert({
      dispense_token_id,
      user_id: tokenRow.user_id,
      kiosk_id,
      amount_eur: amountEur,
      stripe_payment_intent_id: paymentIntent.id,
      meal_blend_id,
      status: "pending",
    });

    if (insertError) {
      await stripe.paymentIntents.cancel(paymentIntent.id).catch((cancelError) => {
        logPaymentError({
          timestamp: new Date().toISOString(),
          source: "payment-create-intent",
          status: "error",
          step: "cancel_orphan_payment_intent",
          payment_intent_id: paymentIntent.id,
          error:
            cancelError instanceof Error
              ? cancelError.message
              : "Failed to cancel orphan payment intent",
        });
      });

      logPaymentError({
        timestamp: new Date().toISOString(),
        source: "payment-create-intent",
        status: "error",
        step: "insert_kiosk_payment",
        payment_intent_id: paymentIntent.id,
        error: insertError.message,
      });

      return NextResponse.json(
        { error: "payment_insert_failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount_eur: amountEur,
      amount_cents: amountCents,
    });
  } catch (error) {
    logPaymentError({
      timestamp: new Date().toISOString(),
      source: "payment-create-intent",
      status: "error",
      step: "unhandled",
      error: error instanceof Error ? error.message : "Unknown payment error",
    });

    return NextResponse.json(
      { error: "create_intent_failed" },
      { status: 500 },
    );
  }
}
