import { DispensingScreen } from "@/components/dispensing-screen";
import { getMealById, getTokenAndSessionOrRedirect } from "@/lib/kiosk-data";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type DispensingPageProps = {
  params: Promise<{ token_id: string }>;
};

export default async function DispensingPage({ params }: DispensingPageProps) {
  const { token_id } = await params;
  const { token, session } = await getTokenAndSessionOrRedirect(token_id, [
    "active",
    "confirmed",
    "consumed",
  ]);
  const client = getSupabaseAdminClient();
  const { data: paymentRow } = await client
    .from("kiosk_payments")
    .select("meal_blend_id, amount_eur")
    .eq("dispense_token_id", token.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const selectedMeal = paymentRow?.meal_blend_id
    ? await getMealById(String(paymentRow.meal_blend_id))
    : null;

  return (
    <DispensingScreen
      tokenId={token.id}
      userId={token.userId || null}
      initialStatus={session.preparationStatus}
      mealName={selectedMeal?.name ?? session.recommendation.recommendedBlend}
      mealType={selectedMeal?.preparationType ?? "assemblage_sec"}
      mealPrice={
        paymentRow?.amount_eur != null
          ? Number(paymentRow.amount_eur)
          : selectedMeal?.priceEur ?? 0
      }
    />
  );
}
