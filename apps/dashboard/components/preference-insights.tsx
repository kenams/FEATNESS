import type { PreferenceInsights } from "@/lib/dashboard-shared";

type PreferenceInsightsProps = {
  insights: PreferenceInsights;
};

function InsightList({
  title,
  items,
  emptyCopy,
}: {
  title: string;
  items: PreferenceInsights["sports"];
  emptyCopy: string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <article className="rounded-[30px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f6f8f7_100%)] p-6 shadow-[0_18px_60px_rgba(16,24,22,0.08)]">
      <h3 className="text-lg font-semibold text-featness-ink">{title}</h3>
      <div className="mt-4 grid gap-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.label}
              className="rounded-[22px] border border-[#e4ebe6] bg-white px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-featness-ink">{item.label}</span>
                <span className="rounded-full border border-[#e4ebe6] bg-[#f8faf9] px-3 py-1 text-sm font-semibold text-featness-ink">
                  {item.value}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf2ef]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#d9bd64_0%,#0f2d25_100%)]"
                  style={{ width: `${Math.max((item.value / maxValue) * 100, 12)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-[22px] border border-dashed border-[#d7dfdb] bg-white/80 px-4 py-4 text-sm text-featness-muted">
            {emptyCopy}
          </p>
        )}
      </div>
    </article>
  );
}

export function PreferenceInsights({ insights }: PreferenceInsightsProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <article className="overflow-hidden rounded-[32px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(217,189,100,0.18),transparent_42%),linear-gradient(180deg,#101917_0%,#0b1110_100%)] p-6 text-white shadow-[0_20px_70px_rgba(16,24,22,0.18)]">
        <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
          Comportement utilisateur
        </p>
        <h2 className="mt-2 text-2xl font-semibold">
          Preferences FEATNESS synchronisees
        </h2>
        <p className="mt-3 max-w-xl text-sm text-white/70">
          Lecture directe des choix enregistres depuis l&apos;application mobile :
          sports favoris, objectifs privilegies et repas les plus sauvegardes.
        </p>

        <div className="mt-6 rounded-[26px] border border-white/10 bg-white/5 p-5 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.18em] text-white/55">
            Profils avec preferences
          </p>
          <p className="mt-2 text-4xl font-semibold">{insights.profilesWithPreferences}</p>
          <p className="mt-2 text-sm text-white/70">
            Compte les profils avec au moins un sport prefere, un objectif prefere
            ou un repas favori.
          </p>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-3">
        <InsightList
          title="Sports preferes"
          items={insights.sports}
          emptyCopy="Aucune preference sport enregistree pour le moment."
        />
        <InsightList
          title="Objectifs preferes"
          items={insights.goals}
          emptyCopy="Aucun objectif favori n'a encore ete remonte."
        />
        <InsightList
          title="Repas favoris"
          items={insights.favoriteMeals}
          emptyCopy="Aucun repas n'a encore ete ajoute en favori."
        />
      </div>
    </section>
  );
}
