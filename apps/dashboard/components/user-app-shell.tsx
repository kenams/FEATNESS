"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import type { Session } from "@supabase/supabase-js";

import {
  buildNutritionRecommendation,
  buildWorkoutRecoveryInsight,
  buildSessionSuggestions,
  calculateBmi,
  isExpired,
  rankMealsForWorkout,
  type DispenseTokenRecord,
  type GoalKey,
  type PrimaryObjectiveKey,
  type SessionSuggestion,
  type UserProfile,
  type UserWorkoutInput,
  type WorkoutSessionRecord,
} from "@featness/shared";

import type { DashboardProfile, DrinkBlendRecord } from "@/lib/dashboard-shared";
import { formatCurrency } from "@/lib/dashboard-shared";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  clearSelectedMealChoice,
  cancelActiveTokens,
  createDispenseToken,
  createWorkoutSession,
  fetchActiveToken,
  fetchAvailableDrinkBlends,
  fetchProfile,
  fetchWorkoutHistory,
  saveProfile,
  saveSelectedMealChoice,
  saveUserPreferences,
} from "@/lib/user-data";

type UserAppShellProps = {
  initialProfile: DashboardProfile;
};

type SuggestedMeal = DrinkBlendRecord & {
  rank: number;
  score: number;
  fitLabel: "ideal" | "solide" | "leger";
  fitReason: string;
  fitChips: string[];
  isRecommended: boolean;
};

const OBJECTIVE_LABELS: Record<PrimaryObjectiveKey, string> = {
  lose_weight: "Perdre du poids",
  maintain: "Rester en forme",
  gain_muscle: "Prendre du muscle",
  improve_endurance: "Ameliorer l'endurance",
};

const GOAL_LABELS: Record<GoalKey, string> = {
  hydration: "Hydratation",
  recovery: "Recuperation",
  performance: "Performance",
};

function formatRemaining(token: DispenseTokenRecord): string {
  if (isExpired(token.expiresAt)) {
    return "Expire";
  }

  const minutes = Math.max(
    0,
    Math.ceil((new Date(token.expiresAt).getTime() - Date.now()) / 60_000),
  );

  return `${minutes} min restantes`;
}

function getEffortLabel(category: DrinkBlendRecord["effortCategory"]): string {
  switch (category) {
    case "light":
      return "Effort leger";
    case "medium":
      return "Effort moyen";
    case "intense":
      return "Effort intense";
    default:
      return "Effort";
  }
}

function groupMealsByEffort(meals: SuggestedMeal[]) {
  return {
    light: meals.filter((meal) => meal.effortCategory === "light"),
    medium: meals.filter((meal) => meal.effortCategory === "medium"),
    intense: meals.filter((meal) => meal.effortCategory === "intense"),
  };
}

function getFitBadgeMeta(label: SuggestedMeal["fitLabel"]) {
  switch (label) {
    case "ideal":
      return {
        text: "Meilleur choix",
        className: "bg-featness-gold/15 text-featness-gold border border-featness-gold/30",
      };
    case "solide":
      return {
        text: "Bon choix",
        className: "bg-sky-100 text-sky-700 border border-sky-200",
      };
    case "leger":
    default:
      return {
        text: "Plus leger",
        className: "bg-slate-100 text-slate-700 border border-slate-200",
      };
  }
}

function getQuickStatus(
  hasSession: boolean,
  hasOnboarding: boolean,
  hasSelectedMeal: boolean,
  hasQr: boolean,
): string {
  if (!hasOnboarding) {
    return "Complete ta fiche sante. FEATNESS pourra ensuite te proposer les bonnes seances.";
  }

  if (!hasSession) {
    return "Choisis une seance suggeree pour obtenir directement ton plat recommande.";
  }

  if (!hasSelectedMeal) {
    return "Tes 3 plats sont prets. Choisis simplement celui que tu veux.";
  }

  if (!hasQr) {
    return "Ton plat est choisi. Le QR est secondaire et peut etre genere ensuite si besoin.";
  }

  return "Ton plat est choisi et ton QR est pret.";
}

function getFeedbackTone(
  message: string | null,
): "neutral" | "success" | "warning" {
  if (!message) {
    return "neutral";
  }

  const lowered = message.toLowerCase();

  if (
    lowered.includes("impossible") ||
    lowered.includes("erreur") ||
    lowered.includes("manquant")
  ) {
    return "warning";
  }

  return "success";
}

export function UserAppShell({ initialProfile }: UserAppShellProps) {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<WorkoutSessionRecord[]>([]);
  const [activeToken, setActiveToken] = useState<DispenseTokenRecord | null>(null);
  const [activeSession, setActiveSession] = useState<WorkoutSessionRecord | null>(null);
  const [meals, setMeals] = useState<DrinkBlendRecord[]>([]);
  const [age, setAge] = useState("");
  const [weightKg, setWeightKg] = useState("78");
  const [heightCm, setHeightCm] = useState("");
  const [primaryObjective, setPrimaryObjective] =
    useState<PrimaryObjectiveKey>("lose_weight");
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const suggestedSessions = useMemo(
    () =>
      Number(age) > 0 && Number(weightKg) > 0 && Number(heightCm) > 0
        ? buildSessionSuggestions({
            age: Number(age),
            weightKg: Number(weightKg),
            heightCm: Number(heightCm),
            primaryObjective,
          })
        : [],
    [age, heightCm, primaryObjective, weightKg],
  );

  const bmiInsight = useMemo(
    () => calculateBmi(Number(weightKg) || 0, Number(heightCm) || 0),
    [heightCm, weightKg],
  );

  const sessionInsight = useMemo(
    () =>
      activeSession
        ? buildWorkoutRecoveryInsight(
            activeSession.workout,
            profile?.primaryObjective ?? primaryObjective,
          )
        : null,
    [activeSession, primaryObjective, profile?.primaryObjective],
  );

  const rankedMeals = useMemo(() => {
    if (!activeSession) {
      return [];
    }

    return rankMealsForWorkout(
      meals,
      activeSession.workout,
      profile?.primaryObjective ?? primaryObjective,
      activeSession.recommendation.recommendedBlend,
    );
  }, [activeSession, meals, primaryObjective, profile?.primaryObjective]);
  const suggestedMeals = useMemo(() => rankedMeals.slice(0, 3), [rankedMeals]);

  const selectedMeal = useMemo(
    () =>
      rankedMeals.find((meal) => meal.id === selectedMealId) ??
      suggestedMeals[0] ??
      rankedMeals[0] ??
      null,
    [rankedMeals, selectedMealId, suggestedMeals],
  );

  const hasOnboarding = Boolean(profile?.onboardingCompleted);
  const hasSelectedMeal = Boolean(activeSession?.selectedMealBlendId);
  const canAccessAdmin =
    initialProfile.role === "owner" || initialProfile.role === "admin";
  const feedbackTone = getFeedbackTone(feedbackMessage);
  const journeySteps = useMemo(
    () => [
      {
        key: "health",
        label: "Profil",
        status: hasOnboarding ? "done" : "current",
      },
      {
        key: "session",
        label: "Seance",
        status: !hasOnboarding
          ? "upcoming"
          : activeSession
            ? "done"
            : "current",
      },
      {
        key: "meal",
        label: "Plat",
        status: !hasOnboarding || !activeSession
          ? "upcoming"
          : hasSelectedMeal
            ? "done"
            : "current",
      },
      {
        key: "qr",
        label: "QR",
        status: !hasSelectedMeal ? "upcoming" : activeToken ? "done" : "current",
      },
    ],
    [activeSession, activeToken, hasOnboarding, hasSelectedMeal],
  );

  const mealNamesById = useMemo(
    () => Object.fromEntries(meals.map((meal) => [meal.id, meal.name])) as Record<string, string>,
    [meals],
  );
  const recommendedMealIds = useMemo(
    () => new Set(suggestedMeals.map((meal) => meal.id)),
    [suggestedMeals],
  );
  const visibleRecommendedMeals = useMemo(
    () => suggestedMeals.filter((meal) => meal.id !== selectedMeal?.id),
    [selectedMeal?.id, suggestedMeals],
  );
  const visibleOtherMeals = useMemo(
    () => rankedMeals.filter((meal) => meal.id !== selectedMeal?.id && !recommendedMealIds.has(meal.id)),
    [rankedMeals, recommendedMealIds, selectedMeal?.id],
  );
  const recommendedGroups = useMemo(
    () => groupMealsByEffort(visibleRecommendedMeals),
    [visibleRecommendedMeals],
  );
  const otherGroups = useMemo(() => groupMealsByEffort(visibleOtherMeals), [visibleOtherMeals]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const currentUser = session?.user;

    if (!currentUser) {
      return;
    }

    const authenticatedUser = currentUser;
    let cancelled = false;

    async function loadRuntimeData() {
      try {
        const [nextProfile, nextHistory, nextToken, nextMeals] = await Promise.all([
          fetchProfile(supabase, authenticatedUser),
          fetchWorkoutHistory(supabase, authenticatedUser.id),
          fetchActiveToken(supabase, authenticatedUser.id),
          fetchAvailableDrinkBlends(supabase),
        ]);

        if (cancelled) {
          return;
        }

        const nextActiveSession =
          nextToken && !isExpired(nextToken.expiresAt)
            ? nextHistory.find((item) => item.id === nextToken.sessionId) ?? null
            : nextHistory[0] ?? null;

        setProfile(nextProfile);
        setMeals(nextMeals);
        setAge(nextProfile?.age ? String(nextProfile.age) : "");
        setWeightKg(String(nextProfile?.weightKg ?? 78));
        setHeightCm(nextProfile?.heightCm ? String(nextProfile.heightCm) : "");
        setPrimaryObjective(nextProfile?.primaryObjective ?? "lose_weight");
        setHistory(nextHistory);
        setActiveToken(nextToken && !isExpired(nextToken.expiresAt) ? nextToken : null);
        setActiveSession(nextActiveSession);
        setSelectedMealId(nextActiveSession?.selectedMealBlendId ?? null);
      } catch (error) {
        if (!cancelled) {
          setFeedbackMessage(
            error instanceof Error ? error.message : "Chargement FEATNESS impossible.",
          );
        }
      }
    }

    void loadRuntimeData();

    const sessionsChannel = supabase
      .channel(`web-sessions-${authenticatedUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workout_sessions",
          filter: `user_id=eq.${authenticatedUser.id}`,
        },
        async () => {
          const nextHistory = await fetchWorkoutHistory(supabase, authenticatedUser.id);
          setHistory(nextHistory);
          setActiveSession((previousSession) =>
            previousSession
              ? nextHistory.find((item) => item.id === previousSession.id) ?? previousSession
              : nextHistory[0] ?? null,
          );
        },
      )
      .subscribe();

    const tokensChannel = supabase
      .channel(`web-tokens-${authenticatedUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dispense_tokens",
          filter: `user_id=eq.${authenticatedUser.id}`,
        },
        async () => {
          const nextToken = await fetchActiveToken(supabase, authenticatedUser.id);
          setActiveToken(nextToken && !isExpired(nextToken.expiresAt) ? nextToken : null);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(sessionsChannel);
      void supabase.removeChannel(tokensChannel);
    };
  }, [session?.user?.id, supabase]);

  useEffect(() => {
    if (!activeSession || meals.length === 0) {
      setSelectedMealId(null);
      return;
    }

    setSelectedMealId((current) => {
      if (current && meals.some((meal) => meal.id === current)) {
        return current;
      }

      if (
        activeSession.selectedMealBlendId &&
        meals.some((meal) => meal.id === activeSession.selectedMealBlendId)
      ) {
        return activeSession.selectedMealBlendId;
      }

      return suggestedMeals[0]?.id ?? null;
    });
  }, [activeSession?.id, activeSession?.selectedMealBlendId, meals, suggestedMeals]);

  async function handleSaveProfile() {
    if (!session?.user) {
      return;
    }

    if (Number(age) <= 0 || Number(weightKg) <= 0 || Number(heightCm) <= 0) {
      setFeedbackMessage("Renseigne age, poids et taille pour continuer.");
      return;
    }

    setIsBusy(true);
    setFeedbackMessage(null);

    try {
      const nextProfile = await saveProfile(supabase, session.user.id, {
        email: session.user.email ?? "",
        fullName: profile?.fullName ?? initialProfile.fullName ?? "",
        age: Number(age),
        weightKg: Number(weightKg) || 0,
        heightCm: Number(heightCm) || 0,
        primaryObjective,
        gymName: profile?.gymName ?? "",
      });

      setProfile(nextProfile);
      setFeedbackMessage("Fiche sante enregistree. Tu peux maintenant choisir une seance.");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer le profil.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleStartSuggestedSession(suggestion: SessionSuggestion) {
    if (!session?.user || !profile?.onboardingCompleted) {
      setFeedbackMessage("Complete d'abord ta fiche sante pour debloquer les seances.");
      return;
    }

    setIsBusy(true);
    setFeedbackMessage(null);

    try {
      const workout: UserWorkoutInput = {
        sport: suggestion.sport,
        intensity: suggestion.intensity,
        goal: suggestion.goal,
        durationMin: suggestion.durationMin,
        weightKg: Number(weightKg) || 0,
      };

      const nextProfile = await saveUserPreferences(supabase, session.user.id, {
        preferredSport: suggestion.sport,
        preferredGoal: suggestion.goal,
        favoriteMealIds: profile.favoriteMealIds,
      });

      await cancelActiveTokens(supabase, session.user.id);

      const nextSession = await createWorkoutSession(
        supabase,
        session.user.id,
        workout,
        buildNutritionRecommendation(workout),
      );

      setProfile(nextProfile);
      setActiveSession(nextSession);
      setActiveToken(null);
      setSelectedMealId(null);
      setHistory((current) => [nextSession, ...current].slice(0, 12));
      setFeedbackMessage(
        `${suggestion.title} lancee. Tes 3 plats recommandes sont deja proposes juste en dessous.`,
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible de lancer cette seance.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleConfirmMealChoice() {
    if (!selectedMeal || !activeSession || !session?.user) {
      return;
    }

    try {
      setIsBusy(true);
      setFeedbackMessage(null);

      const updatedSession = await saveSelectedMealChoice(
        supabase,
        session.user.id,
        activeSession.id,
        selectedMeal.id,
      );
      await cancelActiveTokens(supabase, session.user.id);
      const nextToken = await createDispenseToken(
        supabase,
        session.user.id,
        updatedSession.id,
      );

      setActiveSession(updatedSession);
      setActiveToken(nextToken);
      setHistory((current) =>
        current.map((sessionItem) =>
          sessionItem.id === updatedSession.id ? updatedSession : sessionItem,
        ),
      );
      setFeedbackMessage(`${selectedMeal.name} retenu. Le QR FEATNESS est pret.`);
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer le choix du plat.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleToggleFavoriteMeal() {
    if (!selectedMeal || !session?.user || !profile) {
      return;
    }

    try {
      setIsBusy(true);
      const isFavorite = profile.favoriteMealIds.includes(selectedMeal.id);
      const nextFavoriteMealIds = isFavorite
        ? profile.favoriteMealIds.filter((mealId) => mealId !== selectedMeal.id)
        : [...profile.favoriteMealIds, selectedMeal.id];

      const nextProfile = await saveUserPreferences(supabase, session.user.id, {
        preferredSport: profile.preferredSport,
        preferredGoal: profile.preferredGoal,
        favoriteMealIds: nextFavoriteMealIds,
      });

      setProfile(nextProfile);
      setFeedbackMessage(
        isFavorite ? "Plat retire des favoris." : `${selectedMeal.name} ajoute aux favoris.`,
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible de mettre a jour les favoris.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGenerateQr() {
    if (!activeSession?.selectedMealBlendId || !session?.user) {
      setFeedbackMessage("Choisis d'abord ton plat avant de generer le QR.");
      return;
    }

    try {
      setIsBusy(true);
      setFeedbackMessage(null);
      await cancelActiveTokens(supabase, session.user.id);
      const nextToken = await createDispenseToken(
        supabase,
        session.user.id,
        activeSession.id,
      );
      setActiveToken(nextToken);
      setFeedbackMessage("QR FEATNESS genere. Tu peux finaliser sur la borne.");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible de generer le QR.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClearMealChoice() {
    if (!activeSession || !session?.user) {
      return;
    }

    try {
      setIsBusy(true);
      setFeedbackMessage(null);
      await cancelActiveTokens(supabase, session.user.id);
      const updatedSession = await clearSelectedMealChoice(
        supabase,
        session.user.id,
        activeSession.id,
      );

      setActiveToken(null);
      setActiveSession(updatedSession);
      setSelectedMealId(null);
      setHistory((current) =>
        current.map((sessionItem) =>
          sessionItem.id === updatedSession.id ? updatedSession : sessionItem,
        ),
      );
      setFeedbackMessage("Plat retire. Tu peux en choisir un autre.");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible de retirer ce plat.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  function handleChangeSession() {
    setFeedbackMessage(
      "Choisis une autre seance. FEATNESS reclassera ensuite les plats selon ce nouvel effort.",
    );
    document.getElementById("user-sessions-section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const quickStatus = getQuickStatus(
    Boolean(activeSession),
    hasOnboarding,
    hasSelectedMeal,
    Boolean(activeToken),
  );

  return (
    <main className="min-h-screen bg-[#f4f6f5] text-featness-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
        <header className="flex flex-col gap-4 rounded-[28px] bg-featness-ink px-6 py-5 text-white md:flex-row md:items-center md:justify-between">
          <div className="grid gap-2">
            <p className="text-xs uppercase tracking-[0.32em] text-featness-gold">
              FEATNESS
            </p>
            <div>
              <h1 className="text-3xl font-semibold">Votre repas en quelques clics</h1>
              <p className="text-sm text-white/70">
                Fiche sante, seance utile, plat recommande. Le QR ne vient qu'apres.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {journeySteps.map((step) => (
                <span
                  key={step.key}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    step.status === "done"
                      ? "border border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
                      : step.status === "current"
                        ? "border border-featness-gold/40 bg-featness-gold/10 text-featness-gold"
                        : "border border-white/10 bg-white/5 text-white/55"
                  }`}
                >
                  {step.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canAccessAdmin ? (
              <Link
                href="/admin/overview"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-featness-gold hover:text-featness-gold"
              >
                Aller a l'admin
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="rounded-full bg-featness-gold px-4 py-2 text-sm font-semibold text-featness-ink"
            >
              Deconnexion
            </button>
          </div>
        </header>

        <section className="rounded-[28px] border border-black/10 bg-white px-6 py-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
            Statut rapide
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Le chemin le plus court vers ton plat</h2>
          <p className="mt-2 max-w-3xl text-sm text-featness-muted">{quickStatus}</p>
          <p className="mt-2 text-xs text-featness-muted">
            Demo FEATNESS : profil complet, une seance choisie, un plat valide, QR seulement en fin de parcours.
          </p>
        </section>

        {feedbackMessage ? (
          <div
            className={`rounded-3xl px-5 py-4 text-sm ${
              feedbackTone === "warning"
                ? "border border-amber-200 bg-amber-50 text-amber-900"
                : "border border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            {feedbackMessage}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-6">
            <article id="user-sessions-section" className="rounded-[28px] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
                    Fiche sante
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Profil simple et utile</h2>
                </div>
                <span className="rounded-full bg-[#eff3f1] px-3 py-1 text-xs font-medium text-featness-muted">
                  {hasOnboarding ? "Complete" : "A completer"}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Age</span>
                  <input
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-featness-gold"
                    inputMode="numeric"
                    placeholder="29"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Poids (kg)</span>
                  <input
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-featness-gold"
                    inputMode="decimal"
                    placeholder="78"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Taille (cm)</span>
                  <input
                    value={heightCm}
                    onChange={(event) => setHeightCm(event.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-featness-gold"
                    inputMode="numeric"
                    placeholder="178"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Objectif principal</span>
                  <select
                    value={primaryObjective}
                    onChange={(event) =>
                      setPrimaryObjective(event.target.value as PrimaryObjectiveKey)
                    }
                    className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-featness-gold"
                  >
                    {Object.entries(OBJECTIVE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 rounded-[24px] bg-[#0c1412] p-5 text-white">
                <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">IMC</p>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-semibold">
                      {bmiInsight ? bmiInsight.bmi : "--"}
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      {bmiInsight ? bmiInsight.label : "Renseigne taille et poids"}
                    </p>
                  </div>
                  <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80">
                    {OBJECTIVE_LABELS[primaryObjective]}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={isBusy}
                className="mt-5 rounded-full bg-featness-gold px-5 py-3 text-sm font-semibold text-featness-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? "Enregistrement..." : "Valider ma fiche sante"}
              </button>
            </article>

            <article id="user-meals-section" className="rounded-[28px] bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
                Seances
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                Trois seances utiles pour ton objectif
              </h2>
              <p className="mt-2 text-sm text-featness-muted">
                Choisis une seance. FEATNESS calcule ensuite directement les plats les plus coherents.
              </p>

              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {suggestedSessions.length > 0 ? (
                  suggestedSessions.map((suggestion, index) => (
                    <article
                      key={suggestion.key}
                      className={`rounded-[24px] border p-5 ${
                        index === 0
                          ? "border-featness-gold/40 bg-[#fff9ec]"
                          : "border-black/10 bg-[#f8faf9]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            index === 0
                              ? "bg-featness-gold/15 text-featness-gold"
                              : "bg-white text-featness-muted"
                          }`}
                        >
                          {index === 0 ? "Meilleur choix FEATNESS" : `Option ${index + 1}`}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-xs text-featness-muted">
                          {suggestion.durationMin} min
                        </span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold">{suggestion.title}</h3>
                      <p className="mt-2 text-sm text-featness-muted">
                        {suggestion.description}
                      </p>
                      <p className="mt-3 text-sm text-featness-muted">{suggestion.why}</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-white px-3 py-1">
                          {suggestion.sport}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1">
                          {GOAL_LABELS[suggestion.goal]}
                        </span>
                        {suggestion.estimatedCaloriesBurned ? (
                          <span className="rounded-full bg-white px-3 py-1">
                            {suggestion.estimatedCaloriesBurned} kcal
                          </span>
                        ) : null}
                        {suggestion.effortCategory ? (
                          <span className="rounded-full bg-white px-3 py-1">
                            {getEffortLabel(suggestion.effortCategory)}
                          </span>
                        ) : null}
                      </div>
                      {suggestion.focusTitle ? (
                        <div className="mt-4 rounded-[18px] border border-featness-gold/30 bg-featness-gold/10 p-4">
                          <p className="text-sm font-semibold text-featness-gold">{suggestion.focusTitle}</p>
                          <p className="mt-1 text-sm text-featness-muted">{suggestion.focusCopy}</p>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleStartSuggestedSession(suggestion)}
                        disabled={isBusy || !hasOnboarding}
                        className="mt-5 w-full rounded-full bg-featness-gold px-4 py-3 text-sm font-semibold text-featness-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isBusy ? "Preparation..." : "Choisir cette seance"}
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-dashed border-black/10 bg-[#f8faf9] p-5 text-sm text-featness-muted xl:col-span-3">
                    Complete d'abord ta fiche sante pour debloquer les seances suggerees.
                  </div>
                )}
              </div>
            </article>
 
            <article className="rounded-[28px] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
                    Plats
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Le plat valide passe en premier</h2>
                  {sessionInsight ? (
                    <div className="mt-4 rounded-[20px] border border-black/10 bg-[#f8faf9] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-featness-gold">
                        Resume de ta seance
                      </p>
                      <p className="mt-2 text-lg font-semibold text-featness-ink">{sessionInsight.focusTitle}</p>
                      <p className="mt-2 text-sm text-featness-muted">{sessionInsight.focusCopy}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-white px-3 py-1">
                          {sessionInsight.caloriesBurnedEstimate} kcal estimees
                        </span>
                        <span className="rounded-full bg-white px-3 py-1">
                          {getEffortLabel(sessionInsight.effortCategory)}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1">
                          {GOAL_LABELS[activeSession?.workout.goal ?? "recovery"]}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
                {activeSession?.selectedMealBlendId ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                    Plat choisi
                  </span>
                ) : null}
              </div>

              {meals.length > 0 ? (
                <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
                  <div className="grid gap-4">
                    {[
                      {
                        title: "Recommandes FEATNESS",
                        copy: "Badges verts : les plus coherents avec ta seance en cours.",
                        groups: recommendedGroups,
                        recommended: true,
                      },
                      {
                        title: "Tous les plats disponibles",
                        copy: "Badges rouges : disponibles aussi, mais moins prioritaires pour cet effort.",
                        groups: otherGroups,
                        recommended: false,
                      },
                    ].map((section) => (
                      <div key={section.title} className="grid gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-featness-ink">{section.title}</h3>
                          <p className="mt-1 text-sm text-featness-muted">{section.copy}</p>
                        </div>
                        {(["light", "medium", "intense"] as const).map((effortKey) =>
                          section.groups[effortKey].length > 0 ? (
                            <div key={`${section.title}-${effortKey}`} className="grid gap-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-featness-gold">
                                {getEffortLabel(effortKey)}
                              </p>
                              {section.groups[effortKey].map((meal) => {
                                const isSelected = selectedMeal?.id === meal.id;
                                const allergensLabel =
                                  meal.allergens.length > 0
                                    ? meal.allergens.length === 1
                                      ? meal.allergens[0]
                                      : `${meal.allergens.length} allergenes`
                                    : "Sans allergene majeur";

                                return (
                                  <button
                                    key={meal.id}
                                    type="button"
                                    onClick={() => setSelectedMealId(meal.id)}
                                    className={`rounded-[24px] border p-5 text-left transition ${
                                      isSelected
                                        ? "border-featness-gold bg-[#fff9ec]"
                                        : section.recommended
                                          ? "border-emerald-300 bg-emerald-50"
                                          : "border-rose-200 bg-rose-50"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-4">
                                      <div
                                        className={`mt-1 h-full min-h-24 w-1 rounded-full ${
                                          section.recommended && meal.fitLabel === "ideal"
                                            ? "bg-featness-gold"
                                            : meal.fitLabel === "solide"
                                              ? "bg-sky-400"
                                              : "bg-rose-300"
                                        }`}
                                      />
                                      <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                              section.recommended
                                                ? "bg-emerald-100 text-emerald-800"
                                                : "bg-rose-100 text-rose-700"
                                            }`}
                                          >
                                            {section.recommended ? "Recommande FEATNESS" : "Non prioritaire"}
                                          </span>
                                          <span
                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                              getFitBadgeMeta(meal.fitLabel).className
                                            }`}
                                          >
                                            {getFitBadgeMeta(meal.fitLabel).text}
                                          </span>
                                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-featness-muted">
                                            {GOAL_LABELS[meal.targetGoal as GoalKey] ?? meal.targetGoal}
                                          </span>
                                          <span
                                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                                              meal.allergens.length > 0
                                                ? "bg-rose-100 text-rose-700"
                                                : "bg-slate-100 text-slate-600"
                                            }`}
                                          >
                                            {allergensLabel}
                                          </span>
                                        </div>
                                        <h4 className="mt-3 text-lg font-semibold text-featness-ink">{meal.name}</h4>
                                        <p className="mt-2 text-sm text-featness-muted">{meal.description}</p>
                                        <p className="mt-3 text-sm text-featness-muted">
                                          {meal.fitReason}
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                                          <span className="rounded-full bg-white px-3 py-1">
                                            {meal.proteinG} g prot
                                          </span>
                                          <span className="rounded-full bg-white px-3 py-1">
                                            {meal.calories} kcal
                                          </span>
                                          <span className="rounded-full bg-white px-3 py-1">
                                            {getEffortLabel(meal.effortCategory)}
                                          </span>
                                          {profile?.favoriteMealIds.includes(meal.id) ? (
                                            <span className="rounded-full bg-featness-ink px-3 py-1 text-white">
                                              Favori
                                            </span>
                                          ) : null}
                                          {isSelected ? (
                                            <span className="rounded-full bg-featness-gold px-3 py-1 font-semibold text-featness-ink">
                                              Selectionne
                                            </span>
                                          ) : null}
                                          {meal.fitChips.map((chip) => (
                                            <span key={`${meal.id}-${chip}`} className="rounded-full bg-white px-3 py-1">
                                              {chip}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-featness-ink">
                                        {formatCurrency(meal.priceEur)}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null,
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[24px] border border-black/10 bg-[#0c1412] p-6 text-white">
                    {selectedMeal ? (
                      <>
                        <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
                          Detail du plat
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold">{selectedMeal.name}</h3>
                        <p className="mt-3 text-sm text-white/70">{selectedMeal.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <span
                            className={`rounded-full px-3 py-1 font-semibold ${getFitBadgeMeta(selectedMeal.fitLabel).className}`}
                          >
                            {getFitBadgeMeta(selectedMeal.fitLabel).text}
                          </span>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">
                            {selectedMeal.fitReason}
                          </span>
                        </div>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs text-white/60">Prix</p>
                            <p className="mt-2 text-xl font-semibold">
                              {formatCurrency(selectedMeal.priceEur)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <p className="text-xs text-white/60">Objectif</p>
                            <p className="mt-2 text-xl font-semibold">
                              {GOAL_LABELS[activeSession?.workout.goal ?? "recovery"]}
                            </p>
                          </div>
                        </div>
                        <p className="mt-5 text-sm text-white/70">
                          Si tu veux aller vite, valide ce plat puis utilise le QR uniquement si tu dois passer sur la borne.
                        </p>
                        <div className="mt-5 grid gap-3">
                          <button
                            type="button"
                            onClick={() => void handleConfirmMealChoice()}
                            disabled={isBusy}
                            className="rounded-full bg-featness-gold px-5 py-3 text-sm font-semibold text-featness-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isBusy ? "Enregistrement..." : "Valider ce plat"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleFavoriteMeal()}
                            disabled={isBusy}
                            className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:border-featness-gold hover:text-featness-gold disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {profile?.favoriteMealIds.includes(selectedMeal.id)
                              ? "Retirer des favoris"
                              : "Ajouter aux favoris"}
                          </button>
                          {activeSession?.selectedMealBlendId ? (
                            <button
                              type="button"
                              onClick={() => void handleClearMealChoice()}
                              disabled={isBusy}
                              className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:border-rose-300 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Changer de plat
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={handleChangeSession}
                            disabled={isBusy}
                            className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-white transition hover:border-sky-300 hover:text-sky-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Changer de seance
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-white/70">
                        Lance d'abord une seance pour voir les plats recommandes.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-5 text-sm text-featness-muted">
                  Choisis une seance suggeree pour afficher tes plats recommandes.
                </p>
              )}
            </article>
          </div>

          <aside className="grid gap-6">
            <article className="rounded-[28px] bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
                QR
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Secondaire, apres validation</h2>
              <p className="mt-2 text-sm text-featness-muted">
                Le QR n'est utile qu'une fois le plat choisi. Il reste donc en seconde etape.
              </p>

              <button
                type="button"
                onClick={() => void handleGenerateQr()}
                disabled={isBusy || !activeSession?.selectedMealBlendId}
                className="mt-5 w-full rounded-full bg-featness-gold px-5 py-3 text-sm font-semibold text-featness-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy
                  ? "Generation..."
                  : activeSession?.selectedMealBlendId
                  ? "Generer mon QR"
                  : "Valide d'abord ton plat"}
              </button>
              {activeSession?.selectedMealBlendId ? (
                <button
                  type="button"
                  onClick={() => void handleClearMealChoice()}
                  disabled={isBusy}
                  className="mt-3 w-full rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-featness-ink transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Changer de plat
                </button>
              ) : null}
              {activeSession ? (
                <button
                  type="button"
                  onClick={handleChangeSession}
                  disabled={isBusy}
                  className="mt-3 w-full rounded-full border border-black/10 px-5 py-3 text-sm font-medium text-featness-ink transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Changer de seance
                </button>
              ) : null}

              {activeToken ? (
                <div className="mt-5 grid gap-4">
                  <div className="mx-auto rounded-[24px] bg-white p-4 shadow-[0_12px_32px_rgba(12,20,18,0.08)]">
                    <QRCodeSVG value={activeToken.id} size={200} />
                  </div>
                  <div className="rounded-[24px] bg-[#f8faf9] p-4 text-sm text-featness-muted">
                    <p className="font-medium text-featness-ink">Statut : {activeToken.status}</p>
                    <p className="mt-2">Validite : {formatRemaining(activeToken)}</p>
                    <p className="mt-2 break-all">{activeToken.id}</p>
                  </div>
                  {activeSession?.selectedMealBlendId ? (
                    <div className="rounded-[24px] bg-[#0c1412] p-4 text-sm text-white">
                      <p className="font-medium">
                        Plat retenu :{" "}
                        {mealNamesById[activeSession.selectedMealBlendId] ?? "Repas FEATNESS"}
                      </p>
                      <p className="mt-2 text-white/70">
                        {activeSession.recommendation.recommendationSummary}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-5 text-sm text-featness-muted">
                  Aucun QR actif. Ce n'est pas bloquant pour choisir ton repas.
                </p>
              )}
            </article>

            <article className="rounded-[28px] bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
                Historique
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Dernieres seances</h2>
              <div className="mt-5 grid gap-3">
                {history.length > 0 ? (
                  history.map((sessionItem) => (
                    <div
                      key={sessionItem.id}
                      className="rounded-[22px] border border-black/10 bg-[#f8faf9] p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-featness-ink">
                            {sessionItem.workout.sport}
                          </p>
                          <p className="text-sm text-featness-muted">
                            {sessionItem.workout.durationMin} min /{" "}
                            {GOAL_LABELS[sessionItem.workout.goal]}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-featness-muted">
                          {sessionItem.preparationStatus}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-featness-muted">
                        {sessionItem.recommendation.recommendationSummary}
                      </p>
                      {sessionItem.selectedMealBlendId ? (
                        <p className="mt-2 text-sm text-featness-ink">
                          Plat retenu :{" "}
                          {mealNamesById[sessionItem.selectedMealBlendId] ?? "Repas FEATNESS"}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-featness-muted">
                    Aucune seance pour le moment.
                  </p>
                )}
              </div>
            </article>
          </aside>
        </section>
      </div>
    </main>
  );
}
