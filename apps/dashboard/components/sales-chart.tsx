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
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-featness-ink">Ventes sur 30 jours</h2>
        <p className="text-sm text-featness-muted">
          Nombre de repas vendus et chiffre d&apos;affaires.
        </p>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8ecea" />
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
                  ? [`${value.toFixed(2)} €`, "CA"]
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
