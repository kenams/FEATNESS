import { cookies } from "next/headers";

import { OrdersTable } from "@/components/orders-table";
import { requireOwner } from "@/lib/auth";
import { enrichOrders, getOwnerKiosks, getOwnerPayments } from "@/lib/data";

export default async function OrdersPage() {
  const { profile } = await requireOwner(cookies());
  const kiosks = await getOwnerKiosks(profile.id);
  const payments = await getOwnerPayments(profile.id, 200);
  const orders = await enrichOrders(payments, kiosks);

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-featness-ink">Commandes</h1>
        <p className="mt-2 text-sm text-featness-muted">
          Toutes les commandes de vos bornes FEATNESS avec export CSV.
        </p>
      </header>

      <OrdersTable orders={orders} kiosks={kiosks} />
    </div>
  );
}
