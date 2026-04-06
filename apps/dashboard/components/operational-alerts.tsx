import Link from "next/link";

import type { OperationalSnapshot } from "@/lib/dashboard-shared";

function severityClasses(severity: OperationalSnapshot["alerts"][number]["severity"]): string {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "warning":
      return "border-orange-200 bg-orange-50 text-orange-700";
    default:
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

function statTone(value: number, variant: "critical" | "warning" | "neutral"): string {
  if (value === 0) {
    return "border-black/5 bg-white/70 text-featness-ink";
  }

  switch (variant) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "warning":
      return "border-orange-200 bg-orange-50 text-orange-700";
    default:
      return "border-sky-200 bg-sky-50 text-sky-700";
  }
}

export function OperationalAlerts({
  snapshot,
}: {
  snapshot: OperationalSnapshot;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <article className="overflow-hidden rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,#ffffff_0%,#f4f7f4_100%)] p-6 shadow-[0_18px_60px_rgba(16,24,22,0.08)]">
        <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
          Supervision
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-featness-ink">
          Alertes operationnelles
        </h2>
        <p className="mt-3 text-sm text-featness-muted">
          Vue rapide sur les anomalies qui demandent une action administrateur.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div
            className={`rounded-[24px] border px-4 py-4 ${statTone(
              snapshot.lowStockCount,
              "warning",
            )}`}
          >
            <p className="text-xs uppercase tracking-[0.18em] opacity-70">Bornes stock bas</p>
            <p className="mt-2 text-3xl font-semibold text-featness-ink">
              {snapshot.lowStockCount}
            </p>
          </div>
          <div
            className={`rounded-[24px] border px-4 py-4 ${statTone(
              snapshot.inactiveKioskCount,
              "critical",
            )}`}
          >
            <p className="text-xs uppercase tracking-[0.18em] opacity-70">Bornes inactives</p>
            <p className="mt-2 text-3xl font-semibold text-featness-ink">
              {snapshot.inactiveKioskCount}
            </p>
          </div>
          <div
            className={`rounded-[24px] border px-4 py-4 ${statTone(
              snapshot.failedPaymentCount,
              "critical",
            )}`}
          >
            <p className="text-xs uppercase tracking-[0.18em] opacity-70">Paiements en echec</p>
            <p className="mt-2 text-3xl font-semibold text-featness-ink">
              {snapshot.failedPaymentCount}
            </p>
          </div>
          <div
            className={`rounded-[24px] border px-4 py-4 ${statTone(
              snapshot.pendingPaymentCount,
              "neutral",
            )}`}
          >
            <p className="text-xs uppercase tracking-[0.18em] opacity-70">Paiements en attente</p>
            <p className="mt-2 text-3xl font-semibold text-featness-ink">
              {snapshot.pendingPaymentCount}
            </p>
          </div>
        </div>
      </article>

      <article className="overflow-hidden rounded-[32px] border border-[#dbe5df] bg-[#fbfcfb] p-6 shadow-[0_18px_60px_rgba(16,24,22,0.08)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-featness-ink">Actions recommandees</h3>
            <p className="mt-1 text-sm text-featness-muted">
              Priorisez les incidents qui impactent les ventes ou la disponibilite.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {snapshot.alerts.length > 0 ? (
            snapshot.alerts.map((alert) => (
              <Link
                key={alert.id}
                href={alert.href}
                className="grid gap-3 rounded-[24px] border border-[#e6ece8] bg-white px-4 py-4 transition hover:-translate-y-0.5 hover:border-featness-gold hover:shadow-[0_16px_36px_rgba(16,24,22,0.08)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-featness-ink">{alert.title}</h4>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${severityClasses(alert.severity)}`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="text-sm text-featness-muted">{alert.description}</p>
              </Link>
            ))
          ) : (
            <p className="rounded-[24px] border border-dashed border-[#d7dfdb] bg-white/80 px-4 py-4 text-sm text-featness-muted">
              Aucune alerte critique pour le moment.
            </p>
          )}
        </div>
      </article>
    </section>
  );
}
