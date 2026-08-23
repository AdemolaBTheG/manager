/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "rgba(0, 0, 0, 0.90)",
    textSecondary: "rgba(0, 0, 0, 0.56)",
    background: "#F5F1E9",
    backgroundElement: "rgba(0, 0, 0, 0.04)",
    backgroundSelected: "rgba(0, 0, 0, 0.08)",
    border: "rgba(0, 0, 0, 0.10)",
    primary: "#63364E",
    primaryPressed: "#4E293D",
    onPrimary: "#FFFFFF",
  },
  dark: {
    text: "rgba(255, 255, 255, 0.94)",
    textSecondary: "rgba(255, 255, 255, 0.60)",
    background: "#181116",
    backgroundElement: "rgba(255, 255, 255, 0.08)",
    backgroundSelected: "rgba(255, 255, 255, 0.14)",
    border: "rgba(255, 255, 255, 0.12)",
    primary: "#B47A99",
    primaryPressed: "#9B6684",
    onPrimary: "#181116",
  },
} as const;

export const RehearsalRoomColors = {
  accent: "#BE95A3",
  accentPressed: "#A77D8C",
  background: "#181116",
  border: "rgba(255, 255, 255, 0.12)",
  onAccent: "#181116",
  surface: "rgba(255, 255, 255, 0.08)",
  text: "rgba(255, 255, 255, 0.94)",
  textSecondary: "rgba(255, 255, 255, 0.60)",
  topWash: "rgba(190, 149, 163, 0.16)",
} as const;

export const PracticeCategoryColors = {
  light: {
    feedback: "#365B73",
    boundary: "#73525F",
    pushback: "#80551B",
  },
  dark: {
    feedback: "#7FB1C8",
    boundary: "#BE95A3",
    pushback: "#D7A34B",
  },
} as const;

export const PracticeCardColors = {
  light: {
    surface: "#FFFFFF",
    tintStrength: 0.34,
    metaText: "rgba(0, 0, 0, 0.64)",
    pressedOverlay: "rgba(0, 0, 0, 0.04)",
  },
  dark: {
    surface: "#2A2429",
    tintStrength: 0.30,
    metaText: "rgba(255, 255, 255, 0.68)",
    pressedOverlay: "rgba(255, 255, 255, 0.05)",
  },
} as const;

export type PracticeCategoryColor = keyof typeof PracticeCategoryColors.light;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
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

export const FontSize = {
  labelSmall: 11,
  label: 12,
  caption: 13,
  small: 14,
  body: 16,
  bodyLarge: 17,
  headingSmall: 18,
  heading: 19,
  headingLarge: 21,
  titleSmall: 22,
  title: 24,
  displaySmall: 32,
  display: 34,
  displayLarge: 38,
  hero: 44,
  heroLarge: 48,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Sizing = {
  icon: {
    small: 16,
    medium: 24,
    large: 32,
  },
  control: {
    compact: 36,
    regular: 44,
    large: 58,
    multiline: 80,
  },
  avatar: {
    small: 40,
    medium: 56,
    large: 72,
  },
  radius: {
    small: 12,
    input: 16,
    medium: 20,
    large: 24,
    card: 28,
    feature: 32,
    pill: 999,
  },
  content: {
    compact: 560,
    reading: 690,
    max: 800,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = Sizing.content.max;
