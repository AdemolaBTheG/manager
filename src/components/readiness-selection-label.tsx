import { StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
} from "react-native-reanimated";

import { FontSize } from "@/constants/theme";
import type { ReadinessValue } from "@/domain/session";
import { useTheme } from "@/hooks/use-theme";

type ReadinessSelectionLabelProps = {
  label: string;
  value: ReadinessValue | null;
};

export function ReadinessSelectionLabel({
  label,
  value,
}: ReadinessSelectionLabelProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityLabel={label}
      accessibilityRole="text"
      accessible
      style={styles.container}
    >
      <Animated.Text
        key={value ?? "unselected"}
        entering={LABEL_ENTERING}
        exiting={LABEL_EXITING}
        pointerEvents="none"
        style={[
          styles.label,
          { color: value === null ? theme.textSecondary : theme.text },
        ]}
      >
        {label}
      </Animated.Text>
    </View>
  );
}

const LABEL_ENTERING = FadeIn.duration(140).reduceMotion(ReduceMotion.System);
const LABEL_EXITING = FadeOut.duration(100).reduceMotion(ReduceMotion.System);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 24,
    position: "relative",
  },
  label: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    fontSize: FontSize.body,
    fontWeight: "600",
    textAlign: "center",
  },
});
