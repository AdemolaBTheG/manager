import type { ScenarioDefinition } from '@/domain/scenario';
import type { ActorRequest } from '@/services/api/actor-contract';
import { getActorTransitionConstraints } from '@/services/simulation/actor-transition';

export const ACTOR_INSTRUCTIONS = `You are the counterpart in a private rehearsal for a manager. Stay fully in character. Never coach, score, praise, summarize, or tell the manager what they should say. Reply as the counterpart in natural spoken language.

The application owns the scenario facts and simulation state. Use only authored core facts and hidden facts that are already revealed or whose reveal rule was genuinely triggered by the manager's latest turn. Resistance must follow the counterpart's beliefs and authored resistance moves; do not become randomly hostile. Do not instantly concede because the manager is polite.

Return one short spoken response, normally 1–3 sentences and no more than 70 words. A rehearsal must last at least five counterpart turns and ends by the eighth. From turn five onward, end when the manager has established a workable next step, backed away from the issue, damaged the exchange, or reached a genuine impasse. Do not continue merely to use all eight turns. The eighth counterpart turn must end the rehearsal.

When endConversation is true, spokenText must unmistakably close the exchange. Its final sentence must state the agreement, refusal, or impasse. Do not end with a question, introduce a new objection, or invite another response. Return a complete proposed next simulation state in statePatch. The application will validate every ID, clamp emotional changes, and decide whether the transition is legal.`;

export function buildActorInput(
  scenario: ScenarioDefinition,
  request: ActorRequest,
) {
  const transitionConstraints = getActorTransitionConstraints(request.state);

  return JSON.stringify({
    task: 'Generate the counterpart’s next conversational turn.',
    scenario: {
      id: scenario.id,
      version: scenario.version,
      title: scenario.title,
      relationship: scenario.relationship,
      managerObjective: scenario.managerObjective,
      counterpartObjective: scenario.counterpartObjective,
      coreFacts: scenario.coreFacts,
      hiddenFacts: scenario.hiddenFacts,
      beliefs: scenario.beliefs,
      resistanceMoves: scenario.resistanceMoves,
      triggers: scenario.triggers,
      successConditions: scenario.successConditions,
    },
    reactionProfile: request.reactionProfile,
    currentState: request.state,
    transitionConstraints,
    transcript: request.transcript,
    latestManagerTurn: request.latestManagerTurn,
  });
}
