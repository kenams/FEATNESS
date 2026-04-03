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
      ? "border-orange-200 bg-orange-50"
      : "border-black/5 bg-white";

  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${toneClasses}`}>
      <p className="text-sm text-featness-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-featness-ink">{value}</p>
      {hint ? <p className="mt-2 text-sm text-featness-muted">{hint}</p> : null}
    </article>
  );
}
