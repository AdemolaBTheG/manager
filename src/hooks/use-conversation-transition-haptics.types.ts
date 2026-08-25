export type ConversationTransitionHapticsOptions = {
  readonly incomingDurationMs: number;
  readonly outgoingDurationMs: number;
  readonly reduceMotion: boolean;
};

export type ConversationTransitionHaptics = {
  readonly playIncoming: () => void;
  readonly playOutgoing: () => void;
  readonly playSettle: () => void;
  readonly stop: () => void;
};
