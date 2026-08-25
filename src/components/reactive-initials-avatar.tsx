import type { SharedValue } from "react-native-reanimated";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { StyleSheet, useWindowDimensions, View } from "react-native";

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

const LISTEN_MORPH_ENTER = {
  duration: 420,
  easing: Easing.bezier(0.2, 0.86, 0.3, 1),
} as const;
const LISTEN_MORPH_EXIT = {
  duration: 360,
  easing: Easing.bezier(0.32, 0, 0.22, 1),
} as const;

/**
 * Non-Skia fallback for web. Native platforms resolve the shader-backed
 * `.native` implementation of this component.
 */
export function ReactiveInitialsAvatar({
  accessibilityLabel,
  accentColor,
  activity,
  initials,
  listenerActivity,
  onAccentColor,
  phase,
  size = 240,
}: ReactiveInitialsAvatarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const orbSize = size * 0.81;
  const listeningWidth = Math.min(
    size * 0.76,
    Math.max(size * 0.64, windowWidth * 0.42),
  );
  const pillWidth = listeningWidth * 0.18;
  const pillGap = listeningWidth * 0.0933;
  const reduceMotion = useReducedMotion();
  const listenProgress = useSharedValue(0);

  useAnimatedReaction(
    () =>
      phase.get() === RehearsalAvatarPhase.listening
        ? 1
        : 0,
    (nextProgress, previousProgress) => {
      if (nextProgress === previousProgress) {
        return;
      }

      if (reduceMotion) {
        listenProgress.set(nextProgress);
        return;
      }

      listenProgress.set(
        withTiming(
          nextProgress,
          nextProgress === 1 ? LISTEN_MORPH_ENTER : LISTEN_MORPH_EXIT,
        ),
      );
    },
    [reduceMotion],
  );

  const responsiveScaleStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { transform: [{ scale: 1 }] };
    }

    const speakerEnvelope = clampUnit((activity.get() - 0.18) / 0.68);
    const listenerEnvelope = clampUnit(
      (listenerActivity.get() - 0.015) / 0.52,
    );

    return {
      transform: [
        {
          scale: 1 + speakerEnvelope * 0.14 - listenerEnvelope * 0.13,
        },
      ],
    };
  });
  const orbMorphStyle = useAnimatedStyle(() => {
    const progress = listenProgress.get();

    return {
      opacity: interpolate(
        progress,
        [0, 0.72],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            progress,
            [0, 1],
            [1, 0.42],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });
  const pillGroupMorphStyle = useAnimatedStyle(() => {
    const progress = listenProgress.get();

    return {
      opacity: interpolate(
        progress,
        [0.28, 1],
        [0, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            progress,
            [0.28, 1],
            [0.56, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });
  const outerLeftStyle = useListeningPillStyle(
    listenerActivity,
    reduceMotion,
    0.05,
    0.88,
  );
  const innerLeftStyle = useListeningPillStyle(
    listenerActivity,
    reduceMotion,
    0,
    0.66,
  );
  const innerRightStyle = useListeningPillStyle(
    listenerActivity,
    reduceMotion,
    0.08,
    0.76,
  );
  const outerRightStyle = useListeningPillStyle(
    listenerActivity,
    reduceMotion,
    0.14,
    0.96,
  );

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
      <Animated.View style={[styles.visual, responsiveScaleStyle]}>
        <Animated.View
          style={[
            styles.orb,
            {
              backgroundColor: accentColor,
              height: orbSize,
              width: orbSize,
            },
            orbMorphStyle,
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
        </Animated.View>

        <Animated.View
          aria-hidden
          style={[
            styles.pillGroup,
            { gap: pillGap },
            pillGroupMorphStyle,
          ]}
        >
          <Animated.View
            style={[
              styles.pill,
              {
                backgroundColor: accentColor,
                height: size * 0.3,
                width: pillWidth,
              },
              outerLeftStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.pill,
              {
                backgroundColor: accentColor,
                height: size * 0.46,
                width: pillWidth,
              },
              innerLeftStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.pill,
              {
                backgroundColor: accentColor,
                height: size * 0.4,
                width: pillWidth,
              },
              innerRightStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.pill,
              {
                backgroundColor: accentColor,
                height: size * 0.3,
                width: pillWidth,
              },
              outerRightStyle,
            ]}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function useListeningPillStyle(
  listenerActivity: SharedValue<number>,
  reduceMotion: boolean,
  inputStart: number,
  inputEnd: number,
) {
  return useAnimatedStyle(() => {
    const response = reduceMotion
      ? 0
      : clampUnit(
          (listenerActivity.get() - inputStart) / (inputEnd - inputStart),
        );

    return {
      transform: [{ scaleY: 0.56 + response * 0.44 }],
    };
  });
}

function clampUnit(value: number) {
  "worklet";
  return Math.max(0, Math.min(1, value));
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    justifyContent: "center",
  },
  visual: {
    ...StyleSheet.absoluteFill,
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
  pillGroup: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  pill: {
    borderRadius: Sizing.radius.pill,
  },
});
