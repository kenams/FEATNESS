import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import type { BmiInsight, PrimaryObjectiveKey } from "@featness/shared";

import { mobileShadow, theme } from "../theme";

const OBJECTIVES: Array<{ value: PrimaryObjectiveKey; label: string }> = [
  { value: "lose_weight", label: "Perdre du poids" },
  { value: "maintain", label: "Rester en forme" },
  { value: "gain_muscle", label: "Prendre du muscle" },
  { value: "improve_endurance", label: "Ameliorer l'endurance" },
];

type ProfileCardProps = {
  age: string;
  weightKg: string;
  heightCm: string;
  primaryObjective: PrimaryObjectiveKey;
  bmiInsight: BmiInsight | null;
  onAgeChange: (value: string) => void;
  onWeightChange: (value: string) => void;
  onHeightChange: (value: string) => void;
  onObjectiveChange: (value: PrimaryObjectiveKey) => void;
  onSave: () => void;
  isBusy: boolean;
  isComplete: boolean;
};

export function ProfileCard({
  age,
  weightKg,
  heightCm,
  primaryObjective,
  bmiInsight,
  onAgeChange,
  onWeightChange,
  onHeightChange,
  onObjectiveChange,
  onSave,
  isBusy,
  isComplete,
}: ProfileCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Inscription</Text>
      <Text style={styles.cardTitle}>
        {isComplete ? "Ton profil sante FEATNESS" : "Complete ton profil en 30 secondes"}
      </Text>
      <Text style={styles.helperText}>
        Age, taille, poids et objectif suffisent pour calculer l&apos;IMC et te proposer
        les bonnes seances avant ton plat.
      </Text>

      <View style={styles.grid}>
        <TextInput
          placeholder="Age"
          placeholderTextColor="#88a099"
          keyboardType="numeric"
          value={age}
          onChangeText={onAgeChange}
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
          placeholder="Taille (cm)"
          placeholderTextColor="#88a099"
          keyboardType="numeric"
          value={heightCm}
          onChangeText={onHeightChange}
          style={styles.input}
        />
      </View>

      <View style={styles.objectiveList}>
        {OBJECTIVES.map((objective) => (
          <Pressable
            key={objective.value}
            style={[
              styles.objectiveChip,
              primaryObjective === objective.value && styles.objectiveChipActive,
            ]}
            onPress={() => onObjectiveChange(objective.value)}
          >
            <Text
              style={[
                styles.objectiveChipText,
                primaryObjective === objective.value && styles.objectiveChipTextActive,
              ]}
            >
              {objective.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.bmiPanel}>
        <Text style={styles.bmiEyebrow}>IMC</Text>
        {bmiInsight ? (
          <>
            <Text style={styles.bmiValue}>{bmiInsight.bmi}</Text>
            <Text style={styles.bmiLabel}>{bmiInsight.label}</Text>
          </>
        ) : (
          <>
            <Text style={styles.bmiValue}>--</Text>
            <Text style={styles.bmiLabel}>Renseigne taille et poids</Text>
          </>
        )}
      </View>

      <Pressable
        style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
        onPress={onSave}
        disabled={isBusy}
      >
        <Text style={styles.primaryButtonText}>
          {isBusy ? "Enregistrement..." : "Valider mon profil"}
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
  grid: {
    gap: 10,
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
  objectiveList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  objectiveChip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  objectiveChipActive: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  objectiveChipText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  objectiveChipTextActive: {
    color: theme.colors.ink,
  },
  bmiPanel: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: theme.colors.goldSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 4,
  },
  bmiEyebrow: {
    color: "#f1d893",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    fontWeight: "700",
  },
  bmiValue: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: "700",
  },
  bmiLabel: {
    color: theme.colors.textSoft,
    lineHeight: 19,
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
