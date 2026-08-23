import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";

export type AnimatedHeroGradientProps = {
  pressed: boolean;
};

/**
 * Static web fallback. Native platforms resolve the Skia-backed `.native`
 * implementation while web stays independent of CanvasKit bootstrapping.
 */
export function AnimatedHeroGradient({ pressed }: AnimatedHeroGradientProps) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const colors = isDark
    ? pressed
      ? (["#9B6684", "#C28CA6", "#C88977"] as const)
      : (["#AC7894", "#D29DB5", "#D99E88"] as const)
    : pressed
      ? (["#351426", "#5D2B45", "#744530"] as const)
      : (["#421B30", "#713850", "#89513A"] as const);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <LinearGradient
        colors={colors}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
