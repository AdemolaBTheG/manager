import {
  CustomVariableValue,
  type CustomVariables,
} from "react-native-purchases-ui";

import {
  ONBOARDING_COMMITMENTS,
  isOnboardingCommitmentFocus,
} from "@/data/onboarding-commitments";
import {
  PRACTICE_CATEGORIES,
  type PracticeCategory,
} from "@/domain/scenario";

export const REVENUECAT_ONBOARDING_VARIABLES = {
  commitmentFocus: "commitment_focus",
  commitmentText: "commitment_text",
  conversationType: "conversation_type",
  conversationTypeLabel: "conversation_type_label",
} as const;

export function createOnboardingPaywallVariables({
  category,
  focus,
}: {
  readonly category?: string;
  readonly focus?: string;
}): CustomVariables | undefined {
  if (!isPracticeCategory(category) || !isOnboardingCommitmentFocus(focus)) {
    return undefined;
  }

  return {
    [REVENUECAT_ONBOARDING_VARIABLES.conversationType]:
      CustomVariableValue.string(category),
    [REVENUECAT_ONBOARDING_VARIABLES.conversationTypeLabel]:
      CustomVariableValue.string(PRACTICE_CATEGORIES[category].label),
    [REVENUECAT_ONBOARDING_VARIABLES.commitmentFocus]:
      CustomVariableValue.string(focus),
    [REVENUECAT_ONBOARDING_VARIABLES.commitmentText]:
      CustomVariableValue.string(ONBOARDING_COMMITMENTS[focus]),
  };
}

function isPracticeCategory(
  value: string | undefined,
): value is PracticeCategory {
  return (
    value !== undefined &&
    Object.prototype.hasOwnProperty.call(PRACTICE_CATEGORIES, value)
  );
}
