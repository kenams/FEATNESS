import { Pressable, StyleSheet, Text, View } from "react-native";

import type { SessionSuggestion } from "@featness/shared";

import { mobileShadow, theme } from "../theme";

type SessionSuggestionsCardProps = {
  suggestions: SessionSuggestion[];
  onStartSuggestion: (suggestion: SessionSuggestion) => void;
  isBusy: boolean;
  activeSuggestionKey: string | null;
};

function getEffortLabel(category?: SessionSuggestion["effortCategory"]): string {
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

export function SessionSuggestionsCard({
  suggestions,
  onStartSuggestion,
  isBusy,
  activeSuggestionKey,
}: SessionSuggestionsCardProps) {
  if (suggestions.length === 0) {
    return null;
  }

  const selectedSuggestion =
    suggestions.find((suggestion) => suggestion.key === activeSuggestionKey) ?? null;
  const visibleSuggestions = selectedSuggestion
    ? suggestions.filter((suggestion) => suggestion.key !== selectedSuggestion.key)
    : suggestions;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Seances</Text>
      <Text style={styles.cardTitle}>Seances conseillees pour atteindre ton objectif</Text>
      <Text style={styles.helperText}>
        Choisis un effort. FEATNESS recalculera ensuite les calories estimees et les plats les plus utiles.
      </Text>
      <View style={styles.legendRow}>
        <View style={[styles.legendPill, styles.legendPillGold]}>
          <Text style={[styles.legendPillText, styles.legendPillTextGold]}>Meilleur choix</Text>
        </View>
        <View style={styles.legendPill}>
          <Text style={styles.legendPillText}>3 seances max</Text>
        </View>
        <View style={styles.legendPill}>
          <Text style={styles.legendPillText}>Decision rapide</Text>
        </View>
      </View>

      {selectedSuggestion ? (
        <View style={styles.selectedSummaryCard}>
          <Text style={styles.selectedSummaryEyebrow}>Seance retenue</Text>
          <Text style={styles.selectedSummaryTitle}>{selectedSuggestion.title}</Text>
          <Text style={styles.selectedSummaryCopy}>
            {selectedSuggestion.durationMin} min | {selectedSuggestion.sport} | {selectedSuggestion.goal}
          </Text>
          {selectedSuggestion.estimatedCaloriesBurned ? (
            <Text style={styles.selectedSummaryInsight}>
              {selectedSuggestion.estimatedCaloriesBurned} kcal estimees | {getEffortLabel(selectedSuggestion.effortCategory)}
            </Text>
          ) : null}
          {selectedSuggestion.focusTitle ? (
            <View style={styles.selectedSummaryFocus}>
              <Text style={styles.selectedSummaryFocusTitle}>{selectedSuggestion.focusTitle}</Text>
              <Text style={styles.selectedSummaryFocusCopy} numberOfLines={2}>
                {selectedSuggestion.focusCopy}
              </Text>
            </View>
          ) : null}
          <View style={styles.selectedSummaryBadge}>
            <Text style={styles.selectedSummaryBadgeText}>Prise en compte</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.list}>
        {visibleSuggestions.map((suggestion, index) => {
          const isSelected = activeSuggestionKey === suggestion.key;

          return (
            <View
              key={suggestion.key}
              style={[
                styles.suggestionCard,
                index === 0 && styles.featuredCard,
                isSelected && styles.selectedCard,
              ]}
            >
              <View
                style={[
                  styles.cardAccent,
                  index === 0 ? styles.cardAccentFeatured : null,
                  isSelected ? styles.cardAccentSelected : null,
                ]}
              />
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.rankPill}>
                    <Text style={styles.rankPillText}>
                      {index === 0 ? "Meilleur choix" : `Option ${index + 1}`}
                    </Text>
                  </View>
                  <View style={styles.metaPill}>
                    <Text style={styles.metaPillText}>
                      {suggestion.durationMin} min | {suggestion.intensity}
                    </Text>
                  </View>
                </View>
                {suggestion.estimatedCaloriesBurned ? (
                  <Text style={styles.kcalText}>{suggestion.estimatedCaloriesBurned} kcal</Text>
                ) : null}
              </View>

              <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
              <Text style={styles.whyText}>{suggestion.why}</Text>

              {suggestion.focusTitle ? (
                <View style={styles.focusCard}>
                  <Text style={styles.focusTitle}>{suggestion.focusTitle}</Text>
                  <Text style={styles.focusCopy} numberOfLines={2}>
                    {suggestion.focusCopy}
                  </Text>
                </View>
              ) : null}

              <View style={styles.tags}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{suggestion.sport}</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{suggestion.goal}</Text>
                </View>
                {suggestion.estimatedCaloriesBurned ? (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{suggestion.estimatedCaloriesBurned} kcal</Text>
                  </View>
                ) : null}
                {suggestion.effortCategory ? (
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{getEffortLabel(suggestion.effortCategory)}</Text>
                  </View>
                ) : null}
              </View>

              <Pressable
                style={[
                  styles.primaryButton,
                  isSelected && styles.primaryButtonSuccess,
                  isBusy && styles.buttonDisabled,
                ]}
                onPress={() => onStartSuggestion(suggestion)}
                disabled={isBusy}
              >
                <Text style={styles.primaryButtonText}>
                  {isBusy
                    ? "Preparation..."
                    : isSelected
                      ? "Seance prise en compte"
                      : "Choisir cette seance"}
                </Text>
              </Pressable>
            </View>
          );
        })}
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
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legendPill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  legendPillGold: {
    backgroundColor: theme.colors.goldSoft,
    borderColor: theme.colors.borderStrong,
  },
  legendPillText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  legendPillTextGold: {
    color: "#f1d893",
  },
  selectedSummaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(111,212,168,0.28)",
    backgroundColor: theme.colors.mintSoft,
    padding: 16,
    gap: 8,
  },
  selectedSummaryFocus: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(111,212,168,0.18)",
    gap: 4,
  },
  selectedSummaryFocusTitle: {
    color: theme.colors.text,
    fontWeight: "700",
  },
  selectedSummaryFocusCopy: {
    color: theme.colors.textSoft,
    lineHeight: 18,
  },
  selectedSummaryEyebrow: {
    color: theme.colors.mint,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    fontWeight: "700",
  },
  selectedSummaryTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  selectedSummaryCopy: {
    color: theme.colors.textSoft,
    lineHeight: 20,
    textTransform: "capitalize",
  },
  selectedSummaryInsight: {
    color: theme.colors.text,
    lineHeight: 19,
    fontWeight: "600",
  },
  selectedSummaryBadge: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(111,212,168,0.18)",
    borderWidth: 1,
    borderColor: "rgba(111,212,168,0.32)",
  },
  selectedSummaryBadgeText: {
    color: theme.colors.mint,
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    gap: 12,
  },
  suggestionCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    padding: 16,
    gap: 10,
    overflow: "hidden",
  },
  featuredCard: {
    borderColor: theme.colors.borderStrong,
    backgroundColor: "#132521",
  },
  selectedCard: {
    borderColor: "rgba(111,212,168,0.28)",
    backgroundColor: theme.colors.mintSoft,
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cardAccentFeatured: {
    backgroundColor: theme.colors.gold,
  },
  cardAccentSelected: {
    backgroundColor: theme.colors.mint,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  headerLeft: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  rankPill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.colors.goldSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
  },
  rankPillText: {
    color: "#f1d893",
    fontSize: 12,
    fontWeight: "700",
  },
  metaPill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metaPillText: {
    color: theme.colors.text,
    fontSize: 12,
  },
  kcalText: {
    color: theme.colors.gold,
    fontSize: 13,
    fontWeight: "700",
  },
  suggestionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  whyText: {
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  focusCard: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: theme.colors.goldSoft,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
    gap: 4,
  },
  focusTitle: {
    color: "#f1d893",
    fontWeight: "700",
  },
  focusCopy: {
    color: theme.colors.textSoft,
    lineHeight: 18,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  tagText: {
    color: theme.colors.text,
    fontSize: 12,
    textTransform: "capitalize",
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
});
