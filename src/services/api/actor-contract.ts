import type { ScenarioDefinition } from '@/domain/scenario';
import type { TurnSpeaker } from '@/domain/session';
import type {
  ActorTurn,
  ConversationResolution,
  SimulationPhase,
  SimulationState,
} from '@/domain/simulation-state';
import {
  ScenarioContractError,
  parseEmbeddedScenarioDefinition,
} from './scenario-contract';

export const ACTOR_PROMPT_VERSION = 'actor-v2';

const SIMULATION_PHASES: readonly SimulationPhase[] = [
  'opening',
  'exploration',
  'resistance',
  'resolution',
  'closed',
];
const CONVERSATION_RESOLUTIONS: readonly ConversationResolution[] = [
  'none',
  'collaborative',
  'reluctant',
  'unresolved',
  'damaged',
];

export type ActorTranscriptTurn = {
  readonly speaker: TurnSpeaker;
  readonly text: string;
};

export type ActorRequest = {
  readonly scenarioId: string;
  readonly scenarioVersion: number;
  readonly scenarioDefinition: ScenarioDefinition | null;
  readonly reactionProfile: string;
  readonly state: SimulationState;
  readonly transcript: readonly ActorTranscriptTurn[];
  readonly latestManagerTurn: string;
};

export type ActorResponse = {
  readonly actorTurn: ActorTurn;
  readonly nextState: SimulationState;
  readonly model: string;
  readonly promptVersion: string;
};

export type ActorApiErrorBody = {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
};

export class ActorContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActorContractError';
  }
}

export function parseActorRequest(value: unknown): ActorRequest {
  const object = requireObject(value, 'request');
  assertOnlyKeys(object, [
    'scenarioId',
    'scenarioVersion',
    'scenarioDefinition',
    'reactionProfile',
    'state',
    'transcript',
    'latestManagerTurn',
  ]);

  const scenarioId = requireString(object.scenarioId, 'scenarioId', 80);
  const scenarioVersion = requireInteger(
    object.scenarioVersion,
    'scenarioVersion',
    1,
    Number.MAX_SAFE_INTEGER,
  );
  const reactionProfile = requireString(
    object.reactionProfile,
    'reactionProfile',
    80,
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
      throw new ActorContractError(
        error instanceof ScenarioContractError
          ? error.message
          : 'scenarioDefinition is invalid.',
      );
    }
  }
  const state = parseSimulationState(object.state, 'state');

  if (!Array.isArray(object.transcript) || object.transcript.length > 24) {
    throw new ActorContractError('transcript must contain at most 24 turns.');
  }

  const transcript = object.transcript.map((turn, index) => {
    const turnObject = requireObject(turn, `transcript[${index}]`);
    assertOnlyKeys(turnObject, ['speaker', 'text']);
    const speaker = turnObject.speaker;

    if (speaker !== 'manager' && speaker !== 'counterpart') {
      throw new ActorContractError(
        `transcript[${index}].speaker is invalid.`,
      );
    }

    return {
      speaker: speaker as TurnSpeaker,
      text: requireString(
        turnObject.text,
        `transcript[${index}].text`,
        3_000,
      ),
    };
  });
  const latestManagerTurn = requireString(
    object.latestManagerTurn,
    'latestManagerTurn',
    3_000,
  );
  const finalTranscriptTurn = transcript.at(-1);

  if (
    !finalTranscriptTurn ||
    finalTranscriptTurn.speaker !== 'manager' ||
    normalizeText(finalTranscriptTurn.text) !== normalizeText(latestManagerTurn)
  ) {
    throw new ActorContractError(
      'The transcript must end with latestManagerTurn from the manager.',
    );
  }

  return {
    scenarioId,
    scenarioVersion,
    scenarioDefinition,
    reactionProfile,
    state,
    transcript,
    latestManagerTurn,
  };
}

export function parseActorTurn(value: unknown): ActorTurn {
  const object = requireObject(value, 'actorTurn');
  assertOnlyKeys(object, [
    'spokenText',
    'statePatch',
    'revealedFactIds',
    'invokedResistanceMoveId',
    'endConversation',
  ]);

  return {
    spokenText: requireString(object.spokenText, 'spokenText', 600),
    statePatch: parseSimulationState(object.statePatch, 'statePatch'),
    revealedFactIds: requireStringArray(
      object.revealedFactIds,
      'revealedFactIds',
      24,
    ),
    invokedResistanceMoveId: requireNullableString(
      object.invokedResistanceMoveId,
      'invokedResistanceMoveId',
      100,
    ),
    endConversation: requireBoolean(
      object.endConversation,
      'endConversation',
    ),
  };
}

export function parseActorResponse(value: unknown): ActorResponse {
  const object = requireObject(value, 'response');
  assertOnlyKeys(object, [
    'actorTurn',
    'nextState',
    'model',
    'promptVersion',
  ]);

  return {
    actorTurn: parseActorTurn(object.actorTurn),
    nextState: parseSimulationState(object.nextState, 'nextState'),
    model: requireString(object.model, 'model', 120),
    promptVersion: requireString(
      object.promptVersion,
      'promptVersion',
      120,
    ),
  };
}

export function parseSimulationState(
  value: unknown,
  label = 'state',
): SimulationState {
  const object = requireObject(value, label);
  assertOnlyKeys(object, [
    'trust',
    'openness',
    'phase',
    'turnNumber',
    'revealedFactIds',
    'disputedFactIds',
    'acknowledgedFactIds',
    'unresolvedObjectionIds',
    'issueWasMadeSpecific',
    'managerAskedForPerspective',
    'expectationIsClear',
    'managerBackedAway',
    'nextStepEstablished',
    'resolution',
  ]);

  const phase = object.phase;
  if (!SIMULATION_PHASES.includes(phase as SimulationPhase)) {
    throw new ActorContractError(`${label}.phase is invalid.`);
  }

  const resolution = object.resolution;
  if (
    !CONVERSATION_RESOLUTIONS.includes(
      resolution as ConversationResolution,
    )
  ) {
    throw new ActorContractError(`${label}.resolution is invalid.`);
  }

  return {
    trust: requireNumber(object.trust, `${label}.trust`, 0, 1),
    openness: requireNumber(object.openness, `${label}.openness`, 0, 1),
    phase: phase as SimulationPhase,
    turnNumber: requireInteger(
      object.turnNumber,
      `${label}.turnNumber`,
      0,
      100,
    ),
    revealedFactIds: requireStringArray(
      object.revealedFactIds,
      `${label}.revealedFactIds`,
      48,
    ),
    disputedFactIds: requireStringArray(
      object.disputedFactIds,
      `${label}.disputedFactIds`,
      48,
    ),
    acknowledgedFactIds: requireStringArray(
      object.acknowledgedFactIds,
      `${label}.acknowledgedFactIds`,
      48,
    ),
    unresolvedObjectionIds: requireStringArray(
      object.unresolvedObjectionIds,
      `${label}.unresolvedObjectionIds`,
      48,
    ),
    issueWasMadeSpecific: requireBoolean(
      object.issueWasMadeSpecific,
      `${label}.issueWasMadeSpecific`,
    ),
    managerAskedForPerspective: requireBoolean(
      object.managerAskedForPerspective,
      `${label}.managerAskedForPerspective`,
    ),
    expectationIsClear: requireBoolean(
      object.expectationIsClear,
      `${label}.expectationIsClear`,
    ),
    managerBackedAway: requireBoolean(
      object.managerBackedAway,
      `${label}.managerBackedAway`,
    ),
    nextStepEstablished: requireBoolean(
      object.nextStepEstablished,
      `${label}.nextStepEstablished`,
    ),
    resolution: resolution as ConversationResolution,
  };
}

function requireObject(value: unknown, label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ActorContractError(`${label} must be an object.`);
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
    throw new ActorContractError(`Unexpected field: ${unexpectedKey}.`);
  }

  const missingKey = allowedKeys.find(
    (key) => !Object.prototype.hasOwnProperty.call(object, key),
  );

  if (missingKey) {
    throw new ActorContractError(`Missing field: ${missingKey}.`);
  }
}

function requireString(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string') {
    throw new ActorContractError(`${label} must be a string.`);
  }

  const normalized = normalizeText(value);
  if (!normalized || normalized.length > maxLength) {
    throw new ActorContractError(
      `${label} must contain 1–${maxLength} characters.`,
    );
  }

  return normalized;
}

function requireNullableString(
  value: unknown,
  label: string,
  maxLength: number,
) {
  return value === null ? null : requireString(value, label, maxLength);
}

function requireStringArray(
  value: unknown,
  label: string,
  maxItems: number,
) {
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new ActorContractError(
      `${label} must be an array with at most ${maxItems} items.`,
    );
  }

  return Array.from(
    new Set(
      value.map((item, index) =>
        requireString(item, `${label}[${index}]`, 120),
      ),
    ),
  );
}

function requireNumber(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new ActorContractError(
      `${label} must be between ${minimum} and ${maximum}.`,
    );
  }

  return value;
}

function requireInteger(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  const number = requireNumber(value, label, minimum, maximum);
  if (!Number.isInteger(number)) {
    throw new ActorContractError(`${label} must be an integer.`);
  }

  return number;
}

function requireBoolean(value: unknown, label: string) {
  if (typeof value !== 'boolean') {
    throw new ActorContractError(`${label} must be a boolean.`);
  }

  return value;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}
