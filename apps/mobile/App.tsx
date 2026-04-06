import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Session } from "@supabase/supabase-js";

import {
  buildNutritionRecommendation,
  buildSessionSuggestions,
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
import { getMobileSupabaseClient, isMobileSupabaseConfigured } from "./src/lib/supabase";
import { mobileShadow, theme } from "./src/theme";

const TEST_USER_EMAIL = "featness.user.demo@mailinator.com";
const TEST_USER_PASSWORD = "test123456";

type SuggestedMeal = DrinkBlendRecord & {
  rank: number;
  score: number;
};

type JourneyStep = {
  key: string;
  label: string;
  status: "done" | "current" | "upcoming";
};

type ScreenKey = "home" | "sessions" | "meals" | "qr" | "profile";

type ScreenMeta = {
  eyebrow: string;
  title: string;
  description: string;
  background: string;
  panel: string;
  glow: string;
  accent: string;
};

const SCREEN_META: Record<ScreenKey, ScreenMeta> = {
  home: {
    eyebrow: "Accueil",
    title: "Ton plat sans scroll inutile",
    description:
      "Un point d'entree simple, puis FEATNESS te guide et t'emmene vers la prochaine etape utile.",
    background: "#07110f",
    panel: "#10211d",
    glow: "rgba(201,166,70,0.18)",
    accent: theme.colors.gold,
  },
  sessions: {
    eyebrow: "Seances",
    title: "Choisis ton effort, FEATNESS gere la suite",
    description:
      "Trois seances utiles, un seul choix a faire, puis les plats apparaissent directement.",
    background: "#081715",
    panel: "#0f241f",
    glow: "rgba(111,212,168,0.18)",
    accent: theme.colors.mint,
  },
  meals: {
    eyebrow: "Plats",
    title: "Trois recommandations, une decision rapide",
    description:
      "Tu compares uniquement l'essentiel : alignement, macros, prix et temps de preparation.",
    background: "#161107",
    panel: "#241b0c",
    glow: "rgba(201,166,70,0.22)",
    accent: theme.colors.gold,
  },
  qr: {
    eyebrow: "QR",
    title: "Le QR reste secondaire",
    description:
      "Le repas est deja choisi. Le QR ne sert qu'a finaliser plus tard sur la borne si necessaire.",
    background: "#0a1318",
    panel: "#11212c",
    glow: "rgba(148,206,255,0.2)",
    accent: "#94ceff",
  },
  profile: {
    eyebrow: "Profil",
    title: "Ta fiche sante et ton historique",
    description:
      "IMC, objectif, favoris et dernieres seances restent accessibles sans alourdir le reste du parcours.",
    background: "#0d1219",
    panel: "#171e28",
    glow: "rgba(179,191,210,0.18)",
    accent: "#c0ccda",
  },
};

const TAB_ITEMS: Array<{
  key: ScreenKey;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { key: "home", label: "Accueil", icon: "view-dashboard-outline" },
  { key: "sessions", label: "Seances", icon: "run-fast" },
  { key: "meals", label: "Plats", icon: "silverware-fork-knife" },
  { key: "qr", label: "QR", icon: "qrcode-scan" },
  { key: "profile", label: "Profil", icon: "account-circle-outline" },
];

const HOME_PROMISES: Array<{
  key: string;
  title: string;
  copy: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  {
    key: "health",
    title: "Fiche sante minimale",
    copy: "Age, taille, poids et objectif suffisent pour demarrer.",
    icon: "heart-pulse",
  },
  {
    key: "session",
    title: "Seance suggeree",
    copy: "FEATNESS propose trois options directement exploitables.",
    icon: "lightning-bolt-outline",
  },
  {
    key: "meal",
    title: "Plat choisi vite",
    copy: "Le repas arrive avant le QR, pas apres.",
    icon: "food-apple-outline",
  },
];

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

function getRecommendedScreen(
  hasUser: boolean,
  hasCompletedOnboarding: boolean,
  hasSession: boolean,
  hasSelectedMeal: boolean,
  hasToken: boolean,
): ScreenKey {
  if (!hasUser) {
    return "home";
  }

  if (!hasCompletedOnboarding) {
    return "profile";
  }

  if (!hasSession) {
    return "sessions";
  }

  if (!hasSelectedMeal) {
    return "meals";
  }

  if (!hasToken) {
    return "qr";
  }

  return "home";
}

function formatPrimaryObjectiveLabel(value: PrimaryObjectiveKey): string {
  switch (value) {
    case "lose_weight":
      return "Perte de poids";
    case "maintain":
      return "Maintien";
    case "gain_muscle":
      return "Prise de muscle";
    case "improve_endurance":
      return "Endurance";
    default:
      return value;
  }
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
  const [currentScreen, setCurrentScreen] = useState<ScreenKey>("home");
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(0)).current;

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
  const confirmedMealId = activeSession?.selectedMealBlendId ?? null;
  const hasSelectedMeal = Boolean(confirmedMealId);
  const feedbackTone = getFeedbackTone(feedbackMessage);
  const recommendedScreen = useMemo(
    () =>
      getRecommendedScreen(
        Boolean(session?.user),
        hasCompletedOnboarding,
        Boolean(activeSession),
        hasSelectedMeal,
        Boolean(activeToken),
      ),
    [activeSession, activeToken, hasCompletedOnboarding, hasSelectedMeal, session?.user],
  );

  const currentJourney = useMemo<JourneyStep[]>(
    () => [
      {
        key: "account",
        label: "Compte",
        status: session?.user ? "done" : "current",
      },
      {
        key: "health",
        label: "Profil",
        status: !session?.user
          ? "upcoming"
          : hasCompletedOnboarding
            ? "done"
            : currentScreen === "profile"
              ? "current"
              : "upcoming",
      },
      {
        key: "session",
        label: "Seance",
        status: !session?.user || !hasCompletedOnboarding
          ? "upcoming"
          : activeSession
            ? "done"
            : currentScreen === "sessions"
              ? "current"
              : "upcoming",
      },
      {
        key: "meal",
        label: "Plat",
        status: !session?.user || !hasCompletedOnboarding || !activeSession
          ? "upcoming"
          : hasSelectedMeal
            ? "done"
            : currentScreen === "meals"
              ? "current"
              : "upcoming",
      },
      {
        key: "qr",
        label: "QR",
        status: !hasSelectedMeal
          ? "upcoming"
          : activeToken
            ? "done"
            : currentScreen === "qr"
              ? "current"
              : "upcoming",
      },
    ],
    [
      activeSession,
      activeToken,
      currentScreen,
      hasCompletedOnboarding,
      hasSelectedMeal,
      session?.user,
    ],
  );

  const quickStatus = useMemo(() => {
    if (!session?.user) {
      return "Connecte-toi puis laisse FEATNESS te guider ecran par ecran vers ton repas.";
    }

    if (!hasCompletedOnboarding) {
      return "Commence par la fiche sante. Age, poids, taille et objectif suffisent pour debloquer la suite.";
    }

    if (!activeSession) {
      return "Passe a l'ecran Seances. Tu y trouveras trois options directement basees sur ton profil.";
    }

    if (!hasSelectedMeal) {
      return "Passe a l'ecran Plats. Les trois recommandations sont deja triees pour aller vite.";
    }

    if (!activeToken) {
      return "Ton repas est choisi. Le QR est pret a etre genere ensuite, sans urgence.";
    }

    return "Tout est pret : repas choisi, QR genere, parcours termine.";
  }, [activeSession, activeToken, hasCompletedOnboarding, hasSelectedMeal, session?.user]);

  const mealNamesById = useMemo(
    () =>
      Object.fromEntries(availableMeals.map((meal) => [meal.id, meal.name])) as Record<
        string,
        string
      >,
    [availableMeals],
  );

  const latestSelectedMealName = (confirmedMealId && mealNamesById[confirmedMealId]) || null;

  const screenMeta = SCREEN_META[currentScreen];

  useEffect(() => {
    screenOpacity.setValue(0);
    screenTranslateY.setValue(18);

    Animated.parallel([
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(screenTranslateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentScreen, screenOpacity, screenTranslateY]);

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
      setCurrentScreen("home");
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
    if (!session?.user) {
      return;
    }

    setCurrentScreen((previousScreen) => {
      if (!hasCompletedOnboarding && ["sessions", "meals", "qr"].includes(previousScreen)) {
        return "profile";
      }

      if (!activeSession && ["meals", "qr"].includes(previousScreen)) {
        return "sessions";
      }

      if (!hasSelectedMeal && previousScreen === "qr") {
        return "meals";
      }

      return previousScreen;
    });
  }, [activeSession, hasCompletedOnboarding, hasSelectedMeal, session?.user]);

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

  function canOpenScreen(screen: ScreenKey): boolean {
    switch (screen) {
      case "home":
        return true;
      case "profile":
        return Boolean(session?.user);
      case "sessions":
        return Boolean(session?.user && hasCompletedOnboarding);
      case "meals":
        return Boolean(session?.user && activeSession);
      case "qr":
        return Boolean(session?.user && hasSelectedMeal);
      default:
        return false;
    }
  }

  function openScreen(screen: ScreenKey) {
    if (canOpenScreen(screen)) {
      setCurrentScreen(screen);
      return;
    }

    if (!session?.user) {
      setFeedbackMessage("Connecte-toi d'abord pour acceder aux autres ecrans.");
      return;
    }

    if (!hasCompletedOnboarding) {
      setFeedbackMessage("Complete d'abord la fiche sante.");
      setCurrentScreen("profile");
      return;
    }

    if (!activeSession) {
      setFeedbackMessage("Choisis d'abord une seance.");
      setCurrentScreen("sessions");
      return;
    }

    if (!hasSelectedMeal) {
      setFeedbackMessage("Valide d'abord un plat.");
      setCurrentScreen("meals");
    }
  }

  function openRecommendedStep() {
    openScreen(recommendedScreen);
  }

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
    if (!error) {
      setCurrentScreen("home");
    }
    setFeedbackMessage(
      error ? error.message : "Connexion reussie. Tu peux maintenant avancer ecran par ecran.",
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
    if (!error) {
      setCurrentScreen("home");
    }
    setFeedbackMessage(
      error
        ? error.message
        : "Compte cree. Connecte-toi puis complete la fiche sante pour lancer FEATNESS.",
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
    if (!error) {
      setCurrentScreen("home");
    }
    setFeedbackMessage(
      error ? error.message : "Compte test charge. Le parcours FEATNESS est pret a etre joue.",
    );
  }

  async function handleSignOut() {
    if (!supabaseClient) {
      setSession(null);
      setCurrentScreen("home");
      setFeedbackMessage("Mode demo : aucune session distante a fermer.");
      return;
    }

    setIsBusy(true);
    const { error } = await supabaseClient.auth.signOut();
    setIsBusy(false);
    setCurrentScreen("home");
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
      setCurrentScreen("sessions");
      setFeedbackMessage("Profil sante FEATNESS sauvegarde. Passe maintenant aux seances.");
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
        `${suggestion.title} lancee. Tu arrives maintenant directement sur les plats recommandes.`,
      );
      setCurrentScreen("meals");
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
      setIsBusy(true);
      setFeedbackMessage(null);
      const updatedSession = await saveSelectedMealChoice(
        supabaseClient,
        session.user.id,
        activeSession.id,
        selectedMeal.id,
      );
      await cancelActiveTokens(supabaseClient, session.user.id);

      setActiveSession(updatedSession);
      setActiveToken(null);
      setCurrentScreen("qr");
      setHistory((previousHistory) =>
        previousHistory.map((sessionItem) =>
          sessionItem.id === updatedSession.id ? updatedSession : sessionItem,
        ),
      );
      setFeedbackMessage(
        `${selectedMeal.name} retenu. Le choix est synchronise. Tu peux maintenant generer le QR si besoin.`,
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer le choix du repas.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleGenerateQr() {
    if (!hasSelectedMeal || !activeSession || !supabaseClient || !session?.user) {
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
      setCurrentScreen("qr");
      setFeedbackMessage("QR FEATNESS genere. Tu peux maintenant finaliser sur la borne si besoin.");
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible de generer le QR.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  const renderHomeScreen = () => (
    <>
      <AnimatedSection delay={0}>
        <View style={styles.heroStats}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillValue}>{session?.user ? "Connecte" : "Invite"}</Text>
            <Text style={styles.heroPillLabel}>Etat</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillValue}>{history.length}</Text>
            <Text style={styles.heroPillLabel}>Seances</Text>
          </View>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillValue}>{profile?.favoriteMealIds.length ?? 0}</Text>
            <Text style={styles.heroPillLabel}>Favoris</Text>
          </View>
        </View>
      </AnimatedSection>

      <AnimatedSection delay={70}>
        <View style={styles.nextActionCard}>
          <Text style={styles.sectionEyebrow}>Statut rapide</Text>
          <Text style={styles.nextActionTitle}>La prochaine etape utile</Text>
          <Text style={styles.nextActionDescription}>{quickStatus}</Text>
          {session?.user ? (
            <Pressable style={styles.primaryCta} onPress={openRecommendedStep}>
              <Text style={styles.primaryCtaText}>Ouvrir l'etape recommandee</Text>
            </Pressable>
          ) : null}
        </View>
      </AnimatedSection>

      {!session?.user ? (
        <AnimatedSection delay={120}>
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
            sessionEmail={session?.user?.email ?? null}
            message={null}
          />
        </AnimatedSection>
      ) : (
        <AnimatedSection delay={120}>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Objectif</Text>
              <Text style={styles.summaryValue}>
                {formatPrimaryObjectiveLabel(primaryObjective)}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>IMC</Text>
              <Text style={styles.summaryValue}>{bmiInsight?.bmi ?? "--"}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Plat retenu</Text>
              <Text style={styles.summaryValue} numberOfLines={2}>
                {latestSelectedMealName ?? "Aucun pour l'instant"}
              </Text>
            </View>
          </View>
        </AnimatedSection>
      )}

      <AnimatedSection delay={150}>
        <View style={styles.premiumStrip}>
          {HOME_PROMISES.map((promise) => (
            <View key={promise.key} style={styles.premiumCard}>
              <View style={styles.premiumIconWrap}>
                <MaterialCommunityIcons
                  name={promise.icon}
                  size={20}
                  color={theme.colors.gold}
                />
              </View>
              <Text style={styles.premiumTitle}>{promise.title}</Text>
              <Text style={styles.premiumCopy}>{promise.copy}</Text>
            </View>
          ))}
        </View>
      </AnimatedSection>

      {session?.user ? (
        <AnimatedSection delay={170}>
          <View style={styles.accountCard}>
            <Text style={styles.accountEyebrow}>Compte</Text>
            <Text style={styles.accountEmail}>{session.user.email ?? "Compte FEATNESS"}</Text>
            <Text style={styles.accountHint}>
              Utilise les onglets du bas pour avancer sans repasser par un long scroll.
            </Text>
            <Pressable style={styles.secondaryCta} onPress={() => void handleSignOut()}>
              <Text style={styles.secondaryCtaText}>Se deconnecter</Text>
            </Pressable>
          </View>
        </AnimatedSection>
      ) : null}
    </>
  );

  const renderSessionsScreen = () => {
    if (!session?.user || !hasCompletedOnboarding) {
      return (
        <AnimatedSection delay={0}>
          <View style={styles.prerequisiteCard}>
            <Text style={styles.prerequisiteTitle}>Complete d'abord la fiche sante</Text>
            <Text style={styles.prerequisiteText}>
              Age, poids, taille et objectif sont necessaires avant de recevoir des seances
              pertinentes.
            </Text>
            <Pressable style={styles.primaryCta} onPress={() => openScreen("profile")}>
              <Text style={styles.primaryCtaText}>Aller au profil</Text>
            </Pressable>
          </View>
        </AnimatedSection>
      );
    }

    return (
      <>
        <AnimatedSection delay={0}>
          <View style={styles.summaryBanner}>
            <View style={styles.summaryBannerItem}>
              <Text style={styles.summaryBannerLabel}>IMC</Text>
              <Text style={styles.summaryBannerValue}>{bmiInsight?.bmi ?? "--"}</Text>
            </View>
            <View style={styles.summaryBannerItem}>
              <Text style={styles.summaryBannerLabel}>Objectif</Text>
              <Text style={styles.summaryBannerValue}>
                {formatPrimaryObjectiveLabel(primaryObjective)}
              </Text>
            </View>
          </View>
        </AnimatedSection>
        <AnimatedSection delay={80}>
          <SessionSuggestionsCard
            suggestions={sessionSuggestions}
            onStartSuggestion={(suggestion) => void handleStartSuggestedSession(suggestion)}
            isBusy={isBusy}
          />
        </AnimatedSection>
      </>
    );
  };

  const renderMealsScreen = () => {
    if (!activeSession) {
      return (
        <AnimatedSection delay={0}>
          <View style={styles.prerequisiteCard}>
            <Text style={styles.prerequisiteTitle}>Choisis d'abord une seance</Text>
            <Text style={styles.prerequisiteText}>
              L'ecran Plats reste vide tant qu'aucune seance n'a ete lancee.
            </Text>
            <Pressable style={styles.primaryCta} onPress={() => openScreen("sessions")}>
              <Text style={styles.primaryCtaText}>Aller aux seances</Text>
            </Pressable>
          </View>
        </AnimatedSection>
      );
    }

    return (
      <>
        <AnimatedSection delay={0}>
          <SuggestedMealsCard
            meals={suggestedMeals}
            goal={activeSession.workout.goal}
            selectedMealId={selectedMealId}
            favoriteMealIds={profile?.favoriteMealIds ?? []}
            onSelectMeal={setSelectedMealId}
          />
        </AnimatedSection>
        <AnimatedSection delay={80}>
          <MealDetailCard
            meal={selectedMeal}
            goal={activeSession.workout.goal}
            isFavorite={
              selectedMeal ? profile?.favoriteMealIds.includes(selectedMeal.id) ?? false : false
            }
            onToggleFavorite={() => void handleToggleFavoriteMeal()}
            onConfirmChoice={() => void handleConfirmMealChoice()}
          />
        </AnimatedSection>
      </>
    );
  };

  const renderQrScreen = () => {
    if (!hasSelectedMeal) {
      return (
        <AnimatedSection delay={0}>
          <View style={styles.prerequisiteCard}>
            <Text style={styles.prerequisiteTitle}>Valide d'abord ton plat</Text>
            <Text style={styles.prerequisiteText}>
              Le QR n'apparait qu'une fois ton repas choisi, pour garder un parcours simple.
            </Text>
            <Pressable style={styles.primaryCta} onPress={() => openScreen("meals")}>
              <Text style={styles.primaryCtaText}>Aller aux plats</Text>
            </Pressable>
          </View>
        </AnimatedSection>
      );
    }

    return (
      <>
        <AnimatedSection delay={0}>
          <View style={styles.summaryBanner}>
            <View style={styles.summaryBannerItem}>
              <Text style={styles.summaryBannerLabel}>Repas choisi</Text>
              <Text style={styles.summaryBannerValue} numberOfLines={2}>
                {latestSelectedMealName ?? "Repas FEATNESS"}
              </Text>
            </View>
            <View style={styles.summaryBannerItem}>
              <Text style={styles.summaryBannerLabel}>Etat</Text>
              <Text style={styles.summaryBannerValue}>
                {activeToken ? "QR actif" : "QR a generer"}
              </Text>
            </View>
          </View>
        </AnimatedSection>
        <AnimatedSection delay={80}>
          <ActiveTokenCard
            token={activeToken}
            session={activeSession}
            canGenerate={hasSelectedMeal}
            onGenerate={() => void handleGenerateQr()}
            isBusy={isBusy}
          />
        </AnimatedSection>
      </>
    );
  };

  const renderProfileScreen = () => (
    <>
      <AnimatedSection delay={0}>
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

      {history.length > 0 ? (
        <AnimatedSection delay={80}>
          <HistoryCard sessions={history} mealNamesById={mealNamesById} />
        </AnimatedSection>
      ) : null}
    </>
  );

  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case "sessions":
        return renderSessionsScreen();
      case "meals":
        return renderMealsScreen();
      case "qr":
        return renderQrScreen();
      case "profile":
        return renderProfileScreen();
      case "home":
      default:
        return renderHomeScreen();
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: screenMeta.background }]}>
      <StatusBar style="light" />
      <View style={styles.shell}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <AnimatedSection delay={0}>
            <View style={[styles.hero, { backgroundColor: screenMeta.panel }]}>
              <View style={[styles.heroGlow, { backgroundColor: screenMeta.glow }]} />
              <Text style={[styles.eyebrow, { color: screenMeta.accent }]}>{screenMeta.eyebrow}</Text>
              <Text style={styles.title}>{screenMeta.title}</Text>
              <Text style={styles.subtitle}>{screenMeta.description}</Text>
              <View style={styles.journeyStrip}>
                {currentJourney.map((step) => (
                  <View
                    key={step.key}
                    style={[
                      styles.journeyChip,
                      step.status === "done"
                        ? styles.journeyChipDone
                        : step.status === "current"
                          ? [styles.journeyChipCurrent, { borderColor: screenMeta.accent }]
                          : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.journeyChipText,
                        step.status === "done"
                          ? styles.journeyChipTextDone
                          : step.status === "current"
                            ? [styles.journeyChipTextCurrent, { color: screenMeta.accent }]
                            : null,
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </AnimatedSection>

          {feedbackMessage ? (
            <AnimatedSection delay={40}>
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

          <Animated.View
            style={{
              opacity: screenOpacity,
              transform: [{ translateY: screenTranslateY }],
            }}
          >
            {renderCurrentScreen()}
          </Animated.View>
        </ScrollView>

        {session?.user ? (
          <View style={styles.tabBarWrap}>
            <View style={styles.tabBar}>
              {TAB_ITEMS.map((tab) => {
                const enabled = canOpenScreen(tab.key);
                const active = currentScreen === tab.key;

                return (
                  <Pressable
                    key={tab.key}
                    style={[
                      styles.tabButton,
                      active ? styles.tabButtonActive : null,
                      !enabled ? styles.tabButtonDisabled : null,
                    ]}
                    onPress={() => openScreen(tab.key)}
                    disabled={!enabled}
                  >
                    <MaterialCommunityIcons
                      name={tab.icon}
                      size={18}
                      color={
                        active
                          ? theme.colors.ink
                          : !enabled
                            ? theme.colors.textMuted
                            : theme.colors.textSoft
                      }
                    />
                    <Text
                      style={[
                        styles.tabButtonText,
                        active ? styles.tabButtonTextActive : null,
                        !enabled ? styles.tabButtonTextDisabled : null,
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  shell: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    paddingBottom: 132,
  },
  hero: {
    overflow: "hidden",
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: theme.spacing.sm,
    ...mobileShadow,
  },
  heroGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 999,
    top: -80,
    right: -20,
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 2.4,
    fontSize: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 40,
    maxWidth: 340,
  },
  subtitle: {
    color: theme.colors.textSoft,
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 360,
  },
  journeyStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  journeyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  journeyChipDone: {
    backgroundColor: theme.colors.mintSoft,
    borderColor: "rgba(111,212,168,0.28)",
  },
  journeyChipCurrent: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  journeyChipText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  journeyChipTextDone: {
    color: theme.colors.mint,
  },
  journeyChipTextCurrent: {
    fontWeight: "700",
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
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
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
  primaryCta: {
    marginTop: 6,
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  primaryCtaText: {
    color: theme.colors.ink,
    fontWeight: "700",
    textAlign: "center",
  },
  secondaryCta: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  secondaryCtaText: {
    color: theme.colors.text,
    fontWeight: "600",
    textAlign: "center",
  },
  summaryGrid: {
    gap: 12,
  },
  premiumStrip: {
    gap: 12,
  },
  premiumCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
    ...mobileShadow,
  },
  premiumIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.goldSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  premiumTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  premiumCopy: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 6,
    ...mobileShadow,
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  accountCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
    ...mobileShadow,
  },
  accountEyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.3,
  },
  accountEmail: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  accountHint: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  prerequisiteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 10,
    ...mobileShadow,
  },
  prerequisiteTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  prerequisiteText: {
    color: theme.colors.textSoft,
    lineHeight: 22,
  },
  summaryBanner: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  summaryBannerItem: {
    gap: 4,
  },
  summaryBannerLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  summaryBannerValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  tabBarWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  tabBar: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(6,10,10,0.92)",
    borderRadius: theme.radius.xl,
    padding: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  tabButton: {
    flex: 1,
    borderRadius: theme.radius.lg,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.gold,
  },
  tabButtonDisabled: {
    opacity: 0.42,
  },
  tabButtonText: {
    color: theme.colors.textSoft,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: theme.colors.ink,
  },
  tabButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
});
