import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { Sizing, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type OnboardingStep = 1 | 2 | 3 | 4;

type OnboardingProgressProps = {
  readonly currentStep: OnboardingStep;
  readonly style?: StyleProp<ViewStyle>;
};

const STEP_COUNT = 4;
const PROGRESS_EASING = Easing.out(Easing.cubic);

export function OnboardingProgress({
  currentStep,
  style,
}: OnboardingProgressProps) {
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const transparentHeaderOffset = isLiquidGlassAvailable() ? headerHeight : 0;
  const progress = useSharedValue(currentStep - 2);
  const didAnimateRef = useRef(false);

  const animateCurrentStep = useCallback(() => {
    if (didAnimateRef.current) return;

    didAnimateRef.current = true;
    progress.set(
      withTiming(currentStep - 1, {
        duration: 260,
        easing: PROGRESS_EASING,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [currentStep, progress]);

  return (
    <View
      accessibilityLabel={`Onboarding, step ${currentStep} of ${STEP_COUNT}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ max: STEP_COUNT, min: 1, now: currentStep }}
      onLayout={animateCurrentStep}
      style={[
        styles.progress,
        transparentHeaderOffset > 0 && { marginTop: transparentHeaderOffset },
        style,
      ]}
    >
      {Array.from({ length: STEP_COUNT }, (_, index) => (
        <ProgressSegment
          activeColor={theme.primary}
          inactiveColor={theme.backgroundSelected}
          index={index}
          key={index}
          progress={progress}
        />
      ))}
    </View>
  );
}

function ProgressSegment({
  activeColor,
  inactiveColor,
  index,
  progress,
}: {
  readonly activeColor: string;
  readonly inactiveColor: string;
  readonly index: number;
  readonly progress: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const activation = interpolate(
      progress.value,
      [index - 1, index],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      backgroundColor: interpolateColor(
        activation,
        [0, 1],
        [inactiveColor, activeColor],
      ),
    };
  });

  return <Animated.View style={[styles.segment, animatedStyle]} />;
}

const styles = StyleSheet.create({
  progress: {
    flexDirection: "row",
    gap: Spacing.two,
    width: "100%",
  },
  segment: {
    borderRadius: Sizing.radius.pill,
    flex: 1,
    height: 4,
  },
});
