import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type AuthCardProps = {
  email: string;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSignIn: () => void;
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
  onSignUp,
  onSignOut,
  isBusy,
  isConfigured,
  sessionEmail,
  message,
}: AuthCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Auth mobile</Text>
      <Text style={styles.helperText}>
        {isConfigured
          ? "Email/password uniquement pour le MVP. Le meme projet Supabase pourra servir au mobile et a la borne."
          : "Supabase non configure. Le flux reste visible pour la demo, mais les actions d'auth sont desactivees."}
      </Text>

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
    backgroundColor: "#10201d",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  cardTitle: {
    color: "#f6f7f8",
    fontSize: 20,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#0c1816",
    color: "#f6f7f8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  inlineButtons: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  primaryButton: {
    backgroundColor: "#c9a646",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#08110f",
    fontWeight: "700",
  },
  secondaryButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  secondaryButtonText: {
    color: "#f6f7f8",
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  helperText: {
    color: "#88a099",
    fontSize: 13,
    lineHeight: 18,
  },
  feedback: {
    color: "#f7e3a5",
    lineHeight: 20,
  },
  sessionBlock: {
    marginTop: 4,
    padding: 14,
    backgroundColor: "#0c1816",
    borderRadius: 18,
    gap: 8,
  },
  sessionTitle: {
    color: "#88a099",
    textTransform: "uppercase",
    fontSize: 12,
  },
  sessionEmail: {
    color: "#f6f7f8",
    fontWeight: "700",
  },
});
