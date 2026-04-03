"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const kioskSchema = z.object({
  name: z.string().min(2, "Nom requis"),
  kioskId: z
    .string()
    .regex(/^[A-Z0-9-]+$/, "Majuscules, chiffres et tirets uniquement"),
  locationAddress: z.string().min(2, "Adresse requise"),
  locationCity: z.string().min(2, "Ville requise"),
  stockUnits: z.coerce.number().int().min(0),
  stockAlertThreshold: z.coerce.number().int().min(0),
});

type KioskFormValues = z.infer<typeof kioskSchema>;

export function NewKioskForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<KioskFormValues>({
    resolver: zodResolver(kioskSchema),
    defaultValues: {
      name: "",
      kioskId: "",
      locationAddress: "",
      locationCity: "",
      stockUnits: 50,
      stockAlertThreshold: 10,
    },
  });

  async function onSubmit(values: KioskFormValues) {
    setErrorMessage(null);
    const response = await fetch("/api/kiosks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    const body = (await response.json()) as { kioskId?: string; error?: string };

    if (!response.ok || !body.kioskId) {
      setErrorMessage(body.error ?? "Creation impossible");
      return;
    }

    router.push(`/admin/kiosks/${body.kioskId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5">
      <div className="grid gap-2">
        <label className="text-sm font-medium">Nom de la borne</label>
        <input
          {...register("name")}
          className="rounded-2xl border border-black/10 px-4 py-3"
          placeholder="Sport 2000 Paris 17e"
        />
        {errors.name ? <p className="text-sm text-red-600">{errors.name.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Identifiant physique</label>
        <input
          {...register("kioskId")}
          className="rounded-2xl border border-black/10 px-4 py-3 font-mono uppercase"
          placeholder="KIOSK-PARIS-SPORT2000-01"
        />
        {errors.kioskId ? <p className="text-sm text-red-600">{errors.kioskId.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Adresse</label>
        <input
          {...register("locationAddress")}
          className="rounded-2xl border border-black/10 px-4 py-3"
          placeholder="12 rue des Batignolles"
        />
        {errors.locationAddress ? (
          <p className="text-sm text-red-600">{errors.locationAddress.message}</p>
        ) : null}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="grid gap-2">
          <label className="text-sm font-medium">Ville</label>
          <input
            {...register("locationCity")}
            className="rounded-2xl border border-black/10 px-4 py-3"
            placeholder="Paris"
          />
          {errors.locationCity ? (
            <p className="text-sm text-red-600">{errors.locationCity.message}</p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Stock initial</label>
          <input
            type="number"
            {...register("stockUnits")}
            className="rounded-2xl border border-black/10 px-4 py-3"
          />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Seuil d'alerte</label>
          <input
            type="number"
            {...register("stockAlertThreshold")}
            className="rounded-2xl border border-black/10 px-4 py-3"
          />
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-featness-gold px-5 py-3 text-sm font-semibold text-featness-ink disabled:opacity-60"
      >
        {isSubmitting ? "Creation..." : "Creer la borne"}
      </button>
    </form>
  );
}
