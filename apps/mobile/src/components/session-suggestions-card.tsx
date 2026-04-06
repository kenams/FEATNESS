import { Pressable, StyleSheet, Text, View } from "react-native";

import type { SessionSuggestion } from "@featness/shared";

import { mobileShadow, theme } from "../theme";

type SessionSuggestionsCardProps = {
  suggestions: SessionSuggestion[];
  onStartSuggestion: (suggestion: SessionSuggestion) => void;
  isBusy: boolean;
  activeSuggestionKey: string | null;
};

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
        Choisis une seance, puis laisse FEATNESS te proposer directement les plats les plus coherents.
      </Text>

      {selectedSuggestion ? (
        <View style={styles.selectedSummaryCard}>
          <Text style={styles.selectedSummaryEyebrow}>Seance retenue</Text>
          <Text style={styles.selectedSummaryTitle}>{selectedSuggestion.title}</Text>
          <Text style={styles.selectedSummaryCopy}>
            {selectedSuggestion.durationMin} min • {selectedSuggestion.sport} • {selectedSuggestion.goal}
          </Text>
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
              <View style={styles.header}>
                <View style={styles.rankPill}>
                  <Text style={styles.rankPillText}>Option {index + 1}</Text>
                </View>
                <View style={styles.metaPill}>
                  <Text style={styles.metaPillText}>
                    {suggestion.durationMin} min | {suggestion.intensity}
                  </Text>
                </View>
              </View>

              <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
              <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
              <Text style={styles.whyText}>{suggestion.why}</Text>

              <View style={styles.tags}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{suggestion.sport}</Text>
                </View>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{suggestion.goal}</Text>
                </View>
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
  selectedSummaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(111,212,168,0.28)",
    backgroundColor: theme.colors.mintSoft,
    padding: 16,
    gap: 8,
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
  },
  featuredCard: {
    borderColor: theme.colors.borderStrong,
    backgroundColor: "#132521",
  },
  selectedCard: {
    borderColor: "rgba(111,212,168,0.28)",
    backgroundColor: theme.colors.mintSoft,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
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
  suggestionTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  suggestionDescription: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  whyText: {
    color: theme.colors.textMuted,
    lineHeight: 19,
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
