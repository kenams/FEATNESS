import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { mobileShadow, theme } from "../../theme";

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: "default" | "highlighted" | "success";
};

export function Card({
  children,
  style,
  onPress,
  variant = "default",
}: CardProps) {
  const cardStyle = [
    styles.base,
    variant === "highlighted" ? styles.highlighted : null,
    variant === "success" ? styles.success : null,
    style,
  ];

  if (onPress) {
    return (
      <Pressable style={cardStyle} onPress={onPress}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...mobileShadow,
  },
  highlighted: {
    borderColor: theme.colors.primary,
    backgroundColor: "rgba(16,185,129,0.1)",
  },
  success: {
    borderColor: theme.colors.success,
    backgroundColor: "rgba(16,185,129,0.1)",
  },
});
