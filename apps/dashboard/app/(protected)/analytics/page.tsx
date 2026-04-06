import Link from "next/link";
import { cookies } from "next/headers";

import { AnalyticsBreakdown } from "@/components/analytics-breakdown";
import { MetricCard } from "@/components/metric-card";
import { SalesChart } from "@/components/sales-chart";
import { requireOwner } from "@/lib/auth";
import type { AnalyticsRange } from "@/lib/dashboard-shared";
import { formatCurrency } from "@/lib/dashboard-shared";
import { getDrinkBlends, getOwnerAnalytics, getOwnerKiosks } from "@/lib/data";

const rangeOptions: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
];

const statusOptions = [
  { value: "", label: "Tous les statuts" },
  { value: "paid", label: "Paye" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Echec" },
  { value: "refunded", label: "Rembourse" },
];

function buildDeltaHint(current: number, previous: number, suffix = ""): string {
  if (previous === 0) {
    return current === 0
      ? "Stable vs periode precedente"
      : `Nouvelle progression vs periode precedente${suffix}`;
  }

  const delta = ((current - previous) / previous) * 100;
  const formattedDelta = `${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%`;
  return `${formattedDelta} vs periode precedente${suffix}`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: { range?: string; kiosk?: string; status?: string; meal?: string };
}) {
  const { profile } = await requireOwner(cookies());
  const kiosks = await getOwnerKiosks(profile.id);
  const analytics = await getOwnerAnalytics(
    profile.id,
    searchParams?.range,
    searchParams?.kiosk,
    searchParams?.status,
    searchParams?.meal,
  );
  const meals = await getDrinkBlends();
  const exportHref = `/api/analytics/export?range=${analytics.range}${
    analytics.selectedKioskId ? `&kiosk=${encodeURIComponent(analytics.selectedKioskId)}` : ""
  }${analytics.selectedStatus ? `&status=${encodeURIComponent(analytics.selectedStatus)}` : ""}${
    analytics.selectedMealId ? `&meal=${encodeURIComponent(analytics.selectedMealId)}` : ""
  }`;

  function buildAnalyticsHref(range: AnalyticsRange) {
    const params = new URLSearchParams({ range });

    if (analytics.selectedKioskId) {
      params.set("kiosk", analytics.selectedKioskId);
    }
    if (analytics.selectedStatus) {
      params.set("status", analytics.selectedStatus);
    }
    if (analytics.selectedMealId) {
      params.set("meal", analytics.selectedMealId);
    }

    return `/admin/analytics?${params.toString()}`;
  }

  return (
    <div className="grid gap-6">
      <header className="overflow-hidden rounded-[36px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(217,189,100,0.18),transparent_34%),linear-gradient(135deg,#0f1715_0%,#14211d_56%,#f3f6f4_56%,#ffffff_100%)] p-6 shadow-[0_24px_80px_rgba(16,24,22,0.12)] lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-end">
          <div className="grid gap-2">
            <p className="text-sm uppercase tracking-[0.24em] text-featness-gold">
              FEATNESS B2B
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white lg:text-4xl">
              Analytics
            </h1>
            <p className="max-w-xl text-sm text-white/72">
              Lecture detaillee des ventes, clients actifs et repas les plus commandes.
            </p>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-black/5 bg-white/92 p-5 backdrop-blur">
            <div className="flex flex-wrap gap-2">
              {rangeOptions.map((option) => {
                const active = option.value === analytics.range;

                return (
                  <Link
                    key={option.value}
                    href={buildAnalyticsHref(option.value)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-featness-gold text-featness-ink shadow-[0_10px_20px_rgba(201,166,70,0.18)]"
                        : "border border-black/10 bg-white text-featness-ink hover:border-featness-gold"
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <form action="/admin/analytics" method="get" className="flex flex-wrap gap-2">
                <input type="hidden" name="range" value={analytics.range} />
                <select
                  name="kiosk"
                  defaultValue={analytics.selectedKioskId ?? ""}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-featness-ink outline-none transition focus:border-featness-gold"
                >
                  <option value="">Toutes les bornes</option>
                  {kiosks.map((kiosk) => (
                    <option key={kiosk.id} value={kiosk.id}>
                      {kiosk.name}
                    </option>
                  ))}
                </select>
                <select
                  name="status"
                  defaultValue={analytics.selectedStatus ?? ""}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-featness-ink outline-none transition focus:border-featness-gold"
                >
                  {statusOptions.map((status) => (
                    <option key={status.value || "all"} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <select
                  name="meal"
                  defaultValue={analytics.selectedMealId ?? ""}
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-featness-ink outline-none transition focus:border-featness-gold"
                >
                  <option value="">Tous les repas</option>
                  {meals.map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {meal.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-featness-ink transition hover:border-featness-gold"
                >
                  Filtrer
                </button>
                <Link
                  href="/admin/analytics"
                  className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-featness-ink transition hover:border-featness-gold"
                >
                  Reinitialiser
                </Link>
              </form>

              <Link
                href={exportHref}
                className="rounded-full bg-featness-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-[#18231f]"
              >
                Export CSV
              </Link>
            </div>
          </div>
        </div>
      </header>

      {analytics.selectedKioskName || analytics.selectedStatus || analytics.selectedMealName ? (
        <div className="rounded-[24px] border border-white/70 bg-white/92 px-5 py-4 shadow-[0_14px_32px_rgba(16,24,22,0.08)]">
          <p className="text-sm text-featness-muted">Filtre actif</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {analytics.selectedKioskName ? (
              <span className="rounded-full bg-[#f8faf9] px-3 py-1 text-sm font-medium text-featness-ink">
                Borne : {analytics.selectedKioskName}
              </span>
            ) : null}
            {analytics.selectedStatus ? (
              <span className="rounded-full bg-[#f8faf9] px-3 py-1 text-sm font-medium capitalize text-featness-ink">
                Statut : {analytics.selectedStatus}
              </span>
            ) : null}
            {analytics.selectedMealName ? (
              <span className="rounded-full bg-[#f8faf9] px-3 py-1 text-sm font-medium text-featness-ink">
                Repas : {analytics.selectedMealName}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Repas payes"
          value={String(analytics.paidCount)}
          hint={buildDeltaHint(analytics.paidCount, analytics.previousPaidCount)}
        />
        <MetricCard
          label="Chiffre d'affaires"
          value={formatCurrency(analytics.revenue)}
          hint={buildDeltaHint(analytics.revenue, analytics.previousRevenue)}
        />
        <MetricCard
          label="Panier moyen"
          value={formatCurrency(analytics.averageTicket)}
          hint={buildDeltaHint(analytics.averageTicket, analytics.previousAverageTicket)}
        />
        <MetricCard
          label="Clients actifs"
          value={String(analytics.activeCustomers)}
          hint={buildDeltaHint(analytics.activeCustomers, analytics.previousActiveCustomers)}
        />
      </section>

      <SalesChart data={analytics.salesSeries} />

      <AnalyticsBreakdown analytics={analytics} />
    </div>
  );
}
