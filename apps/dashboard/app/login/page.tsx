import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getAuthenticatedContextOrNull, getDefaultAppPath } from "@/lib/auth";

export default async function LoginPage() {
  const context = await getAuthenticatedContextOrNull(cookies());

  if (context) {
    redirect(getDefaultAppPath(context.profile.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef2f0] px-4">
      <section className="grid w-full max-w-md gap-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.32em] text-featness-gold">
            FEATNESS
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-featness-ink">
            Espace FEATNESS
          </h1>
          <p className="mt-3 text-sm text-featness-muted">
            Utilisateur ou gerant, connectez-vous au meme environnement FEATNESS.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
