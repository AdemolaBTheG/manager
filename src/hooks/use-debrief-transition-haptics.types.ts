export type DebriefTransitionHapticsOptions = {
  readonly enterDurationMs: number;
  readonly reduceMotion: boolean;
  readonly rewindDurationMs: number;
};

export type DebriefTransitionHaptics = {
  readonly playEnter: () => void;
  readonly playRewind: () => void;
  readonly playSettle: () => void;
  readonly stop: () => void;
};
