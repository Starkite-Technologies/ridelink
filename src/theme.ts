import { DynamicColorIOS } from "react-native";

export const paletteValues = {
  light: { ink: "#0f1728", text: "#263244", muted: "#6b7686", line: "#e6ebf1", surface: "#ffffff", wash: "#f4f7fb", successWash: "#e5f8ef", warningWash: "#fff2da", dangerWash: "#f4f5f7", heroTint: "#eef8f6" },
  dark: { ink: "#ffffff", text: "#dce7f5", muted: "#8da0b5", line: "rgba(255,255,255,0.09)", surface: "#0b294b", wash: "#031c3a", successWash: "rgba(20,184,122,0.13)", warningWash: "rgba(244,166,42,0.14)", dangerWash: "rgba(213,52,52,0.13)", heroTint: "#0c2b4f" },
} as const;

type AdaptiveColor = keyof typeof paletteValues.light;

// iOS resolves these colors again whenever Appearance.setColorScheme changes.
// Web resolves stable CSS variables updated by ThemeProvider. Android keeps the
// blue-first palette until native theme resources are added.
const adaptive = (name: AdaptiveColor) => {
  const light = paletteValues.light[name];
  const dark = paletteValues.dark[name];
  if (process.env.EXPO_OS === "ios") return DynamicColorIOS({ light, dark }) as unknown as string;
  if (process.env.EXPO_OS === "web") return `var(--ridelink-${name}, ${dark})`;
  return dark;
};

export const colors = {
  navy: "#031c3a",
  navySoft: "#0c2b4f",
  onBrand: "#ffffff",
  ink: adaptive("ink"),
  text: adaptive("text"),
  muted: adaptive("muted"),
  line: adaptive("line"),
  surface: adaptive("surface"),
  wash: adaptive("wash"),
  success: "#14b87a",
  successWash: adaptive("successWash"),
  warning: "#f4a62a",
  warningWash: adaptive("warningWash"),
  danger: "#d53434",
  dangerWash: adaptive("dangerWash"),
  heroTint: adaptive("heroTint"),
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
};

export const shadow = {
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};
