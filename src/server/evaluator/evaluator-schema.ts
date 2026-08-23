import type { ScenarioDefinition } from '@/domain/scenario';
import type { SimulationState } from '@/domain/simulation-state';
import { DEBRIEF_COPY_LIMITS } from '@/services/api/evaluator-contract';

const foundationKeys = [
  'purpose',
  'specificity',
  'evidence',
  'perspective',
  'boundary',
  'path',
] as const;
const foundationStatuses = ['clear', 'partial', 'missing'] as const;
const approachStyles = ['direct', 'curious', 'relational'] as const;
const momentImpacts = ['helped', 'limited', 'mixed'] as const;

export function buildDebriefJsonSchema(
  scenario: ScenarioDefinition,
  finalState: SimulationState,
) {
  const factIds = [
    ...scenario.coreFacts.map((fact) => fact.id),
    ...scenario.hiddenFacts.map((fact) => fact.id),
  ];
  const evidenceIds = [
    ...scenario.coreFacts.map((fact) => fact.id),
    ...scenario.hiddenFacts
      .filter((fact) => finalState.revealedFactIds.includes(fact.id))
      .map((fact) => fact.id),
    ...scenario.triggers.map((trigger) => trigger.id),
    ...scenario.successConditions.map((condition) => condition.id),
  ];

  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      outcome: {
        type: 'string',
        minLength: 1,
        maxLength: DEBRIEF_COPY_LIMITS.outcome,
      },
      foundations: {
        type: 'array',
        maxItems: 6,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            key: { type: 'string', enum: foundationKeys },
            status: { type: 'string', enum: foundationStatuses },
          },
          required: ['key', 'status'],
        },
      },
      moments: {
        type: 'array',
        minItems: 1,
        maxItems: 3,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string', minLength: 1, maxLength: 120 },
            turnId: { type: 'string', minLength: 1, maxLength: 120 },
            evidenceIds: {
              type: 'array',
              minItems: 1,
              maxItems: 8,
              items: { type: 'string', enum: evidenceIds },
            },
            impact: { type: 'string', enum: momentImpacts },
            quote: {
              type: 'string',
              minLength: 1,
              maxLength: DEBRIEF_COPY_LIMITS.quote,
            },
            observation: {
              type: 'string',
              minLength: 1,
              maxLength: DEBRIEF_COPY_LIMITS.observation,
            },
            consequence: {
              type: 'string',
              minLength: 1,
              maxLength: DEBRIEF_COPY_LIMITS.consequence,
            },
            rewindable: { type: 'boolean' },
            approaches: {
              type: 'array',
              maxItems: 3,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  style: { type: 'string', enum: approachStyles },
                  principle: {
                    type: 'string',
                    minLength: 1,
                    maxLength: DEBRIEF_COPY_LIMITS.approachPrinciple,
                  },
                },
                required: ['style', 'principle'],
              },
            },
          },
          required: [
            'id',
            'turnId',
            'evidenceIds',
            'impact',
            'quote',
            'observation',
            'consequence',
            'rewindable',
            'approaches',
          ],
        },
      },
      preparationCard: {
        type: 'object',
        additionalProperties: false,
        properties: {
          purpose: {
            type: 'string',
            minLength: 1,
            maxLength: DEBRIEF_COPY_LIMITS.preparationPurpose,
          },
          factIds: {
            type: 'array',
            maxItems: 8,
            items: { type: 'string', enum: factIds },
          },
          requestOrBoundary: {
            type: 'string',
            minLength: 1,
            maxLength: DEBRIEF_COPY_LIMITS.preparationRequest,
          },
          stayCuriousAbout: {
            type: 'array',
            maxItems: 2,
            items: {
              type: 'string',
              minLength: 1,
              maxLength: DEBRIEF_COPY_LIMITS.preparationCuriosity,
            },
          },
          likelyPushback: {
            type: 'array',
            maxItems: 3,
            items: {
              type: 'string',
              minLength: 1,
              maxLength: DEBRIEF_COPY_LIMITS.preparationPushback,
            },
          },
          principle: {
            type: 'string',
            minLength: 1,
            maxLength: DEBRIEF_COPY_LIMITS.preparationPrinciple,
          },
        },
        required: [
          'purpose',
          'factIds',
          'requestOrBoundary',
          'stayCuriousAbout',
          'likelyPushback',
          'principle',
        ],
      },
    },
    required: ['outcome', 'foundations', 'moments', 'preparationCard'],
  } as const;
}
