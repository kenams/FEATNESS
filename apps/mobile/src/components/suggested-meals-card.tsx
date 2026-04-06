import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { GoalKey } from "@featness/shared";

import type { DrinkBlendRecord } from "../lib/featness-data";
import { mobileShadow, theme } from "../theme";

type SuggestedMeal = DrinkBlendRecord & {
  rank: number;
  score: number;
};

type MealViewKey = "recommended" | "objective" | "all";

type SuggestedMealsCardProps = {
  recommendedMeals: SuggestedMeal[];
  objectiveMeals: SuggestedMeal[];
  allMeals: SuggestedMeal[];
  goal: GoalKey;
  objectiveTitle: string;
  objectiveCopy: string;
  menuTitle: string;
  mealView: MealViewKey;
  selectedMealId: string | null;
  favoriteMealIds: string[];
  onMealViewChange: (view: MealViewKey) => void;
  onSelectMeal: (mealId: string) => void;
  onQuickConfirmRecommended: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  isConfirmed: boolean;
  isBusy: boolean;
};

const GOAL_LABELS: Record<GoalKey, string> = {
  hydration: "Hydratation",
  recovery: "Recuperation",
  performance: "Performance",
};

const GOAL_COPY: Record<GoalKey, string> = {
  hydration: "Hydrate vite avec un apport leger et utile apres l'effort.",
  recovery: "Remonte plus vite avec des proteines et glucides clairs.",
  performance: "Recharge l'energie avant une reprise ou une double seance.",
};

function formatCurrency(value: number): string {
  return `${value.toFixed(2)} EUR`;
}

function getPreparationEta(type: DrinkBlendRecord["preparationType"]): string {
  switch (type) {
    case "lyophilise":
      return "90 sec";
    case "auto_chauffant":
      return "2 min";
    case "assemblage_sec":
      return "60 sec";
    default:
      return "Rapide";
  }
}

function getEffortLabel(category: DrinkBlendRecord["effortCategory"]): string {
  switch (category) {
    case "light":
      return "Effort leger";
    case "medium":
      return "Effort moyen";
    case "intense":
      return "Effort intense";
    default:
      return "Effort";
  }
}

export function SuggestedMealsCard({
  recommendedMeals,
  objectiveMeals,
  allMeals,
  goal,
  objectiveTitle,
  objectiveCopy,
  menuTitle,
  mealView,
  selectedMealId,
  favoriteMealIds,
  onMealViewChange,
  onSelectMeal,
  onQuickConfirmRecommended,
  onToggleFavorite,
  isFavorite,
  isConfirmed,
  isBusy,
}: SuggestedMealsCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const selectedMeal = useMemo(
    () =>
      allMeals.find((meal) => meal.id === selectedMealId) ??
      recommendedMeals[0] ??
      objectiveMeals[0] ??
      allMeals[0] ??
      null,
    [allMeals, objectiveMeals, recommendedMeals, selectedMealId],
  );

  const listMeals = useMemo(() => {
    switch (mealView) {
      case "objective":
        return objectiveMeals;
      case "all":
        return allMeals;
      case "recommended":
      default:
        return recommendedMeals;
    }
  }, [allMeals, mealView, objectiveMeals, recommendedMeals]);

  const visibleMeals = listMeals.filter((meal) => meal.id !== selectedMeal?.id);

  if (!selectedMeal) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>Plats</Text>
      <Text style={styles.cardTitle}>Choix rapide FEATNESS</Text>
      <Text style={styles.helperText}>
        Le plat choisi remonte tout en haut. Tu peux ensuite comparer par reco, par objectif
        ou via tout le menu.
      </Text>

      <View style={styles.segmentedTabs}>
        <MealTab
          label="Pour toi"
          active={mealView === "recommended"}
          onPress={() => onMealViewChange("recommended")}
        />
        <MealTab
          label="Objectif"
          active={mealView === "objective"}
          onPress={() => onMealViewChange("objective")}
        />
        <MealTab
          label="Menu borne"
          active={mealView === "all"}
          onPress={() => onMealViewChange("all")}
        />
      </View>

      <View style={styles.selectedCard}>
        <View style={styles.selectedHeader}>
          <View style={styles.selectedCopy}>
            <Text style={styles.selectedEyebrow}>Choix retenu</Text>
            <Text style={styles.selectedTitle}>{selectedMeal.name}</Text>
            <Text style={styles.selectedDescription} numberOfLines={2}>
              {selectedMeal.description}
            </Text>
          </View>
          <View style={styles.pricePill}>
            <Text style={styles.pricePillText}>{formatCurrency(selectedMeal.priceEur)}</Text>
          </View>
        </View>

        <View style={styles.primaryTags}>
          <Tag label={GOAL_LABELS[selectedMeal.targetGoal as GoalKey] ?? selectedMeal.targetGoal} />
          <Tag label={getEffortLabel(selectedMeal.effortCategory)} />
          <Tag label={`${selectedMeal.proteinG} g prot`} />
          <Tag label={getPreparationEta(selectedMeal.preparationType)} />
        </View>

        <View style={styles.fastReason}>
          <Text style={styles.fastReasonTitle}>Pourquoi ce choix</Text>
          <Text style={styles.fastReasonCopy}>{GOAL_COPY[goal]}</Text>
        </View>

        <View style={styles.compactMetrics}>
          <Metric label="Calories" value={`${selectedMeal.calories} kcal`} />
          <Metric label="Glucides" value={`${selectedMeal.carbsG} g`} />
          <Metric label="Lipides" value={`${selectedMeal.fatG} g`} />
        </View>

        <View style={styles.inlineActions}>
          <Pressable style={styles.secondaryAction} onPress={onToggleFavorite}>
            <Text style={styles.secondaryActionText}>
              {isFavorite ? "Favori ajoute" : "Ajouter aux favoris"}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.primaryAction,
              isConfirmed && styles.primaryActionSuccess,
              isBusy && styles.buttonDisabled,
            ]}
            onPress={onQuickConfirmRecommended}
            disabled={isBusy}
          >
            <Text style={styles.primaryActionText}>
              {isBusy ? "Validation..." : isConfirmed ? "Plat valide" : "Valider et aller au recap"}
            </Text>
          </Pressable>
        </View>

        <Pressable style={styles.detailToggle} onPress={() => setShowDetails((value) => !value)}>
          <Text style={styles.detailToggleText}>
            {showDetails ? "Masquer ingredients" : "Voir ingredients et allergenes"}
          </Text>
        </Pressable>

        {showDetails ? (
          <View style={styles.detailPanel}>
            <Text style={styles.panelLabel}>Ingredients</Text>
            <View style={styles.chipList}>
              {selectedMeal.ingredients.map((ingredient) => (
                <View key={ingredient} style={styles.chip}>
                  <Text style={styles.chipText}>{ingredient}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.panelLabel}>Allergenes</Text>
            {selectedMeal.allergens.length > 0 ? (
              <View style={styles.chipList}>
                {selectedMeal.allergens.map((allergen) => (
                  <View key={allergen} style={[styles.chip, styles.allergenChip]}>
                    <Text style={[styles.chipText, styles.allergenChipText]}>{allergen}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.panelCopy}>Aucun allergene majeur declare sur cette recette.</Text>
            )}

            <Text style={styles.panelLabel}>Note</Text>
            <Text style={styles.panelCopy}>{selectedMeal.ingredientNotes}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.contextPanel}>
        <Text style={styles.contextTitle}>
          {mealView === "recommended"
            ? "Plats les plus coherents avec ta seance"
            : mealView === "objective"
              ? objectiveTitle
              : menuTitle}
        </Text>
        <Text style={styles.contextCopy}>
          {mealView === "recommended"
            ? "FEATNESS trie d'abord pour toi : effort, objectif et recuperation."
            : mealView === "objective"
              ? objectiveCopy
              : "Liste complete des plats disponibles sur une borne FEATNESS via QR."}
        </Text>
      </View>

      {visibleMeals.length > 0 ? (
        <View style={styles.list}>
          {visibleMeals.map((meal) => {
            const isSelected = meal.id === selectedMealId;

            return (
              <Pressable
                key={`${mealView}-${meal.id}`}
                style={[styles.alternativeCard, isSelected ? styles.alternativeCardSelected : null]}
                onPress={() => onSelectMeal(meal.id)}
              >
                <View style={styles.alternativeHeader}>
                  <View style={styles.alternativeCopy}>
                    <Text style={styles.alternativeEyebrow}>
                      {mealView === "all" ? getEffortLabel(meal.effortCategory) : `Option ${meal.rank}`}
                    </Text>
                    <Text style={styles.alternativeName}>{meal.name}</Text>
                    <Text style={styles.alternativeDescription} numberOfLines={2}>
                      {meal.description}
                    </Text>
                  </View>
                  <Text style={styles.alternativePrice}>{formatCurrency(meal.priceEur)}</Text>
                </View>

                <View style={styles.alternativeTags}>
                  <Tag label={GOAL_LABELS[meal.targetGoal as GoalKey] ?? meal.targetGoal} compact />
                  <Tag label={`${meal.proteinG} g prot`} compact />
                  <Tag label={`${meal.calories} kcal`} compact />
                  {favoriteMealIds.includes(meal.id) ? <Tag label="Favori" compact highlighted /> : null}
                </View>

                <View style={[styles.switchButton, isSelected ? styles.switchButtonSelected : null]}>
                  <Text style={[styles.switchButtonText, isSelected ? styles.switchButtonTextSelected : null]}>
                    {isSelected ? "Selectionne" : "Choisir ce plat"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function MealTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.tabChip, active ? styles.tabChipActive : null]} onPress={onPress}>
      <Text style={[styles.tabChipText, active ? styles.tabChipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function Tag({
  label,
  compact = false,
  highlighted = false,
}: {
  label: string;
  compact?: boolean;
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.tag, compact ? styles.tagCompact : null, highlighted ? styles.tagHighlighted : null]}>
      <Text style={[styles.tagText, highlighted ? styles.tagTextHighlighted : null]}>{label}</Text>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
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
  cardEyebrow: {
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
  segmentedTabs: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  tabChip: {
    flexGrow: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
  },
  tabChipActive: {
    backgroundColor: theme.colors.goldSoft,
    borderColor: theme.colors.borderStrong,
  },
  tabChipText: {
    color: theme.colors.textSoft,
    fontWeight: "700",
    textAlign: "center",
    fontSize: 12,
  },
  tabChipTextActive: {
    color: "#f1d893",
  },
  selectedCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#132521",
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 12,
  },
  selectedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  selectedCopy: {
    flex: 1,
    gap: 4,
  },
  selectedEyebrow: {
    color: theme.colors.mint,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    fontWeight: "700",
  },
  selectedTitle: {
    color: theme.colors.text,
    fontSize: 21,
    fontWeight: "700",
  },
  selectedDescription: {
    color: theme.colors.textSoft,
    lineHeight: 19,
  },
  pricePill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.goldSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  pricePillText: {
    color: "#f1d893",
    fontWeight: "700",
  },
  primaryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tagHighlighted: {
    backgroundColor: theme.colors.mintSoft,
    borderColor: "rgba(111,212,168,0.32)",
  },
  tagText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  tagTextHighlighted: {
    color: theme.colors.mint,
  },
  fastReason: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: theme.colors.goldSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 4,
  },
  fastReasonTitle: {
    color: "#f1d893",
    fontWeight: "700",
  },
  fastReasonCopy: {
    color: theme.colors.textSoft,
    lineHeight: 19,
  },
  compactMetrics: {
    flexDirection: "row",
    gap: 8,
  },
  metric: {
    flex: 1,
    borderRadius: 16,
    padding: 10,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  metricLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
  },
  metricValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  inlineActions: {
    gap: 8,
  },
  secondaryAction: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: theme.colors.surfaceMuted,
  },
  secondaryActionText: {
    color: theme.colors.text,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryAction: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  primaryActionSuccess: {
    backgroundColor: theme.colors.mint,
  },
  primaryActionText: {
    color: theme.colors.ink,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  detailToggle: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  detailToggleText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  detailPanel: {
    gap: 10,
    borderRadius: 18,
    padding: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  panelLabel: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  chipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  allergenChip: {
    backgroundColor: "rgba(240,138,126,0.12)",
    borderColor: "rgba(240,138,126,0.24)",
  },
  allergenChipText: {
    color: theme.colors.danger,
    fontWeight: "700",
  },
  panelCopy: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  contextPanel: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6,
  },
  contextTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  contextCopy: {
    color: theme.colors.textMuted,
    lineHeight: 19,
  },
  list: {
    gap: 10,
  },
  alternativeCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    gap: 10,
  },
  alternativeCardSelected: {
    borderColor: "rgba(111,212,168,0.36)",
    backgroundColor: theme.colors.mintSoft,
  },
  alternativeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  alternativeCopy: {
    flex: 1,
    gap: 4,
  },
  alternativeEyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  alternativeName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  alternativeDescription: {
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  alternativePrice: {
    color: "#f1d893",
    fontWeight: "700",
  },
  alternativeTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  switchButton: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  switchButtonSelected: {
    backgroundColor: theme.colors.mint,
    borderColor: "rgba(111,212,168,0.32)",
  },
  switchButtonText: {
    color: theme.colors.text,
    textAlign: "center",
    fontWeight: "700",
  },
  switchButtonTextSelected: {
    color: theme.colors.ink,
  },
});
