import "server-only";

import type {
  DrinkBlendRecord,
  EnrichedOrder,
  KioskRecord,
  PaymentRecord,
} from "@/lib/dashboard-shared";
import { getKioskStatus } from "@/lib/dashboard-shared";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-server";

type RawKioskRow = {
  id: string;
  name: string;
  location_address: string | null;
  location_city: string | null;
  owner_id: string | null;
  is_active: boolean | null;
  last_heartbeat_at: string | null;
  stock_units: number | null;
  stock_alert_threshold: number | null;
  created_at: string;
};

type RawPaymentRow = {
  id: string;
  created_at: string;
  dispense_token_id: string | null;
  user_id: string | null;
  kiosk_id: string;
  amount_eur: number | string;
  status: PaymentRecord["status"];
  meal_blend_id: string | null;
  paid_at: string | null;
};

type RawBlendRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  target_goal: string;
  price_eur: number | string | null;
  is_available: boolean | null;
};

type RawProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type RawTokenRow = {
  id: string;
  status: string;
};

export async function getOwnerKiosks(ownerId: string): Promise<KioskRecord[]> {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("kiosks")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as RawKioskRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    locationAddress: row.location_address,
    locationCity: row.location_city,
    ownerId: row.owner_id,
    isActive: row.is_active ?? true,
    lastHeartbeatAt: row.last_heartbeat_at,
    stockUnits: Number(row.stock_units ?? 0),
    stockAlertThreshold: Number(row.stock_alert_threshold ?? 10),
    createdAt: row.created_at,
  }));
}

export async function getKioskByOwner(
  ownerId: string,
  kioskId: string,
): Promise<KioskRecord | null> {
  const kiosks = await getOwnerKiosks(ownerId);
  return kiosks.find((kiosk) => kiosk.id === kioskId) ?? null;
}

export async function getDrinkBlends(): Promise<DrinkBlendRecord[]> {
  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("drink_blends")
    .select("id, slug, name, description, target_goal, price_eur, is_available")
    .order("name");

  if (error || !data) {
    return [];
  }

  return (data as RawBlendRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    targetGoal: row.target_goal,
    priceEur:
      typeof row.price_eur === "number"
        ? row.price_eur
        : Number(row.price_eur ?? 0),
    isAvailable: row.is_available ?? true,
  }));
}

export async function getOwnerPayments(
  ownerId: string,
  limit = 200,
): Promise<PaymentRecord[]> {
  const kiosks = await getOwnerKiosks(ownerId);
  const kioskIds = kiosks.map((kiosk) => kiosk.id);

  if (kioskIds.length === 0) {
    return [];
  }

  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("kiosk_payments")
    .select("*")
    .in("kiosk_id", kioskIds)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as RawPaymentRow[]).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    dispenseTokenId: row.dispense_token_id,
    userId: row.user_id,
    kioskId: row.kiosk_id,
    amountEur:
      typeof row.amount_eur === "number"
        ? row.amount_eur
        : Number(row.amount_eur),
    status: row.status,
    mealBlendId: row.meal_blend_id,
    paidAt: row.paid_at,
  }));
}

export async function getPaymentsForKiosk(
  ownerId: string,
  kioskId: string,
  limit = 50,
): Promise<PaymentRecord[]> {
  const kiosk = await getKioskByOwner(ownerId, kioskId);

  if (!kiosk) {
    return [];
  }

  const client = getSupabaseServiceRoleClient();
  const { data, error } = await client
    .from("kiosk_payments")
    .select("*")
    .eq("kiosk_id", kioskId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as RawPaymentRow[]).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    dispenseTokenId: row.dispense_token_id,
    userId: row.user_id,
    kioskId: row.kiosk_id,
    amountEur:
      typeof row.amount_eur === "number"
        ? row.amount_eur
        : Number(row.amount_eur),
    status: row.status,
    mealBlendId: row.meal_blend_id,
    paidAt: row.paid_at,
  }));
}

export async function enrichOrders(
  payments: PaymentRecord[],
  kiosks: KioskRecord[],
): Promise<EnrichedOrder[]> {
  const client = getSupabaseServiceRoleClient();
  const blendIds = Array.from(
    new Set(payments.map((payment) => payment.mealBlendId).filter(Boolean)),
  ) as string[];
  const userIds = Array.from(
    new Set(payments.map((payment) => payment.userId).filter(Boolean)),
  ) as string[];
  const tokenIds = Array.from(
    new Set(payments.map((payment) => payment.dispenseTokenId).filter(Boolean)),
  ) as string[];

  const [{ data: blends }, { data: profiles }, { data: tokens }] = await Promise.all([
    blendIds.length > 0
      ? client
          .from("drink_blends")
          .select("id, name")
          .in("id", blendIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }>, error: null }),
    userIds.length > 0
      ? client
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds)
      : Promise.resolve({ data: [] as RawProfileRow[], error: null }),
    tokenIds.length > 0
      ? client
          .from("dispense_tokens")
          .select("id, status")
          .in("id", tokenIds)
      : Promise.resolve({ data: [] as RawTokenRow[], error: null }),
  ]);

  const kioskMap = new Map(kiosks.map((kiosk) => [kiosk.id, kiosk.name]));
  const blendMap = new Map((blends ?? []).map((blend) => [blend.id, blend.name]));
  const profileMap = new Map(
    ((profiles ?? []) as RawProfileRow[]).map((profile) => [
      profile.id,
      profile.full_name || profile.email || "Anonyme",
    ]),
  );
  const tokenMap = new Map((tokens ?? []).map((token) => [token.id, token.status]));

  return payments.map((payment) => ({
    ...payment,
    kioskName: kioskMap.get(payment.kioskId) ?? payment.kioskId,
    mealName: payment.mealBlendId ? blendMap.get(payment.mealBlendId) ?? "Repas inconnu" : "Repas inconnu",
    userName: payment.userId ? profileMap.get(payment.userId) ?? "Anonyme" : "Anonyme",
    tokenStatus: payment.dispenseTokenId
      ? tokenMap.get(payment.dispenseTokenId) ?? null
      : null,
  }));
}

export function buildOverviewMetrics(
  kiosks: KioskRecord[],
  payments: PaymentRecord[],
): {
  paidTodayCount: number;
  paidTodayRevenue: number;
  activeKioskCount: number;
  kioskCount: number;
  averageStock: number;
  averageThreshold: number;
} {
  const today = new Date().toISOString().slice(0, 10);
  const paidToday = payments.filter(
    (payment) =>
      payment.status === "paid" &&
      payment.paidAt?.slice(0, 10) === today,
  );

  const averageStock =
    kiosks.length > 0
      ? kiosks.reduce((sum, kiosk) => sum + kiosk.stockUnits, 0) / kiosks.length
      : 0;
  const averageThreshold =
    kiosks.length > 0
      ? kiosks.reduce((sum, kiosk) => sum + kiosk.stockAlertThreshold, 0) / kiosks.length
      : 0;

  return {
    paidTodayCount: paidToday.length,
    paidTodayRevenue: paidToday.reduce((sum, payment) => sum + payment.amountEur, 0),
    activeKioskCount: kiosks.filter((kiosk) => getKioskStatus(kiosk) === "active").length,
    kioskCount: kiosks.length,
    averageStock,
    averageThreshold,
  };
}

export function buildSalesSeries(
  payments: PaymentRecord[],
): Array<{ date: string; meals: number; revenue: number }> {
  const byDay = new Map<string, { meals: number; revenue: number }>();
  const now = new Date();

  for (let index = 29; index >= 0; index -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    byDay.set(key, { meals: 0, revenue: 0 });
  }

  for (const payment of payments) {
    if (payment.status !== "paid" || !payment.paidAt) {
      continue;
    }

    const key = payment.paidAt.slice(0, 10);
    const dayEntry = byDay.get(key);

    if (!dayEntry) {
      continue;
    }

    dayEntry.meals += 1;
    dayEntry.revenue += payment.amountEur;
  }

  return Array.from(byDay.entries()).map(([date, value]) => ({
    date,
    meals: value.meals,
    revenue: Number(value.revenue.toFixed(2)),
  }));
}
