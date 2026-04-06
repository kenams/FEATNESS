import { Pressable, StyleSheet, Text, View } from "react-native";

import type { GoalKey } from "@featness/shared";

import type { DrinkBlendRecord } from "../lib/featness-data";
import { mobileShadow, theme } from "../theme";

type MealDetailCardProps = {
  meal: DrinkBlendRecord | null;
  goal: GoalKey;
  isFavorite: boolean;
  isConfirmed: boolean;
  onToggleFavorite: () => void;
  onConfirmChoice: () => void;
  isBusy: boolean;
};

const GOAL_COPY: Record<GoalKey, string> = {
  hydration: "Optimise la rehydratation et remet du volume utile apres l'effort.",
  recovery: "Remonte plus vite avec un apport clair en proteines et glucides.",
  performance:
    "Soutient la recharge energetique avant une reprise ou une double seance.",
};

function getPreparationLabel(type: DrinkBlendRecord["preparationType"]): string {
  switch (type) {
    case "lyophilise":
      return "Lyophilise";
    case "auto_chauffant":
      return "Auto-chauffant";
    case "assemblage_sec":
      return "Assemblage sec";
    default:
      return type;
  }
}

function formatCurrency(value: number): string {
  return `${value.toFixed(2)} EUR`;
}

function getPreparationEta(type: DrinkBlendRecord["preparationType"]): string {
  switch (type) {
    case "lyophilise":
      return "pret en env. 90 sec";
    case "auto_chauffant":
      return "pret en env. 2 min";
    case "assemblage_sec":
      return "pret en env. 60 sec";
    default:
      return "pret rapidement";
  }
}

export function MealDetailCard({
  meal,
  goal,
  isFavorite,
  isConfirmed,
  onToggleFavorite,
  onConfirmChoice,
  isBusy,
}: MealDetailCardProps) {
  if (!meal) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>Decision</Text>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Detail du plat</Text>
          <Text style={styles.title}>{meal.name}</Text>
          <Text style={styles.subtitle}>{meal.description}</Text>
        </View>
        <View style={[styles.pricePill, { borderColor: meal.accent }]}>
          <Text style={styles.pricePillText}>{formatCurrency(meal.priceEur)}</Text>
        </View>
      </View>

      <View style={styles.metricGrid}>
        <MetricCard label="Calories" value={`${meal.calories} kcal`} />
        <MetricCard label="Proteines" value={`${meal.proteinG} g`} />
        <MetricCard label="Glucides" value={`${meal.carbsG} g`} />
        <MetricCard label="Lipides" value={`${meal.fatG} g`} />
      </View>

      <View style={styles.metaRow}>
        <MetaTag label={`Objectif ${goal}`} />
        <MetaTag label={getPreparationLabel(meal.preparationType)} />
        <MetaTag label={getPreparationEta(meal.preparationType)} />
      </View>

      <View style={styles.callout}>
        <Text style={styles.calloutTitle}>Pourquoi FEATNESS le recommande</Text>
        <Text style={styles.calloutCopy}>{GOAL_COPY[goal]}</Text>
      </View>

      <View style={styles.decisionBar}>
        <Text style={styles.decisionBarTitle}>Decision la plus rapide</Text>
        <Text style={styles.decisionBarCopy}>
          Si tu veux aller vite, valide ce plat maintenant. Le QR pourra etre genere juste apres si tu en as besoin.
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.secondaryButton} onPress={onToggleFavorite}>
          <Text style={styles.secondaryButtonText}>
            {isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.primaryButton,
            isConfirmed && styles.primaryButtonSuccess,
            isBusy && styles.buttonDisabled,
          ]}
          onPress={onConfirmChoice}
          disabled={isBusy}
        >
          <Text style={styles.primaryButtonText}>
            {isBusy ? "Validation..." : isConfirmed ? "Plat valide" : "Valider ce plat"}
          </Text>
        </Pressable>
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

function MetaTag({ label }: { label: string }) {
  return (
    <View style={styles.metaTag}>
      <Text style={styles.metaTagText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 14,
    ...mobileShadow,
  },
  cardEyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.6,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  pricePill: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceMuted,
  },
  pricePillText: {
    color: "#f1d893",
    fontWeight: "700",
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
    color: theme.colors.text,
    marginTop: 6,
    fontSize: 18,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaTag: {
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaTagText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  callout: {
    backgroundColor: theme.colors.goldSoft,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 4,
  },
  calloutTitle: {
    color: "#f1d893",
    fontWeight: "700",
  },
  calloutCopy: {
    color: "#f1d893",
    lineHeight: 20,
  },
  decisionBar: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  decisionBarTitle: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  decisionBarCopy: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  primaryButtonSuccess: {
    backgroundColor: theme.colors.mint,
  },
  primaryButtonText: {
    color: theme.colors.ink,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: theme.colors.surfaceMuted,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: "600",
    textAlign: "center",
  },
});
