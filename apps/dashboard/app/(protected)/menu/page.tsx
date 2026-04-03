import { cookies } from "next/headers";

import { MenuAvailabilityList } from "@/components/menu-availability-list";
import { requireOwner } from "@/lib/auth";
import { getDrinkBlends } from "@/lib/data";

export default async function MenuPage() {
  await requireOwner(cookies());
  const meals = await getDrinkBlends();

  return (
    <div className="grid gap-6">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold text-featness-ink">Menu</h1>
        <p className="text-sm text-featness-muted">
          Activez ou suspendez les repas FEATNESS disponibles sur vos bornes.
        </p>
        <p className="text-sm text-featness-muted">
          Pour ajouter un repas, contactez l&apos;equipe FEATNESS.
        </p>
      </header>

      <MenuAvailabilityList meals={meals} />
    </div>
  );
}
