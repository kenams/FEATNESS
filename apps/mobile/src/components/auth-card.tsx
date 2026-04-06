import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { mobileShadow, theme } from "../theme";

type AuthCardProps = {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSignIn: () => void;
  onSignInTest: () => void;
  onSignUp: () => void;
  onSignOut: () => void;
  isBusy: boolean;
  isConfigured: boolean;
  sessionEmail: string | null;
  message: string | null;
};

export function AuthCard({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSignIn,
  onSignInTest,
  onSignUp,
  onSignOut,
  isBusy,
  isConfigured,
  sessionEmail,
  message,
}: AuthCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Acces</Text>
      <Text style={styles.cardTitle}>Authentification mobile</Text>
      <Text style={styles.helperText}>
        {isConfigured
          ? "Email/password uniquement pour le MVP. Le meme projet Supabase pourra servir au mobile et a la borne."
          : "Supabase non configure. Le flux reste visible pour la demo, mais les actions d'auth sont desactivees."}
      </Text>

      {isConfigured ? (
        <View style={styles.demoHint}>
          <Text style={styles.demoHintEyebrow}>Raccourci demo</Text>
          <Text style={styles.demoHintText}>
            Le bouton Connexion test ouvre directement le compte de recette FEATNESS.
          </Text>
        </View>
      ) : null}

      <TextInput
        placeholder="Email"
        placeholderTextColor="#88a099"
        value={email}
        onChangeText={onEmailChange}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        placeholder="Mot de passe"
        placeholderTextColor="#88a099"
        secureTextEntry
        value={password}
        onChangeText={onPasswordChange}
        style={styles.input}
      />

      <View style={styles.inlineButtons}>
        <Pressable
          style={[
            styles.primaryButton,
            (isBusy || !isConfigured) && styles.buttonDisabled,
          ]}
          disabled={isBusy || !isConfigured}
          onPress={onSignIn}
        >
          <Text style={styles.primaryButtonText}>
            {isBusy ? "Connexion..." : "Se connecter"}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.secondaryButton,
            (isBusy || !isConfigured) && styles.buttonDisabled,
          ]}
          disabled={isBusy || !isConfigured}
          onPress={onSignUp}
        >
          <Text style={styles.secondaryButtonText}>Creer un compte</Text>
        </Pressable>
        <Pressable
          style={[
            styles.testButton,
            (isBusy || !isConfigured) && styles.buttonDisabled,
          ]}
          disabled={isBusy || !isConfigured}
          onPress={onSignInTest}
        >
          <Text style={styles.testButtonText}>Connexion test</Text>
        </Pressable>
      </View>

      {sessionEmail ? (
        <View style={styles.sessionBlock}>
          <Text style={styles.sessionTitle}>Session active</Text>
          <Text style={styles.sessionEmail}>{sessionEmail}</Text>
          <Pressable style={styles.secondaryButton} onPress={onSignOut}>
            <Text style={styles.secondaryButtonText}>Se deconnecter</Text>
          </Pressable>
        </View>
      ) : null}

      {message ? <Text style={styles.feedback}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
    ...mobileShadow,
  },
  eyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.6,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  input: {
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.text,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inlineButtons: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: theme.colors.ink,
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  testButton: {
    backgroundColor: theme.colors.mintSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(111,212,168,0.25)",
  },
  testButtonText: {
    color: theme.colors.mint,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  demoHint: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: theme.colors.mintSoft,
    borderWidth: 1,
    borderColor: "rgba(111,212,168,0.22)",
    gap: 4,
  },
  demoHintEyebrow: {
    color: theme.colors.mint,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  demoHintText: {
    color: theme.colors.textSoft,
    lineHeight: 19,
  },
  feedback: {
    color: theme.colors.gold,
    lineHeight: 20,
  },
  sessionBlock: {
    marginTop: 4,
    padding: 16,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sessionTitle: {
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    fontSize: 12,
  },
  sessionEmail: {
    color: theme.colors.text,
    fontWeight: "700",
  },
});
