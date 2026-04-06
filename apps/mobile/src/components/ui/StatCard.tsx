import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card } from "./Card";
import { theme } from "../../theme";

type StatCardProps = {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  icon?: ReactNode;
};

export function StatCard({
  label,
  value,
  unit,
  color = theme.colors.text,
  icon,
}: StatCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color }]}>{value}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 120,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    flex: 1,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  value: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 28,
  },
  unit: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: 2,
  },
});
