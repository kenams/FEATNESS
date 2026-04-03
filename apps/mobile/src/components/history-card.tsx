import { StyleSheet, Text, View } from "react-native";

import type { WorkoutSessionRecord } from "@featness/shared";

type HistoryCardProps = {
  sessions: WorkoutSessionRecord[];
};

export function HistoryCard({ sessions }: HistoryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Historique des seances</Text>
      {sessions.length === 0 ? (
        <Text style={styles.emptyText}>
          Aucune seance enregistree pour le moment.
        </Text>
      ) : (
        sessions.map((session) => (
          <View key={session.id} style={styles.item}>
            <View>
              <Text style={styles.itemTitle}>
                {session.workout.sport} • {session.workout.goal}
              </Text>
              <Text style={styles.itemMeta}>
                {session.workout.durationMin} min • {session.recommendation.recommendedBlend}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <Text style={styles.statusText}>{session.preparationStatus}</Text>
            </View>
          </View>
        ))
      )}
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
  emptyText: {
    color: "#88a099",
    lineHeight: 20,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  itemTitle: {
    color: "#f6f7f8",
    fontWeight: "700",
    textTransform: "capitalize",
  },
  itemMeta: {
    color: "#88a099",
    marginTop: 4,
  },
  statusPill: {
    backgroundColor: "#0c1816",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: "#59d39a",
    textTransform: "capitalize",
  },
});
