import { cookies } from "next/headers";

import { NewKioskForm } from "@/components/new-kiosk-form";
import { requireOwner } from "@/lib/auth";

export default async function NewKioskPage() {
  await requireOwner(cookies());

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-3xl font-semibold text-featness-ink">
          Ajouter une borne
        </h1>
        <p className="mt-2 text-sm text-featness-muted">
          Enregistrez une nouvelle borne FEATNESS pour votre salle.
        </p>
      </header>

      <section className="max-w-3xl rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <NewKioskForm />
      </section>
    </div>
  );
}
