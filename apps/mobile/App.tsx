import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";

import {
  buildSessionSuggestions,
  buildNutritionRecommendation,
  calculateBmi,
  isExpired,
  type BmiInsight,
  type DispenseTokenRecord,
  type GoalKey,
  type PrimaryObjectiveKey,
  type SessionSuggestion,
  type UserProfile,
  type UserWorkoutInput,
  type WorkoutSessionRecord,
} from "@featness/shared";

import { ActiveTokenCard } from "./src/components/active-token-card";
import { AnimatedSection } from "./src/components/animated-section";
import { AuthCard } from "./src/components/auth-card";
import { HistoryCard } from "./src/components/history-card";
import { MealDetailCard } from "./src/components/meal-detail-card";
import { ProfileCard } from "./src/components/profile-card";
import { SessionSuggestionsCard } from "./src/components/session-suggestions-card";
import { SuggestedMealsCard } from "./src/components/suggested-meals-card";
import {
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
  type DrinkBlendRecord,
} from "./src/lib/featness-data";
import { registerForPushNotificationsAsync } from "./src/lib/notifications";
import {
  getMobileSupabaseClient,
  isMobileSupabaseConfigured,
} from "./src/lib/supabase";
import { mobileShadow, theme } from "./src/theme";

const TEST_USER_EMAIL = "featness.user.demo@mailinator.com";
const TEST_USER_PASSWORD = "test123456";

type SuggestedMeal = DrinkBlendRecord & {
  rank: number;
  score: number;
};

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

function getFeedbackTone(message: string | null): "neutral" | "success" | "warning" {
  if (!message) {
    return "neutral";
  }

  const lowered = message.toLowerCase();

  if (
    lowered.includes("impossible") ||
    lowered.includes("erreur") ||
    lowered.includes("manquant") ||
    lowered.includes("configure")
  ) {
    return "warning";
  }

  return "success";
}

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("78");
  const [primaryObjective, setPrimaryObjective] =
    useState<PrimaryObjectiveKey>("lose_weight");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<WorkoutSessionRecord[]>([]);
  const [activeToken, setActiveToken] = useState<DispenseTokenRecord | null>(null);
  const [activeSession, setActiveSession] = useState<WorkoutSessionRecord | null>(null);
  const [availableMeals, setAvailableMeals] = useState<DrinkBlendRecord[]>([]);
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const supabaseEnabled = isMobileSupabaseConfigured();
  const supabaseClient = useMemo(() => getMobileSupabaseClient(), []);

  const bmiInsight = useMemo<BmiInsight | null>(
    () => calculateBmi(Number(weightKg) || 0, Number(heightCm) || 0),
    [heightCm, weightKg],
  );
  const sessionSuggestions = useMemo(
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

  const suggestedMeals = useMemo(() => {
    if (!activeSession) {
      return [];
    }

    return buildSuggestedMeals(
      availableMeals,
      activeSession.workout.goal,
      activeSession.recommendation.recommendedBlend,
    );
  }, [activeSession, availableMeals]);

  const selectedMeal = useMemo(
    () => suggestedMeals.find((meal) => meal.id === selectedMealId) ?? suggestedMeals[0] ?? null,
    [selectedMealId, suggestedMeals],
  );
  const hasCompletedOnboarding = Boolean(profile?.onboardingCompleted);
  const hasSelectedMeal = Boolean(activeSession?.selectedMealBlendId);
  const feedbackTone = getFeedbackTone(feedbackMessage);
  const quickStatus = useMemo(() => {
    if (!session?.user) {
      return "Connecte-toi puis complete ton profil pour obtenir ton plat rapidement.";
    }

    if (!hasCompletedOnboarding) {
      return "Complete ton profil sante. L'app te proposera ensuite directement des seances utiles.";
    }

    if (!activeSession) {
      return "Choisis une seance suggeree pour lancer instantanement ta recommandation repas.";
    }

    if (!hasSelectedMeal) {
      return "Tes 3 plats sont prets. Choisis simplement celui que tu veux.";
    }

    if (!activeToken) {
      return "Ton plat est choisi. Le QR est optionnel et peut etre genere ensuite si besoin.";
    }

    return "C'est bon. Ton plat est choisi et ton QR est pret.";
  }, [activeSession, activeToken, hasCompletedOnboarding, hasSelectedMeal, session?.user]);

  const mealNamesById = useMemo(
    () =>
      Object.fromEntries(availableMeals.map((meal) => [meal.id, meal.name])) as Record<
        string,
        string
      >,
    [availableMeals],
  );

  useEffect(() => {
    if (!supabaseClient) {
      return;
    }

    let mounted = true;

    supabaseClient.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
      }
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabaseClient]);

  useEffect(() => {
    const user = session?.user;

    if (!supabaseClient || !user) {
      setProfile(null);
      setHistory([]);
      setActiveToken(null);
      setActiveSession(null);
      setAvailableMeals([]);
      setSelectedMealId(null);
      return;
    }

    const mobileClient = supabaseClient;
    const authenticatedUser = user;
    let cancelled = false;

    async function loadRuntimeData() {
      try {
        const [nextProfile, nextHistory, nextToken, nextMeals] = await Promise.all([
          fetchProfile(mobileClient, authenticatedUser),
          fetchWorkoutHistory(mobileClient, authenticatedUser.id),
          fetchActiveToken(mobileClient, authenticatedUser.id),
          fetchAvailableDrinkBlends(mobileClient),
        ]);

        if (cancelled) {
          return;
        }

        const nextActiveSession =
          nextToken && !isExpired(nextToken.expiresAt)
            ? nextHistory.find((sessionItem) => sessionItem.id === nextToken.sessionId) ?? null
            : nextHistory[0] ?? null;

        setProfile(nextProfile);
        setAge(nextProfile?.age ? String(nextProfile.age) : "");
        setHeightCm(nextProfile?.heightCm ? String(nextProfile.heightCm) : "");
        setWeightKg(String(nextProfile?.weightKg ?? 78));
        setPrimaryObjective(nextProfile?.primaryObjective ?? "lose_weight");
        setHistory(nextHistory);
        setAvailableMeals(nextMeals);
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

    const sessionsChannel = supabaseClient
      .channel(`mobile-sessions-${authenticatedUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workout_sessions",
          filter: `user_id=eq.${authenticatedUser.id}`,
        },
        async () => {
          const nextHistory = await fetchWorkoutHistory(mobileClient, authenticatedUser.id);
          setHistory(nextHistory);
          setActiveSession((previousSession) =>
            previousSession
              ? nextHistory.find((item) => item.id === previousSession.id) ?? previousSession
              : previousSession,
          );
        },
      )
      .subscribe();

    const tokensChannel = supabaseClient
      .channel(`mobile-tokens-${authenticatedUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dispense_tokens",
          filter: `user_id=eq.${authenticatedUser.id}`,
        },
        async () => {
          const nextToken = await fetchActiveToken(mobileClient, authenticatedUser.id);
          setActiveToken(nextToken && !isExpired(nextToken.expiresAt) ? nextToken : null);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void mobileClient.removeChannel(sessionsChannel);
      void mobileClient.removeChannel(tokensChannel);
    };
  }, [session?.user?.id, supabaseClient]);

  useEffect(() => {
    if (!activeSession || suggestedMeals.length === 0) {
      setSelectedMealId(null);
      return;
    }

    setSelectedMealId((currentMealId) => {
      if (currentMealId && suggestedMeals.some((meal) => meal.id === currentMealId)) {
        return currentMealId;
      }

      if (
        activeSession.selectedMealBlendId &&
        suggestedMeals.some((meal) => meal.id === activeSession.selectedMealBlendId)
      ) {
        return activeSession.selectedMealBlendId;
      }

      return suggestedMeals[0]?.id ?? null;
    });
  }, [activeSession?.id, activeSession?.selectedMealBlendId, suggestedMeals]);

  useEffect(() => {
    const user = session?.user;

    if (!supabaseClient || !user) {
      return;
    }

    const mobileClient = supabaseClient;
    const authenticatedUser = user;
    let cancelled = false;

    async function registerPushToken() {
      const token = await registerForPushNotificationsAsync();

      if (!token || cancelled) {
        return;
      }

      const { error } = await mobileClient
        .from("profiles")
        .update({ expo_push_token: token })
        .eq("id", authenticatedUser.id);

      if (!cancelled && error) {
        setFeedbackMessage(error.message);
      }
    }

    void registerPushToken();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, supabaseClient]);

  async function createSessionFlow(
    workout: UserWorkoutInput,
    nextRecommendation: ReturnType<typeof buildNutritionRecommendation>,
    successMessage: string,
  ) {
    if (!supabaseClient || !session?.user) {
      return;
    }

    await cancelActiveTokens(supabaseClient, session.user.id);

    const nextSession = await createWorkoutSession(
      supabaseClient,
      session.user.id,
      workout,
      nextRecommendation,
    );

    setActiveSession(nextSession);
    setActiveToken(null);
    setSelectedMealId(null);
    setHistory((previousHistory) => [nextSession, ...previousHistory].slice(0, 12));
    setFeedbackMessage(successMessage);
  }

  async function handleSignIn() {
    if (!supabaseClient) {
      setFeedbackMessage(
        "Configure EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY pour activer l'auth.",
      );
      return;
    }

    setIsBusy(true);
    setFeedbackMessage(null);

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsBusy(false);
    setFeedbackMessage(
      error ? error.message : "Connexion reussie. Session mobile FEATNESS ouverte.",
    );
  }

  async function handleSignUp() {
    if (!supabaseClient) {
      setFeedbackMessage(
        "Configure EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY pour activer l'auth.",
      );
      return;
    }

    setIsBusy(true);
    setFeedbackMessage(null);

    const { error } = await supabaseClient.auth.signUp({
      email: email.trim(),
      password,
    });

    setIsBusy(false);
    setFeedbackMessage(
      error
        ? error.message
        : "Compte cree. Le trigger Supabase doit maintenant avoir initialise ton profil.",
    );
  }

  async function handleTestUserSignIn() {
    if (!supabaseClient) {
      setFeedbackMessage(
        "Configure EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY pour activer l'auth.",
      );
      return;
    }

    setIsBusy(true);
    setFeedbackMessage(null);
    setEmail(TEST_USER_EMAIL);
    setPassword(TEST_USER_PASSWORD);

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    setIsBusy(false);
    setFeedbackMessage(
      error
        ? error.message
        : "Compte test charge. Tu peux demarrer les tests FEATNESS.",
    );
  }

  async function handleSignOut() {
    if (!supabaseClient) {
      setSession(null);
      setFeedbackMessage("Mode demo : aucune session distante a fermer.");
      return;
    }

    setIsBusy(true);
    const { error } = await supabaseClient.auth.signOut();
    setIsBusy(false);
    setFeedbackMessage(error ? error.message : "Session fermee.");
  }

  async function handleSaveProfile() {
    if (!supabaseClient || !session?.user) {
      return;
    }

    if (Number(age) <= 0 || Number(weightKg) <= 0 || Number(heightCm) <= 0) {
      setFeedbackMessage("Renseigne age, poids et taille pour continuer.");
      return;
    }

    setIsBusy(true);
    setFeedbackMessage(null);

    try {
      const nextProfile = await saveProfile(supabaseClient, session.user.id, {
        email: session.user.email ?? "",
        fullName: profile?.fullName ?? "",
        age: Number(age),
        weightKg: Number(weightKg) || 0,
        heightCm: Number(heightCm) || 0,
        primaryObjective,
        gymName: profile?.gymName ?? "",
      });

      setProfile(nextProfile);
      setWeightKg(String(nextProfile.weightKg ?? weightKg));
      setFeedbackMessage("Profil sante FEATNESS sauvegarde. Tu peux maintenant choisir une seance.");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer le profil.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleStartSuggestedSession(suggestion: SessionSuggestion) {
    if (!supabaseClient || !session?.user || !profile?.onboardingCompleted) {
      setFeedbackMessage("Complete d'abord ton profil pour debloquer les seances suggerees.");
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

      const nextProfile = await saveUserPreferences(supabaseClient, session.user.id, {
        preferredSport: suggestion.sport,
        preferredGoal: suggestion.goal,
        favoriteMealIds: profile.favoriteMealIds,
      });

      setProfile(nextProfile);

      await createSessionFlow(
        workout,
        buildNutritionRecommendation(workout),
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

  async function handleToggleFavoriteMeal() {
    if (!selectedMeal || !supabaseClient || !session?.user || !profile) {
      return;
    }

    try {
      const isFavorite = profile.favoriteMealIds.includes(selectedMeal.id);
      const nextFavoriteMealIds = isFavorite
        ? profile.favoriteMealIds.filter((mealId) => mealId !== selectedMeal.id)
        : [...profile.favoriteMealIds, selectedMeal.id];

      const nextProfile = await saveUserPreferences(supabaseClient, session.user.id, {
        preferredSport: profile.preferredSport,
        preferredGoal: profile.preferredGoal,
        favoriteMealIds: nextFavoriteMealIds,
      });

      setProfile(nextProfile);
      setFeedbackMessage(
        isFavorite
          ? "Plat retire des favoris."
          : `${selectedMeal.name} ajoute aux favoris FEATNESS.`,
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible de mettre a jour les favoris.",
      );
    }
  }

  async function handleConfirmMealChoice() {
    if (!selectedMeal || !activeSession || !supabaseClient || !session?.user) {
      return;
    }

    try {
      const updatedSession = await saveSelectedMealChoice(
        supabaseClient,
        session.user.id,
        activeSession.id,
        selectedMeal.id,
      );
      await cancelActiveTokens(supabaseClient, session.user.id);
      const nextToken = await createDispenseToken(
        supabaseClient,
        session.user.id,
        updatedSession.id,
      );

      setActiveSession(updatedSession);
      setActiveToken(nextToken);
      setHistory((previousHistory) =>
        previousHistory.map((sessionItem) =>
          sessionItem.id === updatedSession.id ? updatedSession : sessionItem,
        ),
      );
      setFeedbackMessage(
        `${selectedMeal.name} retenu. Le choix est synchronise et ton QR FEATNESS est pret.`,
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer le choix du repas.",
      );
    }
  }

  async function handleGenerateQr() {
    if (!activeSession?.selectedMealBlendId || !supabaseClient || !session?.user) {
      setFeedbackMessage("Choisis d'abord ton plat avant de generer le QR.");
      return;
    }

    try {
      setIsBusy(true);
      setFeedbackMessage(null);
      await cancelActiveTokens(supabaseClient, session.user.id);
      const nextToken = await createDispenseToken(
        supabaseClient,
        session.user.id,
        activeSession.id,
      );
      setActiveToken(nextToken);
      setFeedbackMessage("QR FEATNESS genere. Tu peux maintenant finaliser sur la borne.");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible de generer le QR.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  const showProfileOnboarding = Boolean(session?.user && profile && !profile.onboardingCompleted);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <AnimatedSection delay={0}>
          <View style={styles.hero}>
            <View style={styles.heroGlowGold} />
            <View style={styles.heroGlowMint} />
            <Text style={styles.eyebrow}>FEATNESS Mobile</Text>
            <Text style={styles.title}>Ton plat en quelques clics</Text>
            <Text style={styles.subtitle}>
              Profil sante, seances utiles, recommandation repas. FEATNESS va droit au but
              pour te proposer rapidement le bon plat.
            </Text>
            <View style={styles.heroStats}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillValue}>
                  {session?.user ? "Connecte" : "Invite"}
                </Text>
                <Text style={styles.heroPillLabel}>Etat</Text>
              </View>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillValue}>
                  {history.length > 0 ? history.length : 0}
                </Text>
                <Text style={styles.heroPillLabel}>Seances</Text>
              </View>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillValue}>
                  {profile?.favoriteMealIds.length ?? 0}
                </Text>
                <Text style={styles.heroPillLabel}>Favoris</Text>
              </View>
            </View>
          </View>
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <View style={styles.nextActionCard}>
            <Text style={styles.sectionEyebrow}>Statut rapide</Text>
            <Text style={styles.nextActionTitle}>Le chemin le plus court vers ton repas</Text>
            <Text style={styles.nextActionDescription}>{quickStatus}</Text>
          </View>
        </AnimatedSection>

        <AnimatedSection delay={140}>
          <AuthCard
            email={email}
            password={password}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSignIn={() => void handleSignIn()}
            onSignInTest={() => void handleTestUserSignIn()}
            onSignUp={() => void handleSignUp()}
            onSignOut={() => void handleSignOut()}
            isBusy={isBusy}
            isConfigured={supabaseEnabled}
            sessionEmail={session?.user.email ?? null}
            message={null}
          />
        </AnimatedSection>

        {feedbackMessage ? (
          <AnimatedSection delay={170}>
            <View
              style={[
                styles.feedbackBanner,
                feedbackTone === "success"
                  ? styles.feedbackSuccess
                  : feedbackTone === "warning"
                    ? styles.feedbackWarning
                    : null,
              ]}
            >
              <Text style={styles.feedbackEyebrow}>
                {feedbackTone === "success"
                  ? "Statut"
                  : feedbackTone === "warning"
                    ? "Attention"
                    : "Information"}
              </Text>
              <Text style={styles.feedbackText}>{feedbackMessage}</Text>
            </View>
          </AnimatedSection>
        ) : null}

        {session?.user ? (
          <>
            <AnimatedSection delay={220}>
              <ProfileCard
                age={age}
                weightKg={weightKg}
                heightCm={heightCm}
                primaryObjective={primaryObjective}
                bmiInsight={bmiInsight}
                onAgeChange={setAge}
                onWeightChange={setWeightKg}
                onHeightChange={setHeightCm}
                onObjectiveChange={setPrimaryObjective}
                onSave={() => void handleSaveProfile()}
                isBusy={isBusy}
                isComplete={Boolean(profile?.onboardingCompleted)}
              />
            </AnimatedSection>

            <AnimatedSection delay={260}>
              <SessionSuggestionsCard
                suggestions={sessionSuggestions}
                onStartSuggestion={(suggestion) => void handleStartSuggestedSession(suggestion)}
                isBusy={isBusy || showProfileOnboarding}
              />
            </AnimatedSection>

            <AnimatedSection delay={300}>
              <SuggestedMealsCard
                meals={suggestedMeals}
                goal={activeSession?.workout.goal ?? "recovery"}
                selectedMealId={selectedMealId}
                favoriteMealIds={profile?.favoriteMealIds ?? []}
                onSelectMeal={setSelectedMealId}
              />
            </AnimatedSection>

            <AnimatedSection delay={340}>
              <MealDetailCard
                meal={selectedMeal}
                goal={activeSession?.workout.goal ?? "recovery"}
                isFavorite={selectedMeal ? profile?.favoriteMealIds.includes(selectedMeal.id) ?? false : false}
                onToggleFavorite={() => void handleToggleFavoriteMeal()}
                onConfirmChoice={() => void handleConfirmMealChoice()}
              />
            </AnimatedSection>

            {activeSession ? (
              <AnimatedSection delay={380}>
                <ActiveTokenCard
                  token={activeToken}
                  session={activeSession}
                  onGenerate={() => void handleGenerateQr()}
                  isBusy={isBusy || showProfileOnboarding}
                />
              </AnimatedSection>
            ) : null}

            {history.length > 0 ? (
              <AnimatedSection delay={420}>
                <HistoryCard sessions={history} mealNamesById={mealNamesById} />
              </AnimatedSection>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  hero: {
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: theme.spacing.sm,
    ...mobileShadow,
  },
  heroGlowGold: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(201,166,70,0.16)",
    top: -60,
    right: -20,
  },
  heroGlowMint: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(111,212,168,0.12)",
    bottom: -50,
    left: -30,
  },
  eyebrow: {
    color: theme.colors.gold,
    textTransform: "uppercase",
    letterSpacing: 2.4,
    fontSize: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 40,
  },
  subtitle: {
    color: theme.colors.textSoft,
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 340,
  },
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  heroPill: {
    minWidth: 94,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.lg,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroPillValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  heroPillLabel: {
    marginTop: 4,
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionEyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.6,
  },
  nextActionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: theme.spacing.sm,
    ...mobileShadow,
  },
  nextActionTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  nextActionDescription: {
    color: theme.colors.textSoft,
    lineHeight: 22,
  },
  feedbackBanner: {
    borderRadius: 22,
    padding: theme.spacing.md,
    borderWidth: 1,
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    gap: 6,
  },
  feedbackSuccess: {
    backgroundColor: "rgba(111,212,168,0.1)",
    borderColor: "rgba(111,212,168,0.28)",
  },
  feedbackWarning: {
    backgroundColor: "rgba(201,166,70,0.12)",
    borderColor: theme.colors.borderStrong,
  },
  feedbackEyebrow: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  feedbackText: {
    color: theme.colors.text,
    lineHeight: 20,
  },
});
