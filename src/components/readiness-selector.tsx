import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ReadinessSelectionLabel } from "@/components/readiness-selection-label";
import { FontSize, Sizing, Spacing } from "@/constants/theme";
import type { ReadinessValue } from "@/domain/session";
import { useSemanticHaptics } from "@/hooks/use-semantic-haptics";
import { useTheme } from "@/hooks/use-theme";

export const READINESS_OPTIONS: readonly {
  label: string;
  value: ReadinessValue;
}[] = [
  { value: 1, label: "Not ready" },
  { value: 2, label: "Slightly ready" },
  { value: 3, label: "Unsure" },
  { value: 4, label: "Mostly ready" },
  { value: 5, label: "Ready" },
] as const;

const COLOR_TRANSITION = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

type ReadinessSelectorProps = {
  disabled?: boolean;
  onChange: (value: ReadinessValue) => void;
  value: ReadinessValue | null;
};

export function ReadinessSelector({
  disabled = false,
  onChange,
  value,
}: ReadinessSelectorProps) {
  const { playSelection } = useSemanticHaptics();
  const optionOneProgress = useSharedValue(value === 1 ? 1 : 0);
  const optionTwoProgress = useSharedValue(value === 2 ? 1 : 0);
  const optionThreeProgress = useSharedValue(value === 3 ? 1 : 0);
  const optionFourProgress = useSharedValue(value === 4 ? 1 : 0);
  const optionFiveProgress = useSharedValue(value === 5 ? 1 : 0);
  const optionProgressByValue: Record<ReadinessValue, SharedValue<number>> = {
    1: optionOneProgress,
    2: optionTwoProgress,
    3: optionThreeProgress,
    4: optionFourProgress,
    5: optionFiveProgress,
  };
  const selectedOption = READINESS_OPTIONS.find(
    (option) => option.value === value,
  );

  const handleSelect = (nextValue: ReadinessValue) => {
    if (disabled || nextValue === value) {
      return;
    }

    for (const option of READINESS_OPTIONS) {
      optionProgressByValue[option.value].set(
        withTiming(option.value === nextValue ? 1 : 0, COLOR_TRANSITION),
      );
    }

    onChange(nextValue);
    playSelection();
  };

  return (
    <View style={styles.group}>
      <View accessibilityRole="radiogroup" style={styles.optionsRow}>
        {READINESS_OPTIONS.map((option) => (
          <ReadinessOption
            key={option.value}
            disabled={disabled}
            isSelected={option.value === value}
            onSelect={handleSelect}
            option={option}
            selectionProgress={optionProgressByValue[option.value]}
          />
        ))}
      </View>

      <ReadinessSelectionLabel
        label={selectedOption?.label ?? "Select one"}
        value={value}
      />
    </View>
  );
}

type ReadinessOptionProps = {
  disabled: boolean;
  isSelected: boolean;
  onSelect: (value: ReadinessValue) => void;
  option: (typeof READINESS_OPTIONS)[number];
  selectionProgress: SharedValue<number>;
};

function ReadinessOption({
  disabled,
  isSelected,
  onSelect,
  option,
  selectionProgress,
}: ReadinessOptionProps) {
  const theme = useTheme();
  const surfaceStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selectionProgress.get(),
      [0, 1],
      [theme.backgroundElement, theme.primary],
      "LAB",
    ),
    borderColor: interpolateColor(
      selectionProgress.get(),
      [0, 1],
      [theme.border, theme.primary],
      "LAB",
    ),
  }));
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      selectionProgress.get(),
      [0, 1],
      [theme.text, theme.onPrimary],
      "LAB",
    ),
  }));

  return (
    <Pressable
      accessibilityLabel={`${option.value}, ${option.label}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected, disabled }}
      disabled={disabled}
      hitSlop={Spacing.one}
      onPress={() => onSelect(option.value)}
      style={({ pressed }) => [styles.optionPressable]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.optionSurface, surfaceStyle]}
      >
        <Animated.Text style={[styles.optionText, textStyle]}>
          {option.value}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: {
    alignItems: "center",
    gap: Spacing.two,
    width: "100%",
  },
  optionsRow: {
    flexDirection: "row",
    gap: Spacing.two,
    width: "100%",
  },
  optionPressable: {
    flex: 1,
  },
  optionSurface: {
    alignItems: "center",
    borderRadius: Sizing.radius.small,
    paddingVertical: Spacing.two + 4,

    justifyContent: "center",
    borderCurve: "continuous",
    width: "100%",
  },
  optionText: {
    fontSize: FontSize.bodyLarge,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.76,
  },
});
