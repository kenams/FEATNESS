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
  const [selectedMeal, setSelectedMeal] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const mealOptions = useMemo(
    () =>
      Array.from(new Set(orders.map((order) => order.mealName)))
        .sort((left, right) => left.localeCompare(right)),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const cutoff =
      selectedPeriod === "today"
        ? now - 24 * 60 * 60 * 1000
        : selectedPeriod === "7d"
          ? now - 7 * 24 * 60 * 60 * 1000
          : now - 30 * 24 * 60 * 60 * 1000;
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const createdAt = new Date(order.createdAt).getTime();
      const kioskMatch = selectedKiosk === "all" || order.kioskId === selectedKiosk;
      const statusMatch =
        selectedStatus === "all" || order.status === selectedStatus;
      const mealMatch =
        selectedMeal === "all" || order.mealName === selectedMeal;
      const periodMatch =
        selectedPeriod === "all" ? true : createdAt >= cutoff;
      const searchMatch =
        normalizedSearch.length === 0 ||
        order.kioskName.toLowerCase().includes(normalizedSearch) ||
        order.userName.toLowerCase().includes(normalizedSearch) ||
        order.mealName.toLowerCase().includes(normalizedSearch) ||
        order.id.toLowerCase().includes(normalizedSearch);

      return kioskMatch && statusMatch && mealMatch && periodMatch && searchMatch;
    });
  }, [orders, searchTerm, selectedKiosk, selectedMeal, selectedPeriod, selectedStatus]);

  const paidRevenue = filteredOrders
    .filter((order) => order.status === "paid")
    .reduce((sum, order) => sum + order.amountEur, 0);
  const paidCount = filteredOrders.filter((order) => order.status === "paid").length;

  function handleExportCsv() {
    const header = [
      "order_id",
      "date",
      "kiosk_id",
      "nom_borne",
      "utilisateur",
      "repas",
      "montant_eur",
      "statut",
      "token_status",
    ];
    const rows = filteredOrders.map((order) => [
      order.id,
      order.createdAt,
      order.kioskId,
      order.kioskName,
      order.userName,
      order.mealName,
      order.amountEur.toFixed(2),
      order.status,
      order.tokenStatus ?? "",
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
    <div className="rounded-[30px] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,247,0.94))] p-6 shadow-[0_18px_55px_rgba(17,32,28,0.08)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-featness-gold">
            Transactions
          </p>
          <h2 className="mt-2 text-xl font-semibold text-featness-ink">Commandes</h2>
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

      <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <div className="rounded-[22px] bg-[#f8faf9] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            Commandes filtrees
          </p>
          <p className="mt-2 text-2xl font-semibold text-featness-ink">
            {filteredOrders.length}
          </p>
        </div>
        <div className="rounded-[22px] bg-[#f8faf9] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            Commandes payees
          </p>
          <p className="mt-2 text-2xl font-semibold text-featness-ink">{paidCount}</p>
        </div>
        <div className="rounded-[22px] bg-[#f8faf9] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            CA filtre
          </p>
          <p className="mt-2 text-2xl font-semibold text-featness-ink">
            {formatCurrency(paidRevenue)}
          </p>
        </div>
        <div className="rounded-[22px] bg-[#f8faf9] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            Recherche active
          </p>
          <p className="mt-2 truncate text-sm font-medium text-featness-ink">
            {searchTerm.trim() || "Aucune"}
          </p>
        </div>
      </div>

      {showFilters ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Rechercher une commande, un repas, un client..."
            className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
          />
          <select
            className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
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
            className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
          >
            <option value="all">Tous les statuts</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <select
            className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
            value={selectedMeal}
            onChange={(event) => setSelectedMeal(event.target.value)}
          >
            <option value="all">Tous les repas</option>
            {mealOptions.map((mealName) => (
              <option key={mealName} value={mealName}>
                {mealName}
              </option>
            ))}
          </select>
          <select
            className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
            value={selectedPeriod}
            onChange={(event) => setSelectedPeriod(event.target.value)}
          >
            <option value="today">Aujourd&apos;hui</option>
            <option value="7d">7 jours</option>
            <option value="30d">30 jours</option>
          </select>
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto rounded-[24px] border border-black/5 bg-white/70">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f7faf8] text-featness-muted">
            <tr className="border-b border-black/5">
              <th className="px-4 py-4 font-medium">Date</th>
              <th className="px-4 py-4 font-medium">Borne</th>
              <th className="px-4 py-4 font-medium">Utilisateur</th>
              <th className="px-4 py-4 font-medium">Repas</th>
              <th className="px-4 py-4 font-medium">Montant</th>
              <th className="px-4 py-4 font-medium">Statut</th>
              <th className="px-4 py-4 font-medium">Token</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} className="border-b border-black/5 last:border-0 hover:bg-[#f8faf9]">
                <td className="px-4 py-4 text-featness-ink">
                  {new Date(order.createdAt).toLocaleString("fr-FR")}
                </td>
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    <span className="font-medium text-featness-ink">{order.kioskName}</span>
                    <span className="text-xs text-featness-muted">{order.kioskId}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-featness-ink">{order.userName}</td>
                <td className="px-4 py-4 text-featness-ink">{order.mealName}</td>
                <td className="px-4 py-4 font-medium text-featness-ink">{formatCurrency(order.amountEur)}</td>
                <td className="px-4 py-4 uppercase">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    order.status === "paid"
                      ? "bg-emerald-100 text-emerald-700"
                      : order.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : order.status === "refunded"
                          ? "bg-slate-200 text-slate-700"
                          : "bg-amber-100 text-amber-700"
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-[#f4f7f5] px-3 py-1 text-xs font-medium text-featness-muted">
                    {order.tokenStatus ?? "-"}
                  </span>
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-featness-muted" colSpan={7}>
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
