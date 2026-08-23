export type FoundationKey =
  | 'purpose'
  | 'specificity'
  | 'evidence'
  | 'perspective'
  | 'boundary'
  | 'path';

export type FoundationStatus = 'clear' | 'partial' | 'missing';
export type CoachingApproachStyle = 'direct' | 'curious' | 'relational';
export type DebriefMomentImpact = 'helped' | 'limited' | 'mixed';

export type DebriefFoundation = {
  readonly key: FoundationKey;
  readonly status: FoundationStatus;
};

export type CoachingApproach = {
  readonly style: CoachingApproachStyle;
  readonly principle: string;
};

export type DebriefMoment = {
  readonly id: string;
  readonly turnId: string;
  readonly evidenceIds: readonly string[];
  readonly impact: DebriefMomentImpact;
  readonly quote: string;
  readonly observation: string;
  readonly consequence: string;
  readonly rewindable: boolean;
  readonly approaches: readonly CoachingApproach[];
};

export type PreparationCard = {
  readonly purpose: string;
  readonly factIds: readonly string[];
  readonly requestOrBoundary: string;
  readonly stayCuriousAbout: readonly string[];
  readonly likelyPushback: readonly string[];
  readonly principle: string;
};

export type Debrief = {
  readonly outcome: string;
  readonly foundations: readonly DebriefFoundation[];
  readonly moments: readonly DebriefMoment[];
  readonly preparationCard: PreparationCard;
};
