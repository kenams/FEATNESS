import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { KioskDetailActions } from "@/components/kiosk-detail-actions";
import { KioskLiveStatus } from "@/components/kiosk-live-status";
import { OrdersTable } from "@/components/orders-table";
import { requireOwner } from "@/lib/auth";
import {
  buildOverviewMetrics,
  enrichOrders,
  getKioskByOwner,
  getOwnerKiosks,
  getPaymentsForKiosk,
} from "@/lib/data";
import { formatCurrency } from "@/lib/dashboard-shared";

type KioskDetailPageProps = {
  params: Promise<{ kiosk_id: string }>;
};

export default async function KioskDetailPage({
  params,
}: KioskDetailPageProps) {
  const { profile } = await requireOwner(cookies());
  const { kiosk_id } = await params;
  const kiosk = await getKioskByOwner(profile.id, kiosk_id);

  if (!kiosk) {
    notFound();
  }

  const allKiosks = await getOwnerKiosks(profile.id);
  const payments = await getPaymentsForKiosk(profile.id, kiosk.id, 50);
  const orders = await enrichOrders(payments, allKiosks);
  const metrics = buildOverviewMetrics([kiosk], payments);

  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-featness-ink">{kiosk.name}</h1>
          <p className="rounded-full bg-[#eef2f0] px-3 py-1 font-mono text-xs text-featness-muted">
            {kiosk.id}
          </p>
        </div>
        <KioskLiveStatus
          kioskId={kiosk.id}
          initialHeartbeat={kiosk.lastHeartbeatAt}
          initialActive={kiosk.isActive}
        />
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-sm text-featness-muted">Repas vendus aujourd&apos;hui</p>
          <p className="mt-3 text-3xl font-semibold text-featness-ink">
            {metrics.paidTodayCount}
          </p>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-sm text-featness-muted">CA aujourd&apos;hui</p>
          <p className="mt-3 text-3xl font-semibold text-featness-ink">
            {formatCurrency(metrics.paidTodayRevenue)}
          </p>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-sm text-featness-muted">Stock actuel</p>
          <p className="mt-3 text-3xl font-semibold text-featness-ink">
            {kiosk.stockUnits} repas
          </p>
        </div>
      </section>

      <KioskDetailActions
        kioskId={kiosk.id}
        initialStock={kiosk.stockUnits}
        initialIsActive={kiosk.isActive}
      />

      <OrdersTable orders={orders} kiosks={[kiosk]} showFilters={false} />
    </div>
  );
}
