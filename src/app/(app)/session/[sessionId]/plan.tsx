import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { createDevDebriefPreview } from "@/data/dev-debrief-preview";
import { getScenarioDefinitionForSession } from "@/data/scenarios";
import { PreparationPlanScreen } from "@/screens/preparation-plan-screen";
import { ReadinessFallbackScreen } from "@/screens/readiness-screen";
import {
  planQueryKey,
  type PlanQueryData,
} from "@/services/query/plan-query";
import { sessionRepository } from "@/services/storage";

export default function SessionPlanRoute() {
  const { preview, sessionId } = useLocalSearchParams<{
    preview?: string;
    sessionId: string;
  }>();
  const isDevPreview = __DEV__ && preview === "debrief";
  const router = useRouter();
  const queryKey = planQueryKey(
    sessionId,
    isDevPreview ? "preview" : "persisted",
  );
  const planQuery = useQuery({
    enabled: Boolean(sessionId),
    queryKey,
    queryFn: () =>
      isDevPreview ? loadPlanPreview(sessionId) : loadPlan(sessionId),
    retry: false,
  });
  if (planQuery.isPending) {
    return (
      <>
        <Stack.Screen options={{ title: "Before you go in" }} />
        <ReadinessFallbackScreen
          body="Gathering the anchors from your rehearsal."
          title="Preparing your plan…"
        />
      </>
    );
  }

  if (planQuery.isError || !planQuery.data) {
    return (
      <>
        <Stack.Screen options={{ title: "Before you go in" }} />
        <ReadinessFallbackScreen
          body={
            planQuery.error instanceof Error
              ? planQuery.error.message
              : "Finish the debrief before opening your plan."
          }
          title="Your plan isn’t available"
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Before you go in" }} />
      <PreparationPlanScreen
        afterRating={planQuery.data.afterRating}
        beforeRating={planQuery.data.beforeRating}
        evidenceAnchors={planQuery.data.evidenceAnchors}
        onDone={() => router.dismissTo("/")}
        onRateReadiness={() =>
          router.push({
            pathname: "/session/[sessionId]/post-readiness",
            params: {
              sessionId,
              ...(isDevPreview ? { preview: "debrief" } : {}),
            },
          })
        }
        preparationCard={planQuery.data.preparationCard}
      />
    </>
  );
}

async function loadPlanPreview(sessionId: string): Promise<PlanQueryData> {
  const session = await sessionRepository.getSession(sessionId);
  if (!session) {
    throw new Error("This rehearsal session could not be found.");
  }

  const scenario = getScenarioDefinitionForSession(session);
  if (!scenario) {
    throw new Error("The saved scenario version is unavailable.");
  }

  const beforeRating = await sessionRepository.getReadinessRating(
    session.id,
    "before",
  );
  const debrief = createDevDebriefPreview(scenario);

  return {
    afterRating: null,
    beforeRating: beforeRating?.rating ?? 3,
    evidenceAnchors: scenario.presentation.evidenceAnchors.slice(0, 3),
    preparationCard: debrief.preparationCard,
  };
}

async function loadPlan(sessionId: string): Promise<PlanQueryData> {
  const session = await sessionRepository.getSession(sessionId);
  if (!session?.activeBranchId) {
    throw new Error("This rehearsal session could not be found.");
  }
  if (session.status !== "plan-ready" && session.status !== "complete") {
    throw new Error("Finish the debrief before opening your plan.");
  }

  const [branch, branchState, debriefRecord, beforeRating, afterRating] =
    await Promise.all([
      sessionRepository.getBranch(session.activeBranchId),
      sessionRepository.getBranchSimulationState(session.activeBranchId),
      sessionRepository.getDebrief(session.activeBranchId),
      sessionRepository.getReadinessRating(session.id, "before"),
      sessionRepository.getReadinessRating(session.id, "after"),
    ]);

  if (!branch || branchState?.state.phase !== "closed") {
    throw new Error("The completed rehearsal branch is unavailable.");
  }
  if (!debriefRecord || !beforeRating) {
    throw new Error("The debrief or initial readiness rating is missing.");
  }
  if (session.status === "complete" && !afterRating) {
    throw new Error("The completed session is missing its final readiness rating.");
  }

  const scenario = getScenarioDefinitionForSession(session);
  if (!scenario) {
    throw new Error("The saved scenario version is unavailable.");
  }

  return {
    afterRating:
      session.status === "complete" ? (afterRating?.rating ?? null) : null,
    beforeRating: beforeRating.rating,
    evidenceAnchors: scenario.presentation.evidenceAnchors.slice(0, 3),
    preparationCard: debriefRecord.debrief.preparationCard,
  };
}
