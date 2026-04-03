import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeServerClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || "";

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY est requis pour les paiements FEATNESS.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2026-03-25.dahlia",
    });
  }

  return stripeClient;
}

export function getStripePublishableKey(): string {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || "";
}
