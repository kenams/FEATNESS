import Link from "next/link";
import { cookies } from "next/headers";

import { MetricCard } from "@/components/metric-card";
import { OrdersTable } from "@/components/orders-table";
import { OperationalAlerts } from "@/components/operational-alerts";
import { PreferenceInsights } from "@/components/preference-insights";
import { SalesChart } from "@/components/sales-chart";
import { requireOwner } from "@/lib/auth";
import {
  buildOverviewMetrics,
  buildSalesSeries,
  enrichOrders,
  getOperationalSnapshot,
  getPreferenceInsights,
  getOwnerKiosks,
  getOwnerPayments,
} from "@/lib/data";
import { formatCurrency } from "@/lib/dashboard-shared";

export default async function OverviewPage() {
  const { profile } = await requireOwner(cookies());
  const kiosks = await getOwnerKiosks(profile.id);
  const payments = await getOwnerPayments(profile.id, 200);
  const metrics = buildOverviewMetrics(kiosks, payments);
  const orders = await enrichOrders(payments.slice(0, 10), kiosks);
  const salesSeries = buildSalesSeries(payments);
  const preferenceInsights = await getPreferenceInsights();
  const operationalSnapshot = await getOperationalSnapshot(profile.id);

  return (
    <div className="grid gap-6">
      <header className="overflow-hidden rounded-[36px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(217,189,100,0.18),transparent_32%),linear-gradient(135deg,#0d1714_0%,#14211d_52%,#f5f7f6_52%,#ffffff_100%)] p-6 shadow-[0_24px_80px_rgba(16,24,22,0.12)] lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="grid gap-3">
            <p className="text-sm uppercase tracking-[0.24em] text-featness-gold">
              FEATNESS B2B
            </p>
            <h1 className="max-w-xl text-3xl font-semibold tracking-[-0.03em] text-white lg:text-4xl">
              Vue d&apos;ensemble des ventes, bornes et signaux terrain
            </h1>
            <p className="max-w-xl text-sm text-white/72">
              Pilotage centralise des disponibilites, paiements et comportements
              utilisateurs FEATNESS.
            </p>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-black/5 bg-white/92 p-5 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.18em] text-featness-muted">
                Situation du jour
              </span>
              <span className="rounded-full bg-[#eef3ef] px-3 py-1 text-xs font-semibold text-featness-ink">
                {metrics.activeKioskCount} bornes actives
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-[#f5f8f6] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-featness-muted">
                  CA aujourd&apos;hui
                </p>
                <p className="mt-2 text-2xl font-semibold text-featness-ink">
                  {formatCurrency(metrics.paidTodayRevenue)}
                </p>
              </div>
              <div className="rounded-[22px] bg-[#f5f8f6] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-featness-muted">
                  Stock moyen
                </p>
                <p className="mt-2 text-2xl font-semibold text-featness-ink">
                  {Math.round(metrics.averageStock)} repas
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Repas vendus aujourd'hui"
          value={String(metrics.paidTodayCount)}
        />
        <MetricCard
          label="Chiffre d'affaires du jour"
          value={formatCurrency(metrics.paidTodayRevenue)}
        />
        <MetricCard
          label="Bornes actives"
          value={`${metrics.activeKioskCount} / ${metrics.kioskCount} actives`}
        />
        <MetricCard
          label="Stock moyen"
          value={`${Math.round(metrics.averageStock)} repas`}
          hint={`Seuil moyen ${Math.round(metrics.averageThreshold)} repas`}
          tone={metrics.averageStock < metrics.averageThreshold ? "warning" : "default"}
        />
      </section>

      <SalesChart data={salesSeries} />

      <OperationalAlerts snapshot={operationalSnapshot} />

      <PreferenceInsights insights={preferenceInsights} />

      <section className="grid gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-featness-ink">
              Dernieres commandes
            </h2>
            <p className="text-sm text-featness-muted">
              10 commandes les plus recentes sur vos bornes.
            </p>
          </div>
          <Link
            href="/admin/orders"
            className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-medium text-featness-ink transition hover:border-featness-gold hover:bg-[#f8faf9]"
          >
            Voir toutes
          </Link>
        </div>
        <OrdersTable orders={orders} kiosks={kiosks} showFilters={false} />
      </section>
    </div>
  );
}
