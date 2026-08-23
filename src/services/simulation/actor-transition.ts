import type { ScenarioDefinition } from '@/domain/scenario';
import type {
  ActorTurn,
  ConversationResolution,
  SimulationPhase,
  SimulationState,
} from '@/domain/simulation-state';
import { ActorContractError } from '@/services/api/actor-contract';

const PHASE_ORDER: readonly SimulationPhase[] = [
  'opening',
  'exploration',
  'resistance',
  'resolution',
  'closed',
];
const MAX_EMOTIONAL_DELTA = 0.18;
export const MIN_COUNTERPART_TURNS = 5;
export const MAX_COUNTERPART_TURNS = 8;

export type ActorTransitionConstraints = {
  readonly allowedPhases: readonly SimulationPhase[];
  readonly canEndConversation: boolean;
  readonly mustEndConversation: boolean;
  readonly nextTurnNumber: number;
};

export type ResolvedActorTransition = {
  readonly actorTurn: ActorTurn;
  readonly nextState: SimulationState;
};

export function getActorTransitionConstraints(
  currentState: SimulationState,
): ActorTransitionConstraints {
  const nextTurnNumber = currentState.turnNumber + 1;
  const canEndConversation = nextTurnNumber >= MIN_COUNTERPART_TURNS;
  const mustEndConversation = nextTurnNumber >= MAX_COUNTERPART_TURNS;

  if (mustEndConversation || currentState.phase === 'closed') {
    return {
      allowedPhases: ['closed'],
      canEndConversation: true,
      mustEndConversation: true,
      nextTurnNumber,
    };
  }

  const currentIndex = PHASE_ORDER.indexOf(currentState.phase);
  const allowedPhases = PHASE_ORDER.slice(
    currentIndex,
    currentIndex + 2,
  ).filter((phase) => phase !== 'closed');

  return {
    allowedPhases: canEndConversation
      ? [...allowedPhases, 'closed']
      : allowedPhases,
    canEndConversation,
    mustEndConversation: false,
    nextTurnNumber,
  };
}

export function resolveActorTransition(
  scenario: ScenarioDefinition,
  currentState: SimulationState,
  proposal: ActorTurn,
): ResolvedActorTransition {
  const proposedState = proposal.statePatch as SimulationState;
  const transitionConstraints = getActorTransitionConstraints(currentState);
  const { nextTurnNumber } = transitionConstraints;

  if (proposal.endConversation && !transitionConstraints.canEndConversation) {
    throw new ActorContractError(
      `The actor cannot end the rehearsal before turn ${MIN_COUNTERPART_TURNS}.`,
    );
  }

  const shouldEndConversation =
    proposal.endConversation || transitionConstraints.mustEndConversation;
  const knownCoreFactIds = new Set(scenario.coreFacts.map((fact) => fact.id));
  const knownHiddenFactIds = new Set(
    scenario.hiddenFacts.map((fact) => fact.id),
  );
  const knownResistanceMoveIds = new Set(
    scenario.resistanceMoves.map((move) => move.id),
  );

  assertKnownIds(
    proposal.revealedFactIds,
    knownHiddenFactIds,
    'revealedFactIds',
  );
  assertKnownIds(
    proposedState.revealedFactIds,
    knownHiddenFactIds,
    'statePatch.revealedFactIds',
  );
  assertKnownIds(
    proposedState.unresolvedObjectionIds,
    knownResistanceMoveIds,
    'statePatch.unresolvedObjectionIds',
  );

  if (
    proposal.invokedResistanceMoveId &&
    !knownResistanceMoveIds.has(proposal.invokedResistanceMoveId)
  ) {
    throw new ActorContractError('The actor invoked an unknown resistance move.');
  }

  const revealedFactIds = unionKnownIds(
    currentState.revealedFactIds,
    proposedState.revealedFactIds,
    proposal.revealedFactIds,
  );
  const factsAvailableToActor = new Set([
    ...knownCoreFactIds,
    ...revealedFactIds,
  ]);

  assertKnownIds(
    proposedState.disputedFactIds,
    factsAvailableToActor,
    'statePatch.disputedFactIds',
  );
  assertKnownIds(
    proposedState.acknowledgedFactIds,
    factsAvailableToActor,
    'statePatch.acknowledgedFactIds',
  );

  const phase = resolvePhase(
    currentState.phase,
    proposedState.phase,
    shouldEndConversation,
  );
  const resolution = resolveResolution(
    phase,
    proposedState.resolution,
    shouldEndConversation,
  );
  const nextState: SimulationState = {
    trust: clampDelta(
      currentState.trust,
      proposedState.trust,
      MAX_EMOTIONAL_DELTA,
    ),
    openness: clampDelta(
      currentState.openness,
      proposedState.openness,
      MAX_EMOTIONAL_DELTA,
    ),
    phase,
    turnNumber: nextTurnNumber,
    revealedFactIds,
    disputedFactIds: unionKnownIds(
      currentState.disputedFactIds,
      proposedState.disputedFactIds,
    ),
    acknowledgedFactIds: unionKnownIds(
      currentState.acknowledgedFactIds,
      proposedState.acknowledgedFactIds,
    ),
    unresolvedObjectionIds: proposedState.unresolvedObjectionIds,
    issueWasMadeSpecific:
      currentState.issueWasMadeSpecific ||
      proposedState.issueWasMadeSpecific,
    managerAskedForPerspective:
      currentState.managerAskedForPerspective ||
      proposedState.managerAskedForPerspective,
    expectationIsClear:
      currentState.expectationIsClear || proposedState.expectationIsClear,
    managerBackedAway:
      currentState.managerBackedAway || proposedState.managerBackedAway,
    nextStepEstablished:
      currentState.nextStepEstablished || proposedState.nextStepEstablished,
    resolution,
  };

  return {
    actorTurn: {
      ...proposal,
      spokenText: proposal.spokenText.replace(/\s+/g, ' ').trim(),
      statePatch: nextState,
      revealedFactIds: difference(
        revealedFactIds,
        currentState.revealedFactIds,
      ),
      endConversation: phase === 'closed',
    },
    nextState,
  };
}

function resolvePhase(
  current: SimulationPhase,
  proposed: SimulationPhase,
  endConversation: boolean,
) {
  if (endConversation) {
    return 'closed';
  }

  if (proposed === 'closed') {
    throw new ActorContractError(
      'The actor cannot close the conversation without endConversation.',
    );
  }

  const currentIndex = PHASE_ORDER.indexOf(current);
  const proposedIndex = PHASE_ORDER.indexOf(proposed);

  if (proposedIndex < currentIndex || proposedIndex > currentIndex + 1) {
    throw new ActorContractError(
      `Illegal phase transition from ${current} to ${proposed}.`,
    );
  }

  return proposed;
}

function resolveResolution(
  phase: SimulationPhase,
  proposed: ConversationResolution,
  endConversation: boolean,
) {
  if (phase !== 'resolution' && !endConversation) {
    return 'none';
  }

  if (endConversation && proposed === 'none') {
    return 'unresolved';
  }

  return proposed;
}

function assertKnownIds(
  values: readonly string[],
  knownIds: ReadonlySet<string>,
  label: string,
) {
  const unknownId = values.find((value) => !knownIds.has(value));
  if (unknownId) {
    throw new ActorContractError(`${label} contains unknown ID: ${unknownId}.`);
  }
}

function unionKnownIds(...groups: readonly (readonly string[])[]) {
  return Array.from(new Set(groups.flatMap((group) => [...group])));
}

function difference(values: readonly string[], previous: readonly string[]) {
  const previousSet = new Set(previous);
  return values.filter((value) => !previousSet.has(value));
}

function clampDelta(current: number, proposed: number, maximumDelta: number) {
  const clamped = Math.min(
    1,
    Math.max(0, Math.min(current + maximumDelta, Math.max(current - maximumDelta, proposed))),
  );

  return Math.round(clamped * 1_000) / 1_000;
}
