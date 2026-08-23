import type {
  CoachingApproach,
  Debrief,
  DebriefMoment,
  FoundationKey,
} from '@/domain/coaching';
import { getFixturePreparationCopy } from '@/data/fixture-preparation-copy';
import type { ScenarioDefinition } from '@/domain/scenario';
import type { SimulationState } from '@/domain/simulation-state';
import {
  DEBRIEF_COPY_LIMITS,
  type EvaluatorRequest,
} from '@/services/api/evaluator-contract';

const LEGACY_SPECIFIC_TURN_PATTERN =
  /\b(three|two|minutes|meeting|meetings|decision|decisions|deadline|deadlines|friday|tradeoff|tradeoffs|capacity|quality|preview|staged|scope|prototype|checkout|review)\b/i;
const LEGACY_PATH_TURN_PATTERN =
  /\b(next|agree|plan|message|let me know|before|change|alternative|preview|staged|reset|process|friday|wednesday)\b/i;

const SCENARIO_TURN_PATTERNS: Readonly<
  Record<string, { readonly path: RegExp; readonly specific: RegExp }>
> = {
  'repeated-quality-issues': {
    specific:
      /\b(three|two|report|reports|figures|prior week|omitted|delivery risk|correction|corrections|delayed|quality)\b/i,
    path: /\b(?:use|update|create|add|agree|set|try|restore) (?:a |the )?(?:revised |temporary )?(?:pre-send check|quality check|checklist|peer review|verification|review point)\b|\b(?:before the next report|follow up next)\b/i,
  },
  'after-hours-boundary': {
    specific:
      /\b(two weeks|eight|after 8|8 p\.m\.|four|before 8|urgent|internal decision|internal decisions|following day|response|message|messages)\b/i,
    path: /\b(?:set|agree|define|establish|use) (?:clear )?(?:response hours|reply hours|working hours|an escalation protocol|a protocol|an urgent route|an urgency route|decision authority)\b|\bwait until (?:the )?next workday\b/i,
  },
  'last-minute-scope': {
    specific:
      /\b(four days|friday|launch|custom export|export|quality assurance|qa|two|stability fix|stability fixes|delay|tradeoff|scope)\b/i,
    path: /\b(?:offer|provide|send|show|use|build) (?:a |the )?(?:staged option|sample|walkthrough|demo)\b|\b(?:plan|schedule|move|defer) (?:the )?(?:production export|production work|export|launch|date|scope)\b|\bnext release\b/i,
  },
};

export function requestFixtureDebrief(
  scenario: ScenarioDefinition,
  request: EvaluatorRequest,
) {
  const counterpartName = scenario.relationship.counterpartName.split(' ')[0];
  const managerTurns = request.transcript.filter(
    (turn) => turn.speaker === 'manager',
  );
  const selectedTurns = selectEvidenceTurns(scenario, managerTurns);
  const approaches = getFixtureApproaches(scenario);
  const preparationCopy = getFixturePreparationCopy(scenario);
  const moments: DebriefMoment[] = selectedTurns.map((turn, index) => ({
    id: `moment-${index + 1}`,
    turnId: turn.id,
    evidenceIds: getFixtureEvidenceIds(scenario, request.finalState, turn.text),
    impact: getFixtureImpact(turn.text, request.finalState),
    quote: getExactQuote(turn.text),
    observation: getFixtureObservation(
      turn.text,
      request.finalState,
      counterpartName,
    ),
    consequence: getFixtureConsequence(
      turn.text,
      request.finalState,
      counterpartName,
    ),
    rewindable: index === 0,
    approaches,
  }));

  const debrief: Debrief = {
    outcome: getFixtureOutcome(request.finalState, counterpartName),
    foundations: getFixtureFoundations(request.finalState),
    moments,
    preparationCard: {
      purpose: preparationCopy.purpose,
      factIds: scenario.coreFacts.slice(0, 3).map((fact) => fact.id),
      requestOrBoundary:
        scenario.presentation.briefingGoals.at(-1) ?? scenario.managerObjective,
      stayCuriousAbout: preparationCopy.stayCuriousAbout,
      likelyPushback: preparationCopy.likelyPushback,
      principle: getFixturePrinciple(scenario),
    },
  };

  return { debrief, model: 'fixture-evaluator-v1' } as const;
}

function selectEvidenceTurns<T extends { readonly text: string }>(
  scenario: ScenarioDefinition,
  turns: readonly T[],
) {
  if (turns.length === 0) {
    return [];
  }

  const scenarioPatterns = SCENARIO_TURN_PATTERNS[scenario.id];
  const specificPattern =
    scenarioPatterns?.specific ?? LEGACY_SPECIFIC_TURN_PATTERN;
  const pathPattern = scenarioPatterns?.path ?? LEGACY_PATH_TURN_PATTERN;
  const specific = turns.find((turn) => specificPattern.test(turn.text));
  const curious = turns.find((turn) =>
    /\b(what|why|how|help me understand|tell me|walk me through)\b/i.test(
      turn.text,
    ),
  );
  const path = [...turns]
    .reverse()
    .find((turn) => pathPattern.test(turn.text));

  return Array.from(new Set([specific, curious, path, turns.at(-1)]))
    .filter((turn): turn is T => Boolean(turn))
    .slice(0, 3);
}

function getFixtureApproaches(
  scenario: ScenarioDefinition,
): readonly CoachingApproach[] {
  switch (scenario.id) {
    case 'repeated-quality-issues':
      return [
        {
          style: 'direct',
          principle:
            'Name the repeated report errors and client impact without labelling Taylor’s capability.',
        },
        {
          style: 'curious',
          principle:
            'Ask how the report is prepared and checked before deciding why the errors happened.',
        },
        {
          style: 'relational',
          principle:
            'Recognize Taylor’s correction effort while keeping the pre-send quality standard explicit.',
        },
      ];
    case 'after-hours-boundary':
      return [
        {
          style: 'direct',
          principle:
            'Name the messaging pattern and set response hours without judging Sam for asking for help.',
        },
        {
          style: 'curious',
          principle:
            'Ask what makes waiting or deciding alone feel risky before defining the offline path.',
        },
        {
          style: 'relational',
          principle:
            'Protect Sam’s access to support without promising constant personal availability.',
        },
      ];
    case 'last-minute-scope':
      return [
        {
          style: 'direct',
          principle:
            'Quantify the export cost and state which launch commitments cannot remain unchanged.',
        },
        {
          style: 'curious',
          principle:
            'Ask what the client must actually see and by when before defending a delivery plan.',
        },
        {
          style: 'relational',
          principle:
            'Acknowledge the client pressure while keeping ownership of the scope tradeoff visible.',
        },
      ];
    default:
      return [
        {
          style: 'direct',
          principle:
            'Name the observable facts and your boundary without adding judgment.',
        },
        {
          style: 'curious',
          principle:
            'Ask what is driving the situation while keeping the issue in view.',
        },
        {
          style: 'relational',
          principle:
            'Name the relationship pressure without letting it decide the outcome.',
        },
      ];
  }
}

function getFixturePrinciple(scenario: ScenarioDefinition) {
  switch (scenario.id) {
    case 'repeated-quality-issues':
      return 'Process or workload context can change the support plan without erasing the quality standard.';
    case 'after-hours-boundary':
      return 'Reliable support needs clear response hours, decision authority, and a genuine urgency route.';
    case 'last-minute-scope':
      return 'Strong pushback pairs an explicit tradeoff with a credible path to the real outcome.';
    default:
      return 'Context can change the path forward without erasing the standard.';
  }
}

function getExactQuote(text: string) {
  return text.length <= DEBRIEF_COPY_LIMITS.quote
    ? text
    : text.slice(0, DEBRIEF_COPY_LIMITS.quote);
}

function getFixtureImpact(text: string, state: SimulationState) {
  if (state.managerBackedAway) {
    return 'limited' as const;
  }
  if (/\?/.test(text) && state.managerAskedForPerspective) {
    return 'helped' as const;
  }
  if (
    state.issueWasMadeSpecific ||
    state.expectationIsClear ||
    state.nextStepEstablished
  ) {
    return 'helped' as const;
  }
  return 'mixed' as const;
}

function getFixtureEvidenceIds(
  scenario: ScenarioDefinition,
  state: SimulationState,
  turnText: string,
) {
  const availableFacts = [
    ...scenario.coreFacts,
    ...scenario.hiddenFacts.filter((fact) =>
      state.revealedFactIds.includes(fact.id),
    ),
  ];
  const normalizedTurn = turnText.toLowerCase();
  const matchingFact = availableFacts.find((fact) =>
    fact.statement
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 5)
      .some((word) => normalizedTurn.includes(word)),
  );
  const fallback =
    matchingFact ??
    availableFacts[0] ??
    scenario.triggers[0] ??
    scenario.successConditions[0];

  return fallback ? [fallback.id] : [];
}

function getFixtureObservation(
  text: string,
  state: SimulationState,
  counterpartName: string,
) {
  if (/\?/.test(text) && state.managerAskedForPerspective) {
    return `You invited ${counterpartName}’s perspective instead of treating the first objection as defiance.`;
  }
  if (state.issueWasMadeSpecific) {
    return `You made the issue concrete enough for ${counterpartName} to respond to the actual situation.`;
  }
  if (state.expectationIsClear) {
    return 'You stated an expectation rather than leaving the concern implied.';
  }
  return `The concern remained broad, which gave ${counterpartName} room to minimize it.`;
}

function getFixtureConsequence(
  text: string,
  state: SimulationState,
  counterpartName: string,
) {
  if (state.managerBackedAway) {
    return `${counterpartName} left without a dependable boundary because your position softened under resistance.`;
  }
  if (/\?/.test(text) && state.revealedFactIds.length > 0) {
    return 'That curiosity surfaced context that was not available in the briefing.';
  }
  if (state.nextStepEstablished) {
    return 'The conversation ended with a concrete action rather than general agreement.';
  }
  return `${counterpartName} understood that the issue mattered, but the next action remained uncertain.`;
}

function getFixtureOutcome(state: SimulationState, counterpartName: string) {
  switch (state.resolution) {
    case 'collaborative':
      return `You held the issue in view and reached a workable next step with ${counterpartName}.`;
    case 'reluctant':
      return `${counterpartName} accepted a next step, but the underlying tension remained active.`;
    case 'damaged':
      return 'The standard was heard, but the exchange damaged trust and left the issue unresolved.';
    case 'unresolved':
    case 'none':
      return 'You raised the issue, but the conversation ended without a dependable next step.';
  }
}

function getFixtureFoundations(state: SimulationState) {
  const values: Record<FoundationKey, boolean> = {
    purpose: state.issueWasMadeSpecific || state.expectationIsClear,
    specificity: state.issueWasMadeSpecific,
    evidence: state.issueWasMadeSpecific,
    perspective: state.managerAskedForPerspective,
    boundary: state.expectationIsClear && !state.managerBackedAway,
    path: state.nextStepEstablished,
  };

  return (Object.entries(values) as [FoundationKey, boolean][]).map(
    ([key, isClear]) => ({
      key,
      status: isClear ? ('clear' as const) : ('missing' as const),
    }),
  );
}
