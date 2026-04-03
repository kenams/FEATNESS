import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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
      <Text style={styles.cardTitle}>
        {isComplete ? "Profil FEATNESS" : "Onboarding FEATNESS"}
      </Text>
      <Text style={styles.helperText}>
        {isComplete
          ? "Ton profil pilote la recommandation et le QR remis a la borne."
          : "Le trigger Supabase doit creer le profil automatiquement. Ici tu completes les champs necessaires a l'onboarding."}
      </Text>

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
  helperText: {
    color: "#88a099",
    fontSize: 13,
    lineHeight: 18,
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
  primaryButton: {
    backgroundColor: "#c9a646",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#08110f",
    fontWeight: "700",
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
