import { useCallback, useEffect, useRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  cancelAnimation,
  FadeIn,
  ReduceMotion,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

import { FontSize, Sizing, Spacing } from "@/constants/theme";
import { useProgressiveHoldHaptics } from "@/hooks/use-progressive-hold-haptics";

const DEFAULT_HOLD_DURATION_MS = 1_400;
const PRESS_SCALE = 0.975;
const PRESS_SCALE_IN_MS = 140;
const RESET_DURATION_MS = 180;

type HoldToEndButtonProps = {
  readonly accessibilityHint?: string;
  readonly accessibilityLabel?: string;
  readonly backgroundColor?: string;
  readonly borderColor?: string;
  readonly completed?: boolean;
  readonly completedLabel?: string;
  readonly disabled?: boolean;
  readonly filledTextColor?: string;
  readonly fillColor?: string;
  readonly holdDurationMs?: number;
  /** Backwards-compatible alias for the original component API. */
  readonly holdToEndTime?: number;
  readonly label?: string;
  readonly onComplete?: () => void;
  /** Backwards-compatible alias for the original component API. */
  readonly onEndRun?: () => void;
  readonly style?: StyleProp<ViewStyle>;
  readonly textColor?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HoldToEndButton({
  accessibilityHint,
  accessibilityLabel,
  backgroundColor = "#181116",
  borderColor,
  completed = false,
  completedLabel = "Completed",
  disabled = false,
  filledTextColor = "#181116",
  fillColor = "#FFFFFF",
  holdDurationMs,
  holdToEndTime,
  label = "Hold to end run",
  onComplete,
  onEndRun,
  style,
  textColor = "#FFFFFF",
}: HoldToEndButtonProps) {
  const reduceMotion = useReducedMotion();
  const fillProgress = useSharedValue(0);
  const pressScale = useSharedValue(1);
  const buttonWidth = useSharedValue(0);
  const completionHandledRef = useRef(false);
  const completionCallback = onComplete ?? onEndRun;
  const displayLabel = completed ? completedLabel : label;
  const isDisabled = disabled || completed;
  const duration = Math.max(
    300,
    holdDurationMs ?? holdToEndTime ?? DEFAULT_HOLD_DURATION_MS,
  );
  const {
    complete: completeHoldHaptic,
    play: playHoldHaptic,
    stop: stopHoldHaptic,
  } = useProgressiveHoldHaptics(duration);

  const notifyComplete = useCallback(() => {
    if (completionHandledRef.current || isDisabled) return;

    completionHandledRef.current = true;
    completionCallback?.();
  }, [completionCallback, isDisabled]);

  useAnimatedReaction(
    () => fillProgress.get() >= 0.999,
    (isComplete, wasComplete) => {
      if (!isComplete || wasComplete) return;

      completeHoldHaptic();
      pressScale.set(
        withTiming(1, {
          duration: RESET_DURATION_MS,
          reduceMotion: ReduceMotion.System,
        }),
      );
      scheduleOnRN(notifyComplete);
    },
  );

  const handlePressIn = useCallback(() => {
    if (isDisabled || completionHandledRef.current) return;

    cancelAnimation(fillProgress);
    fillProgress.set(0);
    playHoldHaptic();
    fillProgress.set(
      withTiming(1, {
        duration,
        reduceMotion: ReduceMotion.Never,
      }),
    );
    pressScale.set(
      withTiming(reduceMotion ? 1 : PRESS_SCALE, {
        duration: PRESS_SCALE_IN_MS,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [
    duration,
    fillProgress,
    isDisabled,
    playHoldHaptic,
    pressScale,
    reduceMotion,
  ]);

  const handlePressOut = useCallback(() => {
    pressScale.set(
      withTiming(1, {
        duration: RESET_DURATION_MS,
        reduceMotion: ReduceMotion.System,
      }),
    );

    if (fillProgress.get() >= 0.999) return;

    stopHoldHaptic();
    cancelAnimation(fillProgress);
    fillProgress.set(
      withTiming(0, {
        duration: RESET_DURATION_MS,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [fillProgress, pressScale, stopHoldHaptic]);

  useEffect(() => {
    if (!isDisabled) return;

    stopHoldHaptic();
    cancelAnimation(fillProgress);
    fillProgress.set(0);
  }, [fillProgress, isDisabled, stopHoldHaptic]);

  const completeForAccessibility = useCallback(() => {
    if (isDisabled || completionHandledRef.current) return;

    stopHoldHaptic();
    cancelAnimation(fillProgress);
    fillProgress.set(1);
  }, [fillProgress, isDisabled, stopHoldHaptic]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.get() }],
  }));

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    width: buttonWidth.get() * fillProgress.get(),
  }));

  const fillContentAnimatedStyle = useAnimatedStyle(() => ({
    width: buttonWidth.get(),
  }));

  return (
    <AnimatedPressable
      accessibilityActions={[
        { name: "activate", label: accessibilityLabel ?? displayLabel },
      ]}
      accessibilityHint={
        accessibilityHint ?? "Press and hold until the button fills"
      }
      accessibilityLabel={accessibilityLabel ?? displayLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, selected: completed }}
      disabled={isDisabled}
      entering={reduceMotion ? undefined : FadeIn.duration(180)}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "activate") {
          completeForAccessibility();
        }
      }}
      onLayout={(event) => buttonWidth.set(event.nativeEvent.layout.width)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor: borderColor ?? backgroundColor,
        },
        containerAnimatedStyle,
        style,
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{displayLabel}</Text>

      <Animated.View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          styles.fill,
          { backgroundColor: fillColor },
          fillAnimatedStyle,
        ]}
      >
        <Animated.View style={[styles.fillContent, fillContentAnimatedStyle]}>
          <Text style={[styles.label, { color: filledTextColor }]}>
            {displayLabel}
          </Text>
        </Animated.View>
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: Sizing.control.large,
    overflow: "hidden",
    paddingHorizontal: Spacing.four,
    width: "100%",
  },
  fill: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    top: 0,
  },
  fillContent: {
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
    left: 0,
    position: "absolute",
    top: 0,
  },
  label: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "700",
  },
});
