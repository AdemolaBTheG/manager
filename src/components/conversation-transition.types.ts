export type ConversationTransitionDirection =
  | "into-debrief"
  | "into-rehearsal";

export type ConversationTransitionRequest = {
  readonly accentColor: string;
  readonly direction: ConversationTransitionDirection;
  readonly navigate: () => void;
};

export type ConversationTransitionController = {
  readonly isTransitioning: boolean;
  readonly startConversationTransition: (
    request: ConversationTransitionRequest,
  ) => Promise<void>;
};
