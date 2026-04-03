import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getStripeServerClient } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function logWebhookError(payload: Record<string, unknown>): void {
  console.error(JSON.stringify(payload));
}

async function safelyRunStep(
  step: string,
  handler: () => Promise<void>,
  paymentIntentId: string,
): Promise<void> {
  try {
    await handler();
  } catch (error) {
    logWebhookError({
      timestamp: new Date().toISOString(),
      source: "stripe-webhook",
      status: "error",
      step,
      payment_intent_id: paymentIntentId,
      error: error instanceof Error ? error.message : "Unknown webhook update error",
    });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const stripe = getStripeServerClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  const signature = request.headers.get("stripe-signature");

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    logWebhookError({
      timestamp: new Date().toISOString(),
      source: "stripe-webhook",
      status: "error",
      step: "construct_event",
      error: error instanceof Error ? error.message : "Invalid webhook signature",
    });

    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const dispenseTokenId = paymentIntent.metadata.dispense_token_id;
    const kioskId = paymentIntent.metadata.kiosk_id;
    let notifyUserId: string | null = null;

    await safelyRunStep(
      "read_dispense_token_user",
      async () => {
        const { data: tokenRow, error: tokenError } = await supabase
          .from("dispense_tokens")
          .select("user_id")
          .eq("id", dispenseTokenId)
          .maybeSingle();

        if (tokenError) {
          throw tokenError;
        }

        notifyUserId = tokenRow?.user_id ? String(tokenRow.user_id) : null;
      },
      paymentIntent.id,
    );

    await safelyRunStep(
      "mark_payment_paid",
      async () => {
        await supabase
          .from("kiosk_payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
          })
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .throwOnError();
      },
      paymentIntent.id,
    );

    await safelyRunStep(
      "confirm_dispense_token",
      async () => {
        await supabase
          .from("dispense_tokens")
          .update({ status: "confirmed" })
          .eq("id", dispenseTokenId)
          .throwOnError();
      },
      paymentIntent.id,
    );

    await safelyRunStep(
      "decrement_kiosk_stock",
      async () => {
        const { data: kioskRow, error: kioskFetchError } = await supabase
          .from("kiosks")
          .select("stock_units")
          .eq("id", kioskId)
          .maybeSingle();

        if (kioskFetchError) {
          throw kioskFetchError;
        }

        if (!kioskRow || typeof kioskRow.stock_units !== "number") {
          return;
        }

        const nextStock = Math.max(0, kioskRow.stock_units - 1);
        await supabase
          .from("kiosks")
          .update({ stock_units: nextStock })
          .eq("id", kioskId)
          .throwOnError();
      },
      paymentIntent.id,
    );

    if (notifyUserId) {
      fetch(new URL("/api/notify", request.url), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
        },
        body: JSON.stringify({
          user_id: notifyUserId,
          type: "payment_confirmed",
          payload: {
            dispense_token_id: dispenseTokenId,
            kiosk_id: kioskId,
          },
        }),
      }).catch((error: unknown) =>
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            source: "webhook-notify",
            error:
              error instanceof Error ? error.message : "notify call failed",
          }),
        ),
      );
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    await safelyRunStep(
      "mark_payment_failed",
      async () => {
        await supabase
          .from("kiosk_payments")
          .update({ status: "failed" })
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .throwOnError();
      },
      paymentIntent.id,
    );
  }

  return NextResponse.json({ received: true });
}
