"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import type { Session } from "@supabase/supabase-js";

import {
  ACTIVITY_PRESETS,
  buildNutritionRecommendation,
  isExpired,
  type DispenseTokenRecord,
  type GoalKey,
  type IntensityLevel,
  type SportKey,
  type UserProfile,
  type WorkoutSessionRecord,
} from "@featness/shared";

import type { DashboardProfile, DrinkBlendRecord } from "@/lib/dashboard-shared";
import { formatCurrency } from "@/lib/dashboard-shared";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  cancelActiveTokens,
  createDispenseToken,
  createWorkoutSession,
  fetchActiveToken,
  fetchAvailableDrinkBlends,
  fetchProfile,
  fetchWorkoutHistory,
  saveProfile,
  saveUserPreferences,
} from "@/lib/user-data";

type UserAppShellProps = {
  initialProfile: DashboardProfile;
};

type SuggestedMeal = DrinkBlendRecord & {
  rank: number;
  score: number;
};

const GOAL_LABELS: Record<GoalKey, string> = {
  hydration: "Hydratation",
  recovery: "Recuperation",
  performance: "Performance",
};

const INTENSITY_LABELS: Record<IntensityLevel, string> = {
  light: "Legere",
  moderate: "Moderee",
  intense: "Intense",
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

function buildSuggestedMeals(
  meals: DrinkBlendRecord[],
  goal: GoalKey,
  recommendedBlend: string,
): SuggestedMeal[] {
  return [...meals]
    .map((meal) => {
      let score = 0;

      if (meal.targetGoal === goal) {
        score += 3;
      }

      if (meal.name === recommendedBlend) {
        score += 5;
      }

      return {
        ...meal,
        score,
      };
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.priceEur - right.priceEur;
    })
    .slice(0, 3)
    .map((meal, index) => ({
      ...meal,
      rank: index + 1,
    }));
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
  const [fullName, setFullName] = useState(initialProfile.fullName ?? "");
  const [gymName, setGymName] = useState("");
  const [weightKg, setWeightKg] = useState("78");
  const [sport, setSport] = useState<SportKey>("running");
  const [intensity, setIntensity] = useState<IntensityLevel>("moderate");
  const [goal, setGoal] = useState<GoalKey>("recovery");
  const [durationMin, setDurationMin] = useState("45");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const recommendation = useMemo(
    () =>
      buildNutritionRecommendation({
        sport,
        intensity,
        goal,
        durationMin: Number(durationMin) || 0,
        weightKg: Number(weightKg) || 0,
      }),
    [durationMin, goal, intensity, sport, weightKg],
  );

  const suggestedMeals = useMemo(
    () => buildSuggestedMeals(meals, goal, recommendation.recommendedBlend),
    [goal, meals, recommendation.recommendedBlend],
  );

  const mealNamesById = useMemo(
    () => Object.fromEntries(meals.map((meal) => [meal.id, meal.name])) as Record<string, string>,
    [meals],
  );

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

        setProfile(nextProfile);
        setMeals(nextMeals);
        setFullName(nextProfile?.fullName ?? "");
        setGymName(nextProfile?.gymName ?? "");
        setWeightKg(String(nextProfile?.weightKg ?? 78));
        setSport(nextProfile?.preferredSport ?? "running");
        setGoal(nextProfile?.preferredGoal ?? "recovery");
        setHistory(nextHistory);
        setActiveToken(nextToken && !isExpired(nextToken.expiresAt) ? nextToken : null);
        setActiveSession(
          nextToken
            ? nextHistory.find((sessionItem) => sessionItem.id === nextToken.sessionId) ?? null
            : null,
        );
      } catch (error) {
        if (!cancelled) {
          setFeedbackMessage(
            error instanceof Error
              ? error.message
              : "Chargement FEATNESS impossible.",
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
          const nextHistory = await fetchWorkoutHistory(
            supabase,
            authenticatedUser.id,
          );
          setHistory(nextHistory);
          setActiveSession((previousSession) =>
            previousSession
              ? nextHistory.find((item) => item.id === previousSession.id) ??
                  previousSession
              : previousSession,
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
          const nextToken = await fetchActiveToken(
            supabase,
            authenticatedUser.id,
          );
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

  async function handleSaveProfile() {
    if (!session?.user) {
      return;
    }

    setIsBusy(true);
    setFeedbackMessage(null);

    try {
      const savedProfile = await saveProfile(supabase, session.user.id, {
        email: session.user.email ?? "",
        fullName: fullName.trim(),
        weightKg: Number(weightKg) || 0,
        gymName: gymName.trim(),
      });

      const nextProfile = await saveUserPreferences(supabase, session.user.id, {
        preferredSport: sport,
        preferredGoal: goal,
        favoriteMealIds: savedProfile.favoriteMealIds,
      });

      setProfile(nextProfile);
      setFeedbackMessage("Profil FEATNESS mis a jour.");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer votre profil.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGenerateToken() {
    if (!session?.user || !profile?.onboardingCompleted) {
      setFeedbackMessage("Completez votre profil avant de generer un QR FEATNESS.");
      return;
    }

    setIsBusy(true);
    setFeedbackMessage(null);

    try {
      await cancelActiveTokens(supabase, session.user.id);

      const nextSession = await createWorkoutSession(
        supabase,
        session.user.id,
        {
          sport,
          intensity,
          goal,
          durationMin: Number(durationMin) || 0,
          weightKg: Number(weightKg) || 0,
        },
        recommendation,
      );

      const nextToken = await createDispenseToken(
        supabase,
        session.user.id,
        nextSession.id,
      );

      setActiveSession(nextSession);
      setActiveToken(nextToken);
      setHistory((current) => [nextSession, ...current].slice(0, 12));
      setFeedbackMessage("QR genere. Il reste valide 30 minutes.");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Generation du QR impossible.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const currentSportLabel =
    ACTIVITY_PRESETS.find((preset) => preset.key === sport)?.label ?? sport;
  const canAccessAdmin =
    initialProfile.role === "owner" || initialProfile.role === "admin";

  return (
    <main className="min-h-screen bg-[#f4f6f5] text-featness-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6">
        <header className="flex flex-col gap-4 rounded-[28px] bg-featness-ink px-6 py-5 text-white md:flex-row md:items-center md:justify-between">
          <div className="grid gap-2">
            <p className="text-xs uppercase tracking-[0.32em] text-featness-gold">
              FEATNESS
            </p>
            <div>
              <h1 className="text-3xl font-semibold">Votre espace sportif</h1>
              <p className="text-sm text-white/70">
                Profil, seances, recommandations repas et QR FEATNESS sur une
                seule interface.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canAccessAdmin ? (
              <Link
                href="/admin/overview"
                className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-featness-gold hover:text-featness-gold"
              >
                Aller a l&apos;admin
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

        {feedbackMessage ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            {feedbackMessage}
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-6">
            <article className="rounded-[28px] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
                    Profil
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">Votre base FEATNESS</h2>
                </div>
                <span className="rounded-full bg-[#eff3f1] px-3 py-1 text-xs font-medium text-featness-muted">
                  {profile?.onboardingCompleted ? "Profil complet" : "Onboarding requis"}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Nom complet</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-featness-gold"
                    placeholder="Kenam Keita"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Salle / club</span>
                  <input
                    value={gymName}
                    onChange={(event) => setGymName(event.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-featness-gold"
                    placeholder="FEATNESS Lab"
                  />
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Poids (kg)</span>
                  <input
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-featness-gold"
                    inputMode="decimal"
                  />
                </label>
                <div className="rounded-2xl border border-dashed border-black/10 bg-[#f8faf9] px-4 py-3 text-sm text-featness-muted">
                  L&apos;objectif se choisit au moment de chaque seance pour adapter le
                  repas recommande.
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-[#eff3f1] px-3 py-1 text-featness-muted">
                  Sport prefere : {profile?.preferredSport ?? "non defini"}
                </span>
                <span className="rounded-full bg-[#eff3f1] px-3 py-1 text-featness-muted">
                  Objectif prefere : {profile?.preferredGoal ?? "non defini"}
                </span>
                <span className="rounded-full bg-[#eff3f1] px-3 py-1 text-featness-muted">
                  Favoris synchronises : {profile?.favoriteMealIds.length ?? 0}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void handleSaveProfile()}
                disabled={isBusy}
                className="mt-5 rounded-full bg-featness-gold px-5 py-3 text-sm font-semibold text-featness-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBusy ? "Enregistrement..." : "Sauvegarder mon profil"}
              </button>
            </article>

            <article className="rounded-[28px] bg-white p-6 shadow-sm">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
                  Seance
                </p>
                <h2 className="mt-2 text-2xl font-semibold">
                  Lancez votre prochaine recommandation
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Sport</span>
                  <select
                    value={sport}
                    onChange={(event) => setSport(event.target.value as SportKey)}
                    className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-featness-gold"
                  >
                    {ACTIVITY_PRESETS.map((preset) => (
                      <option key={preset.key} value={preset.key}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Intensite</span>
                  <select
                    value={intensity}
                    onChange={(event) =>
                      setIntensity(event.target.value as IntensityLevel)
                    }
                    className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-featness-gold"
                  >
                    {Object.entries(INTENSITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Objectif</span>
                  <select
                    value={goal}
                    onChange={(event) => setGoal(event.target.value as GoalKey)}
                    className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-featness-gold"
                  >
                    {Object.entries(GOAL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">Duree (min)</span>
                  <input
                    value={durationMin}
                    onChange={(event) => setDurationMin(event.target.value)}
                    className="rounded-2xl border border-black/10 px-4 py-3 outline-none focus:border-featness-gold"
                    inputMode="numeric"
                  />
                </label>
              </div>

              <div className="mt-6 grid gap-3 rounded-[24px] bg-[#0c1412] p-5 text-white md:grid-cols-3">
                <div>
                  <p className="text-sm text-white/60">Calories estimees</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {recommendation.caloriesBurned} kcal
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Hydratation</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {recommendation.hydrationMl} ml
                  </p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Blend recommande</p>
                  <p className="mt-2 text-xl font-semibold">
                    {recommendation.recommendedBlend}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-[28px] bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
                    Propositions repas
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Les meilleurs choix apres votre effort
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => void handleGenerateToken()}
                  disabled={isBusy || !profile?.onboardingCompleted}
                  className="rounded-full bg-featness-gold px-5 py-3 text-sm font-semibold text-featness-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? "Generation..." : "Generer mon QR FEATNESS"}
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {suggestedMeals.map((meal) => (
                  <article
                    key={meal.id}
                    className={`rounded-[24px] border p-5 ${
                      meal.rank === 1
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-black/10 bg-[#f8faf9]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-featness-gold">
                          {meal.rank === 1 ? "Choix recommande" : `Option ${meal.rank}`}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold">{meal.name}</h3>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-featness-ink">
                        {formatCurrency(meal.priceEur)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-featness-muted">
                      {meal.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white px-3 py-1">
                        {GOAL_LABELS[meal.targetGoal as GoalKey] ?? meal.targetGoal}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1">
                        {recommendation.proteinG} g proteines
                      </span>
                      <span className="rounded-full bg-white px-3 py-1">
                        {recommendation.carbsG} g glucides
                      </span>
                      {profile?.favoriteMealIds.includes(meal.id) ? (
                        <span className="rounded-full bg-featness-ink px-3 py-1 text-white">
                          Favori
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </div>

          <aside className="grid gap-6">
            <article className="rounded-[28px] bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
                QR actif
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Votre acces borne</h2>

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
                  {activeSession ? (
                    <div className="rounded-[24px] bg-[#0c1412] p-4 text-sm text-white">
                      <p className="font-medium">{currentSportLabel}</p>
                      <p className="mt-2 text-white/70">
                        {GOAL_LABELS[activeSession.workout.goal]} /{" "}
                        {INTENSITY_LABELS[activeSession.workout.intensity]}
                      </p>
                      <p className="mt-2 text-white/70">
                        {activeSession.recommendation.recommendationSummary}
                      </p>
                      {activeSession.selectedMealBlendId ? (
                        <p className="mt-2 text-white/70">
                          Plat retenu :{" "}
                          {mealNamesById[activeSession.selectedMealBlendId] ?? "Repas FEATNESS"}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-featness-muted">
                  Generez une seance pour afficher un QR utilisable sur la borne FEATNESS.
                </p>
              )}
            </article>

            <article className="rounded-[28px] bg-white p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-featness-gold">
                Historique
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Vos dernieres seances</h2>
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
                            {
                              ACTIVITY_PRESETS.find(
                                (preset) => preset.key === sessionItem.workout.sport,
                              )?.label
                            }
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
                    Aucune seance pour le moment. Lancez votre premiere recommandation.
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
