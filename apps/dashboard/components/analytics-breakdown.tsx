import type { AnalyticsLeaderboardItem, AnalyticsSnapshot } from "@/lib/dashboard-shared";
import { formatCurrency } from "@/lib/dashboard-shared";

function LeaderboardCard({
  title,
  subtitle,
  items,
  emptyCopy,
}: {
  title: string;
  subtitle: string;
  items: AnalyticsLeaderboardItem[];
  emptyCopy: string;
}) {
  return (
    <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-featness-ink">{title}</h2>
      <p className="mt-1 text-sm text-featness-muted">{subtitle}</p>
      <div className="mt-5 grid gap-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-[#f8faf9] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-featness-ink">
                  {item.label}
                </p>
                <p className="text-xs text-featness-muted">
                  {item.count} ventes / {formatCurrency(item.revenue)}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-featness-ink">
                {item.count}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-featness-muted">{emptyCopy}</p>
        )}
      </div>
    </article>
  );
}

function StatusCard({
  statuses,
}: {
  statuses: AnalyticsSnapshot["paymentStatuses"];
}) {
  return (
    <article className="rounded-[28px] border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-featness-ink">Statuts de paiement</h2>
      <p className="mt-1 text-sm text-featness-muted">
        Repartition des transactions sur la periode selectionnee.
      </p>
      <div className="mt-5 grid gap-3">
        {statuses.length > 0 ? (
          statuses.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-2xl bg-[#f8faf9] px-4 py-3"
            >
              <span className="text-sm capitalize text-featness-ink">{item.label}</span>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-featness-ink">
                {item.value}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-featness-muted">
            Aucune transaction sur cette periode.
          </p>
        )}
      </div>
    </article>
  );
}

export function AnalyticsBreakdown({
  analytics,
}: {
  analytics: AnalyticsSnapshot;
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <LeaderboardCard
        title="Top repas"
        subtitle="Repas les plus commandes sur la periode."
        items={analytics.topMeals}
        emptyCopy="Aucun repas paye sur cette periode."
      />
      <LeaderboardCard
        title="Top bornes"
        subtitle="Bornes qui encaissent le plus sur la periode."
        items={analytics.topKiosks}
        emptyCopy="Aucune borne active sur cette periode."
      />
      <StatusCard statuses={analytics.paymentStatuses} />
    </section>
  );
}
