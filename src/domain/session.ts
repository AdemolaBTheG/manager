import type { Debrief } from './coaching';
import type { ScenarioDefinition } from './scenario';
import type { SimulationState } from './simulation-state';

export type Timestamp = string;

export type SessionStatus =
  | 'draft'
  | 'confirmed'
  | 'readiness-recorded'
  | 'rehearsing'
  | 'debriefing'
  | 'debrief-ready'
  | 'rewinding'
  | 'pressure-testing'
  | 'plan-ready'
  | 'complete';

export type PrivacyMode = 'standard' | 'private';
export type BranchKind = 'original' | 'rewind' | 'pressure-test';
export type TurnSpeaker = 'manager' | 'counterpart';
export type ReadinessStage = 'before' | 'after';
export type ReadinessValue = 1 | 2 | 3 | 4 | 5;

export type PracticeSession = {
  readonly id: string;
  readonly scenarioId: string;
  readonly scenarioVersion: number;
  readonly scenarioDefinition: ScenarioDefinition | null;
  readonly privacyMode: PrivacyMode;
  readonly status: SessionStatus;
  readonly activeBranchId: string | null;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly completedAt: Timestamp | null;
};

type BranchBase = {
  readonly id: string;
  readonly sessionId: string;
  readonly reactionProfile: string;
  readonly resistanceMoveOrder: readonly string[];
  readonly createdAt: Timestamp;
};

export type OriginalBranch = BranchBase & {
  readonly kind: 'original';
  readonly parentBranchId: null;
  readonly forkTurnId: null;
};

export type RewindBranch = BranchBase & {
  readonly kind: 'rewind';
  readonly parentBranchId: string;
  readonly forkTurnId: string;
};

export type PressureTestBranch = BranchBase & {
  readonly kind: 'pressure-test';
  readonly parentBranchId: string;
  readonly forkTurnId: null;
};

export type Branch = OriginalBranch | RewindBranch | PressureTestBranch;

export type Turn = {
  readonly id: string;
  readonly branchId: string;
  readonly sequence: number;
  readonly speaker: TurnSpeaker;
  readonly text: string;
  readonly audioPath: string | null;
  readonly modelVersion: string | null;
  readonly promptVersion: string | null;
  readonly createdAt: Timestamp;
};

export type BranchSimulationState = {
  readonly branchId: string;
  readonly state: SimulationState;
  readonly updatedAt: Timestamp;
};

export type StateSnapshot = {
  readonly id: string;
  readonly branchId: string;
  readonly beforeTurnId: string;
  readonly state: SimulationState;
  readonly createdAt: Timestamp;
};

export type ReadinessRating = {
  readonly id: string;
  readonly sessionId: string;
  readonly stage: ReadinessStage;
  readonly rating: ReadinessValue;
  readonly createdAt: Timestamp;
};

export type DebriefRecord = {
  readonly id: string;
  readonly branchId: string;
  readonly debrief: Debrief;
  readonly modelVersion: string;
  readonly promptVersion: string;
  readonly createdAt: Timestamp;
};
