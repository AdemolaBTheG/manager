import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import { Sizing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

const BORDER_WIDTH = 1.5;

/** Static web fallback while CanvasKit is not part of the web bootstrap. */
export function AiGeneratedBorder() {
  const scheme = useColorScheme();
  const theme = useTheme();
  const colors =
    scheme === "dark"
      ? (["#78B8D6", "#E8ABBF", "#B47A99", "#78B8D6"] as const)
      : (["#4F94BA", "#D4829E", "#63364E", "#4F94BA"] as const);
  const glow =
    scheme === "dark"
      ? "0 0 10px rgba(180, 122, 153, 0.24)"
      : "0 0 10px rgba(99, 54, 78, 0.15)";

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
        locations={[0, 0.34, 0.68, 1]}
        start={{ x: 0, y: 0 }}
        style={[StyleSheet.absoluteFill, styles.border, { boxShadow: glow }]}
      >
        <View style={[styles.interior, { backgroundColor: theme.background }]} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  border: {
    borderCurve: "continuous",
    borderRadius: Sizing.radius.input,
    padding: BORDER_WIDTH,
  },
  interior: {
    borderCurve: "continuous",
    borderRadius: Sizing.radius.input - BORDER_WIDTH,
    flex: 1,
  },
});
