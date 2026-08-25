import { useCallback, useLayoutEffect, useMemo } from "react";
import { Presets, type Pattern, usePatternComposer } from "react-native-pulsar";
import { useSharedValue } from "react-native-reanimated";

import type {
  DebriefTransitionHaptics,
  DebriefTransitionHapticsOptions,
} from "@/hooks/use-debrief-transition-haptics.types";
import { useHapticsSettings } from "@/providers/haptics-context";

const ENTER_REFERENCE_DURATION = 900;
const REWIND_REFERENCE_DURATION = 680;
const ENTER_PATTERN_END = 760;
const REWIND_PATTERN_END = 580;

export function useDebriefTransitionHaptics({
  enterDurationMs,
  reduceMotion,
  rewindDurationMs,
}: DebriefTransitionHapticsOptions): DebriefTransitionHaptics {
  const { enabled, support } = useHapticsSettings();
  const enterPattern = useMemo(
    () => createEnterPattern(enterDurationMs),
    [enterDurationMs],
  );
  const rewindPattern = useMemo(
    () => createRewindPattern(rewindDurationMs),
    [rewindDurationMs],
  );
  const activePattern = useSharedValue<0 | 1 | 2>(0);
  const activeUntilMs = useSharedValue(0);
  const isAlive = useSharedValue(1);
  const { play: playEnterPattern, stop: stopEnterPattern } =
    usePatternComposer(enterPattern);
  const { play: playRewindPattern, stop: stopRewindPattern } =
    usePatternComposer(rewindPattern);

  const stop = useCallback(() => {
    "worklet";
    const playingPattern = activePattern.get();
    if (activeUntilMs.get() > Date.now()) {
      if (playingPattern === 1) stopEnterPattern();
      if (playingPattern === 2) stopRewindPattern();
    }
    activePattern.set(0);
    activeUntilMs.set(0);
  }, [
    activePattern,
    activeUntilMs,
    stopEnterPattern,
    stopRewindPattern,
  ]);

  const playEnter = useCallback(() => {
    "worklet";
    if (isAlive.get() !== 1 || !enabled || reduceMotion) return;

    if (support === "advanced" || support === "standard") {
      activePattern.set(1);
      activeUntilMs.set(
        Date.now() +
          scaleReferenceDuration(
            enterDurationMs,
            ENTER_REFERENCE_DURATION,
            ENTER_PATTERN_END,
          ),
      );
      playEnterPattern();
    } else if (support === "limited") {
      Presets.System.impactSoft();
    }
  }, [
    activePattern,
    activeUntilMs,
    enabled,
    enterDurationMs,
    isAlive,
    playEnterPattern,
    reduceMotion,
    support,
  ]);

  const playRewind = useCallback(() => {
    "worklet";
    if (isAlive.get() !== 1 || !enabled || reduceMotion) return;

    if (support === "advanced" || support === "standard") {
      activePattern.set(2);
      activeUntilMs.set(
        Date.now() +
          scaleReferenceDuration(
            rewindDurationMs,
            REWIND_REFERENCE_DURATION,
            REWIND_PATTERN_END,
          ),
      );
      playRewindPattern();
    } else if (support === "limited") {
      Presets.System.impactSoft();
    }
  }, [
    activePattern,
    activeUntilMs,
    enabled,
    isAlive,
    playRewindPattern,
    reduceMotion,
    rewindDurationMs,
    support,
  ]);

  const playSettle = useCallback(() => {
    "worklet";
    activePattern.set(0);
    activeUntilMs.set(0);
    if (isAlive.get() === 1 && enabled && support !== "none") {
      Presets.System.impactLight();
    }
  }, [activePattern, activeUntilMs, enabled, isAlive, support]);

  useLayoutEffect(() => {
    isAlive.set(1);
    return () => {
      isAlive.set(0);
      stop();
    };
  }, [
    enabled,
    enterPattern,
    isAlive,
    reduceMotion,
    rewindPattern,
    stop,
    support,
  ]);

  return { playEnter, playRewind, playSettle, stop };
}

/**
 * Matches the actual wall-clock milestones produced by
 * Easing.bezier(0.32, 0, 0.16, 1): the iris opens at ~115 ms, copy begins
 * emerging at ~239 ms, and the shader glow crests at ~275 ms.
 */
function createEnterPattern(durationMs: number): Pattern {
  const time = createTimeScaler(durationMs, ENTER_REFERENCE_DURATION);

  return {
    discretePattern: [
      event(time(0), 0.18, 0.24),
      event(time(275), 0.24, 0.64),
    ],
    continuousPattern: {
      amplitude: [
        point(time(0), 0),
        point(time(88), 0.03),
        point(time(115), 0.06),
        point(time(157), 0.13),
        point(time(200), 0.21),
        point(time(239), 0.27),
        point(time(275), 0.3),
        point(time(307), 0.28),
        point(time(381), 0.2),
        point(time(450), 0.14),
        point(time(520), 0.09),
        point(time(600), 0.05),
        point(time(680), 0.02),
        point(time(760), 0),
      ],
      frequency: [
        point(time(0), 0.24),
        point(time(115), 0.28),
        point(time(157), 0.33),
        point(time(200), 0.38),
        point(time(239), 0.44),
        point(time(275), 0.5),
        point(time(307), 0.54),
        point(time(381), 0.6),
        point(time(520), 0.65),
        point(time(680), 0.68),
        point(time(760), 0.7),
      ],
    },
  };
}

/** Descending-sharpness release synchronized to the inverse scene easing. */
function createRewindPattern(durationMs: number): Pattern {
  const time = createTimeScaler(durationMs, REWIND_REFERENCE_DURATION);

  return {
    discretePattern: [
      event(time(0), 0.15, 0.68),
      event(time(207), 0.2, 0.46),
    ],
    continuousPattern: {
      amplitude: [
        point(time(0), 0),
        point(time(80), 0.04),
        point(time(120), 0.11),
        point(time(151), 0.17),
        point(time(186), 0.23),
        point(time(207), 0.26),
        point(time(239), 0.23),
        point(time(288), 0.17),
        point(time(360), 0.1),
        point(time(445), 0.05),
        point(time(501), 0.02),
        point(time(580), 0),
      ],
      frequency: [
        point(time(0), 0.68),
        point(time(80), 0.65),
        point(time(120), 0.61),
        point(time(151), 0.56),
        point(time(186), 0.5),
        point(time(207), 0.46),
        point(time(239), 0.41),
        point(time(288), 0.35),
        point(time(360), 0.3),
        point(time(445), 0.27),
        point(time(501), 0.25),
        point(time(580), 0.24),
      ],
    },
  };
}

function createTimeScaler(durationMs: number, referenceDurationMs: number) {
  const duration = Math.max(80, Math.round(durationMs));
  return (referenceTimeMs: number) =>
    Math.round((referenceTimeMs / referenceDurationMs) * duration);
}

function scaleReferenceDuration(
  durationMs: number,
  referenceDurationMs: number,
  referencePatternEndMs: number,
) {
  return Math.round(
    (referencePatternEndMs / referenceDurationMs) * Math.max(80, durationMs),
  );
}

function event(time: number, amplitude: number, frequency: number) {
  return { time, amplitude, frequency };
}

function point(time: number, value: number) {
  return { time, value };
}
