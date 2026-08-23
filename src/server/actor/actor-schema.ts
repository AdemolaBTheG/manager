import type { ScenarioDefinition } from '@/domain/scenario';
import type { SimulationState } from '@/domain/simulation-state';
import { getActorTransitionConstraints } from '@/services/simulation/actor-transition';

const resolutions = [
  'none',
  'collaborative',
  'reluctant',
  'unresolved',
  'damaged',
] as const;

export function buildActorTurnJsonSchema(
  scenario: ScenarioDefinition,
  currentState: SimulationState,
) {
  const transitionConstraints = getActorTransitionConstraints(currentState);
  const hiddenFactIds = scenario.hiddenFacts.map((fact) => fact.id);
  const hiddenFactSchemaIds =
    hiddenFactIds.length > 0 ? hiddenFactIds : ['__no_hidden_facts__'];
  const allFactIds = [
    ...scenario.coreFacts.map((fact) => fact.id),
    ...hiddenFactIds,
  ];
  const resistanceMoveIds = scenario.resistanceMoves.map((move) => move.id);
  const stateSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      trust: { type: 'number', minimum: 0, maximum: 1 },
      openness: { type: 'number', minimum: 0, maximum: 1 },
      phase: {
        type: 'string',
        enum: transitionConstraints.allowedPhases,
      },
      turnNumber: {
        type: 'integer',
        enum: [transitionConstraints.nextTurnNumber],
      },
      revealedFactIds: {
        type: 'array',
        items: { type: 'string', enum: hiddenFactSchemaIds },
      },
      disputedFactIds: {
        type: 'array',
        items: { type: 'string', enum: allFactIds },
      },
      acknowledgedFactIds: {
        type: 'array',
        items: { type: 'string', enum: allFactIds },
      },
      unresolvedObjectionIds: {
        type: 'array',
        items: { type: 'string', enum: resistanceMoveIds },
      },
      issueWasMadeSpecific: { type: 'boolean' },
      managerAskedForPerspective: { type: 'boolean' },
      expectationIsClear: { type: 'boolean' },
      managerBackedAway: { type: 'boolean' },
      nextStepEstablished: { type: 'boolean' },
      resolution: { type: 'string', enum: resolutions },
    },
    required: [
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
    ],
  } as const;

  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      spokenText: { type: 'string', minLength: 1, maxLength: 600 },
      statePatch: stateSchema,
      revealedFactIds: {
        type: 'array',
        items: { type: 'string', enum: hiddenFactSchemaIds },
      },
      invokedResistanceMoveId: {
        anyOf: [
          { type: 'string', enum: resistanceMoveIds },
          { type: 'null' },
        ],
      },
      endConversation: {
        type: 'boolean',
        enum: transitionConstraints.mustEndConversation
          ? [true]
          : transitionConstraints.canEndConversation
            ? [false, true]
            : [false],
      },
    },
    required: [
      'spokenText',
      'statePatch',
      'revealedFactIds',
      'invokedResistanceMoveId',
      'endConversation',
    ],
  } as const;
}
