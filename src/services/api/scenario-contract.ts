import type {
  Belief,
  CoachingDimension,
  PracticeCategory,
  RelationshipType,
  ResistanceMove,
  ScenarioDefinition,
  ScenarioEvidenceAnchor,
  ScenarioFact,
  StateTrigger,
  SuccessCondition,
} from '@/domain/scenario';

export class ScenarioContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioContractError';
  }
}

export function parseEmbeddedScenarioDefinition(
  value: unknown,
  expectedId: string,
  expectedVersion: number,
): ScenarioDefinition {
  const object = requireObject(value, 'scenarioDefinition');
  const id = text(object.id, 'scenarioDefinition.id', 120);
  const version = integer(object.version, 'scenarioDefinition.version', 1, 1000);
  if (id !== expectedId || version !== expectedVersion) {
    throw new ScenarioContractError(
      'The embedded scenario does not match its scenario reference.',
    );
  }
  if (!id.startsWith('private-') || object.publicationStatus !== 'draft') {
    throw new ScenarioContractError('Only private draft scenarios may be embedded.');
  }

  const category = oneOf<PracticeCategory>(
    object.category,
    ['feedback', 'boundary', 'pushback'],
    'scenarioDefinition.category',
  );
  const presentation = requireObject(
    object.presentation,
    'scenarioDefinition.presentation',
  );
  const relationship = requireObject(
    object.relationship,
    'scenarioDefinition.relationship',
  );
  const openingState = requireObject(
    object.openingState,
    'scenarioDefinition.openingState',
  );

  return {
    id,
    version,
    publicationStatus: 'draft',
    category,
    title: text(object.title, 'scenarioDefinition.title', 160),
    presentation: {
      shortTitle: text(presentation.shortTitle, 'presentation.shortTitle', 160),
      fullTitle: text(presentation.fullTitle, 'presentation.fullTitle', 200),
      relationshipLabel: text(
        presentation.relationshipLabel,
        'presentation.relationshipLabel',
        100,
      ),
      briefingSummary: text(
        presentation.briefingSummary,
        'presentation.briefingSummary',
        1000,
      ),
      briefingGoals: stringArray(
        presentation.briefingGoals,
        'presentation.briefingGoals',
        1,
        3,
        500,
      ),
      managerPressure: text(
        presentation.managerPressure,
        'presentation.managerPressure',
        500,
      ),
      evidenceAnchors: objectArray<ScenarioEvidenceAnchor>(
        presentation.evidenceAnchors,
        'presentation.evidenceAnchors',
        1,
        3,
        (anchor, label) => ({
          id: text(anchor.id, `${label}.id`, 100),
          label: text(anchor.label, `${label}.label`, 80),
          statement: text(anchor.statement, `${label}.statement`, 500),
          factIds: stringArray(anchor.factIds, `${label}.factIds`, 1, 3, 100),
        }),
      ),
    },
    relationship: {
      counterpartName: text(
        relationship.counterpartName,
        'relationship.counterpartName',
        80,
      ),
      counterpartRole: text(
        relationship.counterpartRole,
        'relationship.counterpartRole',
        100,
      ),
      relationshipType: oneOf<RelationshipType>(
        relationship.relationshipType,
        ['direct-report', 'former-peer', 'manager', 'stakeholder'],
        'relationship.relationshipType',
      ),
      history: stringArray(relationship.history, 'relationship.history', 0, 3, 600),
    },
    managerObjective: text(
      object.managerObjective,
      'scenarioDefinition.managerObjective',
      700,
    ),
    counterpartObjective: text(
      object.counterpartObjective,
      'scenarioDefinition.counterpartObjective',
      700,
    ),
    openingLine: text(object.openingLine, 'scenarioDefinition.openingLine', 400),
    coreFacts: factArray(object.coreFacts, 'scenarioDefinition.coreFacts', 1, 3),
    hiddenFacts: factArray(object.hiddenFacts, 'scenarioDefinition.hiddenFacts', 0, 3),
    beliefs: objectArray<Belief>(
      object.beliefs,
      'scenarioDefinition.beliefs',
      0,
      3,
      (belief, label) => ({
        id: text(belief.id, `${label}.id`, 100),
        statement: text(belief.statement, `${label}.statement`, 400),
      }),
    ),
    openingState: {
      trust: number(openingState.trust, 'openingState.trust', 0, 1),
      openness: number(openingState.openness, 'openingState.openness', 0, 1),
    },
    resistanceMoves: objectArray<ResistanceMove>(
      object.resistanceMoves,
      'scenarioDefinition.resistanceMoves',
      1,
      3,
      (move, label) => ({
        id: text(move.id, `${label}.id`, 100),
        description: text(move.description, `${label}.description`, 500),
      }),
    ),
    triggers: objectArray<StateTrigger>(
      object.triggers,
      'scenarioDefinition.triggers',
      1,
      8,
      (trigger, label) => ({
        id: text(trigger.id, `${label}.id`, 100),
        description: text(trigger.description, `${label}.description`, 700),
      }),
    ),
    successConditions: objectArray<SuccessCondition>(
      object.successConditions,
      'scenarioDefinition.successConditions',
      1,
      6,
      (condition, label) => ({
        id: text(condition.id, `${label}.id`, 100),
        description: text(condition.description, `${label}.description`, 700),
      }),
    ),
    coachingFocus: oneOfArray<CoachingDimension>(
      object.coachingFocus,
      ['purpose', 'specificity', 'evidence', 'perspective', 'boundary', 'path'],
      'scenarioDefinition.coachingFocus',
      1,
      6,
    ),
  };
}

function factArray(value: unknown, label: string, minimum: number, maximum: number) {
  return objectArray<ScenarioFact>(
    value,
    label,
    minimum,
    maximum,
    (fact, itemLabel) => ({
      id: text(fact.id, `${itemLabel}.id`, 100),
      statement: text(fact.statement, `${itemLabel}.statement`, 500),
      ...(fact.revealRule === undefined
        ? {}
        : { revealRule: text(fact.revealRule, `${itemLabel}.revealRule`, 500) }),
    }),
  );
}

function objectArray<T>(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  map: (object: Record<string, unknown>, label: string) => T,
) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new ScenarioContractError(`${label} has an invalid number of items.`);
  }
  return value.map((item, index) =>
    map(requireObject(item, `${label}[${index}]`), `${label}[${index}]`),
  );
}

function stringArray(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  maxLength: number,
) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new ScenarioContractError(`${label} has an invalid number of items.`);
  }
  return value.map((item, index) => text(item, `${label}[${index}]`, maxLength));
}

function oneOfArray<T extends string>(
  value: unknown,
  options: readonly T[],
  label: string,
  minimum: number,
  maximum: number,
) {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new ScenarioContractError(`${label} has an invalid number of items.`);
  }
  return value.map((item) => oneOf(item, options, label));
}

function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  label: string,
) {
  if (!options.includes(value as T)) {
    throw new ScenarioContractError(`${label} is invalid.`);
  }
  return value as T;
}

function text(value: unknown, label: string, maximum: number) {
  if (typeof value !== 'string') {
    throw new ScenarioContractError(`${label} must be text.`);
  }
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized || normalized.length > maximum) {
    throw new ScenarioContractError(`${label} is invalid.`);
  }
  return normalized;
}

function integer(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
) {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new ScenarioContractError(`${label} is invalid.`);
  }
  return value as number;
}

function number(value: unknown, label: string, minimum: number, maximum: number) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new ScenarioContractError(`${label} is invalid.`);
  }
  return value;
}

function requireObject(value: unknown, label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ScenarioContractError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}
