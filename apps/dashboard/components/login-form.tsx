"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe requis"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const supabase = getSupabaseBrowserClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword(values);

      if (error) {
        setErrorMessage("Email ou mot de passe incorrect");
        return;
      }

      router.push("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp(values);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    setSuccessMessage(
      "Compte cree. Connectez-vous pour acceder a votre espace FEATNESS.",
    );
    setMode("signin");
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-4 rounded-[28px] bg-white p-8 shadow-[0_24px_80px_rgba(12,20,18,0.08)]"
    >
      <div className="grid gap-3">
        <div className="inline-flex rounded-full bg-[#eff3f1] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === "signin"
                ? "bg-featness-ink text-white"
                : "text-featness-muted"
            }`}
          >
            Connexion
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === "signup"
                ? "bg-featness-ink text-white"
                : "text-featness-muted"
            }`}
          >
            Creer un compte
          </button>
        </div>

        <p className="text-sm text-featness-muted">
          {mode === "signin"
            ? "Connectez-vous a votre espace FEATNESS."
            : "Creer un compte utilisateur pour tester le parcours FEATNESS."}
        </p>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-featness-ink" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          {...register("email")}
          className="rounded-2xl border border-black/10 px-4 py-3 outline-none ring-0 transition focus:border-featness-gold"
          placeholder="hello@featness.app"
        />
        {errors.email ? (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-featness-ink" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          {...register("password")}
          className="rounded-2xl border border-black/10 px-4 py-3 outline-none ring-0 transition focus:border-featness-gold"
          placeholder="********"
        />
        {errors.password ? (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        ) : null}
      </div>

      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
      {successMessage ? (
        <p className="text-sm text-emerald-700">{successMessage}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-featness-gold px-5 py-3 text-sm font-semibold text-featness-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? "Chargement..."
          : mode === "signin"
            ? "Se connecter"
            : "Creer mon compte"}
      </button>
    </form>
  );
}
