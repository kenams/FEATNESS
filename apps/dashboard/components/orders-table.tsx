"use client";

import { useMemo, useState } from "react";

import {
  formatCurrency,
  type EnrichedOrder,
  type KioskRecord,
} from "@/lib/dashboard-shared";

type OrdersTableProps = {
  orders: EnrichedOrder[];
  kiosks: KioskRecord[];
  showFilters?: boolean;
};

export function OrdersTable({
  orders,
  kiosks,
  showFilters = true,
}: OrdersTableProps) {
  const [selectedKiosk, setSelectedKiosk] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const cutoff =
      selectedPeriod === "today"
        ? now - 24 * 60 * 60 * 1000
        : selectedPeriod === "7d"
          ? now - 7 * 24 * 60 * 60 * 1000
          : now - 30 * 24 * 60 * 60 * 1000;

    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt).getTime();
      const kioskMatch = selectedKiosk === "all" || order.kioskId === selectedKiosk;
      const statusMatch =
        selectedStatus === "all" || order.status === selectedStatus;
      const periodMatch =
        selectedPeriod === "all" ? true : createdAt >= cutoff;

      return kioskMatch && statusMatch && periodMatch;
    });
  }, [orders, selectedKiosk, selectedStatus, selectedPeriod]);

  function handleExportCsv() {
    const header = [
      "date",
      "kiosk_id",
      "nom_borne",
      "repas",
      "montant_eur",
      "statut",
    ];
    const rows = filteredOrders.map((order) => [
      order.createdAt,
      order.kioskId,
      order.kioskName,
      order.mealName,
      order.amountEur.toFixed(2),
      order.status,
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
    link.download = "featness-orders.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-featness-ink">Commandes</h2>
          <p className="text-sm text-featness-muted">
            Historique des ventes FEATNESS.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-featness-ink transition hover:border-featness-gold"
        >
          Exporter
        </button>
      </div>

      {showFilters ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
            value={selectedKiosk}
            onChange={(event) => setSelectedKiosk(event.target.value)}
          >
            <option value="all">Toutes les bornes</option>
            {kiosks.map((kiosk) => (
              <option key={kiosk.id} value={kiosk.id}>
                {kiosk.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
          <select
            className="rounded-2xl border border-black/10 px-4 py-3 text-sm"
            value={selectedPeriod}
            onChange={(event) => setSelectedPeriod(event.target.value)}
          >
            <option value="today">Aujourd&apos;hui</option>
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
          </select>
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-featness-muted">
            <tr className="border-b border-black/5">
              <th className="px-3 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Borne</th>
              <th className="px-3 py-3 font-medium">Utilisateur</th>
              <th className="px-3 py-3 font-medium">Repas</th>
              <th className="px-3 py-3 font-medium">Montant</th>
              <th className="px-3 py-3 font-medium">Statut</th>
              <th className="px-3 py-3 font-medium">Token</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} className="border-b border-black/5 last:border-0">
                <td className="px-3 py-3 text-featness-ink">
                  {new Date(order.createdAt).toLocaleString("fr-FR")}
                </td>
                <td className="px-3 py-3">{order.kioskName}</td>
                <td className="px-3 py-3">{order.userName}</td>
                <td className="px-3 py-3">{order.mealName}</td>
                <td className="px-3 py-3">{formatCurrency(order.amountEur)}</td>
                <td className="px-3 py-3 uppercase">{order.status}</td>
                <td className="px-3 py-3">{order.tokenStatus ?? "-"}</td>
              </tr>
            ))}
            {filteredOrders.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-featness-muted" colSpan={7}>
                  Aucune commande pour ce filtre.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
