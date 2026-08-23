import type { EmotionalState } from './simulation-state';

export const PRACTICE_CATEGORIES = {
  feedback: {
    id: 'feedback',
    label: 'Give difficult feedback',
    eyebrow: 'DIFFICULT FEEDBACK',
  },
  boundary: {
    id: 'boundary',
    label: 'Set a boundary',
    eyebrow: 'SET A BOUNDARY',
  },
  pushback: {
    id: 'pushback',
    label: 'Say no / push back',
    eyebrow: 'SAY NO · PUSH BACK',
  },
} as const;

export type PracticeCategory = keyof typeof PRACTICE_CATEGORIES;
export type PracticeCategoryDefinition =
  (typeof PRACTICE_CATEGORIES)[PracticeCategory];

export function getPracticeCategory(
  category: PracticeCategory,
): PracticeCategoryDefinition {
  return PRACTICE_CATEGORIES[category];
}

export type RelationshipType =
  | 'direct-report'
  | 'former-peer'
  | 'manager'
  | 'stakeholder';

export type ScenarioFact = {
  readonly id: string;
  readonly statement: string;
  readonly revealRule?: string;
};

export type Belief = {
  readonly id: string;
  readonly statement: string;
};

export type ResistanceMove = {
  readonly id: string;
  readonly description: string;
};

export type StateTrigger = {
  readonly id: string;
  readonly description: string;
};

export type SuccessCondition = {
  readonly id: string;
  readonly description: string;
};

export type CoachingDimension =
  | 'purpose'
  | 'specificity'
  | 'evidence'
  | 'perspective'
  | 'boundary'
  | 'path';

export type ScenarioRelationship = {
  readonly counterpartName: string;
  readonly counterpartRole: string;
  readonly relationshipType: RelationshipType;
  readonly history: readonly string[];
};

export type ScenarioReference = {
  readonly id: string;
  readonly version: number;
};

export type ScenarioPresentation = {
  readonly shortTitle: string;
  readonly fullTitle: string;
  readonly relationshipLabel: string;
  readonly briefingSummary: string;
  readonly briefingGoals: readonly string[];
  readonly managerPressure: string;
  readonly evidenceAnchors: readonly ScenarioEvidenceAnchor[];
};

export type ScenarioEvidenceAnchor = {
  readonly id: string;
  readonly label: string;
  readonly statement: string;
  readonly factIds: readonly string[];
};

export type ScenarioDefinition = {
  readonly id: string;
  readonly version: number;
  readonly publicationStatus: 'draft' | 'published';
  readonly category: PracticeCategory;
  readonly title: string;
  readonly presentation: ScenarioPresentation;
  readonly relationship: ScenarioRelationship;
  readonly managerObjective: string;
  readonly counterpartObjective: string;
  readonly openingLine: string;
  readonly coreFacts: readonly ScenarioFact[];
  readonly hiddenFacts: readonly ScenarioFact[];
  readonly beliefs: readonly Belief[];
  readonly openingState: EmotionalState;
  readonly resistanceMoves: readonly ResistanceMove[];
  readonly triggers: readonly StateTrigger[];
  readonly successConditions: readonly SuccessCondition[];
  readonly coachingFocus: readonly CoachingDimension[];
};
