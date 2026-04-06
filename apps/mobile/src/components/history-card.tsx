import { StyleSheet, Text, View } from "react-native";

import type { WorkoutSessionRecord } from "@featness/shared";
import { mobileShadow, theme } from "../theme";

type HistoryCardProps = {
  sessions: WorkoutSessionRecord[];
  mealNamesById: Record<string, string>;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusStyle(status: WorkoutSessionRecord["preparationStatus"]) {
  switch (status) {
    case "ready":
    case "completed":
      return {
        wrap: styles.statusPillDone,
        text: styles.statusTextDone,
      };
    case "mixing":
    case "queued":
    case "scanned":
      return {
        wrap: styles.statusPillProgress,
        text: styles.statusTextProgress,
      };
    default:
      return {
        wrap: styles.statusPillPending,
        text: styles.statusTextPending,
      };
  }
}

export function HistoryCard({ sessions, mealNamesById }: HistoryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Memoire</Text>
      <Text style={styles.cardTitle}>Historique des seances</Text>
      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Aucune seance enregistree</Text>
          <Text style={styles.emptyText}>
            Lance une seance test pour alimenter l'historique, les favoris et les analytics FEATNESS.
          </Text>
        </View>
      ) : (
        sessions.map((session) => {
          const statusStyle = getStatusStyle(session.preparationStatus);
          const selectedMealName = session.selectedMealBlendId
            ? mealNamesById[session.selectedMealBlendId] ?? "Repas FEATNESS"
            : null;

          return (
            <View key={session.id} style={styles.item}>
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle}>
                  {session.workout.sport} / {session.workout.goal}
                </Text>
                <Text style={styles.itemMeta}>
                  {session.workout.durationMin} min / {formatDate(session.createdAt)}
                </Text>
                <Text style={styles.itemMeta}>
                  Reco FEATNESS : {session.recommendation.recommendedBlend}
                </Text>
                {selectedMealName ? (
                  <Text style={styles.choiceText}>Choix retenu : {selectedMealName}</Text>
                ) : (
                  <Text style={styles.pendingText}>
                    Aucun plat retenu pour l'instant.
                  </Text>
                )}
              </View>
              <View style={[styles.statusPill, statusStyle.wrap]}>
                <Text style={[styles.statusText, statusStyle.text]}>{session.preparationStatus}</Text>
              </View>
            </View>
          );
        })
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
  emptyText: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
  emptyState: {
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 6,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemBody: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    color: theme.colors.text,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  itemMeta: {
    color: theme.colors.textMuted,
  },
  choiceText: {
    color: "#f1d893",
    fontSize: 13,
  },
  pendingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  statusPill: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusText: {
    textTransform: "capitalize",
    fontWeight: "700",
    fontSize: 12,
  },
  statusPillPending: {
    backgroundColor: theme.colors.goldSoft,
    borderColor: theme.colors.borderStrong,
  },
  statusTextPending: {
    color: "#f1d893",
  },
  statusPillProgress: {
    backgroundColor: theme.colors.mintSoft,
    borderColor: "rgba(111,212,168,0.28)",
  },
  statusTextProgress: {
    color: theme.colors.mint,
  },
  statusPillDone: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: theme.colors.border,
  },
  statusTextDone: {
    color: theme.colors.text,
  },
});
