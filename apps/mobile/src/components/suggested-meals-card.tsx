import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { GoalKey } from "@featness/shared";

import type { DrinkBlendRecord } from "../lib/featness-data";
import { mobileShadow, theme } from "../theme";

type SuggestedMeal = DrinkBlendRecord & {
  rank: number;
  score: number;
  fitLabel: "ideal" | "solide" | "leger";
  fitReason: string;
  fitChips: string[];
  isRecommended: boolean;
};

type SuggestedMealsCardProps = {
  recommendedMeals: SuggestedMeal[];
  objectiveMeals: SuggestedMeal[];
  allMeals: SuggestedMeal[];
  goal: GoalKey;
  objectiveTitle: string;
  objectiveCopy: string;
  menuTitle: string;
  sessionCalories: number;
  sessionEffortLabel: string;
  sessionFocusTitle: string;
  sessionFocusCopy: string;
  selectedMealId: string | null;
  favoriteMealIds: string[];
  onSelectMeal: (mealId: string) => void;
  onQuickConfirmRecommended: () => void;
  onClearConfirmedMeal: () => void;
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

function getMealIcon(slug: string): keyof typeof MaterialCommunityIcons.glyphMap {
  if (slug.includes("saumon") || slug.includes("thon") || slug.includes("cabillaud") || slug.includes("poke")) {
    return "fish";
  }

  if (slug.includes("omelette") || slug.includes("oeufs")) {
    return "egg-outline";
  }

  if (slug.includes("wrap") || slug.includes("burrito")) {
    return "wrap";
  }

  if (slug.includes("porridge") || slug.includes("skyr") || slug.includes("bol-recovery")) {
    return "bowl-mix-outline";
  }

  if (slug.includes("pates") || slug.includes("gnocchis") || slug.includes("nouilles")) {
    return "pasta";
  }

  if (slug.includes("riz") || slug.includes("quinoa") || slug.includes("bowl")) {
    return "rice";
  }

  return "food-variant";
}

function getRecommendationLabel(isRecommended: boolean): string {
  return isRecommended ? "Recommande FEATNESS" : "Non prioritaire";
}

function getFitLabelMeta(label: SuggestedMeal["fitLabel"]) {
  switch (label) {
    case "ideal":
      return {
        text: "Meilleur choix",
        containerStyle: styles.fitPillIdeal,
        textStyle: styles.fitPillTextIdeal,
      };
    case "solide":
      return {
        text: "Bon choix",
        containerStyle: styles.fitPillSolide,
        textStyle: styles.fitPillTextSolide,
      };
    case "leger":
    default:
      return {
        text: "Plus leger",
        containerStyle: styles.fitPillLeger,
        textStyle: styles.fitPillTextLeger,
      };
  }
}

function getMealRailStyle(
  fitLabel: SuggestedMeal["fitLabel"],
  isRecommended: boolean,
) {
  if (isRecommended && fitLabel === "ideal") {
    return styles.listRailIdeal;
  }

  if (fitLabel === "solide") {
    return styles.listRailSolide;
  }

  return styles.listRailLeger;
}

function groupMealsByEffort(meals: SuggestedMeal[]) {
  return {
    light: meals.filter((meal) => meal.effortCategory === "light"),
    medium: meals.filter((meal) => meal.effortCategory === "medium"),
    intense: meals.filter((meal) => meal.effortCategory === "intense"),
  };
}

export function SuggestedMealsCard({
  recommendedMeals,
  objectiveMeals,
  allMeals,
  goal,
  objectiveTitle,
  objectiveCopy,
  menuTitle,
  sessionCalories,
  sessionEffortLabel,
  sessionFocusTitle,
  sessionFocusCopy,
  selectedMealId,
  favoriteMealIds,
  onSelectMeal,
  onQuickConfirmRecommended,
  onClearConfirmedMeal,
  onToggleFavorite,
  isFavorite,
  isConfirmed,
  isBusy,
}: SuggestedMealsCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const recommendedIds = useMemo(
    () => new Set(recommendedMeals.map((meal) => meal.id)),
    [recommendedMeals],
  );

  const selectedMeal = useMemo(
    () =>
      allMeals.find((meal) => meal.id === selectedMealId) ??
      recommendedMeals[0] ??
      objectiveMeals[0] ??
      allMeals[0] ??
      null,
    [allMeals, objectiveMeals, recommendedMeals, selectedMealId],
  );

  const visibleRecommendedMeals = useMemo(
    () => recommendedMeals.filter((meal) => meal.id !== selectedMeal?.id),
    [recommendedMeals, selectedMeal?.id],
  );

  const visibleOtherMeals = useMemo(
    () => allMeals.filter((meal) => meal.id !== selectedMeal?.id && !recommendedIds.has(meal.id)),
    [allMeals, recommendedIds, selectedMeal?.id],
  );
  const recommendedGroups = useMemo(
    () => groupMealsByEffort(visibleRecommendedMeals),
    [visibleRecommendedMeals],
  );
  const otherGroups = useMemo(() => groupMealsByEffort(visibleOtherMeals), [visibleOtherMeals]);

  if (!selectedMeal) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>Plats</Text>
      <Text style={styles.cardTitle}>Choisis ton plat en un coup d'oeil</Text>
      <Text style={styles.helperText}>
        Vert = FEATNESS recommande pour ta seance. Rouge = disponible a la borne mais moins prioritaire.
      </Text>
      <View style={styles.legendRow}>
        <FitPill fitLabel="ideal" />
        <FitPill fitLabel="solide" />
        <FitPill fitLabel="leger" />
      </View>

      <View style={styles.sessionSummaryCard}>
        <Text style={styles.sessionSummaryEyebrow}>Resume de ta seance</Text>
        <Text style={styles.sessionSummaryTitle}>{sessionFocusTitle}</Text>
        <Text style={styles.sessionSummaryCopy}>{sessionFocusCopy}</Text>
        <View style={styles.primaryTags}>
          <Tag label={`${sessionCalories} kcal estimees`} />
          <Tag label={sessionEffortLabel} />
          <Tag label={GOAL_LABELS[goal]} />
        </View>
      </View>

      <View style={styles.selectedCard}>
        <View style={styles.selectedTopRow}>
          <MealThumb meal={selectedMeal} large />
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
        </View>

        <View style={styles.primaryTags}>
          <RecommendationPill recommended={selectedMeal.isRecommended} />
          <FitPill fitLabel={selectedMeal.fitLabel} />
          <Tag label={GOAL_LABELS[selectedMeal.targetGoal as GoalKey] ?? selectedMeal.targetGoal} />
          <Tag label={getEffortLabel(selectedMeal.effortCategory)} />
          <Tag label={`${selectedMeal.proteinG} g prot`} />
          <Tag label={getPreparationEta(selectedMeal.preparationType)} />
        </View>

        <View style={styles.fastReason}>
          <Text style={styles.fastReasonTitle}>Pourquoi FEATNESS le pousse</Text>
          <Text style={styles.fastReasonCopy}>{selectedMeal.fitReason}</Text>
          {selectedMeal.fitChips.length > 0 ? (
          <View style={styles.chipList}>
            {selectedMeal.fitChips.map((chip) => (
              <View key={chip} style={styles.chip}>
                  <Text style={styles.chipText}>{chip}</Text>
                </View>
              ))}
            </View>
          ) : null}
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
          {isConfirmed ? (
            <Pressable
              style={[styles.secondaryAction, isBusy && styles.buttonDisabled]}
              onPress={onClearConfirmedMeal}
              disabled={isBusy}
            >
              <Text style={styles.secondaryActionText}>Retirer ce plat</Text>
            </Pressable>
          ) : null}
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
        <Text style={styles.contextTitle}>Classement automatique FEATNESS</Text>
        <Text style={styles.contextCopy}>
          {objectiveTitle} : {objectiveCopy}
        </Text>
        <Text style={styles.contextSecondary}>{menuTitle}</Text>
      </View>

      {visibleRecommendedMeals.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommandes pour toi</Text>
          <Text style={styles.sectionCopy}>
            Ceux-ci sont les plus coherents avec ta seance et ton objectif du moment.
          </Text>
          <EffortGroupedList
            groups={recommendedGroups}
            listKeyPrefix="recommended"
            favoriteMealIds={favoriteMealIds}
            selectedMealId={selectedMealId}
            onSelectMeal={onSelectMeal}
            isRecommended
          />
        </View>
      ) : null}

      {visibleOtherMeals.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tous les plats de la borne</Text>
          <Text style={styles.sectionCopy}>
            Disponibles a la borne FEATNESS, mais moins pertinents que les recommandations vertes.
          </Text>
          <EffortGroupedList
            groups={otherGroups}
            listKeyPrefix="menu"
            favoriteMealIds={favoriteMealIds}
            selectedMealId={selectedMealId}
            onSelectMeal={onSelectMeal}
            isRecommended={false}
          />
        </View>
      ) : null}
    </View>
  );
}

function EffortGroupedList({
  groups,
  listKeyPrefix,
  favoriteMealIds,
  selectedMealId,
  onSelectMeal,
  isRecommended,
}: {
  groups: ReturnType<typeof groupMealsByEffort>;
  listKeyPrefix: string;
  favoriteMealIds: string[];
  selectedMealId: string | null;
  onSelectMeal: (mealId: string) => void;
  isRecommended: boolean;
}) {
  const orderedGroups: Array<{ key: "light" | "medium" | "intense"; label: string }> = [
    { key: "light", label: "Effort leger" },
    { key: "medium", label: "Effort moyen" },
    { key: "intense", label: "Effort intense" },
  ];

  return (
    <View style={styles.list}>
      {orderedGroups.map((group) =>
        groups[group.key].length > 0 ? (
          <View key={`${listKeyPrefix}-${group.key}`} style={styles.effortGroup}>
            <Text style={styles.effortGroupTitle}>{group.label}</Text>
            <View style={styles.groupList}>
              {groups[group.key].map((meal) => (
                <MealListItem
                  key={`${listKeyPrefix}-${meal.id}`}
                  meal={meal}
                  isRecommended={isRecommended}
                  isFavorite={favoriteMealIds.includes(meal.id)}
                  isSelected={meal.id === selectedMealId}
                  onPress={() => onSelectMeal(meal.id)}
                />
              ))}
            </View>
          </View>
        ) : null,
      )}
    </View>
  );
}

function MealThumb({ meal, large = false }: { meal: SuggestedMeal; large?: boolean }) {
  const icon = getMealIcon(meal.slug);

  return (
    <View
      style={[
        styles.thumb,
        large ? styles.thumbLarge : null,
        {
          backgroundColor: `${meal.accent}22`,
          borderColor: `${meal.accent}66`,
        },
      ]}
    >
      <View style={[styles.thumbGlow, { backgroundColor: `${meal.accent}44` }]} />
      <MaterialCommunityIcons name={icon} size={large ? 34 : 24} color={meal.accent} />
      <Text style={styles.thumbLabel}>{getEffortLabel(meal.effortCategory)}</Text>
    </View>
  );
}

function MealListItem({
  meal,
  isRecommended,
  isFavorite,
  isSelected,
  onPress,
}: {
  meal: SuggestedMeal;
  isRecommended: boolean;
  isFavorite: boolean;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.listCard,
        isRecommended ? styles.listCardRecommended : styles.listCardSecondary,
        isSelected ? styles.listCardSelected : null,
      ]}
      onPress={onPress}
    >
      <View style={[styles.listRail, getMealRailStyle(meal.fitLabel, isRecommended)]} />
      <MealThumb meal={meal} />
      <View style={styles.listBody}>
        <View style={styles.listHeader}>
          <View style={styles.listCopy}>
            <Text style={styles.listTitle}>{meal.name}</Text>
            <Text style={styles.listDescription} numberOfLines={2}>
              {meal.description}
            </Text>
            <Text style={styles.listReason}>{meal.fitReason}</Text>
          </View>
          <Text style={styles.listPrice}>{formatCurrency(meal.priceEur)}</Text>
        </View>

        <View style={styles.listMeta}>
          <RecommendationPill recommended={isRecommended} />
          <FitPill fitLabel={meal.fitLabel} />
          <Tag label={GOAL_LABELS[meal.targetGoal as GoalKey] ?? meal.targetGoal} compact />
          <Tag label={`${meal.proteinG} g prot`} compact />
          <Tag
            label={
              meal.allergens.length > 0
                ? meal.allergens.length === 1
                  ? meal.allergens[0]
                  : `${meal.allergens.length} allergenes`
                : "Sans allergene majeur"
            }
            compact
            danger={meal.allergens.length > 0}
          />
          {isFavorite ? <Tag label="Favori" compact highlighted /> : null}
        </View>

        <View style={styles.listFooter}>
          <Text style={styles.listFooterText}>
            {getEffortLabel(meal.effortCategory)} · {meal.calories} kcal · {getPreparationEta(meal.preparationType)}
          </Text>
          <Text style={[styles.selectText, isSelected ? styles.selectTextActive : null]}>
            {isSelected ? "Selectionne" : "Choisir"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function FitPill({ fitLabel }: { fitLabel: SuggestedMeal["fitLabel"] }) {
  const meta = getFitLabelMeta(fitLabel);

  return (
    <View style={[styles.fitPill, meta.containerStyle]}>
      <Text style={[styles.fitPillText, meta.textStyle]}>{meta.text}</Text>
    </View>
  );
}

function RecommendationPill({ recommended }: { recommended: boolean }) {
  return (
    <View style={[styles.recoPill, recommended ? styles.recoPillYes : styles.recoPillNo]}>
      <View style={[styles.recoDot, recommended ? styles.recoDotYes : styles.recoDotNo]} />
      <Text style={[styles.recoText, recommended ? styles.recoTextYes : styles.recoTextNo]}>
        {getRecommendationLabel(recommended)}
      </Text>
    </View>
  );
}

function Tag({
  label,
  compact = false,
  highlighted = false,
  danger = false,
}: {
  label: string;
  compact?: boolean;
  highlighted?: boolean;
  danger?: boolean;
}) {
  return (
    <View
      style={[
        styles.tag,
        compact ? styles.tagCompact : null,
        highlighted ? styles.tagHighlighted : null,
        danger ? styles.tagDanger : null,
      ]}
    >
      <Text
        style={[
          styles.tagText,
          highlighted ? styles.tagTextHighlighted : null,
          danger ? styles.tagTextDanger : null,
        ]}
      >
        {label}
      </Text>
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
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sessionSummaryCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  sessionSummaryEyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  sessionSummaryTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sessionSummaryCopy: {
    color: theme.colors.textSoft,
    lineHeight: 19,
  },
  selectedCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#132521",
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 12,
  },
  selectedTopRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  selectedHeader: {
    flex: 1,
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
  thumb: {
    width: 74,
    height: 74,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
    position: "relative",
  },
  thumbLarge: {
    width: 94,
    height: 94,
    borderRadius: 24,
  },
  thumbGlow: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 999,
    top: -14,
    right: -12,
  },
  thumbLabel: {
    color: theme.colors.textSoft,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  primaryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  recoPillYes: {
    backgroundColor: "rgba(111,212,168,0.16)",
    borderColor: "rgba(111,212,168,0.34)",
  },
  recoPillNo: {
    backgroundColor: "rgba(240,138,126,0.14)",
    borderColor: "rgba(240,138,126,0.26)",
  },
  recoDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  recoDotYes: {
    backgroundColor: theme.colors.mint,
  },
  recoDotNo: {
    backgroundColor: theme.colors.danger,
  },
  recoText: {
    fontSize: 12,
    fontWeight: "700",
  },
  recoTextYes: {
    color: theme.colors.mint,
  },
  recoTextNo: {
    color: theme.colors.danger,
  },
  fitPill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  fitPillIdeal: {
    backgroundColor: theme.colors.goldSoft,
    borderColor: theme.colors.borderStrong,
  },
  fitPillSolide: {
    backgroundColor: "rgba(148,206,255,0.12)",
    borderColor: "rgba(148,206,255,0.28)",
  },
  fitPillLeger: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: theme.colors.border,
  },
  fitPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  fitPillTextIdeal: {
    color: "#f1d893",
  },
  fitPillTextSolide: {
    color: "#94ceff",
  },
  fitPillTextLeger: {
    color: theme.colors.textSoft,
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
  tagDanger: {
    backgroundColor: "rgba(240,138,126,0.12)",
    borderColor: "rgba(240,138,126,0.24)",
  },
  tagText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  tagTextHighlighted: {
    color: theme.colors.mint,
  },
  tagTextDanger: {
    color: theme.colors.danger,
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
  contextSecondary: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  effortGroup: {
    gap: 8,
  },
  effortGroupTitle: {
    color: theme.colors.gold,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  groupList: {
    gap: 10,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionCopy: {
    color: theme.colors.textMuted,
    lineHeight: 19,
  },
  list: {
    gap: 10,
  },
  listCard: {
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    gap: 10,
    flexDirection: "row",
    alignItems: "stretch",
    overflow: "hidden",
  },
  listCardRecommended: {
    backgroundColor: "rgba(111,212,168,0.08)",
    borderColor: "rgba(111,212,168,0.24)",
  },
  listCardSecondary: {
    backgroundColor: "rgba(240,138,126,0.06)",
    borderColor: "rgba(240,138,126,0.18)",
  },
  listCardSelected: {
    borderColor: theme.colors.gold,
  },
  listRail: {
    width: 4,
    borderRadius: 999,
    alignSelf: "stretch",
  },
  listRailIdeal: {
    backgroundColor: theme.colors.gold,
  },
  listRailSolide: {
    backgroundColor: "#94ceff",
  },
  listRailLeger: {
    backgroundColor: theme.colors.danger,
  },
  listBody: {
    flex: 1,
    gap: 8,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  listCopy: {
    flex: 1,
    gap: 4,
  },
  listTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  listDescription: {
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  listReason: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 17,
  },
  listPrice: {
    color: "#f1d893",
    fontWeight: "700",
  },
  listMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  listFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  listFooterText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  selectText: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  selectTextActive: {
    color: theme.colors.gold,
  },
});
