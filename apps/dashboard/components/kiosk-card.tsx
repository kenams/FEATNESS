import Link from "next/link";

import {
  formatCurrency,
  formatRelativeMinutes,
  getKioskStatus,
  type KioskRecord,
} from "@/lib/dashboard-shared";

type KioskCardProps = {
  kiosk: KioskRecord;
  revenueToday: number;
};

export function KioskCard({ kiosk, revenueToday }: KioskCardProps) {
  const status = getKioskStatus(kiosk);
  const statusLabel =
    status === "active"
      ? "Actif"
      : status === "inactive"
        ? "Inactif"
        : "Hors service";
  const statusClasses =
    status === "active"
      ? "bg-emerald-100 text-emerald-700"
      : status === "inactive"
        ? "bg-orange-100 text-orange-700"
        : "bg-red-100 text-red-700";
  const stockPercent = Math.max(0, Math.min(100, kiosk.stockUnits));
  const lowStock = kiosk.stockUnits < kiosk.stockAlertThreshold;

  return (
    <article className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-featness-ink">{kiosk.name}</h2>
          <p className="mt-1 text-sm text-featness-muted">
            {kiosk.locationCity || "Ville non renseignee"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses}`}>
          {statusLabel}
        </span>
      </div>

      <p className="mt-4 rounded-2xl bg-[#f6f8f7] px-3 py-2 font-mono text-xs text-featness-muted">
        {kiosk.id}
      </p>

      <div className="mt-4 grid gap-3 text-sm">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-featness-muted">Stock</span>
            <span className={lowStock ? "font-semibold text-red-600" : "text-featness-ink"}>
              {kiosk.stockUnits} repas
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-black/5">
            <div
              className={`h-2 rounded-full ${lowStock ? "bg-red-500" : "bg-featness-gold"}`}
              style={{ width: `${stockPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-featness-muted">Revenus du jour</span>
          <span className="font-medium text-featness-ink">
            {formatCurrency(revenueToday)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-featness-muted">Dernier heartbeat</span>
          <span className="text-featness-ink">
            {formatRelativeMinutes(kiosk.lastHeartbeatAt)}
          </span>
        </div>
      </div>

      <Link
        href={`/kiosks/${kiosk.id}`}
        className="mt-5 inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-featness-ink transition hover:border-featness-gold"
      >
        Voir details
      </Link>
    </article>
  );
}
