type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warning";
};

export function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: MetricCardProps) {
  const toneClasses =
    tone === "warning"
      ? "border-orange-200/70 bg-[linear-gradient(180deg,rgba(255,244,232,0.95),rgba(255,249,243,0.92))]"
      : "border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,251,249,0.94))]";

  return (
    <article className={`relative overflow-hidden rounded-[30px] border p-5 shadow-[0_18px_55px_rgba(17,32,28,0.08)] ${toneClasses}`}>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-featness-gold/70 via-featness-mint/55 to-transparent" />
      <p className="text-sm uppercase tracking-[0.18em] text-featness-muted">{label}</p>
      <p className="mt-4 text-4xl font-semibold leading-none text-featness-ink">{value}</p>
      {hint ? <p className="mt-3 text-sm text-featness-muted">{hint}</p> : null}
    </article>
  );
}
