import { SQLiteSessionRepository } from './sqlite-session-repository';

import type { SessionRepository } from './session-repository';

export { SessionRepositoryError } from './session-repository';
export type {
  AppendManagerTurnInput,
  AppendManagerTurnResult,
  AppendCounterpartTurnInput,
  AppendTurnInput,
  CompleteSessionInput,
  CreatePressureTestBranchInput,
  CreateRewindBranchInput,
  CreateRewindBranchResult,
  CreateSessionInput,
  SaveDebriefInput,
  SaveReadinessRatingInput,
  SessionRepository,
  SessionRepositoryErrorCode,
} from './session-repository';

export const sessionRepository: SessionRepository = new SQLiteSessionRepository();
