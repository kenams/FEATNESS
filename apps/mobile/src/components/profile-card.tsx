import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { mobileShadow, theme } from "../theme";

type ProfileCardProps = {
  fullName: string;
  weightKg: string;
  gymName: string;
  onFullNameChange: (value: string) => void;
  onWeightChange: (value: string) => void;
  onGymChange: (value: string) => void;
  onSave: () => void;
  isBusy: boolean;
  isComplete: boolean;
};

export function ProfileCard({
  fullName,
  weightKg,
  gymName,
  onFullNameChange,
  onWeightChange,
  onGymChange,
  onSave,
  isBusy,
  isComplete,
}: ProfileCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Profil</Text>
      <Text style={styles.cardTitle}>
        {isComplete ? "Profil FEATNESS" : "Onboarding FEATNESS"}
      </Text>
      <Text style={styles.helperText}>
        {isComplete
          ? "Ton profil pilote la recommandation et le QR remis a la borne."
          : "Le trigger Supabase doit creer le profil automatiquement. Ici tu completes les champs necessaires a l'onboarding."}
      </Text>

      <View style={styles.statusRow}>
        <View style={[styles.statusPill, isComplete && styles.statusPillDone]}>
          <Text style={[styles.statusPillText, isComplete && styles.statusPillTextDone]}>
            {isComplete ? "Onboarding termine" : "Profil a completer"}
          </Text>
        </View>
      </View>

      <TextInput
        placeholder="Nom complet"
        placeholderTextColor="#88a099"
        value={fullName}
        onChangeText={onFullNameChange}
        style={styles.input}
      />
      <TextInput
        placeholder="Poids (kg)"
        placeholderTextColor="#88a099"
        keyboardType="numeric"
        value={weightKg}
        onChangeText={onWeightChange}
        style={styles.input}
      />
      <TextInput
        placeholder="Salle / club"
        placeholderTextColor="#88a099"
        value={gymName}
        onChangeText={onGymChange}
        style={styles.input}
      />

      <Pressable
        style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
        onPress={onSave}
        disabled={isBusy}
      >
        <Text style={styles.primaryButtonText}>
          {isBusy ? "Enregistrement..." : "Sauvegarder le profil"}
        </Text>
      </Pressable>
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
  helperText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusPill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusPillDone: {
    backgroundColor: theme.colors.mintSoft,
    borderColor: "rgba(111,212,168,0.24)",
  },
  statusPillText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  statusPillTextDone: {
    color: theme.colors.mint,
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
  primaryButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: theme.colors.ink,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
