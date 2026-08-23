import type { PreparationCard } from "@/domain/coaching";
import type { ScenarioEvidenceAnchor } from "@/domain/scenario";
import type { ReadinessValue } from "@/domain/session";

export type PlanQueryData = {
  readonly afterRating: ReadinessValue | null;
  readonly beforeRating: ReadinessValue;
  readonly evidenceAnchors: readonly ScenarioEvidenceAnchor[];
  readonly preparationCard: PreparationCard;
};

export function planQueryKey(
  sessionId: string,
  source: "persisted" | "preview",
) {
  return ["rehearsal", "plan", sessionId, source] as const;
}
