import { Pressable, StyleSheet, Text, View } from "react-native";

import type { GoalKey } from "@featness/shared";

import type { DrinkBlendRecord } from "../lib/featness-data";
import { mobileShadow, theme } from "../theme";

type SuggestedMeal = DrinkBlendRecord & {
  rank: number;
  score: number;
};

type SuggestedMealsCardProps = {
  meals: SuggestedMeal[];
  goal: GoalKey;
  selectedMealId: string | null;
  favoriteMealIds: string[];
  onSelectMeal: (mealId: string) => void;
  onQuickConfirmRecommended: () => void;
  isBusy: boolean;
};

const GOAL_LABELS: Record<GoalKey, string> = {
  hydration: "Hydratation",
  recovery: "Recuperation",
  performance: "Performance",
};

function formatCurrency(value: number): string {
  return `${value.toFixed(2)} EUR`;
}

function buildReason(rank: number, meal: SuggestedMeal, goal: GoalKey): string {
  if (meal.rank === 1 && meal.targetGoal === goal) {
    return "Le meilleur alignement entre ta seance et la borne FEATNESS.";
  }

  if (meal.targetGoal === goal) {
    return "Cible le meme objectif que ta recommandation sportive.";
  }

  if (rank === 1) {
    return "Option la plus proche disponible malgre un catalogue partiel.";
  }

  return "Alternative utile si tu veux varier tout en restant dans le bon flux.";
}

export function SuggestedMealsCard({
  meals,
  goal,
  selectedMealId,
  favoriteMealIds,
  onSelectMeal,
  onQuickConfirmRecommended,
  isBusy,
}: SuggestedMealsCardProps) {
  if (meals.length === 0) {
    return null;
  }

  const recommendedMeal = meals[0];

  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>Catalogue</Text>
      <Text style={styles.cardTitle}>Plats recommandes maintenant</Text>
      <Text style={styles.helperText}>
        FEATNESS affiche tout de suite les 3 options les plus coherentes. Le but est de
        choisir ton plat ici, sans attendre la borne.
      </Text>
      <View style={styles.tipBox}>
        <Text style={styles.tipEyebrow}>Conseil FEATNESS</Text>
        <Text style={styles.tipCopy}>
          Commence par l&apos;option 1. Ouvre ensuite le detail uniquement si tu veux comparer les macros ou le temps de preparation.
        </Text>
      </View>

      <View style={styles.expressCard}>
        <View style={styles.expressHeader}>
          <View style={styles.expressCopy}>
            <Text style={styles.expressEyebrow}>Choix express</Text>
            <Text style={styles.expressTitle}>{recommendedMeal.name}</Text>
            <Text style={styles.expressDescription}>
              Le meilleur compromis entre ta seance, le prix et la rapidite de preparation.
            </Text>
          </View>
          <View style={styles.expressPricePill}>
            <Text style={styles.expressPriceText}>{formatCurrency(recommendedMeal.priceEur)}</Text>
          </View>
        </View>

        <View style={styles.expressTags}>
          <View style={styles.expressTag}>
            <Text style={styles.expressTagText}>
              {GOAL_LABELS[recommendedMeal.targetGoal as GoalKey] ?? recommendedMeal.targetGoal}
            </Text>
          </View>
          <View style={styles.expressTag}>
            <Text style={styles.expressTagText}>{recommendedMeal.proteinG} g prot</Text>
          </View>
          <View style={styles.expressTag}>
            <Text style={styles.expressTagText}>{recommendedMeal.calories} kcal</Text>
          </View>
          <View style={styles.expressTag}>
            <Text style={styles.expressTagText}>
              {recommendedMeal.allergens.length > 0
                ? `${recommendedMeal.allergens.length} allergenes`
                : "Sans allergene majeur"}
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.expressButton, isBusy && styles.buttonDisabled]}
          onPress={onQuickConfirmRecommended}
          disabled={isBusy}
        >
          <Text style={styles.expressButtonText}>
            {isBusy ? "Validation..." : "Choisir l'option 1 et generer le QR"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {meals.map((meal) => (
          <Pressable
            key={meal.id}
            style={[
              styles.mealCard,
              meal.rank === 1 && styles.featuredMealCard,
              selectedMealId === meal.id && styles.selectedMealCard,
            ]}
            onPress={() => onSelectMeal(meal.id)}
          >
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <Text style={styles.itemEyebrow}>
                  {meal.rank === 1 ? "Choix recommande" : `Option ${meal.rank}`}
                </Text>
                <Text style={styles.mealName}>{meal.name}</Text>
              </View>
              <Text style={styles.price}>{formatCurrency(meal.priceEur)}</Text>
            </View>

            <Text style={styles.description}>{meal.description}</Text>
            <Text style={styles.reason}>{buildReason(meal.rank, meal, goal)}</Text>

            <View style={styles.tags}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>
                  {GOAL_LABELS[meal.targetGoal as GoalKey] ?? meal.targetGoal}
                </Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{meal.calories} kcal</Text>
              </View>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{meal.proteinG} g prot</Text>
              </View>
              {favoriteMealIds.includes(meal.id) ? (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>Favori</Text>
                </View>
              ) : null}
              {selectedMealId === meal.id ? (
                <View style={styles.selectedTag}>
                  <Text style={styles.selectedTagText}>Selectionne</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
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
  tipBox: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: theme.colors.goldSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 4,
  },
  tipEyebrow: {
    color: "#f1d893",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  tipCopy: {
    color: theme.colors.textSoft,
    lineHeight: 19,
  },
  expressCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#132521",
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 12,
  },
  expressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  expressCopy: {
    flex: 1,
    gap: 4,
  },
  expressEyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    fontWeight: "700",
  },
  expressTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  expressDescription: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  expressPricePill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.goldSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  expressPriceText: {
    color: "#f1d893",
    fontWeight: "700",
  },
  expressTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  expressTag: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  expressTagText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  expressButton: {
    backgroundColor: theme.colors.mint,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  expressButtonText: {
    color: theme.colors.ink,
    fontWeight: "700",
    textAlign: "center",
  },
  list: {
    gap: 12,
  },
  mealCard: {
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10,
  },
  featuredMealCard: {
    borderColor: theme.colors.borderStrong,
    backgroundColor: "#132521",
  },
  selectedMealCard: {
    borderColor: theme.colors.mint,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  itemEyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  mealName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  price: {
    color: "#f1d893",
    fontWeight: "700",
  },
  description: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  reason: {
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  selectedTag: {
    backgroundColor: theme.colors.mintSoft,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(111,212,168,0.35)",
  },
  selectedTagText: {
    color: theme.colors.mint,
    fontSize: 12,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
