"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import { formatEuro } from "@/lib/kiosk-display";
import type { SelectableMeal } from "@/lib/meal-catalog";

type PaymentFormProps = {
  tokenId: string;
  meal: SelectableMeal;
  kioskId: string;
  publishableKey: string;
};

type CreateIntentResponse = {
  client_secret: string | null;
  payment_intent_id: string;
  amount_eur: number;
  amount_cents: number;
};

const cardElementOptions = {
  style: {
    base: {
      color: "#f9fafb",
      fontSize: "18px",
      fontFamily: "Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif",
      "::placeholder": {
        color: "#6b7280",
      },
    },
    invalid: {
      color: "#fca5a5",
    },
  },
};

async function createIntent(
  tokenId: string,
  mealId: string,
  kioskId: string,
): Promise<CreateIntentResponse> {
  const response = await fetch("/api/payment/create-intent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dispense_token_id: tokenId,
      meal_blend_id: mealId,
      kiosk_id: kioskId,
    }),
  });

  const body = (await response.json()) as
    | CreateIntentResponse
    | { error: string };

  if (!response.ok || "error" in body) {
    const errorCode = "error" in body ? body.error : "create_intent_failed";

    if (errorCode === "out_of_stock") {
      throw new Error("Ce repas n'est plus disponible sur cette borne.");
    }

    if (errorCode === "kiosk_not_found") {
      throw new Error("Cette borne FEATNESS est introuvable.");
    }

    if (errorCode === "token_invalid_or_expired") {
      throw new Error("Le QR FEATNESS n'est plus valide.");
    }

    throw new Error("Le paiement FEATNESS n'a pas pu etre initialise.");
  }

  return body;
}

function ErrorPanel({
  message,
  onBack,
}: {
  message: string | null;
  onBack: () => void;
}) {
  if (!message) {
    return null;
  }

  return (
    <>
      <div className="error-box">{message}</div>
      {message === "Ce repas n'est plus disponible sur cette borne." ? (
        <button type="button" className="secondary-button" onClick={onBack}>
          Retour
        </button>
      ) : null}
    </>
  );
}

function TestPaymentButton({
  tokenId,
  meal,
  kioskId,
  publishableKey,
}: PaymentFormProps) {
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleTestPayment() {
    setIsBusy(true);
    setErrorMessage(null);

    try {
      const stripe = await loadStripe(publishableKey);

      if (!stripe) {
        throw new Error("Stripe.js n'a pas pu etre initialise.");
      }

      const intent = await createIntent(tokenId, meal.id, kioskId);

      if (!intent.client_secret) {
        throw new Error("Aucun client secret recu depuis FEATNESS.");
      }

      const result = await stripe.confirmCardPayment(intent.client_secret, {
        payment_method: "pm_card_visa",
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Paiement CB refuse.");
      }

      router.push(`/dispensing/${tokenId}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Paiement FEATNESS impossible.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="pay-button"
        onClick={() => void handleTestPayment()}
        disabled={isBusy}
      >
        {isBusy
          ? "Traitement du paiement..."
          : `Payer ${formatEuro(meal.priceEur)} · Carte test ****4242`}
      </button>
      <p className="helper">Paiement traite par Stripe · Securise SSL</p>
      <ErrorPanel message={errorMessage} onBack={() => router.push("/")} />
    </>
  );
}

function LiveCardForm({
  tokenId,
  meal,
  kioskId,
}: Omit<PaymentFormProps, "publishableKey">) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLivePayment() {
    if (!stripe || !elements) {
      setErrorMessage("Stripe Elements n'est pas encore pret.");
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      const intent = await createIntent(tokenId, meal.id, kioskId);
      const cardElement = elements.getElement(CardElement);

      if (!cardElement || !intent.client_secret) {
        throw new Error("Le formulaire CB FEATNESS est incomplet.");
      }

      const result = await stripe.confirmCardPayment(intent.client_secret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (result.error) {
        throw new Error(result.error.message ?? "Paiement FEATNESS refuse.");
      }

      router.push(`/dispensing/${tokenId}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Paiement FEATNESS impossible.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <div className="card-shell">
        <CardElement options={cardElementOptions} />
      </div>
      <button
        type="button"
        className="pay-button"
        onClick={() => void handleLivePayment()}
        disabled={isBusy}
      >
        {isBusy ? "Traitement du paiement..." : `Payer ${formatEuro(meal.priceEur)}`}
      </button>
      <p className="helper">Paiement traite par Stripe · Securise SSL</p>
      <ErrorPanel message={errorMessage} onBack={() => router.push("/")} />
    </>
  );
}

export function PaymentForm({
  tokenId,
  meal,
  kioskId,
  publishableKey,
}: PaymentFormProps) {
  const isTestMode = publishableKey.startsWith("pk_test_");
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  return (
    <>
      <div className="payment-card">
        <div className="heading-row">
          <div className="lock-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M7 10V7a5 5 0 0 1 10 0v3"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <rect
                x="5"
                y="10"
                width="14"
                height="10"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
          </div>
          <h2>Paiement securise</h2>
        </div>

        {isTestMode ? (
          <TestPaymentButton
            tokenId={tokenId}
            meal={meal}
            kioskId={kioskId}
            publishableKey={publishableKey}
          />
        ) : stripePromise ? (
          <Elements stripe={stripePromise}>
            <LiveCardForm tokenId={tokenId} meal={meal} kioskId={kioskId} />
          </Elements>
        ) : (
          <div className="error-box">
            NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY est requis pour afficher le paiement.
          </div>
        )}
      </div>

      <style jsx>{`
        .payment-card {
          display: grid;
          gap: 18px;
        }

        .heading-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .heading-row h2 {
          margin: 0;
          color: #f9fafb;
          font-size: 20px;
          font-weight: 600;
        }

        .lock-icon {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
        }

        .card-shell {
          background: #111827;
          border: 1px solid #1f2937;
          border-radius: 12px;
          padding: 18px;
        }

        .pay-button {
          width: 100%;
          min-height: 56px;
          border: none;
          border-radius: 12px;
          background: #10b981;
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
        }

        .pay-button:disabled {
          opacity: 0.7;
        }

        .helper {
          margin: 0;
          color: #6b7280;
          font-size: 11px;
          text-align: center;
        }

        .error-box {
          background: #450a0a;
          color: #fca5a5;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
        }

        .secondary-button {
          border: 1px solid #374151;
          border-radius: 12px;
          background: transparent;
          color: #e5e7eb;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 600;
        }
      `}</style>
    </>
  );
}
