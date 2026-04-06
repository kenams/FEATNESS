import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { Session } from "@supabase/supabase-js";

import {
  buildNutritionRecommendation,
  calculateHydrationNeeds,
  buildWorkoutRecoveryInsight,
  buildSessionSuggestions,
  calculateWeeklyRecoveryScore,
  calculateBmi,
  getOptimalConsumptionWindow,
  isExpired,
  rankMealsForWorkout,
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
import { ProfileCard } from "./src/components/profile-card";
import { SessionSuggestionsCard } from "./src/components/session-suggestions-card";
import { SuggestedMealsCard } from "./src/components/suggested-meals-card";
import { Badge } from "./src/components/ui/Badge";
import { Card } from "./src/components/ui/Card";
import { Skeleton } from "./src/components/ui/Skeleton";
import { StatCard } from "./src/components/ui/StatCard";
import { ToastProvider, useToast } from "./src/components/ui/Toast";
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
  saveWorkoutSessionNote,
  setWorkoutSessionFavorite,
  type DrinkBlendRecord,
} from "./src/lib/featness-data";
import { registerForPushNotificationsAsync } from "./src/lib/notifications";
import { getMobileSupabaseClient, isMobileSupabaseConfigured } from "./src/lib/supabase";
import { mobileShadow, theme } from "./src/theme";
import { MacroProgressBar } from "./src/components/macro-progress-bar";

const TEST_USER_EMAIL = "featness.user.demo@mailinator.com";
const TEST_USER_PASSWORD = "test123456";

type SuggestedMeal = DrinkBlendRecord & {
  rank: number;
  score: number;
  matchPercent: number;
  fitLabel: "ideal" | "solide" | "leger";
  fitReason: string;
  fitChips: string[];
  isRecommended: boolean;
  needs: {
    carbsTargetG: number;
    proteinTargetG: number;
    fatTargetG: number;
  };
};

type JourneyStep = {
  key: string;
  label: string;
  status: "done" | "current" | "upcoming";
};

type ScreenKey = "home" | "sessions" | "meals" | "qr" | "profile" | "history";

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
    eyebrow: "Recap",
    title: "Recap rapide avant retrait",
    description:
      "Tu verifies simplement ta seance et ton plat. Le QR ne se genere qu'apres cette validation finale.",
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
  history: {
    eyebrow: "Historique",
    title: "Ta progression de la semaine",
    description:
      "Retrouve tes seances, calories et repas FEATNESS sans perdre la vue d'ensemble.",
    background: "#0a1116",
    panel: "#14202a",
    glow: "rgba(148,206,255,0.16)",
    accent: "#94ceff",
  },
};

const TAB_ITEMS: Array<{
  key: ScreenKey;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}> = [
  { key: "home", label: "Accueil", icon: "home-outline" },
  { key: "sessions", label: "Seance", icon: "lightning-bolt-outline" },
  { key: "history", label: "Historique", icon: "format-list-bulleted-square" },
  { key: "profile", label: "Moi", icon: "account-circle-outline" },
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
    copy: "Le QR se genere juste apres validation du plat.",
    icon: "food-apple-outline",
  },
];

function getEffortCategoryLabel(category: DrinkBlendRecord["effortCategory"]): string {
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

function buildMenuMeals(meals: DrinkBlendRecord[]): SuggestedMeal[] {
  const effortOrder: Record<DrinkBlendRecord["effortCategory"], number> = {
    light: 0,
    medium: 1,
    intense: 2,
  };

  return [...meals]
    .sort((left, right) => {
      if (effortOrder[left.effortCategory] !== effortOrder[right.effortCategory]) {
        return effortOrder[left.effortCategory] - effortOrder[right.effortCategory];
      }

      return left.name.localeCompare(right.name);
    })
    .map((meal, index) => ({
      ...meal,
      rank: index + 1,
      score: 0,
      matchPercent: 0,
      fitLabel: "leger" as const,
      fitReason: "Disponible a la borne FEATNESS.",
      fitChips: [],
      isRecommended: false,
      needs: {
        carbsTargetG: 1,
        proteinTargetG: 1,
        fatTargetG: 1,
      },
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

function formatTokenRemaining(expiresAt: string, nowMs = Date.now()): string {
  const remainingMs = new Date(expiresAt).getTime() - nowMs;

  if (remainingMs <= 0) {
    return "expire";
  }

  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));

  return `${remainingMinutes} min`;
}

function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message =
    "message" in error && typeof error.message === "string"
      ? error.message.toLowerCase()
      : "";

  return (
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found")
  );
}

function formatRuntimeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
    };

    if (candidate.message) {
      return candidate.details
        ? `${candidate.message} (${candidate.details})`
        : candidate.message;
    }

    if (candidate.code) {
      return `${fallback} [${candidate.code}]`;
    }
  }

  return fallback;
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

function resolveActiveSession(
  sessions: WorkoutSessionRecord[],
  token: DispenseTokenRecord | null,
  currentSessionId?: string | null,
) {
  if (token && !isExpired(token.expiresAt)) {
    return sessions.find((sessionItem) => sessionItem.id === token.sessionId) ?? sessions[0] ?? null;
  }

  if (currentSessionId) {
    const currentSession = sessions.find((sessionItem) => sessionItem.id === currentSessionId) ?? null;
    if (currentSession) {
      return currentSession;
    }
  }

  return sessions[0] ?? null;
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

function AppShell() {
  const { showToast } = useToast();
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
  const [isRuntimeLoading, setIsRuntimeLoading] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<ScreenKey>("home");
  const [activeTokenNow, setActiveTokenNow] = useState(Date.now());
  const [selectedHistoryDay, setSelectedHistoryDay] = useState<string | null>(null);
  const [detailSession, setDetailSession] = useState<WorkoutSessionRecord | null>(null);
  const [detailNote, setDetailNote] = useState("");
  const scrollRef = useRef<ScrollView | null>(null);
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;

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

  const suggestedMeals = useMemo(() => {
    if (!activeSession) {
      return [];
    }

    return rankMealsForWorkout(
      availableMeals,
      activeSession.workout,
      profile?.primaryObjective ?? primaryObjective,
      activeSession.recommendation.recommendedBlend,
    );
  }, [
    activeSession,
    availableMeals,
    primaryObjective,
    profile?.primaryObjective,
  ]);
  const objectiveMeals = useMemo(() => suggestedMeals.slice(0, 8), [suggestedMeals]);
  const menuMeals = useMemo(() => buildMenuMeals(availableMeals), [availableMeals]);
  const hasCompletedOnboarding = Boolean(profile?.onboardingCompleted);
  const confirmedMealId = activeSession?.selectedMealBlendId ?? null;
  const hasSelectedMeal = Boolean(confirmedMealId);
  const activeSuggestionKey = useMemo(() => {
    if (!activeSession) {
      return null;
    }

    const matchingSuggestion = sessionSuggestions.find(
      (suggestion) =>
        suggestion.sport === activeSession.workout.sport &&
        suggestion.intensity === activeSession.workout.intensity &&
        suggestion.goal === activeSession.workout.goal &&
        suggestion.durationMin === activeSession.workout.durationMin,
    );

    return matchingSuggestion?.key ?? null;
  }, [activeSession, sessionSuggestions]);
  const selectedMeal = useMemo(
    () =>
      menuMeals.find((meal) => meal.id === selectedMealId) ??
      suggestedMeals[0] ??
      objectiveMeals[0] ??
      menuMeals[0] ??
      null,
    [menuMeals, objectiveMeals, selectedMealId, suggestedMeals],
  );
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
    [
      activeSession,
      activeToken,
      hasCompletedOnboarding,
      hasSelectedMeal,
      session?.user,
    ],
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
      return "Ton repas est choisi. Passe au recap pour verifier puis generer le QR a presenter a la borne.";
    }

    return "Tout est pret : repas choisi, QR genere, tu peux presenter ton telephone a la borne.";
  }, [
    activeSession,
    activeToken,
    hasCompletedOnboarding,
    hasSelectedMeal,
    session?.user,
  ]);

  const mealNamesById = useMemo(
    () =>
      Object.fromEntries(availableMeals.map((meal) => [meal.id, meal.name])) as Record<
        string,
        string
      >,
    [availableMeals],
  );

  const latestSelectedMealName = (confirmedMealId && mealNamesById[confirmedMealId]) || null;
  const latestSession = history[0] ?? null;
  const favoriteSessions = history.filter((sessionItem) => sessionItem.isFavorite).slice(0, 3);
  const activeTokenSession =
    (activeToken
      ? history.find((sessionItem) => sessionItem.id === activeToken.sessionId) ?? null
      : null) ?? activeSession;
  const activeTokenMealName =
    (activeTokenSession?.selectedMealBlendId
      ? mealNamesById[activeTokenSession.selectedMealBlendId] ?? null
      : null) ?? latestSelectedMealName;
  const activeTokenRemaining = activeToken
    ? formatTokenRemaining(activeToken.expiresAt, activeTokenNow)
    : null;
  const recentSessions = history.slice(0, 3);
  const mealSelectionsCount = history.filter((sessionItem) => Boolean(sessionItem.selectedMealBlendId)).length;
  const activeSuggestion =
    (activeSuggestionKey
      ? sessionSuggestions.find((suggestion) => suggestion.key === activeSuggestionKey) ?? null
      : null) ?? null;
  const greetingLabel = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const firstName =
      profile?.fullName?.trim().split(/\s+/)[0] ??
      session?.user?.email?.split("@")[0] ??
      "FEATNESS";

    const lastSessionAt = latestSession ? new Date(latestSession.createdAt).getTime() : null;
    const wasRecentSession =
      lastSessionAt != null && Date.now() - lastSessionAt <= 2 * 60 * 60 * 1000;

    if (wasRecentSession) {
      return `Bonne recuperation ${firstName}`;
    }

    if (hour >= 18) {
      return `Bonsoir ${firstName}`;
    }

    return `Bonjour ${firstName}`;
  }, [latestSession, profile?.fullName, session?.user?.email]);
  const weeklyWindowStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - 6);
    return date;
  }, []);
  const weekSessions = useMemo(
    () =>
      history.filter((sessionItem) => new Date(sessionItem.createdAt) >= weeklyWindowStart),
    [history, weeklyWindowStart],
  );
  const sessionsThisWeek = weekSessions.length;
  const caloriesThisWeek = weekSessions.reduce(
    (total, sessionItem) => total + sessionItem.recommendation.caloriesBurned,
    0,
  );
  const featnessMealsThisWeek = weekSessions.filter((sessionItem) => sessionItem.selectedMealBlendId).length;
  const streakDays = useMemo(() => {
    const sessionDays = new Set(
      history.map((sessionItem) => new Date(sessionItem.createdAt).toISOString().slice(0, 10)),
    );
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (sessionDays.has(cursor.toISOString().slice(0, 10))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }, [history]);
  const weeklyRecoveryScore = useMemo(() => calculateWeeklyRecoveryScore(history), [history]);
  const weeklyDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weeklyWindowStart);
        date.setDate(weeklyWindowStart.getDate() + index);
        const key = date.toISOString().slice(0, 10);
        const count = history.filter(
          (sessionItem) => sessionItem.createdAt.slice(0, 10) === key,
        ).length;

        return {
          key,
          label: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date),
          count,
        };
      }),
    [history, weeklyWindowStart],
  );
  const filteredHistory = useMemo(
    () =>
      selectedHistoryDay
        ? history.filter((sessionItem) => sessionItem.createdAt.slice(0, 10) === selectedHistoryDay)
        : history,
    [history, selectedHistoryDay],
  );

  const screenMeta = SCREEN_META[currentScreen];
  const isCompactScreen = currentScreen !== "home";
  const showSessionsQuickBar = Boolean(
    currentScreen === "sessions" && activeSession,
  );
  const showMealsQuickBar = Boolean(
    currentScreen === "meals" && activeSession && selectedMeal,
  );
  const selectedMealIsConfirmed = Boolean(
    selectedMeal && selectedMeal.id === confirmedMealId,
  );

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    showToast(
      feedbackMessage,
      feedbackTone === "success"
        ? "success"
        : feedbackTone === "warning"
          ? "error"
          : "info",
    );
  }, [feedbackMessage, feedbackTone, showToast]);

  function scrollToTop(animated = true) {
    scrollRef.current?.scrollTo({ y: 0, animated });
  }

  useEffect(() => {
    scrollToTop();
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
    if (currentScreen !== "qr") {
      successScale.setValue(0.7);
      return;
    }

    Animated.spring(successScale, {
      toValue: 1,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [currentScreen, successScale]);

  useEffect(() => {
    if (!activeToken) {
      return;
    }

    const timer = setInterval(() => {
      setActiveTokenNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, [activeToken]);

  useEffect(() => {
    if (!supabaseClient) {
      return;
    }

    const client = supabaseClient;
    let mounted = true;

    async function bootstrapSession() {
      const { data, error } = await client.auth.getSession();

      if (error && isInvalidRefreshTokenError(error)) {
        await client.auth.signOut({ scope: "local" });

        if (mounted) {
          setSession(null);
          setFeedbackMessage("Session expiree. Reconnecte-toi.");
        }

        return;
      }

      if (mounted) {
        setSession(data.session);
      }
    }

    void bootstrapSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
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
      setIsRuntimeLoading(false);
      setCurrentScreen("home");
      scrollToTop(false);
      return;
    }

    const mobileClient = supabaseClient;
    const authenticatedUser = user;
    let cancelled = false;

    async function loadRuntimeData() {
      try {
        setIsRuntimeLoading(true);
        const [nextProfile, nextHistory, nextToken, nextMeals] = await Promise.all([
          fetchProfile(mobileClient, authenticatedUser),
          fetchWorkoutHistory(mobileClient, authenticatedUser.id),
          fetchActiveToken(mobileClient, authenticatedUser.id),
          fetchAvailableDrinkBlends(mobileClient),
        ]);

        if (cancelled) {
          return;
        }

        const liveToken = nextToken && !isExpired(nextToken.expiresAt) ? nextToken : null;
        const nextActiveSession = resolveActiveSession(nextHistory, liveToken);

        setProfile(nextProfile);
        setAge(nextProfile?.age ? String(nextProfile.age) : "");
        setHeightCm(nextProfile?.heightCm ? String(nextProfile.heightCm) : "");
        setWeightKg(String(nextProfile?.weightKg ?? 78));
        setPrimaryObjective(nextProfile?.primaryObjective ?? "lose_weight");
        setHistory(nextHistory);
        setAvailableMeals(nextMeals);
        setActiveToken(liveToken);
        setActiveSession(nextActiveSession);
        setSelectedMealId(nextActiveSession?.selectedMealBlendId ?? null);
        setCurrentScreen("home");
        scrollToTop(false);
      } catch (error) {
        if (!cancelled) {
          setFeedbackMessage(
            error instanceof Error ? error.message : "Chargement FEATNESS impossible.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsRuntimeLoading(false);
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
            resolveActiveSession(nextHistory, activeToken, previousSession?.id),
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
    if (history.length === 0) {
      setActiveSession(null);
      return;
    }

    setActiveSession((previousSession) =>
      resolveActiveSession(history, activeToken, previousSession?.id),
    );
  }, [history, activeToken]);

  useEffect(() => {
    if (!activeSession || availableMeals.length === 0) {
      setSelectedMealId(null);
      return;
    }

    setSelectedMealId((currentMealId) => {
      if (currentMealId && availableMeals.some((meal) => meal.id === currentMealId)) {
        return currentMealId;
      }

      if (
        activeSession.selectedMealBlendId &&
        availableMeals.some((meal) => meal.id === activeSession.selectedMealBlendId)
      ) {
        return activeSession.selectedMealBlendId;
      }

      return suggestedMeals[0]?.id ?? null;
    });
  }, [
    activeSession?.id,
    activeSession?.selectedMealBlendId,
    availableMeals,
    suggestedMeals,
  ]);

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
      case "history":
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
      scrollToTop();
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
      scrollToTop();
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
      scrollToTop();
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
    scrollToTop();
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
      scrollToTop();
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
      scrollToTop();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible de lancer cette seance.",
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsBusy(false);
    }
  }

  function handleSelectMeal(mealId: string) {
    const meal = availableMeals.find((item) => item.id === mealId) ?? null;
    setSelectedMealId(mealId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (meal) {
      setFeedbackMessage(`${meal.name} selectionne. Verifie en haut puis valide ton recap.`);
    }
  }

  async function handleReplaySession(sessionItem: WorkoutSessionRecord, sourceLabel: string) {
    if (!supabaseClient || !session?.user || !profile?.onboardingCompleted) {
      setFeedbackMessage("Complete d'abord ton profil pour relancer une seance.");
      return;
    }

    setIsBusy(true);
    setFeedbackMessage(null);

    try {
      const workout: UserWorkoutInput = {
        ...sessionItem.workout,
        weightKg: Number(weightKg) || sessionItem.workout.weightKg,
      };

      const nextProfile = await saveUserPreferences(supabaseClient, session.user.id, {
        preferredSport: workout.sport,
        preferredGoal: workout.goal,
        favoriteMealIds: profile.favoriteMealIds,
      });

      setProfile(nextProfile);

      await createSessionFlow(
        workout,
        buildNutritionRecommendation(workout),
        `${sourceLabel} relancee. FEATNESS a deja recalcule tes recommandations.`,
      );
      setCurrentScreen("meals");
      scrollToTop();
    } catch (error) {
      setFeedbackMessage(
        formatRuntimeError(error, "Impossible de relancer cette seance."),
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function handleToggleFavoriteSession(sessionItem: WorkoutSessionRecord) {
    if (!supabaseClient || !session?.user) {
      return;
    }

    try {
      setIsBusy(true);
      setFeedbackMessage(null);
      const updatedSession = await setWorkoutSessionFavorite(
        supabaseClient,
        session.user.id,
        sessionItem.id,
        !sessionItem.isFavorite,
      );

      setHistory((previousHistory) =>
        previousHistory.map((candidate) =>
          candidate.id === updatedSession.id ? updatedSession : candidate,
        ),
      );
      setActiveSession((previousSession) =>
        previousSession?.id === updatedSession.id ? updatedSession : previousSession,
      );
      setFeedbackMessage(
        updatedSession.isFavorite
          ? "Seance ajoutee aux favoris."
          : "Seance retiree des favoris.",
      );
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      setFeedbackMessage(
        formatRuntimeError(error, "Impossible de mettre a jour cette seance favorite."),
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible de mettre a jour les favoris.",
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function handleConfirmMealChoice(mealIdOverride?: string | null) {
    const targetMeal =
      (mealIdOverride
        ? availableMeals.find((meal) => meal.id === mealIdOverride) ?? null
        : selectedMeal) ?? null;

    if (!targetMeal || !activeSession || !supabaseClient || !session?.user) {
      return;
    }

    try {
      setIsBusy(true);
      setFeedbackMessage(null);
      setSelectedMealId(targetMeal.id);
      const updatedSession = await saveSelectedMealChoice(
        supabaseClient,
        session.user.id,
        activeSession.id,
        targetMeal.id,
      );
      await cancelActiveTokens(supabaseClient, session.user.id);

      setActiveSession(updatedSession);
      setActiveToken(null);
      setCurrentScreen("qr");
      scrollToTop();
      setHistory((previousHistory) =>
        previousHistory.map((sessionItem) =>
          sessionItem.id === updatedSession.id ? updatedSession : sessionItem,
        ),
      );
      setFeedbackMessage(
        `${targetMeal.name} retenu. Verifie le recap puis genere le QR pour la borne.`,
      );
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Impossible d'enregistrer le choix du repas.",
      );
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      scrollToTop();
      setFeedbackMessage("QR FEATNESS genere. Tu peux maintenant le presenter a la borne.");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setFeedbackMessage(formatRuntimeError(error, "Impossible de generer le QR."));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleClearMealChoice() {
    if (!activeSession || !supabaseClient || !session?.user) {
      return;
    }

    try {
      setIsBusy(true);
      setFeedbackMessage(null);
      await cancelActiveTokens(supabaseClient, session.user.id);
      const updatedSession = await clearSelectedMealChoice(
        supabaseClient,
        session.user.id,
        activeSession.id,
      );

      setActiveToken(null);
      setActiveSession(updatedSession);
      setSelectedMealId(null);
      setCurrentScreen("meals");
      scrollToTop();
      setHistory((previousHistory) =>
        previousHistory.map((sessionItem) =>
          sessionItem.id === updatedSession.id ? updatedSession : sessionItem,
        ),
      );
      setFeedbackMessage("Plat retire. Tu peux en choisir un autre.");
    } catch (error) {
      setFeedbackMessage(formatRuntimeError(error, "Impossible de retirer ce plat."));
    } finally {
      setIsBusy(false);
    }
  }

  function handleChangeSession() {
    setFeedbackMessage(
      "Choisis une autre seance. FEATNESS reclassera ensuite les plats pour ce nouvel effort.",
    );
    openScreen("sessions");
  }

  function openHistoryDetail(sessionItem: WorkoutSessionRecord) {
    setDetailSession(sessionItem);
    setDetailNote(sessionItem.userNote ?? "");
  }

  async function handleSaveSessionNote() {
    if (!detailSession || !supabaseClient || !session?.user) {
      return;
    }

    try {
      setIsBusy(true);
      const updatedSession = await saveWorkoutSessionNote(
        supabaseClient,
        session.user.id,
        detailSession.id,
        detailNote,
      );
      setHistory((previousHistory) =>
        previousHistory.map((candidate) =>
          candidate.id === updatedSession.id ? updatedSession : candidate,
        ),
      );
      setActiveSession((previousSession) =>
        previousSession?.id === updatedSession.id ? updatedSession : previousSession,
      );
      setDetailSession(updatedSession);
      setFeedbackMessage("Note de seance enregistree.");
    } catch (error) {
      setFeedbackMessage(
        formatRuntimeError(error, "Impossible d'enregistrer la note."),
      );
    } finally {
      setIsBusy(false);
    }
  }

  const renderHomeScreen = () => (
    <>
      <AnimatedSection delay={0}>
        <Card variant="highlighted" style={styles.greetingCard}>
          <Badge label="Accueil" variant="primary" size="sm" />
          <Text style={styles.greetingTitle}>{greetingLabel}</Text>
          <Text style={styles.greetingCopy}>
            {session?.user
              ? "Retrouve ton rythme FEATNESS : stats rapides, QR actif et raccourcis de reprise."
              : "Connecte-toi pour retrouver tes seances, tes calories et ton QR actif."}
          </Text>
        </Card>
      </AnimatedSection>

      <AnimatedSection delay={70}>
        {isRuntimeLoading && session?.user ? (
          <Card style={styles.nextActionCard}>
            <Skeleton width="45%" height={16} />
            <Skeleton width="88%" height={32} />
            <Skeleton width="100%" height={18} />
            <Skeleton width="70%" height={18} />
          </Card>
        ) : session?.user ? (
          <View style={styles.heroStats}>
            <StatCard label="Seances semaine" value={sessionsThisWeek} unit="seances" color={theme.colors.primary} />
            <StatCard label="Calories semaine" value={caloriesThisWeek} unit="kcal" color={theme.colors.calories} />
            <StatCard label="Streak" value={streakDays} unit="jours" color={theme.colors.gold} />
          </View>
        ) : (
          <Card variant="highlighted" style={styles.nextActionCard}>
            <Badge label="Statut rapide" variant="primary" size="sm" />
            <Text style={styles.nextActionTitle}>La prochaine etape utile</Text>
            <Text style={styles.nextActionDescription}>{quickStatus}</Text>
          </Card>
        )}
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
          <Card style={styles.nextActionCard}>
            <Badge label="Recuperation" variant="neutral" size="sm" />
            <Text style={styles.nextActionTitle}>Score recuperation · {weeklyRecoveryScore} / 100</Text>
            <Text style={styles.nextActionDescription}>{quickStatus}</Text>
            <View style={styles.summaryGrid}>
              <StatCard label="Objectif" value={formatPrimaryObjectiveLabel(primaryObjective)} color={theme.colors.gold} />
              <StatCard label="IMC" value={bmiInsight?.bmi ?? "--"} />
              <StatCard label="Plat retenu" value={latestSelectedMealName ?? "Aucun"} />
              <StatCard label="Repas semaine" value={featnessMealsThisWeek} />
            </View>
          </Card>
        </AnimatedSection>
      )}

      {session?.user && activeToken ? (
        <AnimatedSection delay={130}>
          <Card variant="success" style={styles.activeTokenHomeCard}>
            <Badge label="QR actif" variant="success" size="sm" />
            <Text style={styles.activeTokenHomeTitle}>{activeTokenMealName ?? "Repas FEATNESS"}</Text>
            <Text style={styles.activeTokenHomeCopy}>
              Encore {activeTokenRemaining ?? "30 min"} avant expiration. Tu peux afficher le QR a tout moment.
            </Text>
            <Pressable style={styles.primaryCta} onPress={() => openScreen("qr")}>
              <Text style={styles.primaryCtaText}>Afficher le QR</Text>
            </Pressable>
          </Card>
        </AnimatedSection>
      ) : null}

      {session?.user ? (
        <AnimatedSection delay={140}>
          <Card style={styles.nextActionCard}>
            <Badge label="Nouvelle seance" variant="success" size="sm" />
            <Text style={styles.nextActionTitle}>Lancer une nouvelle seance</Text>
            <Text style={styles.nextActionDescription}>
              Passe directement aux seances suggerees et relance ton prochain effort en un tap.
            </Text>
            <Pressable style={styles.primaryCta} onPress={() => openScreen("sessions")}>
              <Text style={styles.primaryCtaText}>Nouvelle seance</Text>
            </Pressable>
          </Card>
        </AnimatedSection>
      ) : null}

      {session?.user ? (
        <AnimatedSection delay={150}>
          <Card style={styles.homeRecapCard}>
            <Badge label="Resume recent" variant="neutral" size="sm" />
            <Text style={styles.homeRecapTitle}>Tes dernieres seances et plats</Text>
            {recentSessions.length > 0 ? (
              <View style={styles.recapList}>
                {recentSessions.map((sessionItem) => (
                  <View key={sessionItem.id} style={styles.recapItem}>
                    <View style={styles.recapPrimary}>
                      <Text style={styles.recapTitle}>
                        {sessionItem.workout.sport} · {sessionItem.workout.goal}
                      </Text>
                      <Text style={styles.recapMeta}>
                        {sessionItem.selectedMealBlendId
                          ? mealNamesById[sessionItem.selectedMealBlendId] ?? "Plat FEATNESS"
                          : "Aucun plat valide"}
                      </Text>
                    </View>
                    <Text style={styles.recapDuration}>{sessionItem.workout.durationMin} min</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.homeRecapEmpty}>
                Aucune seance pour l'instant. Commence par ton profil puis choisis une seance.
              </Text>
            )}
          </Card>
        </AnimatedSection>
      ) : null}

      <AnimatedSection delay={145}>
        <Card style={styles.homeRecapCard}>
          <Badge label="Menu FEATNESS" variant="warning" size="sm" />
          <Text style={styles.homeRecapTitle}>Plats disponibles via QR</Text>
          <Text style={styles.homeRecapEmpty}>
            Tu choisis ton plat dans l&apos;app, FEATNESS genere le QR, puis tu le presentes a la borne pour recuperer ton repas.
          </Text>
          <View style={styles.recapList}>
            {availableMeals.slice(0, 3).map((meal) => (
              <View key={meal.id} style={styles.recapItem}>
                <View style={styles.recapPrimary}>
                  <Text style={styles.recapTitle}>{meal.name}</Text>
                  <Text style={styles.recapMeta}>{meal.description}</Text>
                </View>
                <Text style={styles.recapDuration}>{meal.priceEur.toFixed(2)} EUR</Text>
              </View>
            ))}
          </View>
        </Card>
      </AnimatedSection>

      <AnimatedSection delay={150}>
        <View style={styles.premiumStrip}>
          {HOME_PROMISES.map((promise) => (
            <Card key={promise.key} style={styles.premiumCard}>
              <View style={styles.premiumIconWrap}>
                <MaterialCommunityIcons
                  name={promise.icon}
                  size={20}
                  color={theme.colors.gold}
                />
              </View>
              <Text style={styles.premiumTitle}>{promise.title}</Text>
              <Text style={styles.premiumCopy}>{promise.copy}</Text>
            </Card>
          ))}
        </View>
      </AnimatedSection>

      {session?.user ? (
        <AnimatedSection delay={170}>
          <Card style={styles.accountCard}>
            <Badge label="Compte" variant="neutral" size="sm" />
            <Text style={styles.accountEmail}>{session.user.email ?? "Compte FEATNESS"}</Text>
            <Text style={styles.accountHint}>
              Utilise les onglets du bas pour avancer sans repasser par un long scroll.
            </Text>
            <Pressable style={styles.secondaryCta} onPress={() => void handleSignOut()}>
              <Text style={styles.secondaryCtaText}>Se deconnecter</Text>
            </Pressable>
          </Card>
        </AnimatedSection>
      ) : null}
    </>
  );

  const renderHistoryScreen = () => (
    <>
      <AnimatedSection delay={0}>
        <Card style={styles.historyWeekCard}>
          <Badge label="Semaine" variant="neutral" size="sm" />
          <Text style={styles.homeRecapTitle}>Vue hebdomadaire</Text>
          <View style={styles.weekStrip}>
            {weeklyDays.map((day) => {
              const active = selectedHistoryDay === day.key;
              const hasSession = day.count > 0;

              return (
                <Pressable
                  key={day.key}
                  style={[
                    styles.weekDay,
                    hasSession ? styles.weekDayActive : null,
                    active ? styles.weekDaySelected : null,
                  ]}
                  onPress={() =>
                    setSelectedHistoryDay((current) => (current === day.key ? null : day.key))
                  }
                >
                  <Text style={[styles.weekDayLabel, active ? styles.weekDayLabelSelected : null]}>
                    {day.label.slice(0, 2)}
                  </Text>
                  <View style={[styles.weekDot, hasSession ? styles.weekDotFilled : null]} />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.heroStats}>
            <StatCard label="Seances" value={sessionsThisWeek} />
            <StatCard label="Calories" value={caloriesThisWeek} unit="kcal" color={theme.colors.calories} />
            <StatCard label="Repas FEATNESS" value={featnessMealsThisWeek} />
          </View>
        </Card>
      </AnimatedSection>

      <AnimatedSection delay={60}>
        <Card style={styles.homeRecapCard}>
          <Badge
            label={selectedHistoryDay ? "Jour filtre" : "Historique complet"}
            variant={selectedHistoryDay ? "primary" : "neutral"}
            size="sm"
          />
          <Text style={styles.homeRecapTitle}>Tes seances en detail</Text>
          {isRuntimeLoading ? (
            <View style={styles.recapList}>
              <Skeleton width="100%" height={110} borderRadius={22} />
              <Skeleton width="100%" height={110} borderRadius={22} />
              <Skeleton width="100%" height={110} borderRadius={22} />
            </View>
          ) : filteredHistory.length > 0 ? (
            <View style={styles.recapList}>
              {filteredHistory.map((sessionItem) => (
                <Pressable
                  key={sessionItem.id}
                  style={styles.historyDetailItem}
                  onPress={() => openHistoryDetail(sessionItem)}
                >
                  <View style={styles.recapPrimary}>
                    <Text style={styles.recapTitle}>
                      {sessionItem.workout.sport} · {sessionItem.workout.goal}
                    </Text>
                    <Text style={styles.recapMeta}>
                      {sessionItem.workout.durationMin} min · {sessionItem.recommendation.caloriesBurned} kcal
                    </Text>
                    <Text style={styles.recapMeta}>
                      {sessionItem.selectedMealBlendId
                        ? mealNamesById[sessionItem.selectedMealBlendId] ?? "Repas FEATNESS"
                        : "Aucun plat retenu"}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={theme.colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.homeRecapEmpty}>Aucune seance sur la periode choisie.</Text>
          )}
        </Card>
      </AnimatedSection>
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
        {latestSession ? (
          <AnimatedSection delay={0}>
            <Card variant="highlighted" style={styles.quickRestartCard}>
              <Badge label="Reprendre" variant="primary" size="sm" />
              <Text style={styles.quickRestartTitle}>Relancer ma derniere seance</Text>
              <Text style={styles.quickRestartCopy}>
                {latestSession.workout.sport} · {latestSession.workout.durationMin} min ·{" "}
                {latestSession.workout.intensity}
              </Text>
              <View style={styles.quickRestartStats}>
                <Text style={styles.quickRestartMeta}>
                  {latestSession.recommendation.caloriesBurned} kcal estimees
                </Text>
                <Text style={styles.quickRestartMeta}>
                  {latestSession.selectedMealBlendId
                    ? mealNamesById[latestSession.selectedMealBlendId] ?? "Plat FEATNESS"
                    : "Aucun plat choisi"}
                </Text>
              </View>
              <Pressable
                style={[styles.primaryCta, isBusy && styles.buttonDisabled]}
                onPress={() => void handleReplaySession(latestSession, "Derniere seance")}
                disabled={isBusy}
              >
                <Text style={styles.primaryCtaText}>Relancer cette seance</Text>
              </Pressable>
            </Card>
          </AnimatedSection>
        ) : null}

        {favoriteSessions.length > 0 ? (
          <AnimatedSection delay={40}>
            <Card style={styles.favoriteSessionsCard}>
              <Badge label="Favoris" variant="warning" size="sm" />
              <Text style={styles.favoriteSessionsTitle}>Mes seances favorites</Text>
              <View style={styles.favoriteSessionsList}>
                {favoriteSessions.map((sessionItem) => (
                  <Pressable
                    key={sessionItem.id}
                    style={[styles.favoriteSessionItem, isBusy && styles.buttonDisabled]}
                    onPress={() => void handleReplaySession(sessionItem, "Seance favorite")}
                    disabled={isBusy}
                  >
                    <View style={styles.favoriteSessionCopy}>
                      <Text style={styles.favoriteSessionTitle}>
                        {sessionItem.workout.sport} · {sessionItem.workout.goal}
                      </Text>
                      <Text style={styles.favoriteSessionMeta}>
                        {sessionItem.workout.durationMin} min · {sessionItem.workout.intensity} ·{" "}
                        {sessionItem.recommendation.caloriesBurned} kcal
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="arrow-top-right"
                      size={18}
                      color={theme.colors.gold}
                    />
                  </Pressable>
                ))}
              </View>
            </Card>
          </AnimatedSection>
        ) : null}

        <AnimatedSection delay={0}>
          <View style={styles.summaryBanner}>
            <View style={styles.summaryBannerRow}>
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
          </View>
        </AnimatedSection>
        <AnimatedSection delay={80}>
          <SessionSuggestionsCard
            suggestions={sessionSuggestions}
            onStartSuggestion={(suggestion) => void handleStartSuggestedSession(suggestion)}
            isBusy={isBusy}
            activeSuggestionKey={activeSuggestionKey}
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
          <View style={[styles.summaryBanner, styles.summaryBannerSuccess]}>
            <View style={styles.summaryBannerRow}>
              <View style={styles.summaryBannerItem}>
                <Text style={styles.summaryBannerLabel}>Seance prise en compte</Text>
                <Text style={styles.summaryBannerValue}>
                  {activeSuggestionKey
                    ? sessionSuggestions.find((suggestion) => suggestion.key === activeSuggestionKey)?.title ??
                      `${activeSession.workout.sport} ${activeSession.workout.durationMin} min`
                    : `${activeSession.workout.sport} ${activeSession.workout.durationMin} min`}
                </Text>
              </View>
              <View style={styles.summaryBannerItem}>
                <Text style={styles.summaryBannerLabel}>Calories estimees</Text>
                <Text style={styles.summaryBannerValue}>
                  {sessionInsight?.caloriesBurnedEstimate ?? activeSession.recommendation.caloriesBurned} kcal
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.summaryBannerAction, isBusy && styles.buttonDisabled]}
              onPress={handleChangeSession}
              disabled={isBusy}
            >
              <Text style={styles.summaryBannerActionText}>Changer de seance</Text>
            </Pressable>
            <View style={styles.summaryBannerHintRow}>
              <Text style={styles.summaryBannerHint}>
                FEATNESS reclassera automatiquement les plats apres ton nouveau choix.
              </Text>
            </View>
          </View>
        </AnimatedSection>
        <AnimatedSection delay={60}>
          <SuggestedMealsCard
            recommendedMeals={suggestedMeals}
            objectiveMeals={objectiveMeals}
            allMeals={menuMeals}
            goal={activeSession.workout.goal}
            objectiveTitle={sessionInsight?.focusTitle ?? "Focus FEATNESS"}
            objectiveCopy={sessionInsight?.focusCopy ?? "Le repas est classe selon ta seance et ton objectif."}
            menuTitle="Tous les plats FEATNESS disponibles a la borne"
            sessionCalories={
              sessionInsight?.caloriesBurnedEstimate ?? activeSession.recommendation.caloriesBurned
            }
            sessionEffortLabel={
              sessionInsight
                ? getEffortCategoryLabel(sessionInsight.effortCategory)
                : getEffortCategoryLabel(suggestedMeals[0]?.effortCategory ?? "medium")
            }
            sessionFocusTitle={sessionInsight?.focusTitle ?? "Focus FEATNESS"}
            sessionFocusCopy={
              sessionInsight?.focusCopy ?? "Le classement prend en compte ta seance, ton objectif et les calories estimees."
            }
            selectedMealId={selectedMealId}
            favoriteMealIds={profile?.favoriteMealIds ?? []}
            onSelectMeal={handleSelectMeal}
            onQuickConfirmRecommended={() =>
              void handleConfirmMealChoice(selectedMealId ?? suggestedMeals[0]?.id ?? null)
            }
            onClearConfirmedMeal={() => void handleClearMealChoice()}
            onToggleFavorite={() => void handleToggleFavoriteMeal()}
            isFavorite={
              selectedMeal ? profile?.favoriteMealIds.includes(selectedMeal.id) ?? false : false
            }
            isConfirmed={Boolean(selectedMeal && selectedMeal.id === confirmedMealId)}
            isBusy={isBusy}
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

    const workout = activeSession?.workout ?? null;
    const summaryCalories = activeSession?.recommendation.caloriesBurned ?? 0;
    const hydrationTarget = workout
      ? calculateHydrationNeeds(summaryCalories, workout.weightKg)
      : 0;
    const optimalWindow = workout
      ? getOptimalConsumptionWindow(workout.intensity, workout.sport)
      : "A consommer dans l'heure";
    const equivalenceLabel = workout
      ? ["running", "cycling", "swimming", "rowing"].includes(workout.sport)
        ? `${(summaryCalories / 70).toFixed(1)} km de course equivalentes`
        : `${Math.round(summaryCalories / 0.15)} etages montes equivalentes`
      : null;

    return (
      <>
        <AnimatedSection delay={0}>
          <Card variant="success" style={styles.summarySuccessCard}>
            <Animated.View style={[styles.summarySuccessIconWrap, { transform: [{ scale: successScale }] }]}>
              <MaterialCommunityIcons name="check-bold" size={26} color={theme.colors.ink} />
            </Animated.View>
            <Text style={styles.summarySuccessTitle}>Seance enregistree !</Text>
            <Text style={styles.summarySuccessCopy}>Voici ton recap FEATNESS avant retrait.</Text>
          </Card>
        </AnimatedSection>

        {activeSession ? (
          <AnimatedSection delay={30}>
            <Card style={styles.summarySessionCard}>
              <Badge label="Seance" variant="neutral" size="sm" />
              <Text style={styles.summarySessionTitle}>
                {activeSuggestion?.title ?? `${activeSession.workout.sport} ${activeSession.workout.durationMin} min`}
              </Text>
              <View style={styles.summaryBannerRow}>
                <View style={styles.summaryBannerItem}>
                  <Text style={styles.summaryBannerLabel}>Calories</Text>
                  <Text style={styles.summaryBannerValue}>{summaryCalories} kcal</Text>
                </View>
                <View style={styles.summaryBannerItem}>
                  <Text style={styles.summaryBannerLabel}>Intensite</Text>
                  <Text style={styles.summaryBannerValue}>{activeSession.workout.intensity}</Text>
                </View>
              </View>
              {equivalenceLabel ? (
                <Text style={styles.summaryHintText}>Equivalent a {equivalenceLabel}</Text>
              ) : null}
            </Card>
          </AnimatedSection>
        ) : null}

        {selectedMeal ? (
          <AnimatedSection delay={50}>
            <Card style={styles.summaryMealCard}>
              <Badge label="Repas choisi" variant="warning" size="sm" />
              <Text style={styles.summarySessionTitle}>{selectedMeal.name}</Text>
              <Text style={styles.summaryHintText}>
                Couvre environ {selectedMeal.matchPercent}% de tes besoins post-effort.
              </Text>
              <View style={styles.summaryMacroList}>
                <MacroProgressBar
                  label="Proteines"
                  value={selectedMeal.proteinG}
                  target={selectedMeal.needs.proteinTargetG}
                  color={theme.colors.protein}
                />
                <MacroProgressBar
                  label="Glucides"
                  value={selectedMeal.carbsG}
                  target={selectedMeal.needs.carbsTargetG}
                  color={theme.colors.carbs}
                />
                <MacroProgressBar
                  label="Lipides"
                  value={selectedMeal.fatG}
                  target={selectedMeal.needs.fatTargetG}
                  color={theme.colors.fat}
                />
              </View>
            </Card>
          </AnimatedSection>
        ) : null}

        {!activeToken ? (
          <AnimatedSection delay={70}>
            <View style={styles.qrRecapCard}>
              <Text style={styles.sectionEyebrow}>Validation finale</Text>
              <Text style={styles.qrRecapTitle}>Tout est pret pour generer ton QR</Text>
              <View style={styles.qrRecapRow}>
                <View style={styles.qrRecapBlock}>
                  <Text style={styles.qrRecapLabel}>Effort retenu</Text>
                  <Text style={styles.qrRecapValue}>
                    {activeSuggestion?.title ??
                      (activeSession
                        ? `${activeSession.workout.sport} ${activeSession.workout.durationMin} min`
                        : "Seance FEATNESS")}
                  </Text>
                </View>
                <View style={styles.qrRecapBlock}>
                  <Text style={styles.qrRecapLabel}>Plat retenu</Text>
                  <Text style={styles.qrRecapValue}>
                    {latestSelectedMealName ?? "Repas FEATNESS"}
                  </Text>
                </View>
              </View>
              <Text style={styles.qrRecapHint}>
                Appuie une seule fois. Le QR sera ensuite affiche en plein ecran pour la borne.
              </Text>
              <Pressable
                style={[styles.secondaryCta, isBusy && styles.buttonDisabled]}
                onPress={handleChangeSession}
                disabled={isBusy}
              >
                <Text style={styles.secondaryCtaText}>Changer de seance</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryCta, isBusy && styles.buttonDisabled]}
                onPress={() => void handleClearMealChoice()}
                disabled={isBusy}
              >
                <Text style={styles.secondaryCtaText}>Changer de plat</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryCta, isBusy && styles.buttonDisabled]}
                onPress={() => void handleGenerateQr()}
                disabled={isBusy}
              >
                <Text style={styles.primaryCtaText}>
                  {isBusy ? "Generation..." : "Generer mon QR maintenant"}
                </Text>
              </Pressable>
            </View>
          </AnimatedSection>
        ) : null}
        {activeToken ? (
        <AnimatedSection delay={90}>
          <ActiveTokenCard
            token={activeToken}
            session={activeSession}
            mealName={latestSelectedMealName}
            canGenerate={hasSelectedMeal}
            onGenerate={() => void handleGenerateQr()}
            onClearMeal={() => void handleClearMealChoice()}
            onChangeSession={handleChangeSession}
            isBusy={isBusy}
          />
        </AnimatedSection>
        ) : null}

        <AnimatedSection delay={110}>
          <Card style={styles.summaryCoachCard}>
            <Badge label="Coaching" variant="primary" size="sm" />
            <Text style={styles.summarySessionTitle}>Apres ta seance</Text>
            <Text style={styles.summaryHintText}>
              Buvez environ {hydrationTarget} ml dans l&apos;heure qui suit.
            </Text>
            <Text style={styles.summaryHintText}>{optimalWindow}</Text>
          </Card>
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
          isValidated={Boolean(profile?.onboardingCompleted)}
        />
      </AnimatedSection>

      {history.length > 0 ? (
        <AnimatedSection delay={80}>
          <HistoryCard
            sessions={history}
            mealNamesById={mealNamesById}
            onToggleFavorite={(sessionItem) => void handleToggleFavoriteSession(sessionItem)}
            isBusy={isBusy}
          />
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
      case "history":
        return renderHistoryScreen();
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
          ref={scrollRef}
          contentContainerStyle={[
            styles.container,
            showSessionsQuickBar || showMealsQuickBar ? styles.containerWithQuickBar : null,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <AnimatedSection delay={0}>
            <View
              style={[
                styles.hero,
                isCompactScreen ? styles.heroCompact : null,
                { backgroundColor: screenMeta.panel },
              ]}
            >
              <View style={[styles.heroGlow, { backgroundColor: screenMeta.glow }]} />
              <Text style={[styles.eyebrow, { color: screenMeta.accent }]}>{screenMeta.eyebrow}</Text>
              <Text style={[styles.title, isCompactScreen ? styles.titleCompact : null]}>
                {screenMeta.title}
              </Text>
              <Text style={[styles.subtitle, isCompactScreen ? styles.subtitleCompact : null]}>
                {screenMeta.description}
              </Text>
              <View style={[styles.journeyStrip, isCompactScreen ? styles.journeyStripCompact : null]}>
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

          {activeToken ? (
            <AnimatedSection delay={15}>
              <Pressable style={styles.activeTokenBanner} onPress={() => openScreen("qr")}>
                <View style={styles.activeTokenBannerIcon}>
                  <MaterialCommunityIcons name="qrcode-scan" size={18} color={theme.colors.ink} />
                </View>
                <View style={styles.activeTokenBannerCopy}>
                  <Text style={styles.activeTokenBannerLabel}>QR code actif</Text>
                  <Text style={styles.activeTokenBannerTitle}>
                    {activeTokenMealName ?? "Repas FEATNESS"} · encore {activeTokenRemaining ?? "30 min"}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={theme.colors.ink}
                />
              </Pressable>
            </AnimatedSection>
          ) : null}

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

        {showSessionsQuickBar && activeSession ? (
          <View style={styles.quickBarWrap}>
            <View style={styles.quickBar}>
              <View style={styles.quickBarCopy}>
                <Text style={styles.quickBarLabel}>Seance retenue</Text>
                <Text style={styles.quickBarTitle} numberOfLines={1}>
                  {activeSuggestion?.title ?? `${activeSession.workout.sport} ${activeSession.workout.durationMin} min`}
                </Text>
              </View>
              <Pressable
                style={[styles.quickBarButton, isBusy && styles.buttonDisabled]}
                onPress={() => openScreen("meals")}
                disabled={isBusy}
              >
                <Text style={styles.quickBarButtonText}>Aller aux plats</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {showMealsQuickBar && selectedMeal ? (
          <View style={styles.mealsQuickBarWrap}>
            <View style={styles.quickBar}>
              <View style={styles.quickBarCopy}>
                <Text style={styles.quickBarLabel}>
                  {selectedMealIsConfirmed ? "Plat valide" : "Plat selectionne"}
                </Text>
                <Text style={styles.quickBarTitle} numberOfLines={1}>
                  {selectedMeal.name}
                </Text>
              </View>
              <Pressable
                style={[styles.quickBarButton, isBusy && styles.buttonDisabled]}
                onPress={() =>
                  selectedMealIsConfirmed
                    ? openScreen("qr")
                    : void handleConfirmMealChoice(selectedMeal.id)
                }
                disabled={isBusy}
              >
                <Text style={styles.quickBarButtonText}>
                  {isBusy
                    ? "Validation..."
                    : selectedMealIsConfirmed
                      ? "Aller au recap"
                      : "Valider"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <Modal
          visible={Boolean(detailSession)}
          transparent
          animationType="slide"
          onRequestClose={() => setDetailSession(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalSheet}>
              {detailSession ? (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderCopy}>
                      <Text style={styles.modalEyebrow}>Detail seance</Text>
                      <Text style={styles.modalTitle}>
                        {detailSession.workout.sport} · {detailSession.workout.goal}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.modalClose}
                      onPress={() => setDetailSession(null)}
                    >
                      <MaterialCommunityIcons name="close" size={20} color={theme.colors.text} />
                    </Pressable>
                  </View>

                  <View style={styles.summaryGrid}>
                    <StatCard label="Duree" value={detailSession.workout.durationMin} unit="min" />
                    <StatCard label="Calories" value={detailSession.recommendation.caloriesBurned} unit="kcal" color={theme.colors.calories} />
                    <StatCard
                      label="Plat"
                      value={
                        detailSession.selectedMealBlendId
                          ? mealNamesById[detailSession.selectedMealBlendId] ?? "Repas FEATNESS"
                          : "Aucun"
                      }
                    />
                  </View>

                  {detailSession.selectedMealBlendId ? (
                    <View style={styles.detailMealCard}>
                      <Text style={styles.detailMealLabel}>Repas choisi</Text>
                      <Text style={styles.detailMealValue}>
                        {mealNamesById[detailSession.selectedMealBlendId] ?? "Repas FEATNESS"}
                      </Text>
                    </View>
                  ) : null}

                  <TextInput
                    value={detailNote}
                    onChangeText={setDetailNote}
                    placeholder="Ajouter une note personnelle"
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                    style={styles.detailNoteInput}
                  />

                  <View style={styles.modalActions}>
                    <Pressable
                      style={[styles.secondaryCta, isBusy && styles.buttonDisabled]}
                      onPress={() => setDetailSession(null)}
                      disabled={isBusy}
                    >
                      <Text style={styles.secondaryCtaText}>Fermer</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.secondaryCta, isBusy && styles.buttonDisabled]}
                      onPress={() => {
                        void handleReplaySession(detailSession, "Seance historique");
                        setDetailSession(null);
                      }}
                      disabled={isBusy}
                    >
                      <Text style={styles.secondaryCtaText}>Rejouer cette seance</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.primaryCta, isBusy && styles.buttonDisabled]}
                      onPress={() => void handleSaveSessionNote()}
                      disabled={isBusy}
                    >
                      <Text style={styles.primaryCtaText}>
                        {isBusy ? "Sauvegarde..." : "Enregistrer la note"}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </Modal>
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
  containerWithQuickBar: {
    paddingBottom: 220,
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
  heroCompact: {
    padding: theme.spacing.lg,
    gap: 8,
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
  titleCompact: {
    fontSize: 26,
    lineHeight: 31,
    maxWidth: 320,
  },
  subtitle: {
    color: theme.colors.textSoft,
    fontSize: 15,
    lineHeight: 24,
    maxWidth: 360,
  },
  subtitleCompact: {
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 320,
  },
  journeyStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  journeyStripCompact: {
    marginTop: 4,
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
  greetingCard: {
    gap: 10,
  },
  greetingTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  greetingCopy: {
    color: theme.colors.textSoft,
    lineHeight: 21,
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
  activeTokenBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primaryDark,
    ...mobileShadow,
  },
  activeTokenBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  activeTokenBannerCopy: {
    flex: 1,
    gap: 2,
  },
  activeTokenBannerLabel: {
    color: "rgba(17,24,39,0.72)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontWeight: "700",
  },
  activeTokenBannerTitle: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  activeTokenHomeCard: {
    gap: 10,
  },
  activeTokenHomeTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  activeTokenHomeCopy: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  quickRestartCard: {
    gap: 10,
  },
  quickRestartTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  quickRestartCopy: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  quickRestartStats: {
    gap: 4,
  },
  quickRestartMeta: {
    color: theme.colors.textSoft,
    lineHeight: 19,
  },
  favoriteSessionsCard: {
    gap: 12,
  },
  favoriteSessionsTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  favoriteSessionsList: {
    gap: 10,
  },
  favoriteSessionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  favoriteSessionCopy: {
    flex: 1,
    gap: 4,
  },
  favoriteSessionTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  favoriteSessionMeta: {
    color: theme.colors.textMuted,
    lineHeight: 18,
    textTransform: "capitalize",
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
  summaryBannerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryBannerSuccess: {
    backgroundColor: theme.colors.mintSoft,
    borderColor: "rgba(111,212,168,0.24)",
  },
  summaryBannerNeutralStrong: {
    backgroundColor: "rgba(148,206,255,0.08)",
    borderColor: "rgba(148,206,255,0.24)",
  },
  summaryBannerItem: {
    gap: 4,
    flex: 1,
    minWidth: 136,
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
  summaryBannerAction: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  summaryBannerActionText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  summaryBannerHintRow: {
    gap: 4,
  },
  summaryBannerHint: {
    color: theme.colors.textSoft,
    lineHeight: 18,
  },
  qrRecapCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 10,
    ...mobileShadow,
  },
  qrRecapTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  qrRecapRow: {
    gap: 8,
  },
  qrRecapBlock: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  qrRecapLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  qrRecapValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
    textTransform: "capitalize",
  },
  qrRecapHint: {
    color: theme.colors.textSoft,
    lineHeight: 19,
  },
  summarySuccessCard: {
    alignItems: "center",
    gap: 10,
  },
  summarySuccessIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.success,
  },
  summarySuccessTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  summarySuccessCopy: {
    color: theme.colors.textSoft,
    lineHeight: 20,
    textAlign: "center",
  },
  summarySessionCard: {
    gap: 10,
  },
  summaryMealCard: {
    gap: 10,
  },
  summaryCoachCard: {
    gap: 10,
  },
  summarySessionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  summaryHintText: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  summaryMacroList: {
    gap: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  homeRecapCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 12,
    ...mobileShadow,
  },
  homeRecapTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  recapList: {
    gap: 10,
  },
  recapItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 18,
    padding: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  recapPrimary: {
    flex: 1,
    gap: 4,
  },
  recapTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  recapMeta: {
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  recapDuration: {
    color: theme.colors.gold,
    fontWeight: "700",
  },
  homeRecapEmpty: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  historyWeekCard: {
    gap: 14,
  },
  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  weekDay: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  weekDayActive: {
    borderColor: "rgba(16,185,129,0.3)",
  },
  weekDaySelected: {
    backgroundColor: theme.colors.goldSoft,
    borderColor: theme.colors.borderStrong,
  },
  weekDayLabel: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  weekDayLabelSelected: {
    color: theme.colors.text,
  },
  weekDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  weekDotFilled: {
    backgroundColor: theme.colors.primary,
  },
  historyDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 20,
    padding: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
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
    gap: 6,
    backgroundColor: "rgba(6,10,10,0.92)",
    borderRadius: theme.radius.xl,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  quickBarWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 92,
    paddingHorizontal: theme.spacing.md,
  },
  mealsQuickBarWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 92,
    paddingHorizontal: theme.spacing.md,
  },
  quickBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: theme.radius.xl,
    backgroundColor: "rgba(6,10,10,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  quickBarCopy: {
    flex: 1,
    gap: 2,
  },
  quickBarLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  quickBarTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  quickBarButton: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.gold,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  quickBarButtonText: {
    color: theme.colors.ink,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.58)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    gap: 14,
    minHeight: "62%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  modalHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  modalEyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailMealCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  detailMealLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  detailMealValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  detailNoteInput: {
    minHeight: 112,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    textAlignVertical: "top",
  },
  modalActions: {
    gap: 10,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    borderRadius: theme.radius.lg,
    paddingVertical: 8,
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
    fontSize: 10,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: theme.colors.ink,
  },
  tabButtonTextDisabled: {
    color: theme.colors.textMuted,
  },
});

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
