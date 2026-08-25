import type { SemanticHaptics } from "@/hooks/use-semantic-haptics.types";

function noop() {
  "worklet";
}

const WEB_HAPTICS: SemanticHaptics = {
  playError: noop,
  playReady: noop,
  playRecordStart: noop,
  playRecordStop: noop,
  playSelection: noop,
  playSuccess: noop,
};

export function useSemanticHaptics(): SemanticHaptics {
  return WEB_HAPTICS;
}
