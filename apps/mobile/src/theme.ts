export const theme = {
  colors: {
    background: "#07110f",
    backgroundSoft: "#0d1b18",
    surface: "#10211d",
    surfaceStrong: "#152b26",
    surfaceMuted: "#0c1816",
    border: "rgba(216, 226, 220, 0.08)",
    borderStrong: "rgba(201, 166, 70, 0.22)",
    text: "#f4f5f2",
    textMuted: "#95aaa2",
    textSoft: "#b9c8c2",
    gold: "#c9a646",
    goldSoft: "rgba(201, 166, 70, 0.14)",
    mint: "#6fd4a8",
    mintSoft: "rgba(111, 212, 168, 0.14)",
    danger: "#f08a7e",
    white: "#ffffff",
    ink: "#08110f",
  },
  radius: {
    lg: 20,
    xl: 28,
    pill: 999,
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
};

export const mobileShadow = {
  shadowColor: "#000000",
  shadowOpacity: 0.18,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 10,
} as const;
