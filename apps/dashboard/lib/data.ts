import "server-only";
import {
  DEFAULT_MEAL_PRESENTATION,
  getEffortCategoryForSlug,
  MEAL_PRESENTATION_BY_SLUG,
} from "@featness/shared";

import type {
  AnalyticsLeaderboardItem,
  AnalyticsRange,
  AnalyticsSnapshot,
  DashboardUserRecord,
  DrinkBlendRecord,
  EnrichedOrder,
  KioskRecord,
  OperationalSnapshot,
  PaymentRecord,
  PreferenceInsightItem,
  PreferenceInsights,
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
  role?: "user" | "owner" | "admin";
  onboarding_completed?: boolean | null;
  gym_name?: string | null;
  expo_push_token?: string | null;
  created_at?: string;
  updated_at?: string;
  preferred_sport?: string | null;
  preferred_goal?: string | null;
  favorite_meal_ids?: string[] | null;
};

type RawTokenRow = {
  id: string;
  status: string;
};

type RawWorkoutSessionRow = {
  id: string;
  user_id: string;
  goal: string;
  created_at: string;
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
    effortCategory: getEffortCategoryForSlug(row.slug),
    priceEur:
      typeof row.price_eur === "number"
        ? row.price_eur
        : Number(row.price_eur ?? 0),
    isAvailable: row.is_available ?? true,
    calories: (MEAL_PRESENTATION_BY_SLUG[row.slug] ?? DEFAULT_MEAL_PRESENTATION).calories,
    proteinG: (MEAL_PRESENTATION_BY_SLUG[row.slug] ?? DEFAULT_MEAL_PRESENTATION).proteinG,
    carbsG: (MEAL_PRESENTATION_BY_SLUG[row.slug] ?? DEFAULT_MEAL_PRESENTATION).carbsG,
    fatG: (MEAL_PRESENTATION_BY_SLUG[row.slug] ?? DEFAULT_MEAL_PRESENTATION).fatG,
    preparationType:
      (MEAL_PRESENTATION_BY_SLUG[row.slug] ?? DEFAULT_MEAL_PRESENTATION).preparationType,
    accent: (MEAL_PRESENTATION_BY_SLUG[row.slug] ?? DEFAULT_MEAL_PRESENTATION).accent,
    ingredients: (MEAL_PRESENTATION_BY_SLUG[row.slug] ?? DEFAULT_MEAL_PRESENTATION).ingredients,
    allergens: (MEAL_PRESENTATION_BY_SLUG[row.slug] ?? DEFAULT_MEAL_PRESENTATION).allergens,
    ingredientNotes:
      (MEAL_PRESENTATION_BY_SLUG[row.slug] ?? DEFAULT_MEAL_PRESENTATION).ingredientNotes,
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
  days = 30,
): Array<{ date: string; meals: number; revenue: number }> {
  const byDay = new Map<string, { meals: number; revenue: number }>();
  const now = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
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

function normalizeAnalyticsRange(range?: string): AnalyticsRange {
  if (range === "7d" || range === "90d") {
    return range;
  }

  return "30d";
}

function normalizePaymentStatus(
  status?: string,
): PaymentRecord["status"] | null {
  if (
    status === "pending" ||
    status === "paid" ||
    status === "failed" ||
    status === "refunded"
  ) {
    return status;
  }

  return null;
}

function getAnalyticsRangeDays(range: AnalyticsRange): number {
  switch (range) {
    case "7d":
      return 7;
    case "90d":
      return 90;
    default:
      return 30;
  }
}

function getRangeFloor(days: number): number {
  const floor = new Date();
  floor.setHours(0, 0, 0, 0);
  floor.setDate(floor.getDate() - (days - 1));
  return floor.getTime();
}

function buildLeaderboard(
  counter: Map<string, { count: number; revenue: number }>,
  limit = 5,
): AnalyticsLeaderboardItem[] {
  return Array.from(counter.entries())
    .sort((left, right) => {
      if (right[1].count !== left[1].count) {
        return right[1].count - left[1].count;
      }

      if (right[1].revenue !== left[1].revenue) {
        return right[1].revenue - left[1].revenue;
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit)
    .map(([label, value]) => ({
      label,
      count: value.count,
      revenue: Number(value.revenue.toFixed(2)),
    }));
}

function buildAnalyticsSelection(
  payments: PaymentRecord[],
  kiosks: KioskRecord[],
  blends: DrinkBlendRecord[],
  rawRange?: string,
  rawKioskId?: string,
  rawStatus?: string,
  rawMealId?: string,
) {
  const range = normalizeAnalyticsRange(rawRange);
  const days = getAnalyticsRangeDays(range);
  const floor = getRangeFloor(days);
  const previousFloor = floor - days * 24 * 60 * 60 * 1000;
  const selectedKiosk =
    typeof rawKioskId === "string" && rawKioskId.trim().length > 0
      ? kiosks.find((kiosk) => kiosk.id === rawKioskId.trim()) ?? null
      : null;
  const selectedStatus = normalizePaymentStatus(rawStatus);
  const selectedMeal =
    typeof rawMealId === "string" && rawMealId.trim().length > 0
      ? blends.find((blend) => blend.id === rawMealId.trim()) ?? null
      : null;

  const filteredPayments = payments.filter((payment) => {
    const sourceDate = payment.paidAt ?? payment.createdAt;
    const inRange = new Date(sourceDate).getTime() >= floor;
    const matchesKiosk = selectedKiosk ? payment.kioskId === selectedKiosk.id : true;
    const matchesStatus = selectedStatus ? payment.status === selectedStatus : true;
    const matchesMeal = selectedMeal
      ? payment.mealBlendId === selectedMeal.id
      : true;

    return inRange && matchesKiosk && matchesStatus && matchesMeal;
  });

  const previousPayments = payments.filter((payment) => {
    const sourceDate = payment.paidAt ?? payment.createdAt;
    const timestamp = new Date(sourceDate).getTime();
    const inPreviousRange = timestamp >= previousFloor && timestamp < floor;
    const matchesKiosk = selectedKiosk ? payment.kioskId === selectedKiosk.id : true;
    const matchesStatus = selectedStatus ? payment.status === selectedStatus : true;
    const matchesMeal = selectedMeal
      ? payment.mealBlendId === selectedMeal.id
      : true;

    return inPreviousRange && matchesKiosk && matchesStatus && matchesMeal;
  });

  return {
    range,
    days,
    selectedKiosk,
    selectedStatus,
    selectedMeal,
    filteredPayments,
    previousPayments,
  };
}

function buildTopItems(counter: Map<string, number>, limit = 5): PreferenceInsightItem[] {
  return Array.from(counter.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit)
    .map(([label, value]) => ({
      label,
      value,
    }));
}

export async function getPreferenceInsights(): Promise<PreferenceInsights> {
  const client = getSupabaseServiceRoleClient();
  const [{ data: profiles }, { data: blends }] = await Promise.all([
    client
      .from("profiles")
      .select("id, preferred_sport, preferred_goal, favorite_meal_ids"),
    client.from("drink_blends").select("id, name"),
  ]);

  const mealNameById = new Map(
    ((blends ?? []) as Array<{ id: string; name: string }>).map((blend) => [
      blend.id,
      blend.name,
    ]),
  );

  const sportCounter = new Map<string, number>();
  const goalCounter = new Map<string, number>();
  const favoriteMealCounter = new Map<string, number>();
  let profilesWithPreferences = 0;

  for (const profile of (profiles ?? []) as RawProfileRow[]) {
    const hasPreferredSport = Boolean(profile.preferred_sport);
    const hasPreferredGoal = Boolean(profile.preferred_goal);
    const favoriteMealIds = Array.isArray(profile.favorite_meal_ids)
      ? profile.favorite_meal_ids
      : [];

    if (hasPreferredSport || hasPreferredGoal || favoriteMealIds.length > 0) {
      profilesWithPreferences += 1;
    }

    if (profile.preferred_sport) {
      sportCounter.set(
        profile.preferred_sport,
        (sportCounter.get(profile.preferred_sport) ?? 0) + 1,
      );
    }

    if (profile.preferred_goal) {
      goalCounter.set(
        profile.preferred_goal,
        (goalCounter.get(profile.preferred_goal) ?? 0) + 1,
      );
    }

    for (const mealId of favoriteMealIds) {
      const mealName = mealNameById.get(mealId) ?? mealId;
      favoriteMealCounter.set(
        mealName,
        (favoriteMealCounter.get(mealName) ?? 0) + 1,
      );
    }
  }

  return {
    profilesWithPreferences,
    sports: buildTopItems(sportCounter),
    goals: buildTopItems(goalCounter),
    favoriteMeals: buildTopItems(favoriteMealCounter),
  };
}

export async function getDashboardUsers(): Promise<DashboardUserRecord[]> {
  const client = getSupabaseServiceRoleClient();
  const [{ data: profiles }, { data: sessions }, { data: payments }] = await Promise.all([
    client
      .from("profiles")
      .select(
        "id, email, full_name, role, onboarding_completed, gym_name, expo_push_token, created_at, updated_at, preferred_sport, preferred_goal, favorite_meal_ids",
      )
      .order("created_at", { ascending: false }),
    client
      .from("workout_sessions")
      .select("id, user_id, goal, created_at")
      .order("created_at", { ascending: false }),
    client
      .from("kiosk_payments")
      .select("id, user_id, amount_eur, status, paid_at, created_at"),
  ]);

  const sessionsByUser = new Map<
    string,
    { total: number; latestAt: string | null; latestGoal: string | null }
  >();

  for (const session of (sessions ?? []) as RawWorkoutSessionRow[]) {
    const current = sessionsByUser.get(session.user_id) ?? {
      total: 0,
      latestAt: null,
      latestGoal: null,
    };
    current.total += 1;

    if (!current.latestAt || new Date(session.created_at).getTime() > new Date(current.latestAt).getTime()) {
      current.latestAt = session.created_at;
      current.latestGoal = session.goal;
    }

    sessionsByUser.set(session.user_id, current);
  }

  const paymentsByUser = new Map<string, { total: number; paidCount: number; spent: number }>();

  for (const payment of (payments ?? []) as RawPaymentRow[]) {
    if (!payment.user_id) {
      continue;
    }

    const current = paymentsByUser.get(payment.user_id) ?? {
      total: 0,
      paidCount: 0,
      spent: 0,
    };
    current.total += 1;

    if (payment.status === "paid") {
      current.paidCount += 1;
      current.spent +=
        typeof payment.amount_eur === "number"
          ? payment.amount_eur
          : Number(payment.amount_eur ?? 0);
    }

    paymentsByUser.set(payment.user_id, current);
  }

  return ((profiles ?? []) as RawProfileRow[]).map((profile) => {
    const sessionMeta = sessionsByUser.get(profile.id);
    const paymentMeta = paymentsByUser.get(profile.id);

    return {
      id: profile.id,
      email: profile.email ?? "",
      fullName: profile.full_name,
      role: profile.role ?? "user",
      onboardingCompleted: profile.onboarding_completed ?? false,
      gymName: profile.gym_name ?? null,
      preferredSport: profile.preferred_sport ?? null,
      preferredGoal: profile.preferred_goal ?? null,
      favoriteMealIds: profile.favorite_meal_ids ?? [],
      expoPushToken: profile.expo_push_token ?? null,
      createdAt: profile.created_at ?? new Date(0).toISOString(),
      updatedAt: profile.updated_at ?? new Date(0).toISOString(),
      latestWorkoutAt: sessionMeta?.latestAt ?? null,
      latestWorkoutGoal: sessionMeta?.latestGoal ?? null,
      totalWorkouts: sessionMeta?.total ?? 0,
      totalPayments: paymentMeta?.paidCount ?? 0,
      totalSpentEur: Number((paymentMeta?.spent ?? 0).toFixed(2)),
    };
  });
}

export async function getOperationalSnapshot(ownerId: string): Promise<OperationalSnapshot> {
  const [kiosks, payments] = await Promise.all([
    getOwnerKiosks(ownerId),
    getOwnerPayments(ownerId, 500),
  ]);

  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000;
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const alerts: OperationalSnapshot["alerts"] = [];

  const lowStockKiosks = kiosks.filter(
    (kiosk) => kiosk.stockUnits < kiosk.stockAlertThreshold,
  );
  const inactiveKiosks = kiosks.filter((kiosk) => {
    if (!kiosk.isActive) {
      return true;
    }

    if (!kiosk.lastHeartbeatAt) {
      return true;
    }

    return new Date(kiosk.lastHeartbeatAt).getTime() < tenMinutesAgo;
  });
  const failedPayments = payments.filter(
    (payment) =>
      payment.status === "failed" &&
      new Date(payment.createdAt).getTime() >= sevenDaysAgo,
  );
  const pendingPayments = payments.filter(
    (payment) =>
      payment.status === "pending" &&
      new Date(payment.createdAt).getTime() >= twentyFourHoursAgo,
  );

  for (const kiosk of lowStockKiosks.slice(0, 4)) {
    alerts.push({
      id: `stock-${kiosk.id}`,
      severity: "warning",
      title: `Stock bas sur ${kiosk.name}`,
      description: `${kiosk.stockUnits} repas restants pour un seuil d'alerte a ${kiosk.stockAlertThreshold}.`,
      href: `/admin/kiosks/${kiosk.id}`,
    });
  }

  for (const kiosk of inactiveKiosks.slice(0, 4)) {
    alerts.push({
      id: `heartbeat-${kiosk.id}`,
      severity: kiosk.isActive ? "warning" : "critical",
      title: kiosk.isActive
        ? `Heartbeat absent pour ${kiosk.name}`
        : `${kiosk.name} desactivee`,
      description: kiosk.lastHeartbeatAt
        ? `Dernier signal recu le ${new Date(kiosk.lastHeartbeatAt).toLocaleString("fr-FR")}.`
        : "Aucun heartbeat recu pour cette borne.",
      href: `/admin/kiosks/${kiosk.id}`,
    });
  }

  if (failedPayments.length > 0) {
    alerts.push({
      id: "failed-payments",
      severity: "critical",
      title: "Paiements en echec a surveiller",
      description: `${failedPayments.length} paiement(s) en echec sur les 7 derniers jours.`,
      href: "/admin/orders",
    });
  }

  if (pendingPayments.length > 0) {
    alerts.push({
      id: "pending-payments",
      severity: "info",
      title: "Paiements en attente recents",
      description: `${pendingPayments.length} paiement(s) encore en attente sur les 24 dernieres heures.`,
      href: "/admin/orders",
    });
  }

  return {
    alerts,
    lowStockCount: lowStockKiosks.length,
    inactiveKioskCount: inactiveKiosks.length,
    failedPaymentCount: failedPayments.length,
    pendingPaymentCount: pendingPayments.length,
  };
}

export async function getOwnerAnalytics(
  ownerId: string,
  rawRange?: string,
  rawKioskId?: string,
  rawStatus?: string,
  rawMealId?: string,
): Promise<AnalyticsSnapshot> {
  const [payments, kiosks, blends] = await Promise.all([
    getOwnerPayments(ownerId, 2000),
    getOwnerKiosks(ownerId),
    getDrinkBlends(),
  ]);

  const {
    range,
    days,
    selectedKiosk,
    selectedStatus,
    selectedMeal,
    filteredPayments,
    previousPayments,
  } =
    buildAnalyticsSelection(
      payments,
      kiosks,
      blends,
      rawRange,
      rawKioskId,
      rawStatus,
      rawMealId,
    );
  const kioskNameById = new Map(kiosks.map((kiosk) => [kiosk.id, kiosk.name]));
  const blendNameById = new Map(blends.map((blend) => [blend.id, blend.name]));
  const paidPayments = filteredPayments.filter((payment) => payment.status === "paid");
  const previousPaidPayments = previousPayments.filter(
    (payment) => payment.status === "paid",
  );
  const uniqueCustomers = new Set(
    paidPayments.map((payment) => payment.userId).filter(Boolean),
  );
  const previousUniqueCustomers = new Set(
    previousPaidPayments.map((payment) => payment.userId).filter(Boolean),
  );
  const mealCounter = new Map<string, { count: number; revenue: number }>();
  const kioskCounter = new Map<string, { count: number; revenue: number }>();
  const statusCounter = new Map<string, number>();

  for (const payment of filteredPayments) {
    statusCounter.set(payment.status, (statusCounter.get(payment.status) ?? 0) + 1);
  }

  for (const payment of paidPayments) {
    const mealLabel = payment.mealBlendId
      ? blendNameById.get(payment.mealBlendId) ?? payment.mealBlendId
      : "Repas non renseigne";
    const kioskLabel = kioskNameById.get(payment.kioskId) ?? payment.kioskId;

    const mealEntry = mealCounter.get(mealLabel) ?? { count: 0, revenue: 0 };
    mealEntry.count += 1;
    mealEntry.revenue += payment.amountEur;
    mealCounter.set(mealLabel, mealEntry);

    const kioskEntry = kioskCounter.get(kioskLabel) ?? { count: 0, revenue: 0 };
    kioskEntry.count += 1;
    kioskEntry.revenue += payment.amountEur;
    kioskCounter.set(kioskLabel, kioskEntry);
  }

  const revenue = paidPayments.reduce((sum, payment) => sum + payment.amountEur, 0);
  const previousRevenue = previousPaidPayments.reduce(
    (sum, payment) => sum + payment.amountEur,
    0,
  );

  return {
    range,
    selectedKioskId: selectedKiosk?.id ?? null,
    selectedKioskName: selectedKiosk?.name ?? null,
    selectedStatus,
    selectedMealId: selectedMeal?.id ?? null,
    selectedMealName: selectedMeal?.name ?? null,
    paidCount: paidPayments.length,
    revenue,
    averageTicket: paidPayments.length > 0 ? revenue / paidPayments.length : 0,
    activeCustomers: uniqueCustomers.size,
    previousPaidCount: previousPaidPayments.length,
    previousRevenue,
    previousAverageTicket:
      previousPaidPayments.length > 0 ? previousRevenue / previousPaidPayments.length : 0,
    previousActiveCustomers: previousUniqueCustomers.size,
    salesSeries: buildSalesSeries(filteredPayments, days),
    topMeals: buildLeaderboard(mealCounter),
    topKiosks: buildLeaderboard(kioskCounter),
    paymentStatuses: buildTopItems(statusCounter),
  };
}

export async function getOwnerAnalyticsExportRows(
  ownerId: string,
  rawRange?: string,
  rawKioskId?: string,
  rawStatus?: string,
  rawMealId?: string,
): Promise<
  Array<{
    paymentId: string;
    createdAt: string;
    paidAt: string | null;
    status: PaymentRecord["status"];
    kioskId: string;
    kioskName: string;
    mealId: string | null;
    mealName: string;
    userId: string | null;
    amountEur: number;
  }>
> {
  const [payments, kiosks, blends] = await Promise.all([
    getOwnerPayments(ownerId, 2000),
    getOwnerKiosks(ownerId),
    getDrinkBlends(),
  ]);

  const { filteredPayments } = buildAnalyticsSelection(
    payments,
    kiosks,
    blends,
    rawRange,
    rawKioskId,
    rawStatus,
    rawMealId,
  );
  const kioskNameById = new Map(kiosks.map((kiosk) => [kiosk.id, kiosk.name]));
  const blendNameById = new Map(blends.map((blend) => [blend.id, blend.name]));

  return filteredPayments
    .map((payment) => ({
      paymentId: payment.id,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt,
      status: payment.status,
      kioskId: payment.kioskId,
      kioskName: kioskNameById.get(payment.kioskId) ?? payment.kioskId,
      mealId: payment.mealBlendId,
      mealName: payment.mealBlendId
        ? blendNameById.get(payment.mealBlendId) ?? payment.mealBlendId
        : "Repas non renseigne",
      userId: payment.userId,
      amountEur: payment.amountEur,
    }));
}
