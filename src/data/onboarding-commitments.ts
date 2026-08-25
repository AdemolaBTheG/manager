import type { PracticeCategory } from "@/domain/scenario";
import type { SimulationState } from "@/domain/simulation-state";

export const ONBOARDING_COMMITMENTS = {
  specificity: "I’ll make the issue concrete.",
  perspective: "I’ll stay curious when they push back.",
  boundary: "I’ll hold the standard without backing away.",
  path: "I’ll leave with one concrete next step.",
} as const;

export type OnboardingCommitmentFocus =
  keyof typeof ONBOARDING_COMMITMENTS;

const DEFAULT_FOCUS_BY_CATEGORY: Record<
  PracticeCategory,
  OnboardingCommitmentFocus
> = {
  feedback: "specificity",
  boundary: "boundary",
  pushback: "path",
};

const COMMITMENT_FOCUS_ORDER_BY_CATEGORY: Record<
  PracticeCategory,
  readonly OnboardingCommitmentFocus[]
> = {
  feedback: ["specificity", "perspective", "path"],
  boundary: ["boundary", "perspective", "path"],
  pushback: ["path", "specificity", "perspective"],
};

export function getOnboardingCommitmentFocuses(
  category: PracticeCategory,
  primaryFocus: OnboardingCommitmentFocus,
): readonly OnboardingCommitmentFocus[] {
  return [primaryFocus, ...COMMITMENT_FOCUS_ORDER_BY_CATEGORY[category]]
    .filter((focus, index, focuses) => focuses.indexOf(focus) === index)
    .slice(0, 3);
}

export function chooseOnboardingCommitmentFocus(
  state: SimulationState,
  category: PracticeCategory,
): OnboardingCommitmentFocus {
  if (!state.issueWasMadeSpecific) return "specificity";
  if (!state.managerAskedForPerspective) return "perspective";
  if (!state.expectationIsClear || state.managerBackedAway) return "boundary";
  if (!state.nextStepEstablished) return "path";

  return DEFAULT_FOCUS_BY_CATEGORY[category];
}

export function isOnboardingCommitmentFocus(
  value: string | undefined,
): value is OnboardingCommitmentFocus {
  return (
    value !== undefined &&
    Object.prototype.hasOwnProperty.call(ONBOARDING_COMMITMENTS, value)
  );
}
