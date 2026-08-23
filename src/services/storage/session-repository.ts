import type { Debrief } from '@/domain/coaching';
import type { ScenarioDefinition } from '@/domain/scenario';
import type {
  Branch,
  BranchSimulationState,
  DebriefRecord,
  PracticeSession,
  PrivacyMode,
  ReadinessRating,
  ReadinessStage,
  ReadinessValue,
  SessionStatus,
  StateSnapshot,
  Turn,
} from '@/domain/session';
import type { SimulationState } from '@/domain/simulation-state';

export type CreateSessionInput = {
  scenarioId: string;
  scenarioVersion: number;
  scenarioDefinition?: ScenarioDefinition | null;
  initialState: SimulationState;
  privacyMode?: PrivacyMode;
  reactionProfile?: string;
  resistanceMoveOrder?: readonly string[];
};

export type AppendTurnInput = {
  branchId: string;
  text: string;
  audioPath?: string | null;
};

export type AppendManagerTurnInput = AppendTurnInput;

export type AppendCounterpartTurnInput = AppendTurnInput & {
  nextState: SimulationState;
  modelVersion: string;
  promptVersion: string;
};

export type EndRehearsalInput = {
  branchId: string;
};

export type EndRehearsalResult = {
  session: PracticeSession;
  state: BranchSimulationState;
};

export type AppendManagerTurnResult = {
  turn: Turn;
  snapshot: StateSnapshot;
};

export type CreateRewindBranchInput = {
  parentBranchId: string;
  forkTurnId: string;
  reactionProfile?: string;
  resistanceMoveOrder?: readonly string[];
};

export type CreateRewindBranchResult = {
  branch: Extract<Branch, { kind: 'rewind' }>;
  snapshot: StateSnapshot;
};

export type CreatePressureTestBranchInput = {
  parentBranchId: string;
  reactionProfile: string;
  initialState: SimulationState;
  resistanceMoveOrder?: readonly string[];
};

export type SaveReadinessRatingInput = {
  sessionId: string;
  stage: ReadinessStage;
  rating: ReadinessValue;
};

export type SaveDebriefInput = {
  branchId: string;
  debrief: Debrief;
  modelVersion: string;
  promptVersion: string;
};

export type CompleteSessionInput = {
  sessionId: string;
  afterReadiness: ReadinessValue;
};

export type SessionRepositoryErrorCode =
  | 'invalid-input'
  | 'invalid-transition'
  | 'not-found'
  | 'invalid-rewind'
  | 'invariant-violation';

export class SessionRepositoryError extends Error {
  readonly code: SessionRepositoryErrorCode;

  constructor(code: SessionRepositoryErrorCode, message: string) {
    super(message);
    this.name = 'SessionRepositoryError';
    this.code = code;
  }
}

export interface SessionRepository {
  createSession(input: CreateSessionInput): Promise<PracticeSession>;
  getSession(sessionId: string): Promise<PracticeSession | null>;
  listSessions(): Promise<readonly PracticeSession[]>;
  deleteSession(sessionId: string): Promise<void>;
  transitionSession(sessionId: string, status: SessionStatus): Promise<PracticeSession>;

  getBranch(branchId: string): Promise<Branch | null>;
  getBranchSimulationState(branchId: string): Promise<BranchSimulationState | null>;
  listBranches(sessionId: string): Promise<readonly Branch[]>;
  appendManagerTurn(input: AppendManagerTurnInput): Promise<AppendManagerTurnResult>;
  appendCounterpartTurn(input: AppendCounterpartTurnInput): Promise<Turn>;
  endRehearsal(input: EndRehearsalInput): Promise<EndRehearsalResult>;
  listTranscript(branchId: string): Promise<readonly Turn[]>;
  createRewindBranch(input: CreateRewindBranchInput): Promise<CreateRewindBranchResult>;
  createPressureTestBranch(
    input: CreatePressureTestBranchInput,
  ): Promise<Extract<Branch, { kind: 'pressure-test' }>>;
  getSnapshotBeforeTurn(turnId: string): Promise<StateSnapshot | null>;

  saveReadinessRating(input: SaveReadinessRatingInput): Promise<ReadinessRating>;
  getReadinessRating(
    sessionId: string,
    stage: ReadinessStage,
  ): Promise<ReadinessRating | null>;
  completeSession(input: CompleteSessionInput): Promise<PracticeSession>;

  saveDebrief(input: SaveDebriefInput): Promise<DebriefRecord>;
  getDebrief(branchId: string): Promise<DebriefRecord | null>;
}
