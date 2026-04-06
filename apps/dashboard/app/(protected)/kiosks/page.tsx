import Link from "next/link";
import { cookies } from "next/headers";

import { KiosksGrid } from "@/components/kiosks-grid";
import { requireOwner } from "@/lib/auth";
import { getOwnerKiosks, getOwnerPayments } from "@/lib/data";

export default async function KiosksPage() {
  const { profile } = await requireOwner(cookies());
  const kiosks = await getOwnerKiosks(profile.id);
  const payments = await getOwnerPayments(profile.id, 500);
  const today = new Date().toISOString().slice(0, 10);
  const revenueByKiosk = new Map<string, number>();

  for (const payment of payments) {
    if (payment.status !== "paid" || payment.paidAt?.slice(0, 10) !== today) {
      continue;
    }

    revenueByKiosk.set(
      payment.kioskId,
      (revenueByKiosk.get(payment.kioskId) ?? 0) + payment.amountEur,
    );
  }

  const revenueByKioskObject = Object.fromEntries(revenueByKiosk.entries());

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-featness-ink">Bornes</h1>
          <p className="text-sm text-featness-muted">
            Statut, stock et revenus de vos kiosks FEATNESS.
          </p>
        </div>
        <Link
          href="/admin/kiosks/new"
          className="rounded-full bg-featness-gold px-5 py-3 text-sm font-semibold text-featness-ink"
        >
          Ajouter une borne
        </Link>
      </header>

      {kiosks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/10 bg-white p-8 text-sm text-featness-muted">
          Aucune borne pour ce compte. Creez votre premiere borne FEATNESS.
        </div>
      ) : (
        <KiosksGrid kiosks={kiosks} revenueByKiosk={revenueByKioskObject} />
      )}
    </div>
  );
}
