import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import type { OnboardingCommitmentFocus } from "@/data/onboarding-commitments";
import type { DebriefFoundation } from "@/domain/coaching";
import type { PracticeCategory } from "@/domain/scenario";

export type OnboardingProofSnapshot = {
  readonly category: PracticeCategory;
  readonly currentFoundations: readonly DebriefFoundation[];
  readonly focus: OnboardingCommitmentFocus;
  readonly originalFoundations: readonly DebriefFoundation[] | null;
};

type OnboardingFlowContextValue = {
  readonly proofSnapshot: OnboardingProofSnapshot | null;
  readonly clearProofSnapshot: () => void;
  readonly setProofSnapshot: (snapshot: OnboardingProofSnapshot) => void;
};

const OnboardingFlowContext =
  createContext<OnboardingFlowContextValue | null>(null);

export function OnboardingFlowProvider({ children }: PropsWithChildren) {
  const [proofSnapshot, setProofSnapshot] =
    useState<OnboardingProofSnapshot | null>(null);
  const clearProofSnapshot = useCallback(() => setProofSnapshot(null), []);
  const value = useMemo(
    () => ({ clearProofSnapshot, proofSnapshot, setProofSnapshot }),
    [clearProofSnapshot, proofSnapshot],
  );

  return (
    <OnboardingFlowContext value={value}>{children}</OnboardingFlowContext>
  );
}

export function useOnboardingFlow() {
  const value = use(OnboardingFlowContext);

  if (!value) {
    throw new Error(
      "useOnboardingFlow must be used inside OnboardingFlowProvider.",
    );
  }

  return value;
}
