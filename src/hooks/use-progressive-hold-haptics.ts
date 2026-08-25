import type { ProgressiveHoldHaptics } from "@/hooks/use-progressive-hold-haptics.types";

function noop() {
  "worklet";
}

const WEB_HAPTICS: ProgressiveHoldHaptics = {
  complete: noop,
  play: noop,
  stop: noop,
};

export function useProgressiveHoldHaptics(
  _durationMs: number,
): ProgressiveHoldHaptics {
  return WEB_HAPTICS;
}
