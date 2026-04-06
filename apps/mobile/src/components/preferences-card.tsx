import { Pressable, StyleSheet, Text, View } from "react-native";

import type { GoalKey, SportKey } from "@featness/shared";

import { mobileShadow, theme } from "../theme";

type PreferencesCardProps = {
  preferredSport: SportKey | null;
  preferredGoal: GoalKey | null;
  preferredGymName: string | null;
  favoriteCount: number;
  onSaveCurrent: () => void;
};

export function PreferencesCard({
  preferredSport,
  preferredGoal,
  preferredGymName,
  favoriteCount,
  onSaveCurrent,
}: PreferencesCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Memo</Text>
      <Text style={styles.cardTitle}>Preferences FEATNESS</Text>
      <Text style={styles.helperText}>
        Conserve ton sport principal, ton objectif frequent, ta salle habituelle
        et tes repas favoris pour accelerer les prochains tests.
      </Text>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Sport</Text>
          <Text style={styles.summaryValue}>{preferredSport ?? "Non defini"}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Objectif</Text>
          <Text style={styles.summaryValue}>{preferredGoal ?? "Non defini"}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <PreferencePill label={preferredSport ? `Sport ${preferredSport}` : "Sport non defini"} />
        <PreferencePill label={preferredGoal ? `Objectif ${preferredGoal}` : "Objectif non defini"} />
      </View>
      <View style={styles.row}>
        <PreferencePill
          label={preferredGymName ? `Salle ${preferredGymName}` : "Salle non definie"}
        />
        <PreferencePill label={`${favoriteCount} favori${favoriteCount > 1 ? "s" : ""}`} />
      </View>

      <Pressable style={styles.primaryButton} onPress={onSaveCurrent}>
        <Text style={styles.primaryButtonText}>Enregistrer mes preferences actuelles</Text>
      </Pressable>
    </View>
  );
}

function PreferencePill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
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
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    gap: 6,
  },
  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  summaryValue: {
    color: theme.colors.text,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  pill: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pillText: {
    color: theme.colors.text,
    fontSize: 12,
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
});
