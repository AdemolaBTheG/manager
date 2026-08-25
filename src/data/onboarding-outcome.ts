import type {
  DebriefFoundation,
  FoundationKey,
  FoundationStatus,
} from "@/domain/coaching";
import type { SimulationState } from "@/domain/simulation-state";

export const ONBOARDING_FOUNDATION_KEYS = [
  "purpose",
  "specificity",
  "evidence",
  "perspective",
  "boundary",
  "path",
] as const satisfies readonly FoundationKey[];

export const ONBOARDING_FOUNDATION_LABELS: Record<FoundationKey, string> = {
  purpose: "Purpose",
  specificity: "Specificity",
  evidence: "Evidence",
  perspective: "Perspective",
  boundary: "Boundary",
  path: "Next step",
};

export function createOnboardingFoundations(
  state: SimulationState,
): readonly DebriefFoundation[] {
  const status = (clear: boolean): FoundationStatus =>
    clear ? "clear" : "partial";

  return [
    { key: "purpose", status: status(state.issueWasMadeSpecific) },
    { key: "specificity", status: status(state.issueWasMadeSpecific) },
    {
      key: "evidence",
      status: state.acknowledgedFactIds.length > 0 ? "clear" : "partial",
    },
    {
      key: "perspective",
      status: status(state.managerAskedForPerspective),
    },
    {
      key: "boundary",
      status: status(state.expectationIsClear && !state.managerBackedAway),
    },
    { key: "path", status: status(state.nextStepEstablished) },
  ];
}

export function countClearFoundations(
  foundations: readonly DebriefFoundation[],
) {
  return foundations.filter((foundation) => foundation.status === "clear")
    .length;
}

export function getNewlyClearFoundationLabels(
  previous: readonly DebriefFoundation[],
  current: readonly DebriefFoundation[],
) {
  const previousByKey = new Map(
    previous.map((foundation) => [foundation.key, foundation.status]),
  );

  return current
    .filter(
      (foundation) =>
        foundation.status === "clear" &&
        previousByKey.get(foundation.key) !== "clear",
    )
    .map((foundation) => ONBOARDING_FOUNDATION_LABELS[foundation.key]);
}

export function describeOnboardingRetryChange(
  original: SimulationState,
  current: SimulationState,
) {
  if (!original.issueWasMadeSpecific && current.issueWasMadeSpecific) {
    return "This time, you made the issue concrete instead of leaving it implied.";
  }

  if (
    !original.managerAskedForPerspective &&
    current.managerAskedForPerspective
  ) {
    return "This time, you explored their perspective before returning to the standard.";
  }

  if (!original.expectationIsClear && current.expectationIsClear) {
    return "This time, the expectation stayed clear when they pushed back.";
  }

  if (!original.nextStepEstablished && current.nextStepEstablished) {
    return "This time, you moved the conversation toward a concrete next step.";
  }

  if (original.managerBackedAway && !current.managerBackedAway) {
    return "This time, you acknowledged the resistance without abandoning the standard.";
  }

  if (
    countClearFoundations(createOnboardingFoundations(current)) <
    countClearFoundations(createOnboardingFoundations(original))
  ) {
    return "The wording changed, but the first response kept more of the conversation foundations intact.";
  }

  return "The wording changed, but the same coaching opportunity remains: make the issue, standard, or next step more concrete.";
}
