import type { SharedValue } from "react-native-reanimated";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { FontSize, Sizing } from "@/constants/theme";

export const RehearsalAvatarPhase = {
  idle: 0,
  listening: 1,
  thinking: 2,
  speaking: 3,
} as const;

export type RehearsalAvatarPhaseValue =
  (typeof RehearsalAvatarPhase)[keyof typeof RehearsalAvatarPhase];

export type ReactiveInitialsAvatarProps = {
  accessibilityLabel?: string;
  accentColor: string;
  activity: SharedValue<number>;
  initials: string;
  listenerActivity: SharedValue<number>;
  onAccentColor: string;
  phase: SharedValue<RehearsalAvatarPhaseValue>;
  size?: number;
};

/**
 * Static fallback for web. Native platforms resolve the Skia-backed `.native`
 * implementation of this component.
 */
export function ReactiveInitialsAvatar({
  accessibilityLabel,
  accentColor,
  initials,
  onAccentColor,
  size = 240,
}: ReactiveInitialsAvatarProps) {
  const orbSize = size * 0.81;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      importantForAccessibility={
        accessibilityLabel ? "yes" : "no-hide-descendants"
      }
      style={[styles.stage, { height: size, width: size }]}
    >
      <View
        style={[
          styles.orb,
          {
            backgroundColor: accentColor,
            height: orbSize,
            width: orbSize,
          },
        ]}
      >
        <View aria-hidden style={styles.orbLight} />
        <View aria-hidden style={styles.orbShadow} />
        <ThemedText
          aria-hidden
          style={[styles.initials, { color: onAccentColor }]}
        >
          {initials}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    justifyContent: "center",
  },
  orb: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Sizing.radius.pill,
    overflow: "hidden",
  },
  orbLight: {
    position: "absolute",
    top: -12,
    right: -18,
    width: "76%",
    height: "70%",
    borderRadius: Sizing.radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.42)",
  },
  orbShadow: {
    position: "absolute",
    bottom: -30,
    left: -24,
    width: "86%",
    height: "62%",
    borderRadius: Sizing.radius.pill,
    backgroundColor: "rgba(0, 0, 0, 0.26)",
  },
  initials: {
    fontSize: FontSize.displaySmall,
    fontWeight: "700",
    lineHeight: 38,
  },
});
