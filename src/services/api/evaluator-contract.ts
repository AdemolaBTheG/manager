import type {
  CoachingApproach,
  CoachingApproachStyle,
  Debrief,
  DebriefFoundation,
  DebriefMoment,
  DebriefMomentImpact,
  FoundationKey,
  FoundationStatus,
} from '@/domain/coaching';
import type { ScenarioDefinition } from '@/domain/scenario';
import type { TurnSpeaker } from '@/domain/session';
import type { SimulationState } from '@/domain/simulation-state';

import { parseSimulationState } from './actor-contract';
import {
  ScenarioContractError,
  parseEmbeddedScenarioDefinition,
} from './scenario-contract';

export const EVALUATOR_PROMPT_VERSION = 'evaluator-v3';

export const DEBRIEF_COPY_LIMITS = {
  outcome: 160,
  quote: 160,
  observation: 140,
  consequence: 120,
  approachPrinciple: 120,
  preparationPurpose: 100,
  preparationRequest: 140,
  preparationCuriosity: 100,
  preparationPushback: 100,
  preparationPrinciple: 120,
} as const;

const FOUNDATION_KEYS: readonly FoundationKey[] = [
  'purpose',
  'specificity',
  'evidence',
  'perspective',
  'boundary',
  'path',
];
const FOUNDATION_STATUSES: readonly FoundationStatus[] = [
  'clear',
  'partial',
  'missing',
];
const APPROACH_STYLES: readonly CoachingApproachStyle[] = [
  'direct',
  'curious',
  'relational',
];
const MOMENT_IMPACTS: readonly DebriefMomentImpact[] = [
  'helped',
  'limited',
  'mixed',
];

export type EvaluatorTranscriptTurn = {
  readonly id: string;
  readonly speaker: TurnSpeaker;
  readonly text: string;
};

export type EvaluatorRequest = {
  readonly scenarioId: string;
  readonly scenarioVersion: number;
  readonly scenarioDefinition: ScenarioDefinition | null;
  readonly transcript: readonly EvaluatorTranscriptTurn[];
  readonly finalState: SimulationState;
};

export type EvaluatorResponse = {
  readonly debrief: Debrief;
  readonly model: string;
  readonly promptVersion: string;
};

export type EvaluatorApiErrorBody = {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
};

export class EvaluatorContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EvaluatorContractError';
  }
}

export function parseEvaluatorRequest(value: unknown): EvaluatorRequest {
  const object = requireObject(value, 'request');
  assertOnlyKeys(object, [
    'scenarioId',
    'scenarioVersion',
    'scenarioDefinition',
    'transcript',
    'finalState',
  ]);

  const scenarioId = requireString(object.scenarioId, 'scenarioId', 80);
  const scenarioVersion = requireInteger(
    object.scenarioVersion,
    'scenarioVersion',
    1,
    Number.MAX_SAFE_INTEGER,
  );
  let scenarioDefinition: ScenarioDefinition | null = null;
  if (object.scenarioDefinition !== null && object.scenarioDefinition !== undefined) {
    try {
      scenarioDefinition = parseEmbeddedScenarioDefinition(
        object.scenarioDefinition,
        scenarioId,
        scenarioVersion,
      );
    } catch (error) {
      throw new EvaluatorContractError(
        error instanceof ScenarioContractError
          ? error.message
          : 'scenarioDefinition is invalid.',
      );
    }
  }

  if (!Array.isArray(object.transcript) || object.transcript.length > 24) {
    throw new EvaluatorContractError(
      'transcript must be an array with at most 24 turns.',
    );
  }

  const seenTurnIds = new Set<string>();
  const transcript = object.transcript.map((value, index) => {
    const turn = requireObject(value, `transcript[${index}]`);
    assertOnlyKeys(turn, ['id', 'speaker', 'text']);
    const id = requireString(turn.id, `transcript[${index}].id`, 120);
    if (seenTurnIds.has(id)) {
      throw new EvaluatorContractError(`Duplicate transcript turn ID: ${id}.`);
    }
    seenTurnIds.add(id);

    if (turn.speaker !== 'manager' && turn.speaker !== 'counterpart') {
      throw new EvaluatorContractError(
        `transcript[${index}].speaker is invalid.`,
      );
    }

    return {
      id,
      speaker: turn.speaker as TurnSpeaker,
      text: requireString(turn.text, `transcript[${index}].text`, 3_000),
    };
  });
  const finalState = parseSimulationState(object.finalState, 'finalState');
  const counterpartTurnCount = transcript.filter(
    (turn) => turn.speaker === 'counterpart',
  ).length;

  if (
    finalState.phase !== 'closed' ||
    transcript.at(-1)?.speaker !== 'counterpart' ||
    finalState.turnNumber !== counterpartTurnCount
  ) {
    throw new EvaluatorContractError(
      'The evaluator requires a complete, internally consistent rehearsal.',
    );
  }

  return {
    scenarioId,
    scenarioVersion,
    scenarioDefinition,
    transcript,
    finalState,
  };
}

export function parseEvaluatorResponse(
  value: unknown,
  scenario: ScenarioDefinition,
  transcript: readonly EvaluatorTranscriptTurn[],
  finalState: SimulationState,
): EvaluatorResponse {
  const object = requireObject(value, 'response');
  assertOnlyKeys(object, ['debrief', 'model', 'promptVersion']);

  return {
    debrief: parseDebrief(object.debrief, scenario, transcript, finalState),
    model: requireString(object.model, 'model', 120),
    promptVersion: requireString(object.promptVersion, 'promptVersion', 120),
  };
}

export function parseDebrief(
  value: unknown,
  scenario: ScenarioDefinition,
  transcript: readonly EvaluatorTranscriptTurn[],
  finalState: SimulationState,
): Debrief {
  const object = requireObject(value, 'debrief');
  assertOnlyKeys(object, [
    'outcome',
    'foundations',
    'moments',
    'preparationCard',
  ]);

  if (!Array.isArray(object.foundations) || object.foundations.length > 6) {
    throw new EvaluatorContractError(
      'debrief.foundations must contain at most six items.',
    );
  }
  const seenFoundationKeys = new Set<FoundationKey>();
  const foundations: DebriefFoundation[] = object.foundations.map(
    (value, index) => {
      const foundation = requireObject(
        value,
        `debrief.foundations[${index}]`,
      );
      assertOnlyKeys(foundation, ['key', 'status']);
      const key = foundation.key as FoundationKey;
      const status = foundation.status as FoundationStatus;
      if (!FOUNDATION_KEYS.includes(key) || !FOUNDATION_STATUSES.includes(status)) {
        throw new EvaluatorContractError(
          `debrief.foundations[${index}] is invalid.`,
        );
      }
      if (seenFoundationKeys.has(key)) {
        throw new EvaluatorContractError(`Duplicate foundation key: ${key}.`);
      }
      seenFoundationKeys.add(key);
      return { key, status };
    },
  );

  if (
    !Array.isArray(object.moments) ||
    object.moments.length < 1 ||
    object.moments.length > 3
  ) {
    throw new EvaluatorContractError(
      'debrief.moments must contain one to three evidence-linked moments.',
    );
  }

  const managerTurns = new Map(
    transcript
      .filter((turn) => turn.speaker === 'manager')
      .map((turn) => [turn.id, turn] as const),
  );
  const moments: DebriefMoment[] = object.moments.map((value, index) => {
    const moment = requireObject(value, `debrief.moments[${index}]`);
    assertOnlyKeys(moment, [
      'id',
      'turnId',
      'evidenceIds',
      'impact',
      'quote',
      'observation',
      'consequence',
      'rewindable',
      'approaches',
    ]);
    const turnId = requireString(
      moment.turnId,
      `debrief.moments[${index}].turnId`,
      120,
    );
    const impact = moment.impact as DebriefMomentImpact;
    if (!MOMENT_IMPACTS.includes(impact)) {
      throw new EvaluatorContractError(
        `debrief.moments[${index}].impact is invalid.`,
      );
    }
    const quote = requireString(
      moment.quote,
      `debrief.moments[${index}].quote`,
      DEBRIEF_COPY_LIMITS.quote,
      false,
    );
    const sourceTurn = managerTurns.get(turnId);
    if (!sourceTurn || !sourceTurn.text.includes(quote)) {
      throw new EvaluatorContractError(
        `debrief.moments[${index}] does not quote its manager turn exactly.`,
      );
    }

    const availableEvidenceIds = new Set([
      ...scenario.coreFacts.map((fact) => fact.id),
      ...scenario.hiddenFacts
        .filter((fact) => finalState.revealedFactIds.includes(fact.id))
        .map((fact) => fact.id),
      ...scenario.triggers.map((trigger) => trigger.id),
      ...scenario.successConditions.map((condition) => condition.id),
    ]);
    const evidenceIds = requireStringArray(
      moment.evidenceIds,
      `debrief.moments[${index}].evidenceIds`,
      8,
    );
    if (evidenceIds.length === 0) {
      throw new EvaluatorContractError(
        `debrief.moments[${index}].evidenceIds must contain at least one item.`,
      );
    }
    if (new Set(evidenceIds).size !== evidenceIds.length) {
      throw new EvaluatorContractError(
        `debrief.moments[${index}].evidenceIds must not contain duplicates.`,
      );
    }
    const unknownEvidenceId = evidenceIds.find(
      (id) => !availableEvidenceIds.has(id),
    );
    if (unknownEvidenceId) {
      throw new EvaluatorContractError(
        `debrief.moments[${index}] references unavailable evidence: ${unknownEvidenceId}.`,
      );
    }

    if (!Array.isArray(moment.approaches) || moment.approaches.length > 3) {
      throw new EvaluatorContractError(
        `debrief.moments[${index}].approaches must contain at most three items.`,
      );
    }

    const approaches: CoachingApproach[] = moment.approaches.map(
      (value, approachIndex) => {
        const approach = requireObject(
          value,
          `debrief.moments[${index}].approaches[${approachIndex}]`,
        );
        assertOnlyKeys(approach, ['style', 'principle']);
        const style = approach.style as CoachingApproachStyle;
        if (!APPROACH_STYLES.includes(style)) {
          throw new EvaluatorContractError(
            `debrief.moments[${index}].approaches[${approachIndex}].style is invalid.`,
          );
        }
        return {
          style,
          principle: requireString(
            approach.principle,
            `debrief.moments[${index}].approaches[${approachIndex}].principle`,
            DEBRIEF_COPY_LIMITS.approachPrinciple,
          ),
        };
      },
    );

    return {
      id: requireString(moment.id, `debrief.moments[${index}].id`, 120),
      turnId,
      evidenceIds,
      impact,
      quote,
      observation: requireString(
        moment.observation,
        `debrief.moments[${index}].observation`,
        DEBRIEF_COPY_LIMITS.observation,
      ),
      consequence: requireString(
        moment.consequence,
        `debrief.moments[${index}].consequence`,
        DEBRIEF_COPY_LIMITS.consequence,
      ),
      rewindable: requireBoolean(
        moment.rewindable,
        `debrief.moments[${index}].rewindable`,
      ),
      approaches,
    };
  });

  const rewindableMoments = moments.filter((moment) => moment.rewindable);
  if (rewindableMoments.length !== 1) {
    throw new EvaluatorContractError(
      'debrief.moments must identify exactly one rewindable moment.',
    );
  }
  if (rewindableMoments[0].approaches.length === 0) {
    throw new EvaluatorContractError(
      'The rewindable moment must include at least one coaching approach.',
    );
  }

  const preparation = requireObject(
    object.preparationCard,
    'debrief.preparationCard',
  );
  assertOnlyKeys(preparation, [
    'purpose',
    'factIds',
    'requestOrBoundary',
    'stayCuriousAbout',
    'likelyPushback',
    'principle',
  ]);
  const availableFactIds = new Set([
    ...scenario.coreFacts.map((fact) => fact.id),
    ...finalState.revealedFactIds,
  ]);
  const factIds = requireStringArray(
    preparation.factIds,
    'debrief.preparationCard.factIds',
    8,
  );
  const unknownFactId = factIds.find((id) => !availableFactIds.has(id));
  if (unknownFactId) {
    throw new EvaluatorContractError(
      `The preparation card references an unavailable fact: ${unknownFactId}.`,
    );
  }

  return {
    outcome: requireString(
      object.outcome,
      'debrief.outcome',
      DEBRIEF_COPY_LIMITS.outcome,
    ),
    foundations,
    moments,
    preparationCard: {
      purpose: requireString(
        preparation.purpose,
        'debrief.preparationCard.purpose',
        DEBRIEF_COPY_LIMITS.preparationPurpose,
      ),
      factIds,
      requestOrBoundary: requireString(
        preparation.requestOrBoundary,
        'debrief.preparationCard.requestOrBoundary',
        DEBRIEF_COPY_LIMITS.preparationRequest,
      ),
      stayCuriousAbout: requireStringArray(
        preparation.stayCuriousAbout,
        'debrief.preparationCard.stayCuriousAbout',
        2,
        DEBRIEF_COPY_LIMITS.preparationCuriosity,
      ),
      likelyPushback: requireStringArray(
        preparation.likelyPushback,
        'debrief.preparationCard.likelyPushback',
        3,
        DEBRIEF_COPY_LIMITS.preparationPushback,
      ),
      principle: requireString(
        preparation.principle,
        'debrief.preparationCard.principle',
        DEBRIEF_COPY_LIMITS.preparationPrinciple,
      ),
    },
  };
}

function requireObject(value: unknown, label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new EvaluatorContractError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertOnlyKeys(
  object: Record<string, unknown>,
  allowedKeys: readonly string[],
) {
  const unexpectedKey = Object.keys(object).find(
    (key) => !allowedKeys.includes(key),
  );
  if (unexpectedKey) {
    throw new EvaluatorContractError(`Unexpected field: ${unexpectedKey}.`);
  }
  const missingKey = allowedKeys.find(
    (key) => !Object.prototype.hasOwnProperty.call(object, key),
  );
  if (missingKey) {
    throw new EvaluatorContractError(`Missing field: ${missingKey}.`);
  }
}

function requireString(
  value: unknown,
  label: string,
  maxLength: number,
  normalize = true,
) {
  if (typeof value !== 'string') {
    throw new EvaluatorContractError(`${label} must be a string.`);
  }
  const result = normalize ? value.replace(/\s+/g, ' ').trim() : value.trim();
  if (!result || result.length > maxLength) {
    throw new EvaluatorContractError(
      `${label} must contain 1–${maxLength} characters.`,
    );
  }
  return result;
}

function requireStringArray(
  value: unknown,
  label: string,
  maxItems: number,
  maxItemLength = 280,
) {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new EvaluatorContractError(
      `${label} must be an array with at most ${maxItems} items.`,
    );
  }
  return Array.from(
    new Set(
      value.map((item, index) =>
        requireString(item, `${label}[${index}]`, maxItemLength),
      ),
    ),
  );
}

function requireInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new EvaluatorContractError(`${label} is invalid.`);
  }
  return value;
}

function requireBoolean(value: unknown, label: string) {
  if (typeof value !== 'boolean') {
    throw new EvaluatorContractError(`${label} must be a boolean.`);
  }
  return value;
}
