import { StyleSheet, Text, View } from "react-native";

import { theme } from "../../theme";

type BadgeProps = {
  label: string;
  variant: "primary" | "success" | "warning" | "error" | "neutral";
  size?: "sm" | "md";
};

export function Badge({ label, variant, size = "md" }: BadgeProps) {
  return (
    <View
      style={[
        styles.base,
        size === "sm" ? styles.sizeSm : styles.sizeMd,
        variant === "primary" ? styles.primary : null,
        variant === "success" ? styles.success : null,
        variant === "warning" ? styles.warning : null,
        variant === "error" ? styles.error : null,
        variant === "neutral" ? styles.neutral : null,
      ]}
    >
      <Text
        style={[
          styles.text,
          size === "sm" ? styles.textSm : styles.textMd,
          variant === "primary" ? styles.primaryText : null,
          variant === "success" ? styles.successText : null,
          variant === "warning" ? styles.warningText : null,
          variant === "error" ? styles.errorText : null,
          variant === "neutral" ? styles.neutralText : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  sizeSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sizeMd: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    fontWeight: "700",
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 12,
  },
  primary: {
    backgroundColor: "rgba(16,185,129,0.1)",
    borderColor: theme.colors.primary,
  },
  success: {
    backgroundColor: "rgba(16,185,129,0.12)",
    borderColor: theme.colors.success,
  },
  warning: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderColor: theme.colors.warning,
  },
  error: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: theme.colors.error,
  },
  neutral: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: theme.colors.border,
  },
  primaryText: {
    color: theme.colors.primary,
  },
  successText: {
    color: theme.colors.success,
  },
  warningText: {
    color: theme.colors.warning,
  },
  errorText: {
    color: theme.colors.error,
  },
  neutralText: {
    color: theme.colors.textSoft,
  },
});
