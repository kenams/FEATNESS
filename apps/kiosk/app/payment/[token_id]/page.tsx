import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";

import { FeatnessLogo } from "@/components/featness-logo";
import { PaymentForm } from "@/components/payment-form";
import { getPreparationAccent, getPreparationTypeLabel, formatEuro } from "@/lib/kiosk-display";
import { getRecommendedMeals, getTokenAndSessionOrRedirect } from "@/lib/kiosk-data";
import { getStripePublishableKey } from "@/lib/stripe";

type PaymentPageProps = {
  params: Promise<{ token_id: string }>;
  searchParams: Promise<{ meal_id?: string }>;
};

export default async function PaymentPage({
  params,
  searchParams,
}: PaymentPageProps) {
  const { token_id } = await params;
  const { meal_id } = await searchParams;
  const { token, session } = await getTokenAndSessionOrRedirect(token_id, [
    "active",
  ]);
  const meals = await getRecommendedMeals(session.workout.goal);
  const selectedMeal = meals.find((meal) => meal.id === meal_id) ?? meals[0] ?? null;

  if (!selectedMeal) {
    redirect("/");
  }

  const kioskId = process.env.NEXT_PUBLIC_KIOSK_ID?.trim() || "KIOSK-DEMO-01";

  return (
    <main style={pageStyle}>
      <section style={summaryColumnStyle}>
        <span
          style={{
            ...accentBarStyle,
            backgroundColor: getPreparationAccent(selectedMeal.preparationType),
          }}
        />
        <FeatnessLogo align="left" />
        <h1 style={sectionTitleStyle}>Votre commande</h1>

        <div style={mealCardStyle}>
          <h2 style={mealNameStyle}>{selectedMeal.name}</h2>
          <div style={badgesStyle}>
            <span style={badgeStyle}>{selectedMeal.calories} kcal</span>
            <span style={badgeStyle}>{selectedMeal.proteinG}g prot</span>
            <span style={badgeStyle}>{selectedMeal.carbsG}g glu</span>
            <span style={badgeStyle}>{selectedMeal.fatG}g lip</span>
          </div>
          <p style={prepCopyStyle}>
            {getPreparationTypeLabel(selectedMeal.preparationType)}
          </p>
        </div>

        <div style={priceBlockStyle}>
          <span style={priceLabelStyle}>Total</span>
          <strong style={priceValueStyle}>{formatEuro(selectedMeal.priceEur)}</strong>
        </div>
      </section>

      <section style={paymentColumnStyle}>
        <PaymentForm
          tokenId={token.id}
          meal={selectedMeal}
          kioskId={kioskId}
          publishableKey={getStripePublishableKey()}
        />

        <Link href={`/session/${token.id}`} style={backLinkStyle}>
          ← Modifier mon choix
        </Link>
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#0a0a0a",
  color: "#f9fafb",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 24,
  padding: 24,
};

const sharedPanelStyle: CSSProperties = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 24,
  padding: 28,
  display: "grid",
  alignContent: "start",
  gap: 22,
  position: "relative",
  overflow: "hidden",
};

const summaryColumnStyle: CSSProperties = {
  ...sharedPanelStyle,
};

const paymentColumnStyle: CSSProperties = {
  ...sharedPanelStyle,
};

const accentBarStyle: CSSProperties = {
  position: "absolute",
  inset: "0 0 auto 0",
  height: 6,
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 20,
  fontWeight: 600,
};

const mealCardStyle: CSSProperties = {
  display: "grid",
  gap: 14,
};

const mealNameStyle: CSSProperties = {
  margin: 0,
  fontSize: 32,
  fontWeight: 700,
};

const badgesStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const badgeStyle: CSSProperties = {
  background: "#1f2937",
  color: "#d1d5db",
  borderRadius: 999,
  padding: "8px 10px",
  fontSize: 12,
};

const prepCopyStyle: CSSProperties = {
  margin: 0,
  color: "#9ca3af",
  fontSize: 14,
};

const priceBlockStyle: CSSProperties = {
  display: "grid",
  gap: 8,
  marginTop: "auto",
};

const priceLabelStyle: CSSProperties = {
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontSize: 12,
};

const priceValueStyle: CSSProperties = {
  fontSize: 36,
  fontWeight: 700,
};

const backLinkStyle: CSSProperties = {
  color: "#9ca3af",
  fontSize: 14,
};
