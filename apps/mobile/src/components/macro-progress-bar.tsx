import { View, Text, StyleSheet } from "react-native";

import { theme } from "../theme";

type MacroProgressBarProps = {
  label: string;
  value: number;
  target: number;
  color?: string;
};

function getFillColor(ratio: number, fallbackColor: string) {
  if (ratio >= 0.8) {
    return theme.colors.success;
  }

  if (ratio >= 0.5) {
    return theme.colors.warning;
  }

  return fallbackColor;
}

export function MacroProgressBar({
  label,
  value,
  target,
  color = theme.colors.primary,
}: MacroProgressBarProps) {
  const safeTarget = Math.max(target, 1);
  const ratio = Math.min(value / safeTarget, 1);
  const fillColor = getFillColor(ratio, color);

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {Math.round(value)}g / {Math.round(safeTarget)}g
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  value: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  track: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
});
