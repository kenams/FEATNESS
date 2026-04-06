import { StyleSheet, Text, View } from "react-native";

import type { DrinkBlendRecord, KioskRecord } from "../lib/featness-data";
import { mobileShadow, theme } from "../theme";

type KioskMenuCardProps = {
  kiosk: KioskRecord | null;
  meals: DrinkBlendRecord[];
  highlightedMealIds: string[];
};

function getKioskStateCopy(kiosk: KioskRecord | null): string {
  if (!kiosk) {
    return "Choisis une borne pour voir les plats proposes sur place.";
  }

  if (!kiosk.isActive) {
    return "Cette borne est inactive pour le moment.";
  }

  if (kiosk.stockUnits <= 0) {
    return "Cette borne est en rupture de stock pour le moment.";
  }

  return `${kiosk.stockUnits} repas encore disponibles sur cette borne.`;
}

export function KioskMenuCard({
  kiosk,
  meals,
  highlightedMealIds,
}: KioskMenuCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Menu</Text>
      <Text style={styles.cardTitle}>Plats proposes ici</Text>
      <Text style={styles.helperText}>{getKioskStateCopy(kiosk)}</Text>

      {kiosk && kiosk.isActive && kiosk.stockUnits > 0 ? (
        <View style={styles.list}>
          {meals.map((meal) => {
            const isHighlighted = highlightedMealIds.includes(meal.id);

            return (
              <View
                key={meal.id}
                style={[
                  styles.mealCard,
                  isHighlighted && styles.mealCardHighlighted,
                ]}
              >
                <View style={styles.mealHeader}>
                  <View style={styles.mealCopy}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealDescription}>{meal.description}</Text>
                  </View>
                  <View style={[styles.pricePill, { borderColor: meal.accent }]}>
                    <Text style={styles.priceText}>{meal.priceEur.toFixed(2)} EUR</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>{meal.targetGoal}</Text>
                  </View>
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>{meal.calories} kcal</Text>
                  </View>
                  {isHighlighted ? (
                    <View style={[styles.metaChip, styles.highlightChip]}>
                      <Text style={[styles.metaChipText, styles.highlightChipText]}>
                        Recommande pour toi
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Le menu apparait ici des qu'une borne active et selectionnee est disponible.
          </Text>
        </View>
      )}
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
  list: {
    gap: 12,
  },
  mealCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  mealCardHighlighted: {
    borderColor: "rgba(201,166,70,0.26)",
    backgroundColor: theme.colors.goldSoft,
  },
  mealHeader: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  mealCopy: {
    flex: 1,
    gap: 4,
  },
  mealName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  mealDescription: {
    color: theme.colors.textMuted,
    lineHeight: 19,
  },
  pricePill: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  priceText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaChip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metaChipText: {
    color: theme.colors.text,
    fontSize: 12,
    textTransform: "capitalize",
  },
  highlightChip: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  highlightChipText: {
    color: theme.colors.ink,
    fontWeight: "700",
  },
  emptyState: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyStateText: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
