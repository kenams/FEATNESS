import { redirect } from "next/navigation";

import { SessionSelection } from "@/components/session-selection";
import { getRecommendedMeals, getTokenAndSessionOrRedirect } from "@/lib/kiosk-data";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type SessionPageProps = {
  params: Promise<{ token_id: string }>;
};

export default async function SessionPage({ params }: SessionPageProps) {
  const { token_id } = await params;
  const { token, session } = await getTokenAndSessionOrRedirect(token_id, ["active"]);
  const meals = await getRecommendedMeals(session.workout.goal);
  const client = getSupabaseAdminClient();
  const { data: profileRow } = await client
    .from("profiles")
    .select("full_name")
    .eq("id", token.userId)
    .maybeSingle();

  if (meals.length === 0) {
    redirect("/");
  }

  return (
    <SessionSelection
      tokenId={token.id}
      meals={meals}
      memberName={(profileRow?.full_name as string | null) ?? null}
      session={session}
    />
  );
}
