export type SemanticHaptics = {
  readonly playError: () => void;
  readonly playReady: () => void;
  readonly playRecordStart: () => void;
  readonly playRecordStop: () => void;
  readonly playSelection: () => void;
  readonly playSuccess: () => void;
};
