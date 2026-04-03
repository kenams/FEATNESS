"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type KioskDetailActionsProps = {
  kioskId: string;
  initialStock: number;
  initialIsActive: boolean;
};

export function KioskDetailActions({
  kioskId,
  initialStock,
  initialIsActive,
}: KioskDetailActionsProps) {
  const router = useRouter();
  const [stockUnits, setStockUnits] = useState(initialStock);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function updateKiosk(payload: {
    stockUnits?: number;
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
    await updateKiosk({ stockUnits });
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
    <div className="grid gap-4 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-featness-muted">Stock actuel</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="number"
            value={stockUnits}
            min={0}
            onChange={(event) => setStockUnits(Number(event.target.value))}
            className="w-32 rounded-2xl border border-black/10 px-4 py-3"
          />
          <button
            type="button"
            onClick={() => void handleSaveStock()}
            disabled={isSaving}
            className="rounded-full bg-featness-gold px-4 py-2 text-sm font-semibold text-featness-ink disabled:opacity-60"
          >
            Sauvegarder
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-black/5 bg-[#f8faf9] px-4 py-4">
        <div>
          <p className="text-sm font-medium text-featness-ink">
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
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            isActive
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          } disabled:opacity-60`}
        >
          {isActive ? "Desactiver la borne" : "Reactiver la borne"}
        </button>
      </div>

      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
