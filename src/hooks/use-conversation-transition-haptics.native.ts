import { useCallback, useLayoutEffect, useMemo } from "react";
import { Presets, type Pattern, usePatternComposer } from "react-native-pulsar";
import { useSharedValue } from "react-native-reanimated";

import type {
  ConversationTransitionHaptics,
  ConversationTransitionHapticsOptions,
} from "@/hooks/use-conversation-transition-haptics.types";
import { useHapticsSettings } from "@/providers/haptics-context";

const OUTGOING_REFERENCE_DURATION = 500;
const INCOMING_REFERENCE_DURATION = 560;
const OUTGOING_PATTERN_END = 350;
const INCOMING_PATTERN_END = 360;

export function useConversationTransitionHaptics({
  incomingDurationMs,
  outgoingDurationMs,
  reduceMotion,
}: ConversationTransitionHapticsOptions): ConversationTransitionHaptics {
  const { enabled, support } = useHapticsSettings();
  const outgoingPattern = useMemo(
    () => createOutgoingPattern(outgoingDurationMs),
    [outgoingDurationMs],
  );
  const incomingPattern = useMemo(
    () => createIncomingPattern(incomingDurationMs),
    [incomingDurationMs],
  );
  const activePattern = useSharedValue<0 | 1 | 2>(0);
  const activeUntilMs = useSharedValue(0);
  const isAlive = useSharedValue(1);
  const { play: playOutgoingPattern, stop: stopOutgoingPattern } =
    usePatternComposer(outgoingPattern);
  const { play: playIncomingPattern, stop: stopIncomingPattern } =
    usePatternComposer(incomingPattern);

  const stop = useCallback(() => {
    "worklet";
    const playingPattern = activePattern.get();
    if (activeUntilMs.get() > Date.now()) {
      if (playingPattern === 1) stopOutgoingPattern();
      if (playingPattern === 2) stopIncomingPattern();
    }
    activePattern.set(0);
    activeUntilMs.set(0);
  }, [
    activePattern,
    activeUntilMs,
    stopIncomingPattern,
    stopOutgoingPattern,
  ]);

  const playOutgoing = useCallback(() => {
    "worklet";
    if (isAlive.get() !== 1 || !enabled || reduceMotion) return;

    if (support === "advanced" || support === "standard") {
      activePattern.set(1);
      activeUntilMs.set(
        Date.now() +
          scaleReferenceDuration(
            outgoingDurationMs,
            OUTGOING_REFERENCE_DURATION,
            OUTGOING_PATTERN_END,
          ),
      );
      playOutgoingPattern();
    } else if (support === "limited") {
      Presets.System.impactSoft();
    }
  }, [
    activePattern,
    activeUntilMs,
    enabled,
    isAlive,
    outgoingDurationMs,
    playOutgoingPattern,
    reduceMotion,
    support,
  ]);

  const playIncoming = useCallback(() => {
    "worklet";
    if (isAlive.get() !== 1 || !enabled || reduceMotion) return;

    if (support === "advanced" || support === "standard") {
      activePattern.set(2);
      activeUntilMs.set(
        Date.now() +
          scaleReferenceDuration(
            incomingDurationMs,
            INCOMING_REFERENCE_DURATION,
            INCOMING_PATTERN_END,
          ),
      );
      playIncomingPattern();
    } else if (support === "limited") {
      Presets.System.impactSoft();
    }
  }, [
    activePattern,
    activeUntilMs,
    enabled,
    incomingDurationMs,
    isAlive,
    playIncomingPattern,
    reduceMotion,
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
    incomingPattern,
    isAlive,
    outgoingPattern,
    reduceMotion,
    stop,
    support,
  ]);

  return { playIncoming, playOutgoing, playSettle, stop };
}

/** The first cover edge crests at 51 ms under bezier(0.16, 1, 0.3, 1). */
function createOutgoingPattern(durationMs: number): Pattern {
  const time = createTimeScaler(durationMs, OUTGOING_REFERENCE_DURATION);

  return {
    discretePattern: [
      event(time(0), 0.16, 0.28),
      event(time(51), 0.2, 0.62),
    ],
    continuousPattern: {
      amplitude: [
        point(time(0), 0),
        point(time(6), 0.04),
        point(time(15), 0.11),
        point(time(33), 0.22),
        point(time(51), 0.27),
        point(time(102), 0.17),
        point(time(180), 0.06),
        point(time(250), 0.02),
        point(time(350), 0),
      ],
      frequency: [
        point(time(0), 0.26),
        point(time(51), 0.48),
        point(time(102), 0.58),
        point(time(180), 0.64),
        point(time(350), 0.68),
      ],
    },
  };
}

/** A softer inverse crest as the destination emerges from the cover. */
function createIncomingPattern(durationMs: number): Pattern {
  const time = createTimeScaler(durationMs, INCOMING_REFERENCE_DURATION);

  return {
    discretePattern: [event(time(57), 0.18, 0.52)],
    continuousPattern: {
      amplitude: [
        point(time(0), 0),
        point(time(23), 0.15),
        point(time(57), 0.25),
        point(time(83), 0.22),
        point(time(137), 0.13),
        point(time(207), 0.05),
        point(time(280), 0.02),
        point(time(360), 0),
      ],
      frequency: [
        point(time(0), 0.68),
        point(time(57), 0.48),
        point(time(137), 0.35),
        point(time(207), 0.3),
        point(time(360), 0.26),
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
