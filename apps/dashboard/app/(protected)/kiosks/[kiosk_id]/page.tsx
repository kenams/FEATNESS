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
      <header className="overflow-hidden rounded-[36px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(217,189,100,0.18),transparent_34%),linear-gradient(135deg,#0f1714_0%,#16231f_54%,#f4f7f5_54%,#ffffff_100%)] p-6 shadow-[0_24px_80px_rgba(16,24,22,0.12)] lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-end">
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white lg:text-4xl">
                {kiosk.name}
              </h1>
              <p className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs text-white/72">
                {kiosk.id}
              </p>
            </div>
            <p className="max-w-xl text-sm text-white/72">
              Pilotage detaille de la borne: activite, stock, revenus et dernieres commandes.
            </p>
            <KioskLiveStatus
              kioskId={kiosk.id}
              initialHeartbeat={kiosk.lastHeartbeatAt}
              initialActive={kiosk.isActive}
            />
          </div>

          <div className="grid gap-3 rounded-[28px] border border-black/5 bg-white/92 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
              Performance du jour
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[20px] bg-[#f5f8f6] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-featness-muted">
                  Repas
                </p>
                <p className="mt-2 text-2xl font-semibold text-featness-ink">
                  {metrics.paidTodayCount}
                </p>
              </div>
              <div className="rounded-[20px] bg-[#f5f8f6] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-featness-muted">
                  CA
                </p>
                <p className="mt-2 text-2xl font-semibold text-featness-ink">
                  {formatCurrency(metrics.paidTodayRevenue)}
                </p>
              </div>
              <div className="rounded-[20px] bg-[#f5f8f6] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.16em] text-featness-muted">
                  Stock
                </p>
                <p className="mt-2 text-2xl font-semibold text-featness-ink">
                  {kiosk.stockUnits}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f6f8f7_100%)] p-5 shadow-[0_16px_40px_rgba(16,24,22,0.08)]">
          <p className="text-sm text-featness-muted">Repas vendus aujourd&apos;hui</p>
          <p className="mt-3 text-3xl font-semibold text-featness-ink">
            {metrics.paidTodayCount}
          </p>
        </div>
        <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f6f8f7_100%)] p-5 shadow-[0_16px_40px_rgba(16,24,22,0.08)]">
          <p className="text-sm text-featness-muted">CA aujourd&apos;hui</p>
          <p className="mt-3 text-3xl font-semibold text-featness-ink">
            {formatCurrency(metrics.paidTodayRevenue)}
          </p>
        </div>
        <div className="rounded-[28px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f6f8f7_100%)] p-5 shadow-[0_16px_40px_rgba(16,24,22,0.08)]">
          <p className="text-sm text-featness-muted">Stock actuel</p>
          <p className="mt-3 text-3xl font-semibold text-featness-ink">
            {kiosk.stockUnits} repas
          </p>
        </div>
      </section>

      <KioskDetailActions
        kioskId={kiosk.id}
        initialStock={kiosk.stockUnits}
        initialStockAlertThreshold={kiosk.stockAlertThreshold}
        initialIsActive={kiosk.isActive}
      />

      <OrdersTable orders={orders} kiosks={[kiosk]} showFilters={false} />
    </div>
  );
}
