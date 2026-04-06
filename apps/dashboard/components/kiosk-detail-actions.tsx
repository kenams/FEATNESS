"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type KioskDetailActionsProps = {
  kioskId: string;
  initialStock: number;
  initialStockAlertThreshold: number;
  initialIsActive: boolean;
};

export function KioskDetailActions({
  kioskId,
  initialStock,
  initialStockAlertThreshold,
  initialIsActive,
}: KioskDetailActionsProps) {
  const router = useRouter();
  const [stockUnits, setStockUnits] = useState(initialStock);
  const [stockAlertThreshold, setStockAlertThreshold] = useState(initialStockAlertThreshold);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function updateKiosk(payload: {
    stockUnits?: number;
    stockAlertThreshold?: number;
    isActive?: boolean;
  }) {
    setIsSaving(true);
    setErrorMessage(null);

    const response = await fetch(`/api/kiosks/${encodeURIComponent(kioskId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setErrorMessage(body.error ?? "Mise a jour impossible");
      setIsSaving(false);
      return false;
    }

    router.refresh();
    setIsSaving(false);
    return true;
  }

  async function handleSaveStock() {
    await updateKiosk({ stockUnits, stockAlertThreshold });
  }

  async function handleToggleActive() {
    if (!window.confirm("Confirmer la mise a jour du statut de cette borne ?")) {
      return;
    }

    const nextValue = !isActive;
    const success = await updateKiosk({ isActive: nextValue });

    if (success) {
      setIsActive(nextValue);
    }
  }

  return (
    <div className="grid gap-5 rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#f6f8f7_100%)] p-6 shadow-[0_18px_60px_rgba(16,24,22,0.08)]">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-featness-gold">
          Parametres operationnels
        </p>
        <h2 className="mt-2 text-xl font-semibold text-featness-ink">
          Stock et seuil d&apos;alerte
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[140px_180px_auto] md:items-end">
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.18em] text-featness-muted">
              Stock
            </label>
            <input
              type="number"
              value={stockUnits}
              min={0}
              onChange={(event) => setStockUnits(Number(event.target.value))}
              className="rounded-[20px] border border-[#dfe7e2] bg-white px-4 py-3 text-featness-ink outline-none transition focus:border-featness-gold"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs uppercase tracking-[0.18em] text-featness-muted">
              Seuil d'alerte
            </label>
            <input
              type="number"
              value={stockAlertThreshold}
              min={0}
              onChange={(event) => setStockAlertThreshold(Number(event.target.value))}
              className="rounded-[20px] border border-[#dfe7e2] bg-white px-4 py-3 text-featness-ink outline-none transition focus:border-featness-gold"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSaveStock()}
            disabled={isSaving}
            className="rounded-full bg-[linear-gradient(135deg,#e3c86e_0%,#c9a646_100%)] px-5 py-3 text-sm font-semibold text-featness-ink shadow-[0_12px_24px_rgba(201,166,70,0.28)] transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            Sauvegarder
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#dfe7e2] bg-white px-5 py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            Controle de la borne
          </p>
          <p className="mt-2 text-sm font-medium text-featness-ink">
            {isActive ? "Borne active" : "Borne desactivee"}
          </p>
          <p className="text-sm text-featness-muted">
            Active ou stoppee manuellement pour maintenance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleToggleActive()}
          disabled={isSaving}
          className={`rounded-full px-5 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 ${
            isActive
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          } disabled:opacity-60`}
        >
          {isActive ? "Desactiver la borne" : "Reactiver la borne"}
        </button>
      </div>

      {errorMessage ? (
        <p className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
