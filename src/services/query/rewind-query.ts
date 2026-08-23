import {
  getScenarioBriefForSession,
  getScenarioDefinitionForSession,
} from "@/data/scenarios";
import { sessionRepository } from "@/services/storage";

export function rewindQueryKey(sessionId: string, momentId: string) {
  return ["rehearsal", "rewind", sessionId, momentId] as const;
}

export async function loadRewind(sessionId: string, momentId: string) {
  const session = await sessionRepository.getSession(sessionId);
  if (!session?.activeBranchId) {
    throw new Error("This rehearsal session could not be found.");
  }

  const branch = await sessionRepository.getBranch(session.activeBranchId);
  if (branch?.kind !== "rewind") {
    throw new Error("The active rehearsal branch is not a rewind.");
  }

  const parentDebrief = await sessionRepository.getDebrief(
    branch.parentBranchId,
  );
  const selectedMoment = parentDebrief?.debrief.moments.find(
    (moment) => moment.id === momentId,
  );
  if (
    !selectedMoment?.rewindable ||
    selectedMoment.turnId !== branch.forkTurnId
  ) {
    throw new Error("The selected debrief moment does not match this rewind.");
  }

  const branchState = await sessionRepository.getBranchSimulationState(
    branch.id,
  );
  if (session.status === "plan-ready" || session.status === "complete") {
    return { status: "plan" as const };
  }
  if (
    (session.status === "debriefing" || session.status === "debrief-ready") &&
    branchState?.state.phase === "closed"
  ) {
    return { status: "complete" as const };
  }
  if (session.status !== "rewinding" || branchState?.state.phase === "closed") {
    throw new Error("This session is not currently at a rewind point.");
  }

  const scenario = getScenarioBriefForSession(session);
  const scenarioDefinition = getScenarioDefinitionForSession(session);
  if (
    !scenario ||
    !scenarioDefinition ||
    scenario.version !== session.scenarioVersion
  ) {
    throw new Error("The saved scenario version is unavailable.");
  }

  return { scenario, scenarioDefinition, session, status: "ready" as const };
}
