import { sql } from 'drizzle-orm';
import {
  AnySQLiteColumn,
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

import type { DebriefRecord } from '@/domain/session';
import type { ScenarioDefinition } from '@/domain/scenario';
import type { SimulationState } from '@/domain/simulation-state';

export const practiceSessions = sqliteTable(
  'practice_sessions',
  {
    id: text('id').primaryKey(),
    scenarioId: text('scenario_id').notNull(),
    scenarioVersion: integer('scenario_version').notNull(),
    scenarioDefinition: text('scenario_definition_json', { mode: 'json' })
      .$type<ScenarioDefinition>(),
    privacyMode: text('privacy_mode', { enum: ['standard', 'private'] }).notNull(),
    status: text('status', {
      enum: [
        'draft',
        'confirmed',
        'readiness-recorded',
        'rehearsing',
        'debriefing',
        'debrief-ready',
        'rewinding',
        'pressure-testing',
        'plan-ready',
        'complete',
      ],
    }).notNull(),
    activeBranchId: text('active_branch_id').references((): AnySQLiteColumn => branches.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    completedAt: text('completed_at'),
  },
  (table) => [
    index('practice_sessions_scenario_idx').on(table.scenarioId, table.scenarioVersion),
    index('practice_sessions_status_idx').on(table.status),
    check('practice_sessions_scenario_version_check', sql`${table.scenarioVersion} > 0`),
  ],
);

export const branches = sqliteTable(
  'branches',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => practiceSessions.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    kind: text('kind', { enum: ['original', 'rewind', 'pressure-test'] }).notNull(),
    parentBranchId: text('parent_branch_id').references((): AnySQLiteColumn => branches.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    forkTurnId: text('fork_turn_id').references((): AnySQLiteColumn => turns.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    reactionProfile: text('reaction_profile').notNull(),
    resistanceMoveOrder: text('resistance_move_order', { mode: 'json' })
      .$type<readonly string[]>()
      .notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('branches_session_idx').on(table.sessionId),
    index('branches_parent_idx').on(table.parentBranchId),
    index('branches_fork_turn_idx').on(table.forkTurnId),
    check(
      'branches_lineage_check',
      sql`(${table.kind} = 'original' AND ${table.parentBranchId} IS NULL AND ${table.forkTurnId} IS NULL)
        OR (${table.kind} = 'rewind' AND ${table.parentBranchId} IS NOT NULL AND ${table.forkTurnId} IS NOT NULL)
        OR (${table.kind} = 'pressure-test' AND ${table.parentBranchId} IS NOT NULL AND ${table.forkTurnId} IS NULL)`,
    ),
    check('branches_reaction_profile_check', sql`length(trim(${table.reactionProfile})) > 0`),
  ],
);

export const branchSimulationStates = sqliteTable('branch_simulation_states', {
  branchId: text('branch_id')
    .primaryKey()
    .references(() => branches.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  state: text('state_json', { mode: 'json' }).$type<SimulationState>().notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const turns = sqliteTable(
  'turns',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    sequence: integer('sequence').notNull(),
    speaker: text('speaker', { enum: ['manager', 'counterpart'] }).notNull(),
    text: text('text').notNull(),
    audioPath: text('audio_path'),
    modelVersion: text('model_version'),
    promptVersion: text('prompt_version'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('turns_branch_sequence_unique').on(table.branchId, table.sequence),
    index('turns_branch_speaker_idx').on(table.branchId, table.speaker),
    check('turns_sequence_check', sql`${table.sequence} > 0`),
    check('turns_text_check', sql`length(trim(${table.text})) > 0`),
  ],
);

export const stateSnapshots = sqliteTable(
  'state_snapshots',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    beforeTurnId: text('before_turn_id')
      .notNull()
      .references(() => turns.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    state: text('state_json', { mode: 'json' }).$type<SimulationState>().notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('state_snapshots_before_turn_unique').on(table.beforeTurnId),
    index('state_snapshots_branch_idx').on(table.branchId),
  ],
);

export const readinessRatings = sqliteTable(
  'readiness_ratings',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => practiceSessions.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    stage: text('stage', { enum: ['before', 'after'] }).notNull(),
    rating: integer('rating').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('readiness_ratings_session_stage_unique').on(table.sessionId, table.stage),
    check('readiness_ratings_value_check', sql`${table.rating} BETWEEN 1 AND 5`),
  ],
);

export const debriefs = sqliteTable(
  'debriefs',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    debrief: text('debrief_json', { mode: 'json' })
      .$type<DebriefRecord['debrief']>()
      .notNull(),
    modelVersion: text('model_version').notNull(),
    promptVersion: text('prompt_version').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex('debriefs_branch_unique').on(table.branchId)],
);

export type PracticeSessionRow = typeof practiceSessions.$inferSelect;
export type BranchRow = typeof branches.$inferSelect;
export type BranchSimulationStateRow = typeof branchSimulationStates.$inferSelect;
export type TurnRow = typeof turns.$inferSelect;
export type StateSnapshotRow = typeof stateSnapshots.$inferSelect;
export type ReadinessRatingRow = typeof readinessRatings.$inferSelect;
export type DebriefRow = typeof debriefs.$inferSelect;
