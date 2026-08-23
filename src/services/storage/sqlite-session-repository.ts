import { and, asc, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';

import type {
  Branch,
  BranchSimulationState,
  DebriefRecord,
  PracticeSession,
  ReadinessRating,
  ReadinessStage,
  ReadinessValue,
  SessionStatus,
  StateSnapshot,
  Turn,
} from '@/domain/session';
import { initializeDatabase } from '@/db/migrations';
import {
  branches,
  branchSimulationStates,
  debriefs,
  practiceSessions,
  readinessRatings,
  stateSnapshots,
  turns,
  type BranchRow,
  type BranchSimulationStateRow,
  type DebriefRow,
  type PracticeSessionRow,
  type ReadinessRatingRow,
  type StateSnapshotRow,
  type TurnRow,
} from '@/db/schema';

import type {
  AppendCounterpartTurnInput,
  AppendManagerTurnInput,
  AppendManagerTurnResult,
  CompleteSessionInput,
  CreatePressureTestBranchInput,
  CreateRewindBranchInput,
  CreateRewindBranchResult,
  CreateSessionInput,
  EndRehearsalInput,
  EndRehearsalResult,
  SaveDebriefInput,
  SaveReadinessRatingInput,
  SessionRepository,
} from './session-repository';
import { SessionRepositoryError } from './session-repository';

const DEFAULT_REACTION_PROFILE = 'default';
const writableSessionStatuses: readonly SessionStatus[] = [
  'rehearsing',
  'rewinding',
  'pressure-testing',
];

const legalTransitions: Record<SessionStatus, readonly SessionStatus[]> = {
  draft: ['confirmed'],
  confirmed: ['readiness-recorded'],
  'readiness-recorded': ['rehearsing'],
  rehearsing: ['debriefing'],
  debriefing: ['debrief-ready'],
  'debrief-ready': ['rewinding', 'pressure-testing', 'plan-ready'],
  rewinding: ['rehearsing', 'debriefing', 'plan-ready'],
  'pressure-testing': ['rehearsing', 'debriefing', 'plan-ready'],
  'plan-ready': ['complete'],
  complete: [],
};

type SQLiteSessionRepositoryOptions = {
  generateId?: () => string;
  now?: () => string;
};

export class SQLiteSessionRepository implements SessionRepository {
  private readonly generateId: () => string;
  private readonly now: () => string;

  constructor(options: SQLiteSessionRepositoryOptions = {}) {
    this.generateId = options.generateId ?? randomUUID;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async createSession(input: CreateSessionInput): Promise<PracticeSession> {
    const database = await initializeDatabase();
    const scenarioId = requireNonEmpty(input.scenarioId, 'scenarioId');

    if (!Number.isInteger(input.scenarioVersion) || input.scenarioVersion < 1) {
      throw new SessionRepositoryError(
        'invalid-input',
        'scenarioVersion must be a positive integer.',
      );
    }

    const privacyMode = input.privacyMode ?? 'standard';
    if (privacyMode !== 'standard' && privacyMode !== 'private') {
      throw new SessionRepositoryError('invalid-input', 'privacyMode is invalid.');
    }

    const scenarioDefinition = input.scenarioDefinition
      ? cloneJson(input.scenarioDefinition)
      : null;
    if (
      scenarioDefinition &&
      (scenarioDefinition.id !== scenarioId ||
        scenarioDefinition.version !== input.scenarioVersion)
    ) {
      throw new SessionRepositoryError(
        'invalid-input',
        'scenarioDefinition must match the session scenario reference.',
      );
    }
    if (scenarioDefinition && privacyMode !== 'private') {
      throw new SessionRepositoryError(
        'invalid-input',
        'Embedded scenarios must use private session mode.',
      );
    }

    const reactionProfile = requireNonEmpty(
      input.reactionProfile ?? DEFAULT_REACTION_PROFILE,
      'reactionProfile',
    );
    const resistanceMoveOrder = cloneStringArray(input.resistanceMoveOrder ?? []);
    const sessionId = this.generateId();
    const branchId = this.generateId();
    const timestamp = this.now();
    const initialState = cloneJson(input.initialState);

    database.transaction((transaction) => {
      transaction
        .insert(practiceSessions)
        .values({
          id: sessionId,
          scenarioId,
          scenarioVersion: input.scenarioVersion,
          scenarioDefinition,
          privacyMode,
          status: 'draft',
          activeBranchId: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          completedAt: null,
        })
        .run();

      transaction
        .insert(branches)
        .values({
          id: branchId,
          sessionId,
          kind: 'original',
          parentBranchId: null,
          forkTurnId: null,
          reactionProfile,
          resistanceMoveOrder,
          createdAt: timestamp,
        })
        .run();

      transaction
        .insert(branchSimulationStates)
        .values({
          branchId,
          state: initialState,
          updatedAt: timestamp,
        })
        .run();

      transaction
        .update(practiceSessions)
        .set({ activeBranchId: branchId })
        .where(eq(practiceSessions.id, sessionId))
        .run();
    });

    return {
      id: sessionId,
      scenarioId,
      scenarioVersion: input.scenarioVersion,
      scenarioDefinition,
      privacyMode,
      status: 'draft',
      activeBranchId: branchId,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    };
  }

  async getSession(sessionId: string): Promise<PracticeSession | null> {
    const database = await initializeDatabase();
    const row = database
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.id, sessionId))
      .get();

    return row ? mapSession(row) : null;
  }

  async listSessions(): Promise<readonly PracticeSession[]> {
    const database = await initializeDatabase();

    return database
      .select()
      .from(practiceSessions)
      .orderBy(desc(practiceSessions.updatedAt), desc(practiceSessions.createdAt))
      .all()
      .map(mapSession);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const database = await initializeDatabase();
    requireSessionRow(database, sessionId);
    const sessionBranches = database
      .select()
      .from(branches)
      .where(eq(branches.sessionId, sessionId))
      .all();
    const branchById = new Map(sessionBranches.map((branch) => [branch.id, branch]));
    const childrenByParentId = new Map<string, BranchRow[]>();

    for (const branch of sessionBranches) {
      if (!branch.parentBranchId) {
        continue;
      }

      const children = childrenByParentId.get(branch.parentBranchId) ?? [];
      children.push(branch);
      childrenByParentId.set(branch.parentBranchId, children);
    }

    const deletionOrder: BranchRow[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const visit = (branch: BranchRow) => {
      if (visited.has(branch.id)) {
        return;
      }
      if (visiting.has(branch.id)) {
        throw new SessionRepositoryError(
          'invariant-violation',
          `Session ${sessionId} contains a branch cycle.`,
        );
      }

      visiting.add(branch.id);
      for (const child of childrenByParentId.get(branch.id) ?? []) {
        visit(child);
      }
      visiting.delete(branch.id);
      visited.add(branch.id);
      deletionOrder.push(branch);
    };

    for (const branch of sessionBranches) {
      if (branch.parentBranchId && !branchById.has(branch.parentBranchId)) {
        throw new SessionRepositoryError(
          'invariant-violation',
          `Branch ${branch.id} points outside session ${sessionId}.`,
        );
      }
      visit(branch);
    }

    database.transaction((transaction) => {
      transaction
        .update(practiceSessions)
        .set({ activeBranchId: null })
        .where(eq(practiceSessions.id, sessionId))
        .run();

      for (const branch of deletionOrder) {
        transaction.delete(branches).where(eq(branches.id, branch.id)).run();
      }

      const deletedSession = transaction
        .delete(practiceSessions)
        .where(eq(practiceSessions.id, sessionId))
        .run();
      if (deletedSession.changes !== 1) {
        throw new SessionRepositoryError(
          'not-found',
          `Session ${sessionId} was not found.`,
        );
      }
    });
  }

  async transitionSession(sessionId: string, status: SessionStatus): Promise<PracticeSession> {
    const database = await initializeDatabase();
    const row = requireSessionRow(database, sessionId);

    if (row.status === status) {
      return mapSession(row);
    }

    if (!legalTransitions[row.status].includes(status)) {
      throw new SessionRepositoryError(
        'invalid-transition',
        `Cannot transition session ${sessionId} from ${row.status} to ${status}.`,
      );
    }

    const timestamp = this.now();
    const completedAt = status === 'complete' ? timestamp : row.completedAt;

    database
      .update(practiceSessions)
      .set({ status, updatedAt: timestamp, completedAt })
      .where(and(eq(practiceSessions.id, sessionId), eq(practiceSessions.status, row.status)))
      .run();

    return mapSession({
      ...row,
      status,
      updatedAt: timestamp,
      completedAt,
    });
  }

  async getBranch(branchId: string): Promise<Branch | null> {
    const database = await initializeDatabase();
    const row = findBranchRow(database, branchId);
    return row ? mapBranch(row) : null;
  }

  async getBranchSimulationState(
    branchId: string,
  ): Promise<BranchSimulationState | null> {
    const database = await initializeDatabase();
    requireBranchRow(database, branchId);
    const row = database
      .select()
      .from(branchSimulationStates)
      .where(eq(branchSimulationStates.branchId, branchId))
      .get();

    return row ? mapBranchSimulationState(row) : null;
  }

  async listBranches(sessionId: string): Promise<readonly Branch[]> {
    const database = await initializeDatabase();
    requireSessionRow(database, sessionId);

    return database
      .select()
      .from(branches)
      .where(eq(branches.sessionId, sessionId))
      .orderBy(asc(branches.createdAt))
      .all()
      .map(mapBranch);
  }

  async appendManagerTurn(input: AppendManagerTurnInput): Promise<AppendManagerTurnResult> {
    const database = await initializeDatabase();
    const branch = requireBranchRow(database, input.branchId);
    const session = requireActiveBranch(database, branch);
    requireWritableSession(session);

    const branchState = requireBranchSimulationStateRow(database, branch.id);

    const transcript = resolveTranscriptRows(database, branch.id);
    if (transcript.at(-1)?.speaker === 'manager') {
      throw new SessionRepositoryError(
        'invariant-violation',
        'A manager turn is already waiting for a counterpart response.',
      );
    }
    const turnId = this.generateId();
    const snapshotId = this.generateId();
    const timestamp = this.now();
    const turnRow: TurnRow = {
      id: turnId,
      branchId: branch.id,
      sequence: transcript.length + 1,
      speaker: 'manager',
      text: requireNonEmpty(input.text, 'text'),
      audioPath: input.audioPath ?? null,
      modelVersion: null,
      promptVersion: null,
      createdAt: timestamp,
    };
    const snapshotRow: StateSnapshotRow = {
      id: snapshotId,
      branchId: branch.id,
      beforeTurnId: turnId,
      state: cloneJson(branchState.state),
      createdAt: timestamp,
    };

    database.transaction((transaction) => {
      transaction.insert(turns).values(turnRow).run();
      transaction.insert(stateSnapshots).values(snapshotRow).run();
      transaction
        .update(practiceSessions)
        .set({ updatedAt: timestamp })
        .where(eq(practiceSessions.id, branch.sessionId))
        .run();
    });

    return {
      turn: mapTurn(turnRow),
      snapshot: mapSnapshot(snapshotRow),
    };
  }

  async appendCounterpartTurn(input: AppendCounterpartTurnInput): Promise<Turn> {
    const database = await initializeDatabase();
    const branch = requireBranchRow(database, input.branchId);
    const session = requireActiveBranch(database, branch);
    requireWritableSession(session);

    const transcript = resolveTranscriptRows(database, branch.id);
    if (transcript.at(-1)?.speaker !== 'manager') {
      throw new SessionRepositoryError(
        'invariant-violation',
        'A counterpart response must follow a saved manager turn.',
      );
    }

    requireBranchSimulationStateRow(database, branch.id);
    const timestamp = this.now();
    const nextState = cloneJson(input.nextState);
    const modelVersion = requireNonEmpty(input.modelVersion, 'modelVersion');
    const promptVersion = requireNonEmpty(input.promptVersion, 'promptVersion');
    const closesConversation = nextState.phase === 'closed';

    if (
      closesConversation &&
      !legalTransitions[session.status].includes('debriefing') &&
      session.status !== 'debriefing'
    ) {
      throw new SessionRepositoryError(
        'invalid-transition',
        `Cannot complete a rehearsal while session ${session.id} is ${session.status}.`,
      );
    }

    const row: TurnRow = {
      id: this.generateId(),
      branchId: branch.id,
      sequence: transcript.length + 1,
      speaker: 'counterpart',
      text: requireNonEmpty(input.text, 'text'),
      audioPath: input.audioPath ?? null,
      modelVersion,
      promptVersion,
      createdAt: timestamp,
    };

    database.transaction((transaction) => {
      transaction.insert(turns).values(row).run();
      transaction
        .update(branchSimulationStates)
        .set({ state: nextState, updatedAt: timestamp })
        .where(eq(branchSimulationStates.branchId, branch.id))
        .run();
      transaction
        .update(practiceSessions)
        .set({
          updatedAt: timestamp,
          status: closesConversation ? 'debriefing' : session.status,
        })
        .where(eq(practiceSessions.id, branch.sessionId))
        .run();
    });

    return mapTurn(row);
  }

  async endRehearsal(
    input: EndRehearsalInput,
  ): Promise<EndRehearsalResult> {
    const database = await initializeDatabase();
    const branch = requireBranchRow(database, input.branchId);
    const session = requireActiveBranch(database, branch);
    const branchState = requireBranchSimulationStateRow(database, branch.id);

    if (
      branchState.state.phase === 'closed' &&
      session.status === 'debriefing'
    ) {
      return {
        session: mapSession(session),
        state: mapBranchSimulationState(branchState),
      };
    }

    requireWritableSession(session);

    if (!legalTransitions[session.status].includes('debriefing')) {
      throw new SessionRepositoryError(
        'invalid-transition',
        `Cannot end a rehearsal while session ${session.id} is ${session.status}.`,
      );
    }

    const transcript = resolveTranscriptRows(database, branch.id);
    if (transcript.at(-1)?.speaker !== 'counterpart') {
      throw new SessionRepositoryError(
        'invariant-violation',
        'Finish the current exchange before ending practice.',
      );
    }

    const localTurns = database
      .select()
      .from(turns)
      .where(eq(turns.branchId, branch.id))
      .orderBy(asc(turns.sequence))
      .all();
    if (!localTurns.some((turn) => turn.speaker === 'counterpart')) {
      throw new SessionRepositoryError(
        'invalid-transition',
        'Complete at least one exchange before ending practice.',
      );
    }

    const timestamp = this.now();
    const nextState = cloneJson({
      ...branchState.state,
      phase: 'closed' as const,
      resolution:
        branchState.state.resolution === 'none'
          ? ('unresolved' as const)
          : branchState.state.resolution,
    });
    const nextSessionRow: PracticeSessionRow = {
      ...session,
      status: 'debriefing',
      updatedAt: timestamp,
    };
    const nextStateRow: BranchSimulationStateRow = {
      ...branchState,
      state: nextState,
      updatedAt: timestamp,
    };

    database.transaction((transaction) => {
      transaction
        .update(branchSimulationStates)
        .set({ state: nextState, updatedAt: timestamp })
        .where(eq(branchSimulationStates.branchId, branch.id))
        .run();
      transaction
        .update(practiceSessions)
        .set({ status: 'debriefing', updatedAt: timestamp })
        .where(
          and(
            eq(practiceSessions.id, session.id),
            eq(practiceSessions.status, session.status),
          ),
        )
        .run();
    });

    return {
      session: mapSession(nextSessionRow),
      state: mapBranchSimulationState(nextStateRow),
    };
  }

  async listTranscript(branchId: string): Promise<readonly Turn[]> {
    const database = await initializeDatabase();
    return resolveTranscriptRows(database, branchId).map(mapTurn);
  }

  async createRewindBranch(
    input: CreateRewindBranchInput,
  ): Promise<CreateRewindBranchResult> {
    const database = await initializeDatabase();
    const parent = requireBranchRow(database, input.parentBranchId);
    const session = requireSessionRow(database, parent.sessionId);

    if (session.status !== 'debrief-ready') {
      throw new SessionRepositoryError(
        'invalid-transition',
        `Cannot begin a rewind while session ${session.id} is ${session.status}.`,
      );
    }

    const transcript = resolveTranscriptRows(database, parent.id);
    const forkTurn = transcript.find((turn) => turn.id === input.forkTurnId);

    if (!forkTurn || forkTurn.speaker !== 'manager') {
      throw new SessionRepositoryError(
        'invalid-rewind',
        'A rewind must fork from a manager turn in the parent transcript.',
      );
    }

    const snapshotRow = database
      .select()
      .from(stateSnapshots)
      .where(eq(stateSnapshots.beforeTurnId, forkTurn.id))
      .get();

    if (!snapshotRow || snapshotRow.branchId !== forkTurn.branchId) {
      throw new SessionRepositoryError(
        'invalid-rewind',
        'The selected manager turn does not have a matching pre-turn snapshot.',
      );
    }

    const timestamp = this.now();
    const branchRow: BranchRow = {
      id: this.generateId(),
      sessionId: parent.sessionId,
      kind: 'rewind',
      parentBranchId: parent.id,
      forkTurnId: forkTurn.id,
      reactionProfile: requireNonEmpty(
        input.reactionProfile ?? parent.reactionProfile,
        'reactionProfile',
      ),
      resistanceMoveOrder: cloneStringArray(
        input.resistanceMoveOrder ?? parent.resistanceMoveOrder,
      ),
      createdAt: timestamp,
    };
    const branchStateRow: BranchSimulationStateRow = {
      branchId: branchRow.id,
      state: cloneJson(snapshotRow.state),
      updatedAt: timestamp,
    };

    database.transaction((transaction) => {
      transaction.insert(branches).values(branchRow).run();
      transaction.insert(branchSimulationStates).values(branchStateRow).run();
      const sessionUpdate = transaction
        .update(practiceSessions)
        .set({
          activeBranchId: branchRow.id,
          status: 'rewinding',
          updatedAt: timestamp,
        })
        .where(
          and(
            eq(practiceSessions.id, parent.sessionId),
            eq(practiceSessions.status, 'debrief-ready'),
          ),
        )
        .run();

      if (sessionUpdate.changes !== 1) {
        throw new SessionRepositoryError(
          'invalid-transition',
          `Session ${session.id} changed before the rewind could begin.`,
        );
      }
    });

    const branch = mapBranch(branchRow);
    if (branch.kind !== 'rewind') {
      throw new SessionRepositoryError('invariant-violation', 'Rewind branch mapping failed.');
    }

    return { branch, snapshot: mapSnapshot(snapshotRow) };
  }

  async createPressureTestBranch(
    input: CreatePressureTestBranchInput,
  ): Promise<Extract<Branch, { kind: 'pressure-test' }>> {
    const database = await initializeDatabase();
    const parent = requireBranchRow(database, input.parentBranchId);
    const timestamp = this.now();
    const branchRow: BranchRow = {
      id: this.generateId(),
      sessionId: parent.sessionId,
      kind: 'pressure-test',
      parentBranchId: parent.id,
      forkTurnId: null,
      reactionProfile: requireNonEmpty(input.reactionProfile, 'reactionProfile'),
      resistanceMoveOrder: cloneStringArray(
        input.resistanceMoveOrder ?? parent.resistanceMoveOrder,
      ),
      createdAt: timestamp,
    };
    const branchStateRow: BranchSimulationStateRow = {
      branchId: branchRow.id,
      state: cloneJson(input.initialState),
      updatedAt: timestamp,
    };

    database.transaction((transaction) => {
      transaction.insert(branches).values(branchRow).run();
      transaction.insert(branchSimulationStates).values(branchStateRow).run();
      transaction
        .update(practiceSessions)
        .set({ activeBranchId: branchRow.id, updatedAt: timestamp })
        .where(eq(practiceSessions.id, parent.sessionId))
        .run();
    });

    const branch = mapBranch(branchRow);
    if (branch.kind !== 'pressure-test') {
      throw new SessionRepositoryError(
        'invariant-violation',
        'Pressure-test branch mapping failed.',
      );
    }

    return branch;
  }

  async getSnapshotBeforeTurn(turnId: string): Promise<StateSnapshot | null> {
    const database = await initializeDatabase();
    const row = database
      .select()
      .from(stateSnapshots)
      .where(eq(stateSnapshots.beforeTurnId, turnId))
      .get();

    return row ? mapSnapshot(row) : null;
  }

  async saveReadinessRating(input: SaveReadinessRatingInput): Promise<ReadinessRating> {
    const database = await initializeDatabase();
    const session = requireSessionRow(database, input.sessionId);
    assertReadinessStage(input.stage);
    assertReadinessValue(input.rating);

    if (
      input.stage === 'after' &&
      session.status !== 'plan-ready' &&
      session.status !== 'complete'
    ) {
      throw new SessionRepositoryError(
        'invalid-transition',
        `Cannot save post-rehearsal readiness while session ${session.id} is ${session.status}.`,
      );
    }

    const existing = database
      .select()
      .from(readinessRatings)
      .where(
        and(
          eq(readinessRatings.sessionId, input.sessionId),
          eq(readinessRatings.stage, input.stage),
        ),
      )
      .get();
    const timestamp = this.now();
    const row: ReadinessRatingRow = {
      id: existing?.id ?? this.generateId(),
      sessionId: input.sessionId,
      stage: input.stage,
      rating: input.rating,
      createdAt: timestamp,
    };

    database.transaction((transaction) => {
      transaction
        .insert(readinessRatings)
        .values(row)
        .onConflictDoUpdate({
          target: [readinessRatings.sessionId, readinessRatings.stage],
          set: { rating: row.rating, createdAt: row.createdAt },
        })
        .run();
      transaction
        .update(practiceSessions)
        .set({ updatedAt: timestamp })
        .where(eq(practiceSessions.id, input.sessionId))
        .run();
    });

    return mapReadiness(row);
  }

  async getReadinessRating(
    sessionId: string,
    stage: ReadinessStage,
  ): Promise<ReadinessRating | null> {
    const database = await initializeDatabase();
    assertReadinessStage(stage);

    const row = database
      .select()
      .from(readinessRatings)
      .where(and(eq(readinessRatings.sessionId, sessionId), eq(readinessRatings.stage, stage)))
      .get();

    return row ? mapReadiness(row) : null;
  }

  async completeSession(input: CompleteSessionInput): Promise<PracticeSession> {
    const database = await initializeDatabase();
    const session = requireSessionRow(database, input.sessionId);
    assertReadinessValue(input.afterReadiness);

    if (session.status === 'complete') {
      const existingRating = database
        .select()
        .from(readinessRatings)
        .where(
          and(
            eq(readinessRatings.sessionId, session.id),
            eq(readinessRatings.stage, 'after'),
          ),
        )
        .get();
      if (!existingRating) {
        throw new SessionRepositoryError(
          'invariant-violation',
          `Completed session ${session.id} does not have a post-rehearsal readiness rating.`,
        );
      }
      return mapSession(session);
    }

    if (session.status !== 'plan-ready') {
      throw new SessionRepositoryError(
        'invalid-transition',
        `Cannot complete session ${session.id} while it is ${session.status}.`,
      );
    }

    const existingRating = database
      .select()
      .from(readinessRatings)
      .where(
        and(
          eq(readinessRatings.sessionId, session.id),
          eq(readinessRatings.stage, 'after'),
        ),
      )
      .get();
    const timestamp = this.now();
    const ratingRow: ReadinessRatingRow = {
      id: existingRating?.id ?? this.generateId(),
      sessionId: session.id,
      stage: 'after',
      rating: input.afterReadiness,
      createdAt: timestamp,
    };

    database.transaction((transaction) => {
      transaction
        .insert(readinessRatings)
        .values(ratingRow)
        .onConflictDoUpdate({
          target: [readinessRatings.sessionId, readinessRatings.stage],
          set: { rating: ratingRow.rating, createdAt: ratingRow.createdAt },
        })
        .run();
      const sessionUpdate = transaction
        .update(practiceSessions)
        .set({
          status: 'complete',
          updatedAt: timestamp,
          completedAt: timestamp,
        })
        .where(
          and(
            eq(practiceSessions.id, session.id),
            eq(practiceSessions.status, 'plan-ready'),
          ),
        )
        .run();

      if (sessionUpdate.changes !== 1) {
        throw new SessionRepositoryError(
          'invalid-transition',
          `Session ${session.id} changed before it could be completed.`,
        );
      }
    });

    return mapSession({
      ...session,
      status: 'complete',
      updatedAt: timestamp,
      completedAt: timestamp,
    });
  }

  async saveDebrief(input: SaveDebriefInput): Promise<DebriefRecord> {
    const database = await initializeDatabase();
    const branch = requireBranchRow(database, input.branchId);
    const existing = database
      .select()
      .from(debriefs)
      .where(eq(debriefs.branchId, branch.id))
      .get();
    const timestamp = this.now();
    const row: DebriefRow = {
      id: existing?.id ?? this.generateId(),
      branchId: branch.id,
      debrief: cloneJson(input.debrief),
      modelVersion: requireNonEmpty(input.modelVersion, 'modelVersion'),
      promptVersion: requireNonEmpty(input.promptVersion, 'promptVersion'),
      createdAt: timestamp,
    };

    database.transaction((transaction) => {
      transaction
        .insert(debriefs)
        .values(row)
        .onConflictDoUpdate({
          target: debriefs.branchId,
          set: {
            debrief: row.debrief,
            modelVersion: row.modelVersion,
            promptVersion: row.promptVersion,
            createdAt: row.createdAt,
          },
        })
        .run();
      transaction
        .update(practiceSessions)
        .set({ updatedAt: timestamp })
        .where(eq(practiceSessions.id, branch.sessionId))
        .run();
    });

    return mapDebrief(row);
  }

  async getDebrief(branchId: string): Promise<DebriefRecord | null> {
    const database = await initializeDatabase();
    const row = database.select().from(debriefs).where(eq(debriefs.branchId, branchId)).get();
    return row ? mapDebrief(row) : null;
  }
}

function requireSessionRow(
  database: Awaited<ReturnType<typeof initializeDatabase>>,
  sessionId: string,
): PracticeSessionRow {
  const row = database
    .select()
    .from(practiceSessions)
    .where(eq(practiceSessions.id, sessionId))
    .get();

  if (!row) {
    throw new SessionRepositoryError('not-found', `Session ${sessionId} was not found.`);
  }

  return row;
}

function findBranchRow(
  database: Awaited<ReturnType<typeof initializeDatabase>>,
  branchId: string,
): BranchRow | undefined {
  return database.select().from(branches).where(eq(branches.id, branchId)).get();
}

function requireBranchRow(
  database: Awaited<ReturnType<typeof initializeDatabase>>,
  branchId: string,
): BranchRow {
  const row = findBranchRow(database, branchId);

  if (!row) {
    throw new SessionRepositoryError('not-found', `Branch ${branchId} was not found.`);
  }

  return row;
}

function requireBranchSimulationStateRow(
  database: Awaited<ReturnType<typeof initializeDatabase>>,
  branchId: string,
): BranchSimulationStateRow {
  const row = database
    .select()
    .from(branchSimulationStates)
    .where(eq(branchSimulationStates.branchId, branchId))
    .get();

  if (!row) {
    throw new SessionRepositoryError(
      'invariant-violation',
      `Branch ${branchId} does not have a seeded simulation state.`,
    );
  }

  return row;
}

function requireActiveBranch(
  database: Awaited<ReturnType<typeof initializeDatabase>>,
  branch: BranchRow,
): PracticeSessionRow {
  const session = requireSessionRow(database, branch.sessionId);

  if (session.activeBranchId !== branch.id) {
    throw new SessionRepositoryError(
      'invalid-input',
      `Branch ${branch.id} is immutable because it is not the active branch.`,
    );
  }

  return session;
}

function requireWritableSession(session: PracticeSessionRow): void {
  if (!writableSessionStatuses.includes(session.status)) {
    throw new SessionRepositoryError(
      'invalid-transition',
      `Cannot append rehearsal turns while session ${session.id} is ${session.status}.`,
    );
  }
}

function resolveTranscriptRows(
  database: Awaited<ReturnType<typeof initializeDatabase>>,
  branchId: string,
  ancestors: ReadonlySet<string> = new Set(),
): TurnRow[] {
  if (ancestors.has(branchId)) {
    throw new SessionRepositoryError('invariant-violation', 'Branch lineage contains a cycle.');
  }

  const branch = requireBranchRow(database, branchId);
  const localTurns = database
    .select()
    .from(turns)
    .where(eq(turns.branchId, branchId))
    .orderBy(asc(turns.sequence))
    .all();

  let resolved: TurnRow[];

  if (branch.kind === 'rewind') {
    if (!branch.parentBranchId || !branch.forkTurnId) {
      throw new SessionRepositoryError(
        'invariant-violation',
        `Rewind branch ${branch.id} has incomplete lineage.`,
      );
    }

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(branch.id);
    const parentTranscript = resolveTranscriptRows(
      database,
      branch.parentBranchId,
      nextAncestors,
    );
    const forkIndex = parentTranscript.findIndex((turn) => turn.id === branch.forkTurnId);

    if (forkIndex < 0) {
      throw new SessionRepositoryError(
        'invariant-violation',
        `Fork turn ${branch.forkTurnId} is not in branch ${branch.parentBranchId}.`,
      );
    }

    resolved = [...parentTranscript.slice(0, forkIndex), ...localTurns];
  } else {
    resolved = localTurns;
  }

  assertContiguousTranscript(resolved, branch.id);
  return resolved;
}

function assertContiguousTranscript(transcript: readonly TurnRow[], branchId: string): void {
  transcript.forEach((turn, index) => {
    if (turn.sequence !== index + 1) {
      throw new SessionRepositoryError(
        'invariant-violation',
        `Branch ${branchId} has a non-contiguous transcript.`,
      );
    }
  });
}

function mapSession(row: PracticeSessionRow): PracticeSession {
  return {
    ...row,
    scenarioDefinition: row.scenarioDefinition
      ? cloneJson(row.scenarioDefinition)
      : null,
  };
}

function mapBranch(row: BranchRow): Branch {
  const base = {
    id: row.id,
    sessionId: row.sessionId,
    reactionProfile: row.reactionProfile,
    resistanceMoveOrder: cloneStringArray(row.resistanceMoveOrder),
    createdAt: row.createdAt,
  };

  switch (row.kind) {
    case 'original':
      if (row.parentBranchId !== null || row.forkTurnId !== null) {
        break;
      }
      return { ...base, kind: 'original', parentBranchId: null, forkTurnId: null };
    case 'rewind':
      if (row.parentBranchId && row.forkTurnId) {
        return {
          ...base,
          kind: 'rewind',
          parentBranchId: row.parentBranchId,
          forkTurnId: row.forkTurnId,
        };
      }
      break;
    case 'pressure-test':
      if (row.parentBranchId && row.forkTurnId === null) {
        return {
          ...base,
          kind: 'pressure-test',
          parentBranchId: row.parentBranchId,
          forkTurnId: null,
        };
      }
      break;
  }

  throw new SessionRepositoryError(
    'invariant-violation',
    `Branch ${row.id} does not satisfy its ${row.kind} lineage contract.`,
  );
}

function mapBranchSimulationState(
  row: BranchSimulationStateRow,
): BranchSimulationState {
  return { ...row, state: cloneJson(row.state) };
}

function mapTurn(row: TurnRow): Turn {
  return { ...row };
}

function mapSnapshot(row: StateSnapshotRow): StateSnapshot {
  return { ...row, state: cloneJson(row.state) };
}

function mapReadiness(row: ReadinessRatingRow): ReadinessRating {
  assertReadinessValue(row.rating);
  return { ...row, rating: row.rating as ReadinessValue };
}

function mapDebrief(row: DebriefRow): DebriefRecord {
  return { ...row, debrief: cloneJson(row.debrief) };
}

function requireNonEmpty(value: string, field: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new SessionRepositoryError('invalid-input', `${field} must not be empty.`);
  }

  return normalized;
}

function assertReadinessStage(stage: string): asserts stage is ReadinessStage {
  if (stage !== 'before' && stage !== 'after') {
    throw new SessionRepositoryError('invalid-input', 'Readiness stage must be before or after.');
  }
}

function assertReadinessValue(value: number): asserts value is ReadinessValue {
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw new SessionRepositoryError(
      'invalid-input',
      'Readiness rating must be an integer from 1 through 5.',
    );
  }
}

function cloneStringArray(values: readonly string[]): readonly string[] {
  return values.map((value) => requireNonEmpty(value, 'resistanceMoveOrder item'));
}

function cloneJson<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    throw new SessionRepositoryError('invalid-input', 'Value must be JSON serializable.');
  }
}
