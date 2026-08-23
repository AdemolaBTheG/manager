import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Redirect,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { useConversationTransition } from "@/components/conversation-transition-provider";
import { DebriefAtmosphere } from "@/components/debrief-atmosphere";
import { ThemedText } from "@/components/themed-text";
import {
  FontSize,
  PracticeCategoryColors,
  Sizing,
  Spacing,
} from "@/constants/theme";
import { createDevDebriefPreview } from "@/data/dev-debrief-preview";
import { getScenarioDefinitionForSession } from "@/data/scenarios";
import type { Debrief, DebriefMoment } from "@/domain/coaching";
import type { Branch, Turn } from "@/domain/session";
import type { ScenarioDefinition } from "@/domain/scenario";
import type { SimulationState } from "@/domain/simulation-state";
import { DebriefScreen } from "@/screens/debrief-screen";
import {
  type RewindComparison,
  WhatChangedScreen,
} from "@/screens/what-changed-screen";
import { useDebriefMutation } from "@/services/query/rehearsal-mutations";
import {
  buildCounterpartLineByTurnId,
  type CounterpartLineByTurnId,
} from "@/services/query/debrief-context";
import {
  loadRewind,
  rewindQueryKey,
} from "@/services/query/rewind-query";
import { prepareSessionPlan } from "@/services/query/debrief-flow";
import { sessionRepository } from "@/services/storage";

type LoadState =
  | { scenario?: ScenarioDefinition; status: "loading" }
  | {
      branchId: string;
      counterpartLineByTurnId: CounterpartLineByTurnId;
      debrief: Debrief;
      readOnly: boolean;
      scenario: ScenarioDefinition;
      sessionId: string;
      status: "initial";
    }
  | {
      comparison: RewindComparison;
      scenario: ScenarioDefinition;
      sessionId: string;
      status: "comparison";
    }
  | {
      counterpartLineByTurnId: CounterpartLineByTurnId;
      debrief: Debrief;
      scenario: ScenarioDefinition;
      sessionId: string;
      status: "preview";
    }
  | {
      momentId: string;
      sessionId: string;
      status: "resume-rewind";
    }
  | {
      sessionId: string;
      status: "resume-plan";
    }
  | { status: "error"; message: string };

export default function DebriefRoute() {
  const { preview, review, sessionId } = useLocalSearchParams<{
    preview?: string;
    review?: string;
    sessionId: string;
  }>();
  const isDevPreview = __DEV__ && preview === "skia";
  const isReview = review === "1";
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isTransitioning, startConversationTransition } =
    useConversationTransition();
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const isRunningRef = useRef(false);
  const {
    mutateAsync: generateDebrief,
    reset: resetDebriefMutation,
  } = useDebriefMutation(sessionId ?? "unavailable");
  const rewindMutation = useMutation({
    mutationKey: ["rehearsal", "start-rewind", sessionId],
    mutationFn: ({
      branchId,
      moment,
    }: {
      branchId: string;
      moment: DebriefMoment;
    }) => startRewind(sessionId, branchId, moment),
    onSuccess: async ({ momentId }) => {
      try {
        await queryClient.ensureQueryData({
          queryKey: rewindQueryKey(sessionId, momentId),
          queryFn: () => loadRewind(sessionId, momentId),
          revalidateIfStale: false,
        });
      } catch {
        // The destination retains its recovery UI if a persisted rewind cannot load.
      }

      const accentColor =
        PracticeCategoryColors.dark[loadState.status === "initial"
          ? loadState.scenario.category
          : "boundary"];

      await startConversationTransition({
        accentColor,
        direction: "into-rehearsal",
        navigate: () => {
          router.push({
            pathname: "/session/[sessionId]/rewind/[momentId]",
            params: { momentId, sessionId },
          });
        },
      });
    },
  });
  const planMutation = useMutation({
    mutationKey: ["rehearsal", "open-plan", sessionId],
    mutationFn: () => prepareSessionPlan(sessionId),
    onSuccess: () => {
      router.replace({
        pathname: "/session/[sessionId]/plan",
        params: { sessionId },
      });
    },
  });
  const closeDevPreview = useCallback(() => {
    if (isTransitioning || loadState.status !== "preview") {
      return;
    }

    void startConversationTransition({
      accentColor:
        PracticeCategoryColors.dark[loadState.scenario.category],
      direction: "into-rehearsal",
      navigate: () => router.back(),
    });
  }, [
    isTransitioning,
    loadState,
    router,
    startConversationTransition,
  ]);
  const openDevPlanPreview = useCallback(() => {
    if (isTransitioning || loadState.status !== "preview") {
      return;
    }

    router.push({
      pathname: "/session/[sessionId]/plan",
      params: { preview: "debrief", sessionId: loadState.sessionId },
    });
  }, [isTransitioning, loadState, router]);

  const loadDebrief = useCallback(async () => {
    if (!sessionId || isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;
    resetDebriefMutation();
    setLoadState({ status: "loading" });

    try {
      const session = await sessionRepository.getSession(sessionId);
      if (!session?.activeBranchId) {
        throw new Error("This rehearsal session could not be found.");
      }

      const scenario = getScenarioDefinitionForSession(session);
      if (!scenario) {
        throw new Error("This saved scenario version is unavailable.");
      }
      setLoadState({ scenario, status: "loading" });

      if (isDevPreview) {
        const debrief = createDevDebriefPreview(scenario);
        setLoadState({
          counterpartLineByTurnId: {
            "dev-manager-turn": scenario.openingLine,
          },
          debrief,
          scenario,
          sessionId: session.id,
          status: "preview",
        });
        return;
      }

      const [branch, branchState, transcript, savedDebrief] = await Promise.all([
        sessionRepository.getBranch(session.activeBranchId),
        sessionRepository.getBranchSimulationState(session.activeBranchId),
        sessionRepository.listTranscript(session.activeBranchId),
        sessionRepository.getDebrief(session.activeBranchId),
      ]);

      if (!branch) {
        throw new Error("The active rehearsal branch could not be found.");
      }

      if (isReview) {
        if (!savedDebrief || !branchState || branchState.state.phase !== "closed") {
          throw new Error("This session does not have a completed debrief to review.");
        }
        setLoadState({
          branchId: branch.id,
          counterpartLineByTurnId: buildCounterpartLineByTurnId(
            savedDebrief.debrief,
            transcript,
            scenario.openingLine,
          ),
          debrief: savedDebrief.debrief,
          readOnly: true,
          scenario,
          sessionId: session.id,
          status: "initial",
        });
        return;
      }

      if (session.status === "plan-ready" || session.status === "complete") {
        setLoadState({ sessionId: session.id, status: "resume-plan" });
        return;
      }

      if (session.status === "rewinding" && branch.kind === "rewind") {
        const parentDebrief = await sessionRepository.getDebrief(
          branch.parentBranchId,
        );
        const rewindMoment = parentDebrief?.debrief.moments.find(
          (moment) =>
            moment.rewindable && moment.turnId === branch.forkTurnId,
        );
        if (!rewindMoment) {
          throw new Error("The active rewind no longer matches its debrief moment.");
        }

        setLoadState({
          momentId: rewindMoment.id,
          sessionId: session.id,
          status: "resume-rewind",
        });
        return;
      }

      if (!branchState || branchState.state.phase !== "closed") {
        throw new Error("Finish the rehearsal before opening its debrief.");
      }

      const debrief = await getOrCreateDebrief({
        branchId: branch.id,
        finalState: branchState.state,
        generateDebrief,
        savedDebrief: savedDebrief?.debrief ?? null,
        scenario,
        transcript,
      });

      const latestSession = await sessionRepository.getSession(session.id);
      if (latestSession?.status === "debriefing") {
        await sessionRepository.transitionSession(session.id, "debrief-ready");
      } else if (latestSession?.status !== "debrief-ready") {
        throw new Error("This session is not ready to show its debrief.");
      }

      if (branch.kind === "rewind") {
        setLoadState({
          comparison: await buildRewindComparison(
            branch,
            transcript,
            debrief,
            branchState.state,
          ),
          scenario,
          sessionId: session.id,
          status: "comparison",
        });
      } else {
        setLoadState({
          branchId: branch.id,
          counterpartLineByTurnId: buildCounterpartLineByTurnId(
            debrief,
            transcript,
            scenario.openingLine,
          ),
          debrief,
          readOnly: false,
          scenario,
          sessionId: session.id,
          status: "initial",
        });
      }
    } catch (error) {
      setLoadState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "The debrief could not be generated. Please try again.",
      });
    } finally {
      isRunningRef.current = false;
    }
  }, [generateDebrief, isDevPreview, isReview, resetDebriefMutation, sessionId]);

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => {
        void loadDebrief();
      }, 0);

      return () => clearTimeout(timeout);
    }, [loadDebrief]),
  );

  if (loadState.status === "resume-plan") {
    return (
      <Redirect
        href={{
          pathname: "/session/[sessionId]/plan",
          params: { sessionId: loadState.sessionId },
        }}
      />
    );
  }

  if (loadState.status === "resume-rewind") {
    return (
      <Redirect
        href={{
          pathname: "/session/[sessionId]/rewind/[momentId]",
          params: {
            momentId: loadState.momentId,
            sessionId: loadState.sessionId,
          },
        }}
      />
    );
  }

  if (loadState.status === "initial") {
    const accentColor =
      PracticeCategoryColors.dark[loadState.scenario.category];

    return (
      <>
        <StatusBar animated style="light" />
        <Stack.Screen options={immersiveHeaderOptions("Debrief")} />
        <DebriefScreen
          accentColor={accentColor}
          counterpartLineByTurnId={loadState.counterpartLineByTurnId}
          counterpartName={loadState.scenario.relationship.counterpartName}
          continueError={
            planMutation.error instanceof Error
              ? planMutation.error.message
              : null
          }
          debrief={loadState.debrief}
          isContinuing={planMutation.isPending}
          isRewinding={rewindMutation.isPending || isTransitioning}
          onContinue={
            loadState.readOnly
              ? null
              : () => {
                  rewindMutation.reset();
                  planMutation.mutate();
                }
          }
          onRewind={
            loadState.readOnly
              ? null
              : (moment) => {
                  planMutation.reset();
                  rewindMutation.mutate({
                    branchId: loadState.branchId,
                    moment,
                  });
                }
          }
          rewindError={
            rewindMutation.error instanceof Error
              ? rewindMutation.error.message
              : null
          }
        />
      </>
    );
  }

  if (loadState.status === "preview") {
    const accentColor =
      PracticeCategoryColors.dark[loadState.scenario.category];

    return (
      <>
        <StatusBar animated style="light" />
        <Stack.Screen options={immersiveHeaderOptions("Debrief preview")} />
        <DebriefScreen
          accentColor={accentColor}
          counterpartLineByTurnId={loadState.counterpartLineByTurnId}
          counterpartName={loadState.scenario.relationship.counterpartName}
          continueError={null}
          debrief={loadState.debrief}
          isContinuing={false}
          isRewinding={isTransitioning}
          onContinue={openDevPlanPreview}
          onRewind={closeDevPreview}
          rewindError={null}
        />
      </>
    );
  }

  if (loadState.status === "comparison") {
    const accentColor =
      PracticeCategoryColors.dark[loadState.scenario.category];

    return (
      <>
        <StatusBar animated style="light" />
        <Stack.Screen options={immersiveHeaderOptions("What changed")} />
        <WhatChangedScreen
          accentColor={accentColor}
          comparison={loadState.comparison}
          errorMessage={
            planMutation.error instanceof Error ? planMutation.error.message : null
          }
          isContinuing={planMutation.isPending}
          onContinue={() => planMutation.mutate()}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar animated style="light" />
      <Stack.Screen options={immersiveHeaderOptions("Debrief")} />
      <DebriefStatusScreen
        accentColor={
          loadState.status === "loading" && loadState.scenario
            ? PracticeCategoryColors.dark[loadState.scenario.category]
            : PracticeCategoryColors.dark.boundary
        }
        errorMessage={loadState.status === "error" ? loadState.message : null}
        onRetry={loadDebrief}
      />
    </>
  );
}

async function getOrCreateDebrief({
  branchId,
  finalState,
  generateDebrief,
  savedDebrief,
  scenario,
  transcript,
}: {
  branchId: string;
  finalState: SimulationState;
  generateDebrief: ReturnType<typeof useDebriefMutation>["mutateAsync"];
  savedDebrief: Debrief | null;
  scenario: ScenarioDefinition;
  transcript: readonly Turn[];
}) {
  if (savedDebrief) {
    return savedDebrief;
  }

  const response = await generateDebrief({
    scenario,
    request: {
      scenarioId: scenario.id,
      scenarioVersion: scenario.version,
      scenarioDefinition: scenario.id.startsWith("private-")
        ? scenario
        : null,
      transcript: transcript.map((turn) => ({
        id: turn.id,
        speaker: turn.speaker,
        text: turn.text,
      })),
      finalState,
    },
  });
  const record = await sessionRepository.saveDebrief({
    branchId,
    debrief: response.debrief,
    modelVersion: response.model,
    promptVersion: response.promptVersion,
  });
  return record.debrief;
}

async function buildRewindComparison(
  branch: Extract<Branch, { kind: "rewind" }>,
  transcript: readonly Turn[],
  debrief: Debrief,
  currentState: SimulationState,
): Promise<RewindComparison> {
  const [parentDebrief, parentTranscript, parentState, session] = await Promise.all([
    sessionRepository.getDebrief(branch.parentBranchId),
    sessionRepository.listTranscript(branch.parentBranchId),
    sessionRepository.getBranchSimulationState(branch.parentBranchId),
    sessionRepository.getSession(branch.sessionId),
  ]);
  if (!parentDebrief || !parentState || !session) {
    throw new Error("The original branch is unavailable for comparison.");
  }

  const scenario = getScenarioDefinitionForSession(session);
  const originalTurn = parentTranscript.find(
    (turn) => turn.id === branch.forkTurnId,
  );
  const localTurns = transcript.filter((turn) => turn.branchId === branch.id);
  const replacementTurn = localTurns.find((turn) => turn.speaker === "manager");
  const counterpartReply = localTurns.find(
    (turn) =>
      turn.speaker === "counterpart" &&
      replacementTurn !== undefined &&
      turn.sequence > replacementTurn.sequence,
  );

  if (!scenario || !originalTurn || !replacementTurn || !counterpartReply) {
    throw new Error("The rewind does not contain a complete replacement exchange.");
  }

  return {
    counterpartName: scenario.relationship.counterpartName.split(" ")[0],
    counterpartReply: counterpartReply.text,
    currentOutcome: debrief.outcome,
    originalManagerTurn: originalTurn.text,
    previousOutcome: parentDebrief.debrief.outcome,
    replacementManagerTurn: replacementTurn.text,
    stateChanges: describeStateChanges(
      parentState.state,
      currentState,
      scenario.relationship.counterpartName.split(" ")[0],
    ),
  };
}

function describeStateChanges(
  previous: SimulationState,
  current: SimulationState,
  counterpartName: string,
) {
  const changes: string[] = [];

  addBooleanChange(
    changes,
    previous.issueWasMadeSpecific,
    current.issueWasMadeSpecific,
    "The issue became more concrete in this branch.",
    "The issue ended less specific in this branch.",
  );
  addBooleanChange(
    changes,
    previous.managerAskedForPerspective,
    current.managerAskedForPerspective,
    `You explored ${counterpartName}’s perspective this time.`,
    `You explored less of ${counterpartName}’s perspective this time.`,
  );
  addBooleanChange(
    changes,
    previous.expectationIsClear,
    current.expectationIsClear,
    "The expectation ended clearer in this branch.",
    "The expectation ended less clear in this branch.",
  );
  addBooleanChange(
    changes,
    previous.managerBackedAway,
    current.managerBackedAway,
    "The standard softened under resistance in this branch.",
    "You held the standard this time instead of backing away.",
  );
  addBooleanChange(
    changes,
    previous.nextStepEstablished,
    current.nextStepEstablished,
    "This branch reached a concrete next step.",
    "This branch ended without the earlier concrete next step.",
  );

  const previousFacts = new Set(previous.revealedFactIds);
  const currentFacts = new Set(current.revealedFactIds);
  const additionalFactCount = current.revealedFactIds.filter(
    (id) => !previousFacts.has(id),
  ).length;
  const missingFactCount = previous.revealedFactIds.filter(
    (id) => !currentFacts.has(id),
  ).length;
  if (additionalFactCount > 0) {
    changes.push(`This path surfaced more of ${counterpartName}’s context.`);
  } else if (missingFactCount > 0) {
    changes.push(`This path surfaced less of ${counterpartName}’s context.`);
  }

  if (previous.resolution !== current.resolution) {
    changes.push(
      `The simulated resolution changed from ${formatResolution(previous.resolution)} to ${formatResolution(current.resolution)}.`,
    );
  }

  return changes.length > 0
    ? changes
    : [
        "The observable conversation state ended the same, while your wording and the immediate response changed.",
      ];
}

function addBooleanChange(
  changes: string[],
  previous: boolean,
  current: boolean,
  becameTrue: string,
  becameFalse: string,
) {
  if (previous === current) {
    return;
  }
  changes.push(current ? becameTrue : becameFalse);
}

function formatResolution(value: SimulationState["resolution"]) {
  return value.replace(/-/g, " ");
}

async function startRewind(
  sessionId: string,
  branchId: string,
  moment: DebriefMoment,
) {
  if (!moment.rewindable) {
    throw new Error("This moment is not available for rewind.");
  }

  const session = await sessionRepository.getSession(sessionId);
  if (!session) {
    throw new Error("This rehearsal session could not be found.");
  }
  if (session.status !== "debrief-ready") {
    throw new Error("This session is not ready to rewind.");
  }

  await sessionRepository.createRewindBranch({
    parentBranchId: branchId,
    forkTurnId: moment.turnId,
  });

  return { momentId: moment.id } as const;
}

function DebriefStatusScreen({
  accentColor,
  errorMessage,
  onRetry,
}: {
  accentColor: string;
  errorMessage: string | null;
  onRetry: () => void;
}) {
  return (
    <View style={styles.statusScene}>
      <DebriefAtmosphere accentColor={accentColor} />
      <View style={styles.statusScreen}>
        {errorMessage ? null : <ActivityIndicator color="#FFFFFF" />}
        <ThemedText selectable style={styles.statusTitle}>
          {errorMessage
            ? "Debrief unavailable"
            : "Finding the moments that mattered…"}
        </ThemedText>
        <ThemedText selectable style={styles.statusBody}>
          {errorMessage ??
            "Your feedback will be tied to the words you actually used."}
        </ThemedText>
        {errorMessage ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retryButton,
              { opacity: pressed ? 0.78 : 1 },
            ]}
          >
            <ThemedText style={styles.retryText}>Try again</ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function immersiveHeaderOptions(title: string) {
  return {
    contentStyle: { backgroundColor: "#181116" },
    headerShadowVisible: false,
    headerStyle: { backgroundColor: "transparent" },
    headerTintColor: "#FFFFFF",
    headerTransparent: true,
    title,
  } as const;
}

const styles = StyleSheet.create({
  statusScene: {
    backgroundColor: "#181116",
    flex: 1,
  },
  statusScreen: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.two,
    justifyContent: "center",
    padding: Spacing.four,
  },
  statusTitle: {
    color: "rgba(255, 255, 255, 0.96)",
    fontSize: FontSize.titleSmall,
    fontWeight: "700",
    lineHeight: 28,
    textAlign: "center",
  },
  statusBody: {
    color: "rgba(255, 255, 255, 0.68)",
    fontSize: FontSize.body,
    lineHeight: 24,
    maxWidth: 340,
    textAlign: "center",
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    justifyContent: "center",
    marginTop: Spacing.two,
    minHeight: Sizing.control.large,
    minWidth: 180,
    paddingHorizontal: Spacing.four,
  },
  retryText: {
    color: "#211018",
    fontSize: FontSize.body,
    fontWeight: "700",
    lineHeight: 24,
  },
});
