import type { ScenarioDefinition } from '@/domain/scenario';
import type { ActorTurn, SimulationPhase } from '@/domain/simulation-state';
import type { ActorRequest } from '@/services/api/actor-contract';

const LEGACY_SPECIFIC_EVIDENCE_PATTERN =
  /\b(three|two|last|minutes|meeting|meetings|decision|decisions|deadline|deadlines|friday|quality|commitments|tradeoff|tradeoffs|capacity|preview|staged|scope|prototype|checkout|review)\b/;
const LEGACY_PATH_PATTERN =
  /\b(next meeting|message me|let me know|move the call|plan|agree|alternative|preview|staged|process|reset|flag|release|wednesday)\b/;

type FixtureSignals = {
  asksForPerspective: boolean;
  backsAway: boolean;
  hiddenFactId?: string;
  hiddenFactStatement?: string;
  nextStepEstablished: boolean;
  overusesAuthority: boolean;
  shouldEnd: boolean;
  usesSpecificEvidence: boolean;
};

type ScenarioFixture = {
  evidencePattern: RegExp;
  pathPattern: RegExp;
  hiddenFactRevealPatterns: Readonly<Record<string, RegExp>>;
  resistanceMoves: {
    readonly accepted: string;
    readonly default: string;
    readonly evidence: string;
    readonly hiddenFacts: Readonly<Record<string, string>>;
    readonly perspective: string;
    readonly authority: string;
  };
  spokenText: (signals: FixtureSignals) => string;
};

const SCENARIO_FIXTURES: Readonly<Record<string, ScenarioFixture>> = {
  'repeated-quality-issues': {
    evidencePattern:
      /\b(three|two|report|reports|figures|prior week|omitted|delivery risk|correction|corrections|delayed|quality)\b/,
    pathPattern:
      /\b(?:use|update|create|add|agree|set|try|restore) (?:a |the )?(?:revised |temporary )?(?:pre-send check|quality check|checklist|peer review|verification|review point)\b|\b(?:before the next report|follow up next)\b/,
    hiddenFactRevealPatterns: {
      'outdated-report-checklist':
        /\b(prepare|preparing|check|checking|checklist|workflow|process|export|steps|figures|report|reports)\b/,
      'peer-review-dropped':
        /\b(workload|capacity|support|changed|change|peer review|accounts|help|time|pressure)\b/,
    },
    resistanceMoves: {
      accepted: 'accept-quality-path',
      default: 'minimize-quality-impact',
      evidence: 'defend-correction-effort',
      hiddenFacts: {
        'outdated-report-checklist': 'raise-report-process',
        'peer-review-dropped': 'raise-report-process',
      },
      perspective: 'defend-correction-effort',
      authority: 'defend-correction-effort',
    },
    spokenText: getRepeatedQualityFixtureText,
  },
  'after-hours-boundary': {
    evidencePattern:
      /\b(two weeks|eight|after 8|8 p\.m\.|four|before 8|urgent|internal decision|internal decisions|following day|response|message|messages)\b/,
    pathPattern:
      /\b(?:set|agree|define|establish|use) (?:clear )?(?:response hours|reply hours|working hours|an escalation protocol|a protocol|an urgent route|an urgency route|decision authority)\b|\bwait until (?:the )?next workday\b/,
    hiddenFactRevealPatterns: {
      'previous-manager-norm':
        /\b(expect|expectation|available|availability|reply|response|respond|previous|past|used to|hours)\b/,
      'unsupported-decision-criticism':
        /\b(decide|decision|alone|customer|risk|ambiguous|approval|afraid|fear|reluctant)\b/,
    },
    resistanceMoves: {
      accepted: 'accept-urgency-path',
      default: 'frame-access-as-support',
      evidence: 'frame-access-as-support',
      hiddenFacts: {
        'previous-manager-norm': 'compare-previous-manager',
        'unsupported-decision-criticism': 'raise-decision-risk',
      },
      perspective: 'frame-access-as-support',
      authority: 'frame-access-as-support',
    },
    spokenText: getAfterHoursFixtureText,
  },
  'last-minute-scope': {
    evidencePattern:
      /\b(four days|friday|launch|custom export|export|quality assurance|qa|two|stability fix|stability fixes|delay|tradeoff|scope)\b/,
    pathPattern:
      /\b(?:offer|provide|send|show|use|build) (?:a |the )?(?:staged option|sample|walkthrough|demo)\b|\b(?:plan|schedule|move|defer) (?:the )?(?:production export|production work|export|launch|date|scope)\b|\bnext release\b/,
    hiddenFactRevealPatterns: {
      'client-demo-is-enough':
        /\b(outcome|need|needs|client|see|show|accomplish|achieve|by when|monday|review|walkthrough|sample|demo)\b/,
      'export-promise-unconfirmed':
        /\b(origin|came from|promise|promised|planned|establish|established|agreed|sales call|friday expectation)\b/,
    },
    resistanceMoves: {
      accepted: 'accept-staged-export',
      default: 'minimize-export-size',
      evidence: 'invoke-client-importance',
      hiddenFacts: {
        'client-demo-is-enough': 'clarify-client-outcome',
        'export-promise-unconfirmed': 'clarify-client-outcome',
      },
      perspective: 'invoke-client-importance',
      authority: 'challenge-partnership',
    },
    spokenText: getLastMinuteScopeFixtureText,
  },
};

export function requestFixtureActorTurn(
  scenario: ScenarioDefinition,
  request: ActorRequest,
) {
  const managerText = request.latestManagerTurn.toLowerCase();
  const scenarioFixture = SCENARIO_FIXTURES[scenario.id];
  const asksForPerspective =
    /\b(what|why|how|help me understand|tell me|walk me through|what's behind|what is behind)\b/.test(
      managerText,
    );
  const usesSpecificEvidence =
    (scenarioFixture?.evidencePattern ?? LEGACY_SPECIFIC_EVIDENCE_PATTERN).test(
      managerText,
    );
  const overusesAuthority =
    /\b(because i(?:'m| am) your manager|as your manager|i(?:'m| am) your boss|do as i say)\b/.test(
      managerText,
    );
  const backsAway =
    /\b(doesn't matter|does not matter|forget it|not a big deal|never mind)\b/.test(
      managerText,
    );
  const offersPath =
    (scenarioFixture?.pathPattern ?? LEGACY_PATH_PATTERN).test(managerText);
  const hiddenFact = selectHiddenFact(
    scenario,
    managerText,
    asksForPerspective,
    request.state.revealedFactIds,
  );
  const revealedFactIds = hiddenFact ? [hiddenFact.id] : [];
  const nextStepEstablished = request.state.nextStepEstablished || offersPath;
  const managerBackedAway = request.state.managerBackedAway || backsAway;
  const shouldEnd =
    request.state.turnNumber >= 7 ||
    (request.state.turnNumber >= 4 &&
      (nextStepEstablished || managerBackedAway));
  const signals: FixtureSignals = {
    asksForPerspective,
    backsAway,
    hiddenFactId: hiddenFact?.id,
    hiddenFactStatement: hiddenFact?.statement,
    nextStepEstablished,
    overusesAuthority,
    shouldEnd,
    usesSpecificEvidence,
  };
  const invokedResistanceMoveId = selectResistanceMoveId(scenario, signals);
  const proposedPhase = getNextFixturePhase(
    request.state.phase,
    nextStepEstablished,
  );
  const statePatch = {
    ...request.state,
    trust: request.state.trust + (overusesAuthority ? -0.12 : 0.04),
    openness:
      request.state.openness +
      (asksForPerspective ? 0.12 : overusesAuthority ? -0.12 : 0.01),
    phase: shouldEnd ? 'closed' : proposedPhase,
    turnNumber: request.state.turnNumber + 1,
    revealedFactIds: [
      ...request.state.revealedFactIds,
      ...revealedFactIds,
    ],
    disputedFactIds: request.state.disputedFactIds,
    acknowledgedFactIds: request.state.acknowledgedFactIds,
    unresolvedObjectionIds: invokedResistanceMoveId
      ? [invokedResistanceMoveId]
      : [],
    issueWasMadeSpecific:
      request.state.issueWasMadeSpecific || usesSpecificEvidence,
    managerAskedForPerspective:
      request.state.managerAskedForPerspective || asksForPerspective,
    expectationIsClear:
      request.state.expectationIsClear || usesSpecificEvidence || offersPath,
    managerBackedAway,
    nextStepEstablished,
    resolution: shouldEnd
      ? managerBackedAway
        ? 'unresolved'
        : nextStepEstablished
          ? 'collaborative'
          : overusesAuthority
            ? 'damaged'
            : 'unresolved'
      : nextStepEstablished
        ? 'collaborative'
        : 'none',
  } as const;

  const actorTurn: ActorTurn = {
    spokenText: getFixtureSpokenText(
      scenario,
      signals,
    ),
    statePatch,
    revealedFactIds,
    invokedResistanceMoveId,
    endConversation: shouldEnd,
  };

  return { actorTurn, model: 'fixture-v1' } as const;
}

function getNextFixturePhase(
  current: SimulationPhase,
  nextStepEstablished: boolean,
): SimulationPhase {
  switch (current) {
    case 'opening':
      return 'exploration';
    case 'exploration':
      return 'resistance';
    case 'resistance':
      return nextStepEstablished ? 'resolution' : 'resistance';
    case 'resolution':
      return 'resolution';
    case 'closed':
      return 'closed';
  }
}

function selectResistanceMoveId(
  scenario: ScenarioDefinition,
  signals: FixtureSignals,
) {
  const fixture = SCENARIO_FIXTURES[scenario.id];
  if (fixture) {
    const preferredId = signals.nextStepEstablished
      ? fixture.resistanceMoves.accepted
      : signals.hiddenFactId
        ? fixture.resistanceMoves.hiddenFacts[signals.hiddenFactId]
        : signals.overusesAuthority
          ? fixture.resistanceMoves.authority
          : signals.asksForPerspective
            ? fixture.resistanceMoves.perspective
            : signals.usesSpecificEvidence
              ? fixture.resistanceMoves.evidence
              : fixture.resistanceMoves.default;

    return (
      scenario.resistanceMoves.find((move) => move.id === preferredId)?.id ??
      scenario.resistanceMoves[0]?.id ??
      null
    );
  }

  const preferredIds = signals.nextStepEstablished
    ? ['soften', 'accept-path', 'accept-option']
    : signals.asksForPerspective
      ? ['raise-context', 'raise-scope', 'clarify-outcome']
      : signals.overusesAuthority
        ? ['challenge-authority', 'challenge-commitment']
        : signals.usesSpecificEvidence
          ? ['invoke-friendship', 'deny-fairness', 'repeat-urgency']
          : ['minimize-pattern', 'deny-fairness', 'repeat-urgency'];

  return (
    preferredIds.find((id) =>
      scenario.resistanceMoves.some((move) => move.id === id),
    ) ??
    scenario.resistanceMoves[0]?.id ??
    null
  );
}

function getFixtureSpokenText(
  scenario: ScenarioDefinition,
  signals: FixtureSignals,
) {
  const fixture = SCENARIO_FIXTURES[scenario.id];
  if (fixture) {
    return fixture.spokenText(signals);
  }

  if (scenario.category === 'feedback') {
    return getFeedbackFixtureText(signals);
  }

  if (scenario.category === 'pushback') {
    return getPushbackFixtureText(signals);
  }

  if (signals.backsAway) {
    return 'Okay, sure. If it isn’t really a problem, then we’re good.';
  }

  if (signals.nextStepEstablished) {
    return 'All right. I can flag it before the meeting and change the recurring conflict. Let’s try that for the next two meetings.';
  }

  if (signals.shouldEnd) {
    return 'I don’t think we’re going to settle this right now. Let’s stop here and return to it with a clearer path.';
  }

  if (signals.overusesAuthority) {
    return 'You don’t need to perform the boss thing with me. I know you’re the manager.';
  }

  if (signals.asksForPerspective && signals.hiddenFactStatement) {
    return `${signals.hiddenFactStatement} I should have messaged you, but I’m not just ignoring the commitment.`;
  }

  if (signals.usesSpecificEvidence) {
    return 'I hear the dates. But you never treated me like this before the promotion—why is this suddenly formal?';
  }

  return 'It’s been a few minutes here and there. The work still gets done, so I’m not sure why this needs to be a whole thing.';
}

function selectHiddenFact(
  scenario: ScenarioDefinition,
  managerText: string,
  asksForPerspective: boolean,
  revealedFactIds: readonly string[],
) {
  if (!asksForPerspective) {
    return undefined;
  }

  const unrevealedFacts = scenario.hiddenFacts.filter(
    (fact) => !revealedFactIds.includes(fact.id),
  );
  const legacyRevealPatterns: Readonly<Record<string, RegExp>> = {
    'client-call-overrun':
      /\b(late|lateness|meeting|cause|causing|happen|happening|behind)\b/,
    'promotion-disappointment':
      /\b(promotion|role|relationship|between us|tension|formal|friendship)\b/,
    'public-correction':
      /\b(land|felt|feel|approach|front of|team|embarrass|public)\b/,
    'late-scope-change':
      /\b(scope|requirement|requirements|change|changed|added|deadline|delivery|happened)\b/,
    'board-preview':
      /\b(friday|outcome|need from friday|achieve|board|preview|deliverable)\b/,
  };
  const revealPatterns =
    SCENARIO_FIXTURES[scenario.id]?.hiddenFactRevealPatterns ??
    legacyRevealPatterns;

  return unrevealedFacts.find((fact) =>
    revealPatterns[fact.id]?.test(managerText),
  );
}

function getRepeatedQualityFixtureText(signals: FixtureSignals) {
  if (signals.backsAway) {
    return 'Okay. If fixing the reports before they go out is enough, I’ll keep handling corrections the same way.';
  }

  if (signals.nextStepEstablished) {
    return 'All right. Let’s update the checklist and use a peer review before the next few reports. I can flag it early if the account load gets in the way.';
  }

  if (signals.shouldEnd) {
    return 'I understand the concern, but I don’t think we have a workable quality plan yet. Let’s stop here and revisit it with a clearer process.';
  }

  if (signals.overusesAuthority) {
    return 'Pulling rank doesn’t explain which part of my process you think is failing.';
  }

  if (signals.asksForPerspective && signals.hiddenFactStatement) {
    return `${signals.hiddenFactStatement} I should have raised that instead of assuming I just needed to work faster.`;
  }

  if (signals.usesSpecificEvidence) {
    return 'I hear the examples, but I corrected each one before a client saw it. That doesn’t mean I’m careless.';
  }

  return 'I fixed everything that was flagged. Corrections are part of review, so I don’t see this as a performance pattern.';
}

function getAfterHoursFixtureText(signals: FixtureSignals) {
  if (signals.backsAway) {
    return 'Okay. Then I’ll keep messaging when something comes up and assume you’ll answer if you can.';
  }

  if (signals.nextStepEstablished) {
    return 'That works. I’ll wait for response hours on routine decisions and use the escalation route only when it meets the urgency rule.';
  }

  if (signals.shouldEnd) {
    return 'I still don’t know what support is available after hours, so this isn’t resolved. Let’s stop here until we can define that clearly.';
  }

  if (signals.overusesAuthority) {
    return 'I’m asking for support, not permission to ignore a customer problem. Being my manager doesn’t make the uncertainty disappear.';
  }

  if (signals.asksForPerspective && signals.hiddenFactStatement) {
    return `${signals.hiddenFactStatement} That’s why waiting without a clear backup feels risky to me.`;
  }

  if (signals.usesSpecificEvidence) {
    return 'I know I followed up, but I marked the decisions that felt risky. I wasn’t trying to demand that you stay online.';
  }

  return 'If something comes up and I can’t get an answer, I’m the one left carrying the risk. I thought checking with you was the responsible thing.';
}

function getLastMinuteScopeFixtureText(signals: FixtureSignals) {
  if (signals.backsAway) {
    return 'Good. Then I still need the export in Friday’s release—please make the plan work.';
  }

  if (signals.nextStepEstablished) {
    return 'A sample walkthrough for Monday and a properly planned production export works. Send me what the demo will cover and the follow-up date.';
  }

  if (signals.shouldEnd) {
    return 'We still don’t have an option that protects the client outcome. Let’s stop here and revisit it when there’s a credible tradeoff.';
  }

  if (signals.overusesAuthority) {
    return 'This isn’t about who controls the team. I need a partner who can help protect an important client outcome.';
  }

  if (signals.asksForPerspective && signals.hiddenFactStatement) {
    return `${signals.hiddenFactStatement} If we can cover that need credibly, I have room on the production timing.`;
  }

  if (signals.usesSpecificEvidence) {
    return 'I understand the estimate, but this account is important. I need an option that protects the client conversation, not just a reason to delay.';
  }

  return 'It’s one export for an important account. I need the team to treat it like a priority and find a way to include it Friday.';
}

function getFeedbackFixtureText(signals: FixtureSignals) {
  if (signals.backsAway) {
    return 'Okay. If this isn’t really a concern, then I’m not sure what we’re trying to solve.';
  }

  if (signals.nextStepEstablished) {
    return 'All right. If scope changes again, I’ll flag the impact immediately so we can reset the commitment together.';
  }

  if (signals.shouldEnd) {
    return 'I still don’t think the feedback accounts for the scope changes, so we haven’t resolved this. Let’s stop here for now.';
  }

  if (signals.overusesAuthority) {
    return 'Telling me you’re the manager doesn’t make the feedback fair.';
  }

  if (signals.asksForPerspective && signals.hiddenFactStatement) {
    return `${signals.hiddenFactStatement} That’s why I don’t think these were two clean misses.`;
  }

  if (signals.usesSpecificEvidence) {
    return 'I hear the dates, but you’re treating them like the scope stayed fixed. It didn’t.';
  }

  return 'I still think you’re singling me out without acknowledging what changed.';
}

function getPushbackFixtureText(signals: FixtureSignals) {
  if (signals.backsAway) {
    return 'Okay, but I still need Friday. Let me know when you’ve found a way to make it work.';
  }

  if (signals.nextStepEstablished) {
    return 'A board-ready preview by Friday and the full release next Wednesday works. Send me the cut-down scope today.';
  }

  if (signals.shouldEnd) {
    return 'We still don’t have a credible way to protect Friday’s outcome. Let’s stop here and return with a real tradeoff.';
  }

  if (signals.overusesAuthority) {
    return 'This isn’t about titles. I need you to bring me a credible way to hit the outcome.';
  }

  if (signals.asksForPerspective && signals.hiddenFactStatement) {
    return `${signals.hiddenFactStatement} If you can give me that by Friday, we have room on the full release.`;
  }

  if (signals.usesSpecificEvidence) {
    return 'I understand the tradeoffs, but this is the priority. What can you change without losing the outcome?';
  }

  return 'I know it’s tight. I still need the team to find a way to make Friday work.';
}
