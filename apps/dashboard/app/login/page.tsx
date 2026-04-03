import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getOwnerSessionOrNull } from "@/lib/auth";

export default async function LoginPage() {
  const ownerContext = await getOwnerSessionOrNull(cookies());

  if (ownerContext) {
    redirect("/overview");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f0] px-4">
      <section className="grid w-full max-w-md gap-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-featness-gold">FEATNESS</p>
          <h1 className="mt-3 text-4xl font-semibold text-featness-ink">Dashboard B2B</h1>
          <p className="mt-3 text-sm text-featness-muted">
            Connexion reservee aux comptes gérants FEATNESS.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
