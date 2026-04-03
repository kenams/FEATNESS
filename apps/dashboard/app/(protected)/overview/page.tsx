import Link from "next/link";
import { cookies } from "next/headers";

import { MetricCard } from "@/components/metric-card";
import { OrdersTable } from "@/components/orders-table";
import { SalesChart } from "@/components/sales-chart";
import { requireOwner } from "@/lib/auth";
import {
  buildOverviewMetrics,
  buildSalesSeries,
  enrichOrders,
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

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.24em] text-featness-gold">
          FEATNESS B2B
        </p>
        <h1 className="text-3xl font-semibold text-featness-ink">Vue d&apos;ensemble</h1>
        <p className="text-sm text-featness-muted">
          Pilotage de vos bornes, ventes et disponibilites.
        </p>
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
            href="/orders"
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-featness-ink transition hover:border-featness-gold"
          >
            Voir toutes
          </Link>
        </div>
        <OrdersTable orders={orders} kiosks={kiosks} showFilters={false} />
      </section>
    </div>
  );
}
