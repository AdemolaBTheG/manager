import type {
  DebriefTransitionHaptics,
  DebriefTransitionHapticsOptions,
} from "@/hooks/use-debrief-transition-haptics.types";

function noop() {
  "worklet";
}

const WEB_HAPTICS: DebriefTransitionHaptics = {
  playEnter: noop,
  playRewind: noop,
  playSettle: noop,
  stop: noop,
};

export function useDebriefTransitionHaptics(
  _options: DebriefTransitionHapticsOptions,
): DebriefTransitionHaptics {
  return WEB_HAPTICS;
}
