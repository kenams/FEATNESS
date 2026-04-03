import { useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text } from "react-native";
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
  type WorkoutSessionRecord,
} from "@featness/shared";

import { ActiveTokenCard } from "./src/components/active-token-card";
import { AuthCard } from "./src/components/auth-card";
import { HistoryCard } from "./src/components/history-card";
import { ProfileCard } from "./src/components/profile-card";
import { RecommendationCard } from "./src/components/recommendation-card";
import {
  cancelActiveTokens,
  createDispenseToken,
  createWorkoutSession,
  fetchActiveToken,
  fetchProfile,
  fetchWorkoutHistory,
  saveProfile,
} from "./src/lib/featness-data";
import { registerForPushNotificationsAsync } from "./src/lib/notifications";
import {
  getMobileSupabaseClient,
  isMobileSupabaseConfigured,
} from "./src/lib/supabase";

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
      return;
    }

    const mobileClient = supabaseClient;
    const authenticatedUser = user;
    let cancelled = false;

    async function loadRuntimeData() {
      try {
        const [nextProfile, nextHistory, nextToken] = await Promise.all([
          fetchProfile(mobileClient, authenticatedUser),
          fetchWorkoutHistory(mobileClient, authenticatedUser.id),
          fetchActiveToken(mobileClient, authenticatedUser.id),
        ]);

        if (cancelled) {
          return;
        }

        setProfile(nextProfile);
        setFullName(nextProfile?.fullName ?? "");
        setGymName(nextProfile?.gymName ?? "");
        setWeightKg(String((nextProfile?.weightKg ?? Number(weightKg)) || 78));
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
          const nextHistory = await fetchWorkoutHistory(
            mobileClient,
            authenticatedUser.id,
          );
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
          const nextToken = await fetchActiveToken(
            mobileClient,
            authenticatedUser.id,
          );
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

  async function handleGenerateQr() {
    if (!supabaseClient || !session?.user || !profile?.onboardingCompleted) {
      setFeedbackMessage(
        "Complete d'abord ton profil FEATNESS avant de generer un QR.",
      );
      return;
    }

    setIsBusy(true);
    setFeedbackMessage(null);

    try {
      await cancelActiveTokens(supabaseClient, session.user.id);

      const nextSession = await createWorkoutSession(
        supabaseClient,
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
        supabaseClient,
        session.user.id,
        nextSession.id,
      );

      setActiveSession(nextSession);
      setActiveToken(nextToken);
      setHistory((previousHistory) => [nextSession, ...previousHistory].slice(0, 12));
      setFeedbackMessage(
        "QR FEATNESS genere. Presente-le a la borne dans les 30 prochaines minutes.",
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error ? error.message : "Generation du QR impossible.",
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
        <Text style={styles.eyebrow}>FEATNESS Mobile</Text>
        <Text style={styles.title}>FEATNESS companion</Text>
        <Text style={styles.subtitle}>
          Auth, profil, seance, QR code et historique sur le meme flux mobile.
        </Text>

        <AuthCard
          email={email}
          password={password}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onSignIn={() => void handleSignIn()}
          onSignUp={() => void handleSignUp()}
          onSignOut={() => void handleSignOut()}
          isBusy={isBusy}
          isConfigured={supabaseEnabled}
          sessionEmail={session?.user.email ?? null}
          message={feedbackMessage}
        />

        {session?.user ? (
          <>
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
            />

            <ActiveTokenCard
              token={activeToken}
              session={activeSession}
              onGenerate={() => void handleGenerateQr()}
              isBusy={isBusy || showProfileOnboarding}
            />

            <HistoryCard sessions={history} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#08110f",
  },
  container: {
    padding: 20,
    gap: 16,
  },
  eyebrow: {
    color: "#c9a646",
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 12,
    marginTop: 12,
  },
  title: {
    color: "#f6f7f8",
    fontSize: 34,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9eb6af",
    fontSize: 15,
    lineHeight: 22,
  },
});
