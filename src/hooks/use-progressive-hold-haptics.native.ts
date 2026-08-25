import {
  Presets,
  type Pattern,
  usePatternComposer,
} from "react-native-pulsar";
import { useCallback, useLayoutEffect, useMemo } from "react";
import { useSharedValue } from "react-native-reanimated";

import type { ProgressiveHoldHaptics } from "@/hooks/use-progressive-hold-haptics.types";
import { useSemanticHaptics } from "@/hooks/use-semantic-haptics";
import { useHapticsSettings } from "@/providers/haptics-context";

function createHoldPattern(durationMs: number, advanced: boolean): Pattern {
  const at = (fraction: number) => Math.round(durationMs * fraction);

  if (!advanced) {
    return {
      discretePattern: [
        { time: 0, amplitude: 0.14, frequency: 0.28 },
        { time: at(0.84), amplitude: 0.24, frequency: 0.5 },
      ],
      continuousPattern: {
        amplitude: [
          { time: 0, value: 0.02 },
          { time: at(0.5), value: 0.07 },
          { time: at(0.82), value: 0.17 },
          { time: at(0.97), value: 0.28 },
          { time: durationMs, value: 0 },
        ],
        frequency: [
          { time: 0, value: 0.18 },
          { time: durationMs, value: 0.42 },
        ],
      },
    };
  }

  return {
    discretePattern: [
      { time: 0, amplitude: 0.18, frequency: 0.28 },
      { time: at(0.82), amplitude: 0.3, frequency: 0.55 },
    ],
    continuousPattern: {
      amplitude: [
        { time: 0, value: 0.03 },
        { time: at(0.25), value: 0.08 },
        { time: at(0.58), value: 0.18 },
        { time: at(0.82), value: 0.32 },
        { time: at(0.96), value: 0.48 },
        { time: durationMs, value: 0 },
      ],
      frequency: [
        { time: 0, value: 0.18 },
        { time: at(0.58), value: 0.3 },
        { time: at(0.82), value: 0.44 },
        { time: durationMs, value: 0.58 },
      ],
    },
  };
}

export function useProgressiveHoldHaptics(
  durationMs: number,
): ProgressiveHoldHaptics {
  const { enabled, support } = useHapticsSettings();
  const { playSuccess } = useSemanticHaptics();
  const pattern = useMemo(
    () => createHoldPattern(durationMs, support === "advanced"),
    [durationMs, support],
  );
  const activeUntilMs = useSharedValue(0);
  const { play: playPattern, stop: stopPattern } = usePatternComposer(pattern);

  const stop = useCallback(() => {
    "worklet";
    if (activeUntilMs.get() > Date.now()) {
      stopPattern();
    }
    activeUntilMs.set(0);
  }, [activeUntilMs, stopPattern]);

  const play = useCallback(() => {
    "worklet";
    if (!enabled) return;

    if (support === "advanced" || support === "standard") {
      activeUntilMs.set(Date.now() + durationMs);
      playPattern();
    } else if (support === "limited") {
      Presets.System.impactSoft();
    }
  }, [activeUntilMs, durationMs, enabled, playPattern, support]);

  useLayoutEffect(() => () => stop(), [pattern, stop]);

  const complete = useCallback(() => {
    "worklet";
    stop();
    playSuccess();
  }, [playSuccess, stop]);

  return {
    complete,
    play,
    stop,
  };
}
