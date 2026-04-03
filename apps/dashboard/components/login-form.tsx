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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    const { error } = await supabase.auth.signInWithPassword(values);

    if (error) {
      setErrorMessage("Email ou mot de passe incorrect");
      return;
    }

    router.push("/overview");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-4 rounded-[28px] bg-white p-8 shadow-[0_24px_80px_rgba(12,20,18,0.08)]"
    >
      <div className="grid gap-2">
        <label className="text-sm font-medium text-featness-ink" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          {...register("email")}
          className="rounded-2xl border border-black/10 px-4 py-3 outline-none ring-0 transition focus:border-featness-gold"
          placeholder="owner@featness.app"
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
          placeholder="••••••••"
        />
        {errors.password ? (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        ) : null}
      </div>

      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-featness-gold px-5 py-3 text-sm font-semibold text-featness-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
