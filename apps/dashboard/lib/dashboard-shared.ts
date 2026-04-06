export type KioskStatus = "active" | "inactive" | "out_of_service";

export type DashboardProfile = {
  id: string;
  email: string;
  fullName: string | null;
  role: "user" | "owner" | "admin";
};

export type DashboardUserRecord = {
  id: string;
  email: string;
  fullName: string | null;
  role: DashboardProfile["role"];
  onboardingCompleted: boolean;
  gymName: string | null;
  preferredSport: string | null;
  preferredGoal: string | null;
  favoriteMealIds: string[];
  expoPushToken: string | null;
  createdAt: string;
  updatedAt: string;
  latestWorkoutAt: string | null;
  latestWorkoutGoal: string | null;
  totalWorkouts: number;
  totalPayments: number;
  totalSpentEur: number;
};

export type KioskRecord = {
  id: string;
  name: string;
  locationAddress: string | null;
  locationCity: string | null;
  ownerId: string | null;
  isActive: boolean;
  lastHeartbeatAt: string | null;
  stockUnits: number;
  stockAlertThreshold: number;
  createdAt: string;
};

export type PaymentRecord = {
  id: string;
  createdAt: string;
  dispenseTokenId: string | null;
  userId: string | null;
  kioskId: string;
  amountEur: number;
  status: "pending" | "paid" | "failed" | "refunded";
  mealBlendId: string | null;
  paidAt: string | null;
};

export type DrinkBlendRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  targetGoal: string;
  priceEur: number;
  isAvailable: boolean;
};

export type EnrichedOrder = PaymentRecord & {
  kioskName: string;
  mealName: string;
  userName: string;
  tokenStatus: string | null;
};

export type PreferenceInsightItem = {
  label: string;
  value: number;
};

export type PreferenceInsights = {
  profilesWithPreferences: number;
  sports: PreferenceInsightItem[];
  goals: PreferenceInsightItem[];
  favoriteMeals: PreferenceInsightItem[];
};

export type AnalyticsRange = "7d" | "30d" | "90d";

export type AnalyticsLeaderboardItem = {
  label: string;
  count: number;
  revenue: number;
};

export type AnalyticsSnapshot = {
  range: AnalyticsRange;
  selectedKioskId: string | null;
  selectedKioskName: string | null;
  selectedStatus: PaymentRecord["status"] | null;
  selectedMealId: string | null;
  selectedMealName: string | null;
  paidCount: number;
  revenue: number;
  averageTicket: number;
  activeCustomers: number;
  previousPaidCount: number;
  previousRevenue: number;
  previousAverageTicket: number;
  previousActiveCustomers: number;
  salesSeries: Array<{ date: string; meals: number; revenue: number }>;
  topMeals: AnalyticsLeaderboardItem[];
  topKiosks: AnalyticsLeaderboardItem[];
  paymentStatuses: PreferenceInsightItem[];
};

export type OperationalAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  href: string;
};

export type OperationalSnapshot = {
  alerts: OperationalAlert[];
  lowStockCount: number;
  inactiveKioskCount: number;
  failedPaymentCount: number;
  pendingPaymentCount: number;
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function getKioskStatus(kiosk: KioskRecord): KioskStatus {
  if (!kiosk.isActive) {
    return "out_of_service";
  }

  if (!kiosk.lastHeartbeatAt) {
    return "inactive";
  }

  const heartbeatMs = new Date(kiosk.lastHeartbeatAt).getTime();
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  return heartbeatMs > tenMinutesAgo ? "active" : "inactive";
}

export function formatRelativeMinutes(dateValue: string | null): string {
  if (!dateValue) {
    return "jamais";
  }

  const diffMs = Date.now() - new Date(dateValue).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return "a l'instant";
  }

  if (diffMinutes < 60) {
    return `il y a ${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  return `il y a ${diffHours} h`;
}

export function getFirstName(profile: DashboardProfile): string {
  return profile.fullName?.trim().split(/\s+/)[0] || profile.email;
}
