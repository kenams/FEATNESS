import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  ACTIVITY_PRESETS,
  type GoalKey,
  type IntensityLevel,
  type NutritionRecommendation,
  type SportKey,
} from "@featness/shared";

import { mobileShadow, theme } from "../theme";

type RecommendationCardProps = {
  sport: SportKey;
  intensity: IntensityLevel;
  goal: GoalKey;
  durationMin: string;
  weightKg: string;
  recommendation: NutritionRecommendation;
  onSportChange: (value: SportKey) => void;
  onIntensityChange: (value: IntensityLevel) => void;
  onGoalChange: (value: GoalKey) => void;
  onDurationChange: (value: string) => void;
  onWeightChange: (value: string) => void;
  onRunDemoSession: () => void;
  isBusy: boolean;
};

export function RecommendationCard({
  sport,
  intensity,
  goal,
  durationMin,
  weightKg,
  recommendation,
  onSportChange,
  onIntensityChange,
  onGoalChange,
  onDurationChange,
  onWeightChange,
  onRunDemoSession,
  isBusy,
}: RecommendationCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Session</Text>
      <Text style={styles.cardTitle}>Preview recommandation</Text>
      <View style={styles.heroPanel}>
        <Text style={styles.heroPanelEyebrow}>Coach FEATNESS</Text>
        <Text style={styles.heroPanelCopy}>
          Renseigne ton effort ou lance une demo. FEATNESS calcule ensuite le mix recommande,
          le QR et les meilleurs plats a retenir.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
      >
        {ACTIVITY_PRESETS.map((preset) => (
          <Pressable
            key={preset.key}
            style={[styles.chip, sport === preset.key && styles.chipActive]}
            onPress={() => onSportChange(preset.key)}
          >
            <Text
              style={[
                styles.chipText,
                sport === preset.key && styles.chipTextActive,
              ]}
            >
              {preset.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.inlineButtons}>
        {(["light", "moderate", "intense"] as const).map((value) => (
          <Pressable
            key={value}
            style={[
              styles.compactChip,
              intensity === value && styles.compactChipActive,
            ]}
            onPress={() => onIntensityChange(value)}
          >
            <Text style={styles.compactChipText}>{value}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.inlineButtons}>
        {(["hydration", "recovery", "performance"] as const).map((value) => (
          <Pressable
            key={value}
            style={[
              styles.compactChip,
              goal === value && styles.compactChipActive,
            ]}
            onPress={() => onGoalChange(value)}
          >
            <Text style={styles.compactChipText}>{value}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        placeholder="Duree (min)"
        placeholderTextColor="#88a099"
        keyboardType="numeric"
        value={durationMin}
        onChangeText={onDurationChange}
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

      <View style={styles.metricGrid}>
        <MetricCard
          label="Calories"
          value={`${recommendation.caloriesBurned} kcal`}
        />
        <MetricCard
          label="Hydratation"
          value={`${recommendation.hydrationMl} ml`}
        />
        <MetricCard label="Glucides" value={`${recommendation.carbsG} g`} />
        <MetricCard label="Proteines" value={`${recommendation.proteinG} g`} />
      </View>

      <View style={styles.callout}>
        <Text style={styles.calloutText}>
          {recommendation.recommendationSummary}
        </Text>
      </View>

      <Pressable
        style={[styles.demoButton, isBusy && styles.buttonDisabled]}
        onPress={onRunDemoSession}
        disabled={isBusy}
      >
        <Text style={styles.demoButtonText}>
          {isBusy ? "Preparation..." : "Lancer une seance test en 1 clic"}
        </Text>
      </Pressable>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
  heroPanel: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  heroPanelEyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  heroPanelCopy: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  chipsRow: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  chipActive: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  chipText: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  chipTextActive: {
    color: theme.colors.ink,
  },
  compactChip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  compactChipActive: {
    backgroundColor: theme.colors.mintSoft,
    borderColor: theme.colors.mint,
  },
  compactChipText: {
    color: theme.colors.text,
    textTransform: "capitalize",
  },
  inlineButtons: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
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
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
  },
  metricValue: {
    marginTop: 6,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  callout: {
    backgroundColor: theme.colors.goldSoft,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  calloutText: {
    color: "#f1d893",
    lineHeight: 20,
  },
  demoButton: {
    backgroundColor: theme.colors.mintSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(111,212,168,0.35)",
  },
  demoButtonText: {
    color: theme.colors.mint,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
