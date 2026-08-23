import { getScenarioDefinitionForSession } from "@/data/scenarios";
import type { Debrief, DebriefMoment } from "@/domain/coaching";
import type { PracticeSession, Turn } from "@/domain/session";
import type { ScenarioDefinition } from "@/domain/scenario";
import type { SimulationState } from "@/domain/simulation-state";
import type { EvaluatorResponse } from "@/services/api/evaluator-contract";
import type { DebriefRequest } from "@/services/api/evaluator-client";
import {
  buildCounterpartLineByTurnId,
  type CounterpartLineByTurnId,
} from "@/services/query/debrief-context";
import { loadRewind } from "@/services/query/rewind-query";
import { sessionRepository } from "@/services/storage";

type GenerateDebrief = (variables: {
  readonly request: DebriefRequest;
  readonly scenario: ScenarioDefinition;
}) => Promise<EvaluatorResponse>;

export type InitialDebriefResult = {
  readonly branchId: string;
  readonly counterpartLineByTurnId: CounterpartLineByTurnId;
  readonly debrief: Debrief;
  readonly scenario: ScenarioDefinition;
  readonly session: PracticeSession;
};

export async function loadOrCreateInitialDebrief({
  generateDebrief,
  sessionId,
}: {
  readonly generateDebrief: GenerateDebrief;
  readonly sessionId: string;
}): Promise<InitialDebriefResult> {
  const session = await sessionRepository.getSession(sessionId);
  if (!session?.activeBranchId) {
    throw new Error("This rehearsal session could not be found.");
  }

  const scenario = getScenarioDefinitionForSession(session);
  if (!scenario) {
    throw new Error("This saved scenario version is unavailable.");
  }

  const [branch, branchState, transcript, savedDebrief] = await Promise.all([
    sessionRepository.getBranch(session.activeBranchId),
    sessionRepository.getBranchSimulationState(session.activeBranchId),
    sessionRepository.listTranscript(session.activeBranchId),
    sessionRepository.getDebrief(session.activeBranchId),
  ]);

  if (branch?.kind !== "original") {
    throw new Error("The original rehearsal branch is unavailable.");
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

  const readySession = await sessionRepository.getSession(session.id);
  if (!readySession) {
    throw new Error("This rehearsal session could not be restored.");
  }

  return {
    branchId: branch.id,
    counterpartLineByTurnId: buildCounterpartLineByTurnId(
      debrief,
      transcript,
      scenario.openingLine,
    ),
    debrief,
    scenario,
    session: readySession,
  };
}

export async function createAndLoadRewind({
  branchId,
  moment,
  sessionId,
}: {
  readonly branchId: string;
  readonly moment: DebriefMoment;
  readonly sessionId: string;
}) {
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

  const rewind = await loadRewind(sessionId, moment.id);
  if (rewind.status !== "ready") {
    throw new Error("The selected rewind could not be restored.");
  }

  return {
    momentId: moment.id,
    scenario: rewind.scenario,
    scenarioDefinition: rewind.scenarioDefinition,
    session: rewind.session,
  } as const;
}

export async function prepareSessionPlan(sessionId: string) {
  const session = await sessionRepository.getSession(sessionId);
  if (!session?.activeBranchId) {
    throw new Error("This rehearsal session could not be found.");
  }
  if (session.status === "plan-ready" || session.status === "complete") {
    return session;
  }
  if (session.status !== "debrief-ready") {
    throw new Error("This session is not ready for its final plan.");
  }

  const [branchState, debrief] = await Promise.all([
    sessionRepository.getBranchSimulationState(session.activeBranchId),
    sessionRepository.getDebrief(session.activeBranchId),
  ]);
  if (branchState?.state.phase !== "closed" || !debrief) {
    throw new Error("Finish the debrief before building your plan.");
  }

  return sessionRepository.transitionSession(session.id, "plan-ready");
}

export async function getOrCreateDebrief({
  branchId,
  finalState,
  generateDebrief,
  savedDebrief,
  scenario,
  transcript,
}: {
  readonly branchId: string;
  readonly finalState: SimulationState;
  readonly generateDebrief: GenerateDebrief;
  readonly savedDebrief: Debrief | null;
  readonly scenario: ScenarioDefinition;
  readonly transcript: readonly Turn[];
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
