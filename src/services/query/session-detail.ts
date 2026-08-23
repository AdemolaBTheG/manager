import { createDevDebriefPreview } from "@/data/dev-debrief-preview";
import { getScenarioDefinitionForSession } from "@/data/scenarios";
import type { DebriefRecord, PracticeSession, ReadinessValue } from "@/domain/session";
import type { ScenarioDefinition } from "@/domain/scenario";
import { sessionRepository } from "@/services/storage";

export type SessionDestination =
  | "debrief"
  | "plan"
  | "readiness"
  | "rehearsal"
  | "scenario"
  | "situation";

export type SessionAction = {
  readonly destination: SessionDestination;
  readonly label: string;
};

export type SessionSummary = {
  readonly action: SessionAction | null;
  readonly scenario: ScenarioDefinition;
  readonly session: PracticeSession;
};

export type SessionDetailData = SessionSummary & {
  readonly afterRating: ReadinessValue | null;
  readonly attempts: {
    readonly original: number;
    readonly pressureTests: number;
    readonly rewinds: number;
  };
  readonly beforeRating: ReadinessValue | null;
  readonly debrief: DebriefRecord | null;
};

export const sessionQueryKeys = {
  all: ["sessions"] as const,
  detail: (sessionId: string) => ["sessions", "detail", sessionId] as const,
  completePreview: (sessionId: string) =>
    ["sessions", "detail", sessionId, "complete-preview"] as const,
  library: ["sessions", "library"] as const,
};

export async function loadSessionLibrary(): Promise<readonly SessionSummary[]> {
  const sessions = await sessionRepository.listSessions();

  return sessions.flatMap((session) => {
    const scenario = getScenarioDefinitionForSession(session);
    return scenario
      ? [{ action: getSessionAction(session), scenario, session }]
      : [];
  });
}

export async function loadSessionDetail(
  sessionId: string,
): Promise<SessionDetailData> {
  const session = await sessionRepository.getSession(sessionId);
  if (!session?.activeBranchId) {
    throw new Error("This rehearsal session could not be found.");
  }

  const scenario = getScenarioDefinitionForSession(session);
  if (!scenario) {
    throw new Error("This saved scenario version is unavailable.");
  }

  const [activeBranch, branches, beforeRating, afterRating] = await Promise.all([
    sessionRepository.getBranch(session.activeBranchId),
    sessionRepository.listBranches(session.id),
    sessionRepository.getReadinessRating(session.id, "before"),
    sessionRepository.getReadinessRating(session.id, "after"),
  ]);
  if (!activeBranch) {
    throw new Error("This rehearsal’s active attempt is unavailable.");
  }

  const debriefs = await Promise.all(
    [activeBranch, ...branches.filter((branch) => branch.id !== activeBranch.id).reverse()].map(
      (branch) => sessionRepository.getDebrief(branch.id),
    ),
  );
  const debrief = debriefs.find((record) => record !== null) ?? null;

  if (
    session.status === "complete" &&
    (!beforeRating || !afterRating || !debrief)
  ) {
    throw new Error("This completed session is missing part of its saved review.");
  }

  return {
    action: getSessionAction(session),
    afterRating: afterRating?.rating ?? null,
    attempts: {
      original: branches.filter((branch) => branch.kind === "original").length,
      pressureTests: branches.filter((branch) => branch.kind === "pressure-test")
        .length,
      rewinds: branches.filter((branch) => branch.kind === "rewind").length,
    },
    beforeRating: beforeRating?.rating ?? null,
    debrief,
    scenario,
    session,
  };
}

export async function loadCompleteSessionDetailPreview(
  sessionId: string,
): Promise<SessionDetailData> {
  if (!__DEV__) {
    throw new Error("Session previews are only available in development.");
  }

  const savedSession = await sessionRepository.getSession(sessionId);
  if (!savedSession) {
    throw new Error("This rehearsal session could not be found.");
  }

  const scenario = getScenarioDefinitionForSession(savedSession);
  if (!scenario) {
    throw new Error("This saved scenario version is unavailable.");
  }

  const completedAt = new Date().toISOString();
  const activeBranchId =
    savedSession.activeBranchId ?? `${savedSession.id}-preview-branch`;
  const session: PracticeSession = {
    ...savedSession,
    activeBranchId,
    completedAt,
    status: "complete",
    updatedAt: completedAt,
  };
  const debrief = createDevDebriefPreview(scenario);

  return {
    action: {
      destination:
        session.privacyMode === "private" ? "situation" : "scenario",
      label: "Practice again",
    },
    afterRating: 4,
    attempts: {
      original: 1,
      pressureTests: 1,
      rewinds: 2,
    },
    beforeRating: 2,
    debrief: {
      id: `${session.id}-preview-debrief`,
      branchId: activeBranchId,
      createdAt: completedAt,
      debrief,
      modelVersion: "dev-preview",
      promptVersion: "dev-preview",
    },
    scenario,
    session,
  };
}

export function getSessionAction(session: PracticeSession): SessionAction | null {
  switch (session.status) {
    case "draft":
      return {
        destination: session.privacyMode === "private" ? "situation" : "scenario",
        label: "Start again",
      };
    case "confirmed":
    case "readiness-recorded":
      return { destination: "readiness", label: "Start practice" };
    case "rehearsing":
      return { destination: "rehearsal", label: "Continue rehearsal" };
    case "debriefing":
      return { destination: "debrief", label: "Open debrief" };
    case "debrief-ready":
      return { destination: "debrief", label: "Review debrief" };
    case "rewinding":
      return { destination: "debrief", label: "Continue rewind" };
    case "pressure-testing":
      return null;
    case "plan-ready":
      return { destination: "plan", label: "Finish session" };
    case "complete":
      return {
        destination: session.privacyMode === "private" ? "situation" : "scenario",
        label: "Practice again",
      };
  }
}

export function getSessionStatusLabel(session: PracticeSession): string {
  switch (session.status) {
    case "draft":
      return "Not started";
    case "confirmed":
    case "readiness-recorded":
      return "Ready to practice";
    case "rehearsing":
      return "In progress";
    case "debriefing":
      return "Preparing debrief";
    case "debrief-ready":
      return "Debrief ready";
    case "rewinding":
      return "Rewind in progress";
    case "pressure-testing":
      return "Pressure test in progress";
    case "plan-ready":
      return "Plan ready";
    case "complete":
      return "Complete";
  }
}
