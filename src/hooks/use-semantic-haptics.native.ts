import { useCallback } from "react";
import { Presets } from "react-native-pulsar";

import type { SemanticHaptics } from "@/hooks/use-semantic-haptics.types";
import { useHapticsSettings } from "@/providers/haptics-context";

export function useSemanticHaptics(): SemanticHaptics {
  const { enabled, support } = useHapticsSettings();
  const canPlay = enabled && support !== "none";

  const playError = useCallback(() => {
    "worklet";
    if (canPlay) Presets.System.notificationError();
  }, [canPlay]);

  const playReady = useCallback(() => {
    "worklet";
    if (canPlay) Presets.System.impactLight();
  }, [canPlay]);

  const playRecordStart = useCallback(() => {
    "worklet";
    if (canPlay) Presets.System.impactSoft();
  }, [canPlay]);

  const playRecordStop = useCallback(() => {
    "worklet";
    if (canPlay) Presets.System.impactRigid();
  }, [canPlay]);

  const playSelection = useCallback(() => {
    "worklet";
    if (canPlay) Presets.System.selection();
  }, [canPlay]);

  const playSuccess = useCallback(() => {
    "worklet";
    if (canPlay) Presets.System.notificationSuccess();
  }, [canPlay]);

  return {
    playError,
    playReady,
    playRecordStart,
    playRecordStop,
    playSelection,
    playSuccess,
  };
}
