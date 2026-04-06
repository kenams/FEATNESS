"use client";

import { useMemo, useState } from "react";

import { KioskCard } from "@/components/kiosk-card";
import {
  formatCurrency,
  getKioskStatus,
  type KioskRecord,
} from "@/lib/dashboard-shared";

type KiosksGridProps = {
  kiosks: KioskRecord[];
  revenueByKiosk: Record<string, number>;
};

export function KiosksGrid({ kiosks, revenueByKiosk }: KiosksGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedStock, setSelectedStock] = useState("all");

  const filteredKiosks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return kiosks.filter((kiosk) => {
      const status = getKioskStatus(kiosk);
      const lowStock = kiosk.stockUnits < kiosk.stockAlertThreshold;
      const searchMatch =
        normalizedSearch.length === 0 ||
        kiosk.name.toLowerCase().includes(normalizedSearch) ||
        kiosk.id.toLowerCase().includes(normalizedSearch) ||
        (kiosk.locationCity ?? "").toLowerCase().includes(normalizedSearch);
      const statusMatch = selectedStatus === "all" || status === selectedStatus;
      const stockMatch =
        selectedStock === "all" ||
        (selectedStock === "low" ? lowStock : !lowStock);

      return searchMatch && statusMatch && stockMatch;
    });
  }, [kiosks, searchTerm, selectedStatus, selectedStock]);

  const activeCount = filteredKiosks.filter(
    (kiosk) => getKioskStatus(kiosk) === "active",
  ).length;
  const lowStockCount = filteredKiosks.filter(
    (kiosk) => kiosk.stockUnits < kiosk.stockAlertThreshold,
  ).length;
  const filteredRevenue = filteredKiosks.reduce(
    (sum, kiosk) => sum + (revenueByKiosk[kiosk.id] ?? 0),
    0,
  );

  function handleExportCsv() {
    const header = [
      "kiosk_id",
      "name",
      "city",
      "is_active",
      "derived_status",
      "stock_units",
      "stock_alert_threshold",
      "revenue_today_eur",
      "last_heartbeat_at",
    ];
    const rows = filteredKiosks.map((kiosk) => [
      kiosk.id,
      kiosk.name,
      kiosk.locationCity ?? "",
      kiosk.isActive ? "yes" : "no",
      getKioskStatus(kiosk),
      String(kiosk.stockUnits),
      String(kiosk.stockAlertThreshold),
      (revenueByKiosk[kiosk.id] ?? 0).toFixed(2),
      kiosk.lastHeartbeatAt ?? "",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "featness-kiosks.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <div className="rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,247,0.94))] px-4 py-4 shadow-[0_16px_40px_rgba(17,32,28,0.06)]">
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            Bornes filtrees
          </p>
          <p className="mt-2 text-2xl font-semibold text-featness-ink">
            {filteredKiosks.length}
          </p>
        </div>
        <div className="rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,247,0.94))] px-4 py-4 shadow-[0_16px_40px_rgba(17,32,28,0.06)]">
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            Actives
          </p>
          <p className="mt-2 text-2xl font-semibold text-featness-ink">{activeCount}</p>
        </div>
        <div className="rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,247,0.94))] px-4 py-4 shadow-[0_16px_40px_rgba(17,32,28,0.06)]">
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            Stock bas
          </p>
          <p className="mt-2 text-2xl font-semibold text-featness-ink">{lowStockCount}</p>
        </div>
        <div className="rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,247,0.94))] px-4 py-4 shadow-[0_16px_40px_rgba(17,32,28,0.06)]">
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            CA du jour
          </p>
          <p className="mt-2 text-2xl font-semibold text-featness-ink">
            {formatCurrency(filteredRevenue)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Rechercher une borne, un id, une ville..."
          className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
        />
        <select
          value={selectedStatus}
          onChange={(event) => setSelectedStatus(event.target.value)}
          className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actives</option>
          <option value="inactive">Inactives</option>
          <option value="out_of_service">Hors service</option>
        </select>
        <select
          value={selectedStock}
          onChange={(event) => setSelectedStock(event.target.value)}
          className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
        >
          <option value="all">Tous les stocks</option>
          <option value="low">Stock bas</option>
          <option value="healthy">Stock correct</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExportCsv}
          className="rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm font-medium text-featness-ink transition hover:border-featness-gold"
        >
          Exporter les bornes filtrees
        </button>
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        {filteredKiosks.map((kiosk) => (
          <KioskCard
            key={kiosk.id}
            kiosk={kiosk}
            revenueToday={revenueByKiosk[kiosk.id] ?? 0}
          />
        ))}
        {filteredKiosks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/10 bg-white p-8 text-sm text-featness-muted">
            Aucune borne ne correspond aux filtres actifs.
          </div>
        ) : null}
      </section>
    </div>
  );
}
