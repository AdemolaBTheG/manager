import type {
  CoachingDimension,
  PracticeCategory,
  RelationshipType,
  ScenarioDefinition,
} from './scenario';

export const REAL_SITUATION_RELATIONSHIPS = {
  'direct-report': 'Direct report',
  'former-peer': 'Former peer',
  manager: 'My manager',
  stakeholder: 'Stakeholder',
} as const satisfies Record<RelationshipType, string>;

export type RealSituationInput = {
  readonly conversationType: PracticeCategory;
  readonly relationshipType: RelationshipType;
  readonly counterpartAlias: string;
  readonly observableFacts: readonly string[];
  readonly desiredChange: string;
  readonly fearedResponse: string;
  readonly relationshipContext: string;
};

export type NormalizedRealSituation = {
  readonly title: string;
  readonly summary: string;
  readonly managerObjective: string;
  readonly counterpartObjective: string;
  readonly openingLine: string;
  readonly possibleMotivations: readonly string[];
  readonly likelyResistance: readonly string[];
};

export type ConfirmedRealSituation = RealSituationInput &
  NormalizedRealSituation;

export const REAL_SITUATION_LIMITS = {
  alias: 60,
  fact: 280,
  facts: 3,
  desiredChange: 500,
  fearedResponse: 400,
  relationshipContext: 500,
  possibility: 240,
  generatedPossibility: 80,
  possibilities: 3,
} as const;

export class RealSituationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RealSituationValidationError';
  }
}

export function hasMinimumSituationDetail(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length >= 3;
}

export function parseRealSituationInput(value: unknown): RealSituationInput {
  const object = requireObject(value, 'situation');
  assertOnlyKeys(object, [
    'conversationType',
    'relationshipType',
    'counterpartAlias',
    'observableFacts',
    'desiredChange',
    'fearedResponse',
    'relationshipContext',
  ]);

  const conversationType = object.conversationType;
  if (
    conversationType !== 'feedback' &&
    conversationType !== 'boundary' &&
    conversationType !== 'pushback'
  ) {
    throw new RealSituationValidationError('Choose a conversation type.');
  }

  const relationshipType = object.relationshipType;
  if (
    relationshipType !== 'direct-report' &&
    relationshipType !== 'former-peer' &&
    relationshipType !== 'manager' &&
    relationshipType !== 'stakeholder'
  ) {
    throw new RealSituationValidationError('Choose a relationship.');
  }

  if (
    !Array.isArray(object.observableFacts) ||
    object.observableFacts.length < 1 ||
    object.observableFacts.length > REAL_SITUATION_LIMITS.facts
  ) {
    throw new RealSituationValidationError('Add one to three observable facts.');
  }

  const observableFacts = object.observableFacts.map((fact, index) =>
    requiredString(
      fact,
      `Observable fact ${index + 1}`,
      REAL_SITUATION_LIMITS.fact,
    ),
  );
  const incompleteFactIndex = observableFacts.findIndex(
    (fact) => !hasMinimumSituationDetail(fact),
  );
  if (incompleteFactIndex >= 0) {
    throw new RealSituationValidationError(
      `Observable fact ${incompleteFactIndex + 1} needs a complete, specific statement.`,
    );
  }

  const desiredChange = requiredString(
    object.desiredChange,
    'What needs to change',
    REAL_SITUATION_LIMITS.desiredChange,
  );
  if (!hasMinimumSituationDetail(desiredChange)) {
    throw new RealSituationValidationError(
      'Describe what needs to change in a little more detail.',
    );
  }

  const fearedResponse = requiredString(
    object.fearedResponse,
    'Feared response',
    REAL_SITUATION_LIMITS.fearedResponse,
  );
  if (!hasMinimumSituationDetail(fearedResponse)) {
    throw new RealSituationValidationError(
      'Describe the response you are worried about in a little more detail.',
    );
  }

  return {
    conversationType,
    relationshipType,
    counterpartAlias: optionalString(
      object.counterpartAlias,
      'Name or alias',
      REAL_SITUATION_LIMITS.alias,
    ),
    observableFacts,
    desiredChange,
    fearedResponse,
    relationshipContext: optionalString(
      object.relationshipContext,
      'Relationship context',
      REAL_SITUATION_LIMITS.relationshipContext,
    ),
  };
}

export function parseNormalizedRealSituation(
  value: unknown,
): NormalizedRealSituation {
  const object = requireObject(value, 'normalized situation');
  assertOnlyKeys(object, [
    'title',
    'summary',
    'managerObjective',
    'counterpartObjective',
    'openingLine',
    'possibleMotivations',
    'likelyResistance',
  ]);

  return {
    title: requiredString(object.title, 'Title', 120),
    summary: requiredString(object.summary, 'Summary', 700),
    managerObjective: requiredString(
      object.managerObjective,
      'Manager objective',
      500,
    ),
    counterpartObjective: requiredString(
      object.counterpartObjective,
      'Counterpart objective',
      500,
    ),
    openingLine: requiredString(object.openingLine, 'Opening line', 300),
    possibleMotivations: requireStringArray(
      object.possibleMotivations,
      'Possible motivations',
      0,
      REAL_SITUATION_LIMITS.possibilities,
      REAL_SITUATION_LIMITS.possibility,
    ),
    likelyResistance: requireStringArray(
      object.likelyResistance,
      'Likely resistance',
      1,
      3,
      240,
    ),
  };
}

export function buildPrivateScenario(
  id: string,
  situation: ConfirmedRealSituation,
): ScenarioDefinition {
  const input = parseRealSituationInput({
    conversationType: situation.conversationType,
    relationshipType: situation.relationshipType,
    counterpartAlias: situation.counterpartAlias,
    observableFacts: situation.observableFacts,
    desiredChange: situation.desiredChange,
    fearedResponse: situation.fearedResponse,
    relationshipContext: situation.relationshipContext,
  });
  const normalized = parseNormalizedRealSituation({
    title: situation.title,
    summary: situation.summary,
    managerObjective: situation.managerObjective,
    counterpartObjective: situation.counterpartObjective,
    openingLine: situation.openingLine,
    possibleMotivations: situation.possibleMotivations,
    likelyResistance: situation.likelyResistance,
  });
  const counterpartName = input.counterpartAlias || 'Alex';
  const relationshipLabel =
    REAL_SITUATION_RELATIONSHIPS[input.relationshipType];
  const factIds = input.observableFacts.map((_, index) => `fact-${index + 1}`);
  const motivations = normalized.possibleMotivations.slice(
    0,
    REAL_SITUATION_LIMITS.possibilities,
  );
  const resistance = uniqueStrings([
    input.fearedResponse,
    ...normalized.likelyResistance,
  ]).slice(0, 3);

  return {
    id: requiredString(id, 'Scenario ID', 120),
    version: 1,
    publicationStatus: 'draft',
    category: input.conversationType,
    title: normalized.title,
    presentation: {
      shortTitle: normalized.title,
      fullTitle: normalized.title,
      relationshipLabel,
      briefingSummary: normalized.summary,
      briefingGoals: buildGoals(input.conversationType, input.desiredChange),
      managerPressure: input.fearedResponse,
      evidenceAnchors: input.observableFacts.map((statement, index) => ({
        id: `evidence-${index + 1}`,
        label: index === 0 ? 'What happened' : `Fact ${index + 1}`,
        statement,
        factIds: [factIds[index]],
      })),
    },
    relationship: {
      counterpartName,
      counterpartRole: relationshipLabel,
      relationshipType: input.relationshipType,
      history: input.relationshipContext ? [input.relationshipContext] : [],
    },
    managerObjective: normalized.managerObjective || input.desiredChange,
    counterpartObjective: normalized.counterpartObjective,
    openingLine: normalized.openingLine,
    coreFacts: input.observableFacts.map((statement, index) => ({
      id: factIds[index],
      statement,
    })),
    hiddenFacts: motivations.map((statement, index) => ({
      id: `possible-motivation-${index + 1}`,
      statement,
      revealRule:
        'Treat this as a simulation hypothesis. Reveal it only after a relevant, open question; never present it as a verified fact.',
    })),
    beliefs: motivations.map((statement, index) => ({
      id: `possible-belief-${index + 1}`,
      statement,
    })),
    openingState: { trust: 0.52, openness: 0.4 },
    resistanceMoves: resistance.map((description, index) => ({
      id: `resistance-${index + 1}`,
      description,
    })),
    triggers: [
      {
        id: 'specific-evidence-used',
        description: 'The manager accurately names the observable facts.',
      },
      {
        id: 'perspective-invited',
        description:
          'The manager asks an open question without withdrawing the request or boundary.',
      },
      {
        id: 'clear-path-offered',
        description: `The manager makes the desired change concrete: ${input.desiredChange}`,
      },
      {
        id: 'standard-abandoned',
        description:
          'The manager retreats from the request or boundary after resistance.',
      },
    ],
    successConditions: [
      {
        id: 'observable-facts',
        description: 'Use observable facts without exaggeration or mind-reading.',
      },
      {
        id: 'perspective-heard',
        description: 'Explore the other person’s perspective with genuine curiosity.',
      },
      {
        id: 'clear-change',
        description: `Make the requested change explicit: ${input.desiredChange}`,
      },
    ],
    coachingFocus: coachingFocusFor(input.conversationType),
  };
}

function buildGoals(category: PracticeCategory, desiredChange: string) {
  const first =
    category === 'feedback'
      ? 'Make the feedback concrete and evidence-linked.'
      : category === 'boundary'
        ? 'State the boundary clearly without over-explaining.'
        : 'Push back clearly while protecting the working relationship.';

  return [
    first,
    'Explore their perspective without abandoning your position.',
    `Agree what happens next: ${desiredChange}`,
  ];
}

function coachingFocusFor(
  category: PracticeCategory,
): readonly CoachingDimension[] {
  if (category === 'feedback') {
    return ['purpose', 'specificity', 'evidence', 'perspective', 'path'];
  }
  if (category === 'boundary') {
    return ['purpose', 'specificity', 'perspective', 'boundary', 'path'];
  }
  return ['purpose', 'specificity', 'perspective', 'boundary', 'path'];
}

function uniqueStrings(values: readonly string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function requireStringArray(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  maxLength: number,
) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new RealSituationValidationError(
      `${label} must contain ${minimum}–${maximum} items.`,
    );
  }
  return value.map((item, index) =>
    requiredString(item, `${label} ${index + 1}`, maxLength),
  );
}

function requireObject(value: unknown, label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RealSituationValidationError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertOnlyKeys(
  object: Record<string, unknown>,
  keys: readonly string[],
) {
  const allowed = new Set(keys);
  if (Object.keys(object).some((key) => !allowed.has(key))) {
    throw new RealSituationValidationError('The situation contains unknown fields.');
  }
}

function requiredString(value: unknown, label: string, maxLength: number) {
  const normalized = optionalString(value, label, maxLength);
  if (!normalized) {
    throw new RealSituationValidationError(`${label} is required.`);
  }
  return normalized;
}

function optionalString(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string') {
    throw new RealSituationValidationError(`${label} must be text.`);
  }
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length > maxLength) {
    throw new RealSituationValidationError(
      `${label} must be ${maxLength} characters or fewer.`,
    );
  }
  return normalized;
}
