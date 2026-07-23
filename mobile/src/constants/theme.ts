import "@/global.css";

import {
  Platform,
} from "react-native";


export const Colors = {
  light: {
    text: "#07111F",
    background: "#FFF9F2",
    backgroundAlt: "#FFFDFB",
    surface: "#FFFFFF",
    surfaceMuted: "#F8F8F9",
    surfaceAccent: "#FFF0F2",
    border: "#ECEDEF",
    borderStrong: "#D9DDE3",
    textSecondary: "#69707C",
    textMuted: "#9298A2",
    primary: "#F3344A",
    primarySoft: "#FFF0F2",
    tabBar: "#07111F",
    tabBarInactive: "#A7ADB7",
    success: "#168B4F",
    successSoft: "#EFFAF3",
    danger: "#C62828",
    dangerSoft: "#FFF1F1",
    warning: "#E3A008",
    white: "#FFFFFF",

    // Preserve the starter-theme keys used elsewhere.
    backgroundElement: "#F0F0F3",
    backgroundSelected: "#E0E1E6",
  },

  dark: {
    text: "#F7F8FA",
    background: "#0B111A",
    backgroundAlt: "#080D14",
    surface: "#141C27",
    surfaceMuted: "#1A2431",
    surfaceAccent: "#2A1720",
    border: "#273240",
    borderStrong: "#394655",
    textSecondary: "#B5BDC8",
    textMuted: "#87919E",
    primary: "#FF4D62",
    primarySoft: "#2A1720",
    tabBar: "#050A10",
    tabBarInactive: "#8F99A6",
    success: "#42B97A",
    successSoft: "#102A1D",
    danger: "#FF6B6B",
    dangerSoft: "#2C1719",
    warning: "#F4BE3F",
    white: "#FFFFFF",

    // Preserve the starter-theme keys used elsewhere.
    backgroundElement: "#212B37",
    backgroundSelected: "#2D3947",
  },
} as const;


export type AppColorScheme =
  keyof typeof Colors;

export type ThemeColor =
  keyof typeof Colors.light
  & keyof typeof Colors.dark;


export const Fonts =
  Platform.select({
    ios: {
      sans: "system-ui",
      serif: "ui-serif",
      rounded: "ui-rounded",
      mono: "ui-monospace",
    },
    default: {
      sans: "normal",
      serif: "serif",
      rounded: "normal",
      mono: "monospace",
    },
    web: {
      sans: "var(--font-display)",
      serif: "var(--font-serif)",
      rounded: "var(--font-rounded)",
      mono: "var(--font-mono)",
    },
  });


export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;


export const BottomTabInset =
  Platform.select({
    ios: 50,
    android: 80,
  }) ?? 0;

export const MaxContentWidth = 800;
