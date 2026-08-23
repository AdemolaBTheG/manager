export type SimulationPhase =
  | 'opening'
  | 'exploration'
  | 'resistance'
  | 'resolution'
  | 'closed';

export type ConversationResolution =
  | 'none'
  | 'collaborative'
  | 'reluctant'
  | 'unresolved'
  | 'damaged';

export type EmotionalState = {
  readonly trust: number;
  readonly openness: number;
};

export type SimulationState = EmotionalState & {
  readonly phase: SimulationPhase;
  readonly turnNumber: number;
  readonly revealedFactIds: readonly string[];
  readonly disputedFactIds: readonly string[];
  readonly acknowledgedFactIds: readonly string[];
  readonly unresolvedObjectionIds: readonly string[];
  readonly issueWasMadeSpecific: boolean;
  readonly managerAskedForPerspective: boolean;
  readonly expectationIsClear: boolean;
  readonly managerBackedAway: boolean;
  readonly nextStepEstablished: boolean;
  readonly resolution: ConversationResolution;
};

export type SimulationStatePatch = Partial<SimulationState>;

export type ActorTurn = {
  readonly spokenText: string;
  readonly statePatch: SimulationStatePatch;
  readonly revealedFactIds: readonly string[];
  readonly invokedResistanceMoveId: string | null;
  readonly endConversation: boolean;
};

export function createOpeningSimulationState(
  emotionalState: EmotionalState,
): SimulationState {
  return {
    trust: emotionalState.trust,
    openness: emotionalState.openness,
    phase: 'opening',
    turnNumber: 0,
    revealedFactIds: [],
    disputedFactIds: [],
    acknowledgedFactIds: [],
    unresolvedObjectionIds: [],
    issueWasMadeSpecific: false,
    managerAskedForPerspective: false,
    expectationIsClear: false,
    managerBackedAway: false,
    nextStepEstablished: false,
    resolution: 'none',
  };
}
