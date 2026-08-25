import type {
  ConversationTransitionHaptics,
  ConversationTransitionHapticsOptions,
} from "@/hooks/use-conversation-transition-haptics.types";

function noop() {
  "worklet";
}

const WEB_HAPTICS: ConversationTransitionHaptics = {
  playIncoming: noop,
  playOutgoing: noop,
  playSettle: noop,
  stop: noop,
};

export function useConversationTransitionHaptics(
  _options: ConversationTransitionHapticsOptions,
): ConversationTransitionHaptics {
  return WEB_HAPTICS;
}
