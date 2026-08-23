import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";

import type {
  DebriefAtmosphereProps,
  DebriefTransitionFieldProps,
} from "@/components/debrief-atmosphere.types";

export function DebriefAtmosphere({
  accentColor,
}: DebriefAtmosphereProps) {
  return <StaticField accentColor={accentColor} />;
}

export function DebriefTransitionField({
  accentColor,
}: DebriefTransitionFieldProps) {
  return <StaticField accentColor={accentColor} />;
}

function StaticField({ accentColor }: { accentColor: string }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <LinearGradient
        colors={[accentColor, "#21101A", "#0B0710"]}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
