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
}: RecommendationCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Preview recommandation</Text>

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
  chipsRow: {
    flexGrow: 0,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    marginRight: 10,
  },
  chipActive: {
    backgroundColor: "#c9a646",
    borderColor: "#c9a646",
  },
  chipText: {
    color: "#f6f7f8",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#08110f",
  },
  compactChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#0c1816",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  compactChipActive: {
    backgroundColor: "#15382d",
    borderColor: "#59d39a",
  },
  compactChipText: {
    color: "#f6f7f8",
    textTransform: "capitalize",
  },
  inlineButtons: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
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
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    backgroundColor: "#0c1816",
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  metricLabel: {
    color: "#88a099",
    fontSize: 12,
    textTransform: "uppercase",
  },
  metricValue: {
    marginTop: 6,
    color: "#f6f7f8",
    fontSize: 18,
    fontWeight: "700",
  },
  callout: {
    backgroundColor: "rgba(201,166,70,0.12)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(201,166,70,0.28)",
  },
  calloutText: {
    color: "#f7e3a5",
    lineHeight: 20,
  },
});
