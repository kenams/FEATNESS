"use client";

import { useMemo, useState } from "react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGoal, setSelectedGoal] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return items.filter((meal) => {
      const searchMatch =
        normalizedSearch.length === 0 ||
        meal.name.toLowerCase().includes(normalizedSearch) ||
        meal.description.toLowerCase().includes(normalizedSearch) ||
        meal.slug.toLowerCase().includes(normalizedSearch);
      const goalMatch = selectedGoal === "all" || meal.targetGoal === selectedGoal;
      const availabilityMatch =
        selectedAvailability === "all" ||
        (selectedAvailability === "available" ? meal.isAvailable : !meal.isAvailable);

      return searchMatch && goalMatch && availabilityMatch;
    });
  }, [items, searchTerm, selectedAvailability, selectedGoal]);

  const availableCount = filteredItems.filter((meal) => meal.isAvailable).length;

  async function handleBulkAvailability(nextValue: boolean) {
    if (filteredItems.length === 0) {
      return;
    }

    setErrorMessage(null);
    const mealIds = filteredItems.map((meal) => meal.id);
    const previousItems = items;
    setItems((current) =>
      current.map((meal) =>
        mealIds.includes(meal.id) ? { ...meal, isAvailable: nextValue } : meal,
      ),
    );

    const response = await fetch("/api/menu/bulk", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mealIds, isAvailable: nextValue }),
    });

    if (!response.ok) {
      setItems(previousItems);
      setErrorMessage("La mise a jour en masse du menu a echoue. Reessayez.");
    }
  }

  function handleExportCsv() {
    const header = [
      "meal_id",
      "slug",
      "name",
      "target_goal",
      "price_eur",
      "is_available",
    ];
    const rows = filteredItems.map((meal) => [
      meal.id,
      meal.slug,
      meal.name,
      meal.targetGoal,
      meal.priceEur.toFixed(2),
      meal.isAvailable ? "yes" : "no",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "featness-menu.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function toggleAvailability(mealId: string, nextValue: boolean) {
    setErrorMessage(null);
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
      setErrorMessage("La mise a jour du menu a echoue. Reessayez.");
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        {[
          ["Repas filtres", String(filteredItems.length)],
          ["Disponibles", String(availableCount)],
          ["Suspendus", String(filteredItems.length - availableCount)],
          ["Recherche active", searchTerm.trim() || "Aucune"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,247,0.94))] px-4 py-4 shadow-[0_16px_40px_rgba(17,32,28,0.06)]"
          >
            <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
              {label}
            </p>
            <p className="mt-2 truncate text-2xl font-semibold text-featness-ink">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Rechercher un repas, une recette, un slug..."
          className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
        />
        <select
          value={selectedGoal}
          onChange={(event) => setSelectedGoal(event.target.value)}
          className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
        >
          <option value="all">Tous les objectifs</option>
          {Array.from(new Set(items.map((meal) => meal.targetGoal)))
            .sort((left, right) => left.localeCompare(right))
            .map((goal) => (
              <option key={goal} value={goal}>
                {goal}
              </option>
            ))}
        </select>
        <select
          value={selectedAvailability}
          onChange={(event) => setSelectedAvailability(event.target.value)}
          className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
        >
          <option value="all">Tous les statuts</option>
          <option value="available">Disponibles</option>
          <option value="unavailable">Suspendus</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleBulkAvailability(true)}
          className="rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm font-medium text-featness-ink transition hover:border-featness-gold"
        >
          Activer les repas filtres
        </button>
        <button
          type="button"
          onClick={() => void handleBulkAvailability(false)}
          className="rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm font-medium text-featness-ink transition hover:border-featness-gold"
        >
          Suspendre les repas filtres
        </button>
        <button
          type="button"
          onClick={handleExportCsv}
          className="rounded-full border border-black/10 bg-white/90 px-4 py-2 text-sm font-medium text-featness-ink transition hover:border-featness-gold"
        >
          Exporter CSV
        </button>
      </div>

      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

      {filteredItems.map((meal) => (
        <article
          key={meal.id}
          className="rounded-[28px] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,248,0.94))] p-5 shadow-[0_18px_46px_rgba(17,32,28,0.06)]"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-featness-gold">
                {meal.targetGoal}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-featness-ink">{meal.name}</h2>
              <p className="mt-1 text-sm text-featness-muted">{meal.description}</p>
            </div>
            <label className="inline-flex items-center gap-3 rounded-full bg-[#f8faf9] px-3 py-2 text-sm font-medium text-featness-ink">
              <span>{meal.isAvailable ? "Disponible" : "Indisponible"}</span>
              <input
                type="checkbox"
                checked={meal.isAvailable}
                onChange={(event) => void toggleAvailability(meal.id, event.target.checked)}
                className="h-5 w-5 accent-[#c9a646]"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-featness-muted md:grid-cols-3">
            <p>Preparation : {getPreparationType(meal.slug)}</p>
            <p>Macros : {getMacroSummary(meal.slug)}</p>
            <p>Prix : {meal.priceEur.toFixed(2)} EUR</p>
          </div>
        </article>
      ))}

      {filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/10 bg-white p-8 text-sm text-featness-muted">
          Aucun repas ne correspond aux filtres actifs.
        </div>
      ) : null}
    </div>
  );
}
