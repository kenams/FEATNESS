"use client";

import { useState } from "react";

import type { DrinkBlendRecord } from "@/lib/dashboard-shared";

type MenuAvailabilityListProps = {
  meals: DrinkBlendRecord[];
};

function getPreparationType(slug: string): string {
  if (slug.includes("recovery")) {
    return "Auto-chauffant";
  }

  if (slug.includes("endurance")) {
    return "Lyophilise";
  }

  return "Assemblage sec";
}

function getMacroSummary(slug: string): string {
  if (slug.includes("recovery")) {
    return "340 kcal / 28 P / 35 G / 8 L";
  }

  if (slug.includes("endurance")) {
    return "290 kcal / 14 P / 44 G / 6 L";
  }

  return "180 kcal / 12 P / 18 G / 4 L";
}

export function MenuAvailabilityList({ meals }: MenuAvailabilityListProps) {
  const [items, setItems] = useState(meals);

  async function toggleAvailability(mealId: string, nextValue: boolean) {
    setItems((current) =>
      current.map((meal) =>
        meal.id === mealId ? { ...meal, isAvailable: nextValue } : meal,
      ),
    );

    const response = await fetch(`/api/menu/${encodeURIComponent(mealId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isAvailable: nextValue }),
    });

    if (!response.ok) {
      setItems((current) =>
        current.map((meal) =>
          meal.id === mealId ? { ...meal, isAvailable: !nextValue } : meal,
        ),
      );
    }
  }

  return (
    <div className="grid gap-4">
      {items.map((meal) => (
        <article
          key={meal.id}
          className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-featness-ink">{meal.name}</h2>
              <p className="mt-1 text-sm text-featness-muted">{meal.description}</p>
            </div>
            <label className="inline-flex items-center gap-3 text-sm font-medium text-featness-ink">
              <span>{meal.isAvailable ? "Disponible" : "Indisponible"}</span>
              <input
                type="checkbox"
                checked={meal.isAvailable}
                onChange={(event) =>
                  void toggleAvailability(meal.id, event.target.checked)
                }
                className="h-5 w-5 accent-[#c9a646]"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-featness-muted md:grid-cols-3">
            <p>Preparation : {getPreparationType(meal.slug)}</p>
            <p>Macros : {getMacroSummary(meal.slug)}</p>
            <p>Prix : {meal.priceEur.toFixed(2)} €</p>
          </div>
        </article>
      ))}
    </div>
  );
}
