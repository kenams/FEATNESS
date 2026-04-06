"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SalesPoint = {
  date: string;
  meals: number;
  revenue: number;
};

export function SalesChart({ data }: { data: SalesPoint[] }) {
  return (
    <div className="rounded-[30px] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,247,0.94))] p-6 shadow-[0_18px_55px_rgba(17,32,28,0.08)]">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.22em] text-featness-gold">
          Activite
        </p>
        <h2 className="mt-2 text-xl font-semibold text-featness-ink">Ventes sur 30 jours</h2>
        <p className="text-sm text-featness-muted">
          Nombre de repas vendus et chiffre d&apos;affaires.
        </p>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="4 4" stroke="#dbe6e0" />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) =>
                new Date(value).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                })
              }
              stroke="#6c867f"
            />
            <YAxis yAxisId="left" stroke="#6c867f" />
            <YAxis yAxisId="right" orientation="right" stroke="#c9a646" />
            <Tooltip
              formatter={(value: number, key: string) =>
                key === "revenue"
                  ? [`${value.toFixed(2)} EUR`, "CA"]
                  : [String(value), "Repas"]
              }
              labelFormatter={(value: string) =>
                new Date(value).toLocaleDateString("fr-FR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })
              }
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="meals"
              name="Repas"
              stroke="#0f7a5d"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              name="CA"
              stroke="#c9a646"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
