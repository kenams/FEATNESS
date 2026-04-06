import { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import type { Session } from "@supabase/supabase-js";

import {
  buildNutritionRecommendation,
  isExpired,
  type DispenseTokenRecord,
  type GoalKey,
  type IntensityLevel,
  type SportKey,
  type UserProfile,
  type UserWorkoutInput,
  type WorkoutSessionRecord,
} from "@featness/shared";

import { ActiveTokenCard } from "./src/components/active-token-card";
import { AnimatedSection } from "./src/components/animated-section";
import { AuthCard } from "./src/components/auth-card";
import { HistoryCard } from "./src/components/history-card";
import { MealDetailCard } from "./src/components/meal-detail-card";
import { PreferencesCard } from "./src/components/preferences-card";
import { ProfileCard } from "./src/components/profile-card";
import { RecommendationCard } from "./src/components/recommendation-card";
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

type JourneyStep = {
  key: string;
  title: string;
  description: string;
  done: boolean;
};

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
  const [sport, setSport] = useState<SportKey>("running");
  const [intensity, setIntensity] = useState<IntensityLevel>("moderate");
  const [goal, setGoal] = useState<GoalKey>("recovery");
  const [durationMin, setDurationMin] = useState("45");
  const [weightKg, setWeightKg] = useState("78");
  const [fullName, setFullName] = useState("");
  const [gymName, setGymName] = useState("");
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
  const hasActiveQr = Boolean(activeToken && activeSession);
  const hasSelectedMeal = Boolean(activeSession?.selectedMealBlendId);
  const feedbackTone = getFeedbackTone(feedbackMessage);
  const journeySteps = useMemo<JourneyStep[]>(
    () => [
      {
        key: "auth",
        title: "Connexion",
        description: session?.user ? "Session FEATNESS activee" : "Accede a ton espace mobile",
        done: Boolean(session?.user),
      },
      {
        key: "profile",
        title: "Profil",
        description: hasCompletedOnboarding ? "Profil et poids enregistres" : "Complete ton onboarding",
        done: hasCompletedOnboarding,
      },
      {
        key: "session",
        title: "Seance",
        description: activeSession ? "Reco calculee et session creee" : "Configure ton effort du jour",
        done: Boolean(activeSession),
      },
      {
        key: "qr",
        title: "QR",
        description: hasActiveQr ? "Token de distribution genere" : "Genere le QR FEATNESS",
        done: hasActiveQr,
      },
      {
        key: "meal",
        title: "Plat",
        description: hasSelectedMeal ? "Repas retenu et synchronise" : "Choisis ton repas conseille",
        done: hasSelectedMeal,
      },
    ],
    [activeSession, hasActiveQr, hasCompletedOnboarding, hasSelectedMeal, session?.user],
  );

  const nextAction = useMemo(() => {
    if (!session?.user) {
      return {
        eyebrow: "Etape 1",
        title: "Connecte-toi pour demarrer un flux complet",
        description:
          "Le compte test te donne un parcours immediat sans configuration supplementaire.",
        cta: "Utilise le bouton Connexion test pour ouvrir un scenario de demo en quelques secondes.",
      };
    }

    if (!hasCompletedOnboarding) {
      return {
        eyebrow: "Etape 2",
        title: "Termine ton onboarding",
        description:
          "Nom, poids et salle suffisent pour fiabiliser la recommandation et la persistance Supabase.",
        cta: "Renseigne ton profil puis sauvegarde pour debloquer le QR FEATNESS.",
      };
    }

    if (!activeSession) {
      return {
        eyebrow: "Etape 3",
        title: "Lance une seance",
        description:
          "Tu peux renseigner ta vraie session ou utiliser la demo en un clic pour aller plus vite.",
        cta: "Le meilleur raccourci ici est Lancer une seance test en 1 clic.",
      };
    }

    if (!hasActiveQr) {
      return {
        eyebrow: "Etape 4",
        title: "Genere ton QR FEATNESS",
        description:
          "Le QR fige la session et cree le point de passage vers la distribution et le choix repas.",
        cta: "Genere le QR puis descends juste apres pour comparer les plats proposes.",
      };
    }

    if (!hasSelectedMeal) {
      return {
        eyebrow: "Etape 5",
        title: "Choisis le plat le plus coherent",
        description:
          "FEATNESS classe deja les options. Tu peux valider la meilleure ou garder une alternative favorite.",
        cta: "Ouvre le detail d'un plat puis appuie sur Choix retenu.",
      };
    }

    return {
      eyebrow: "Flux complet",
      title: "Ton parcours FEATNESS est pret",
      description:
        "Profil, session, QR et repas retenu sont maintenant alignes et synchronises.",
      cta: "Tu peux maintenant rejouer une nouvelle session ou consulter l'historique pour comparer tes choix.",
    };
  }, [activeSession, hasActiveQr, hasCompletedOnboarding, hasSelectedMeal, session?.user]);
  const storyHighlights = useMemo(
    () =>
      session?.user
        ? [
            "Profil et preferences gardent ta logique FEATNESS d'une seance a l'autre.",
            "Le QR connecte la reco, la session et le choix repas dans un meme fil narratif.",
            "Chaque favori et chaque choix enrichissent aussi le dashboard admin.",
          ]
        : [
            "Connexion test pour entrer tout de suite dans un parcours realiste.",
            "Seance, QR et plats recommandes s'enchainent sans quitter l'app.",
            "Les choix retenus remontent dans Supabase pour le suivi produit FEATNESS.",
          ],
    [session?.user],
  );

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
            : null;

        setProfile(nextProfile);
        setFullName(nextProfile?.fullName ?? "");
        setGymName(nextProfile?.gymName ?? "");
        setWeightKg(String(nextProfile?.weightKg ?? 78));
        setSport(nextProfile?.preferredSport ?? "running");
        setGoal(nextProfile?.preferredGoal ?? "recovery");
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

    const nextToken = await createDispenseToken(
      supabaseClient,
      session.user.id,
      nextSession.id,
    );

    setActiveSession(nextSession);
    setActiveToken(nextToken);
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

    setIsBusy(true);
    setFeedbackMessage(null);

    try {
      const nextProfile = await saveProfile(supabaseClient, session.user.id, {
        email: session.user.email ?? "",
        fullName: fullName.trim(),
        weightKg: Number(weightKg) || 0,
        gymName: gymName.trim(),
      });

      setProfile(nextProfile);
      setWeightKg(String(nextProfile.weightKg ?? weightKg));
      setFeedbackMessage("Profil FEATNESS sauvegarde.");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer le profil.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleSaveCurrentPreferences() {
    if (!supabaseClient || !session?.user || !profile) {
      return;
    }

    try {
      const nextProfile = await saveUserPreferences(supabaseClient, session.user.id, {
        preferredSport: sport,
        preferredGoal: goal,
        favoriteMealIds: profile.favoriteMealIds,
      });

      setProfile(nextProfile);
      setFeedbackMessage("Preferences FEATNESS synchronisees dans Supabase.");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible de sauvegarder les preferences.",
      );
    }
  }

  async function handleGenerateQr() {
    if (!supabaseClient || !session?.user || !profile?.onboardingCompleted) {
      setFeedbackMessage("Complete d'abord ton profil FEATNESS avant de generer un QR.");
      return;
    }

    setIsBusy(true);
    setFeedbackMessage(null);

    try {
      await createSessionFlow(
        {
          sport,
          intensity,
          goal,
          durationMin: Number(durationMin) || 0,
          weightKg: Number(weightKg) || 0,
        },
        recommendation,
        "QR FEATNESS genere. Les plats recommandes sont maintenant visibles sous le QR.",
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Generation du QR impossible.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRunDemoSession() {
    if (!supabaseClient || !session?.user) {
      setFeedbackMessage("Connecte-toi d'abord pour lancer une seance test.");
      return;
    }

    const demoWorkout: UserWorkoutInput = {
      sport: "strength",
      intensity: "moderate",
      goal: "recovery",
      durationMin: 42,
      weightKg: Number(weightKg) || 78,
    };

    setIsBusy(true);
    setFeedbackMessage(null);

    try {
      let nextProfile = profile;

      if (!profile?.onboardingCompleted) {
        nextProfile = await saveProfile(supabaseClient, session.user.id, {
          email: session.user.email ?? "",
          fullName: fullName.trim() || "Utilisateur FEATNESS Demo",
          weightKg: demoWorkout.weightKg,
          gymName: gymName.trim() || "FEATNESS Demo Club",
        });

        setProfile(nextProfile);
        setFullName(nextProfile.fullName ?? fullName);
        setGymName(nextProfile.gymName ?? gymName);
        setWeightKg(String(nextProfile.weightKg ?? demoWorkout.weightKg));
      }

      const profileWithPreferences = await saveUserPreferences(
        supabaseClient,
        session.user.id,
        {
          preferredSport: demoWorkout.sport,
          preferredGoal: demoWorkout.goal,
          favoriteMealIds: nextProfile?.favoriteMealIds ?? profile?.favoriteMealIds ?? [],
        },
      );

      setProfile(profileWithPreferences);
      setSport(demoWorkout.sport);
      setIntensity(demoWorkout.intensity);
      setGoal(demoWorkout.goal);
      setDurationMin(String(demoWorkout.durationMin));

      const demoRecommendation = buildNutritionRecommendation(demoWorkout);

      await createSessionFlow(
        demoWorkout,
        demoRecommendation,
        "Seance test lancee. QR genere, plats proposes et detail repas prets pour la demo.",
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Seance test impossible.",
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

      setActiveSession(updatedSession);
      setHistory((previousHistory) =>
        previousHistory.map((sessionItem) =>
          sessionItem.id === updatedSession.id ? updatedSession : sessionItem,
        ),
      );
      setFeedbackMessage(
        `${selectedMeal.name} retenu pour cette seance. Le choix est maintenant synchronise dans Supabase.`,
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer le choix du repas.",
      );
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
            <Text style={styles.title}>Coach nutrition post-effort</Text>
            <Text style={styles.subtitle}>
              Un parcours unique pour ton profil, ta seance, ton QR FEATNESS et
              les repas recommandes les plus coherents avec ton objectif.
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
          <View style={styles.journeyCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>Parcours</Text>
                <Text style={styles.sectionTitle}>Ou tu en es dans le flux</Text>
              </View>
              <View style={styles.progressPill}>
                <Text style={styles.progressPillText}>
                  {journeySteps.filter((step) => step.done).length}/{journeySteps.length}
                </Text>
              </View>
            </View>
            <View style={styles.journeyGrid}>
              {journeySteps.map((step, index) => (
                <View
                  key={step.key}
                  style={[styles.journeyStep, step.done && styles.journeyStepDone]}
                >
                  <View style={[styles.journeyIndex, step.done && styles.journeyIndexDone]}>
                    <Text style={[styles.journeyIndexText, step.done && styles.journeyIndexTextDone]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.journeyCopy}>
                    <Text style={styles.journeyTitle}>{step.title}</Text>
                    <Text style={styles.journeyDescription}>{step.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </AnimatedSection>

        <AnimatedSection delay={140}>
          <View style={styles.nextActionCard}>
            <Text style={styles.sectionEyebrow}>{nextAction.eyebrow}</Text>
            <Text style={styles.nextActionTitle}>{nextAction.title}</Text>
            <Text style={styles.nextActionDescription}>{nextAction.description}</Text>
            <Text style={styles.nextActionCta}>{nextAction.cta}</Text>
          </View>
        </AnimatedSection>

        <AnimatedSection delay={170}>
          <View style={styles.storyCard}>
            <Text style={styles.sectionEyebrow}>
              {session?.user ? "Pourquoi ce flux compte" : "Avant de commencer"}
            </Text>
            <Text style={styles.storyTitle}>
              {session?.user
                ? "FEATNESS relie ton effort a une decision nutrition concrete"
                : "Trois promesses produit en une seule experience mobile"}
            </Text>
            <View style={styles.storyList}>
              {storyHighlights.map((item, index) => (
                <View key={item} style={styles.storyItem}>
                  <View style={styles.storyBullet}>
                    <Text style={styles.storyBulletText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.storyCopy}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedSection>

        <AnimatedSection delay={200}>
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
            message={feedbackMessage}
          />
        </AnimatedSection>

        {feedbackMessage ? (
          <AnimatedSection delay={240}>
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
            <AnimatedSection delay={280}>
              <ProfileCard
                fullName={fullName}
                weightKg={weightKg}
                gymName={gymName}
                onFullNameChange={setFullName}
                onWeightChange={setWeightKg}
                onGymChange={setGymName}
                onSave={() => void handleSaveProfile()}
                isBusy={isBusy}
                isComplete={Boolean(profile?.onboardingCompleted)}
              />
            </AnimatedSection>

            <AnimatedSection delay={320}>
              <PreferencesCard
                preferredSport={profile?.preferredSport ?? null}
                preferredGoal={profile?.preferredGoal ?? null}
                preferredGymName={profile?.gymName ?? null}
                favoriteCount={profile?.favoriteMealIds.length ?? 0}
                onSaveCurrent={() => void handleSaveCurrentPreferences()}
              />
            </AnimatedSection>

            <AnimatedSection delay={360}>
              <RecommendationCard
                sport={sport}
                intensity={intensity}
                goal={goal}
                durationMin={durationMin}
                weightKg={weightKg}
                recommendation={recommendation}
                onSportChange={setSport}
                onIntensityChange={setIntensity}
                onGoalChange={setGoal}
                onDurationChange={setDurationMin}
                onWeightChange={setWeightKg}
                onRunDemoSession={() => void handleRunDemoSession()}
                isBusy={isBusy}
              />
            </AnimatedSection>

            <AnimatedSection delay={400}>
              <ActiveTokenCard
                token={activeToken}
                session={activeSession}
                onGenerate={() => void handleGenerateQr()}
                isBusy={isBusy || showProfileOnboarding}
              />
            </AnimatedSection>

            <AnimatedSection delay={440}>
              <SuggestedMealsCard
                meals={suggestedMeals}
                goal={activeSession?.workout.goal ?? goal}
                selectedMealId={selectedMealId}
                favoriteMealIds={profile?.favoriteMealIds ?? []}
                onSelectMeal={setSelectedMealId}
              />
            </AnimatedSection>

            <AnimatedSection delay={480}>
              <MealDetailCard
                meal={selectedMeal}
                goal={activeSession?.workout.goal ?? goal}
                isFavorite={selectedMeal ? profile?.favoriteMealIds.includes(selectedMeal.id) ?? false : false}
                onToggleFavorite={() => void handleToggleFavoriteMeal()}
                onConfirmChoice={() => void handleConfirmMealChoice()}
              />
            </AnimatedSection>

            <AnimatedSection delay={520}>
              <HistoryCard sessions={history} mealNamesById={mealNamesById} />
            </AnimatedSection>

            <AnimatedSection delay={560}>
              <View style={styles.footerCard}>
                <Text style={styles.sectionEyebrow}>Suite</Text>
                <Text style={styles.footerTitle}>Continue a enrichir ton profil FEATNESS</Text>
                <Text style={styles.footerCopy}>
                  Plus tu sauvegardes de seances et de favoris, plus le dashboard et les futures experiences
                  FEATNESS deviennent utiles pour le suivi produit.
                </Text>
                <Pressable style={styles.footerGhostButton}>
                  <Text style={styles.footerGhostButtonText}>Historique et preferences deja synchronises</Text>
                </Pressable>
              </View>
            </AnimatedSection>
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
  journeyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
    ...mobileShadow,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  sectionEyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.6,
  },
  sectionTitle: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  progressPill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progressPillText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  journeyGrid: {
    gap: theme.spacing.sm,
  },
  journeyStep: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
  },
  journeyStepDone: {
    borderColor: "rgba(111,212,168,0.25)",
    backgroundColor: "rgba(111,212,168,0.08)",
  },
  journeyIndex: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  journeyIndexDone: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  journeyIndexText: {
    color: theme.colors.textMuted,
    fontWeight: "700",
  },
  journeyIndexTextDone: {
    color: theme.colors.ink,
  },
  journeyCopy: {
    flex: 1,
    gap: 4,
  },
  journeyTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  journeyDescription: {
    color: theme.colors.textMuted,
    lineHeight: 19,
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
  nextActionCta: {
    color: theme.colors.gold,
    lineHeight: 21,
    fontWeight: "600",
  },
  storyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
    ...mobileShadow,
  },
  storyTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  storyList: {
    gap: 10,
    marginTop: 4,
  },
  storyItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  storyBullet: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.goldSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  storyBulletText: {
    color: "#f1d893",
    fontWeight: "700",
    fontSize: 12,
  },
  storyCopy: {
    flex: 1,
    color: theme.colors.textSoft,
    lineHeight: 20,
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
  footerCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
    ...mobileShadow,
  },
  footerTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  footerCopy: {
    color: theme.colors.textMuted,
    lineHeight: 21,
  },
  footerGhostButton: {
    marginTop: 4,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
  },
  footerGhostButtonText: {
    color: theme.colors.textSoft,
    textAlign: "center",
    fontWeight: "600",
  },
});
