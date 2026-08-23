import { createContext, useContext } from "react";

import type { ConversationTransitionController } from "@/components/conversation-transition.types";

export const ConversationTransitionContext =
  createContext<ConversationTransitionController | null>(null);

export function useConversationTransition() {
  const value = useContext(ConversationTransitionContext);

  if (!value) {
    throw new Error(
      "useConversationTransition must be used inside ConversationTransitionProvider.",
    );
  }

  return value;
}
