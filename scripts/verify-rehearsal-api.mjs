const baseUrl = process.env.REHEARSAL_API_URL ?? 'http://127.0.0.1:8081';

const managerTurns = [
  'You were 12, 15, and 10 minutes late to our last three meetings, and the team repeated decisions twice.',
  'Help me understand what has been causing the late arrivals.',
  'I know the promotion changed our relationship, and I do not want to pretend that tension is not here.',
  'The expectation is that you join on time or message me before the meeting when a client call runs over.',
  'Can we agree that you will move the recurring call and warn me before the next meeting if it still conflicts?',
];

let state = {
  trust: 0.56,
  openness: 0.42,
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
const transcript = [];
const actorModels = [];

for (const [index, text] of managerTurns.entries()) {
  transcript.push({ id: `manager-${index + 1}`, speaker: 'manager', text });
  const response = await fetch(`${baseUrl}/api/rehearsal/respond`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioId: 'former-peer',
      scenarioVersion: 1,
      scenarioDefinition: null,
      reactionProfile: 'default',
      state,
      transcript: transcript.map(({ speaker, text: turnText }) => ({
        speaker,
        text: turnText,
      })),
      latestManagerTurn: text,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Actor turn ${index + 1} failed: ${JSON.stringify(payload)}`);
  }
  state = payload.nextState;
  actorModels.push(payload.model);
  transcript.push({
    id: `counterpart-${index + 1}`,
    speaker: 'counterpart',
    text: payload.actorTurn.spokenText,
  });
}

if (state.phase !== 'closed' || state.turnNumber !== managerTurns.length) {
  throw new Error(`The rehearsal did not close on turn five: ${JSON.stringify(state)}`);
}

const finalCounterpartTurn = transcript.at(-1);
if (
  finalCounterpartTurn?.speaker !== 'counterpart' ||
  !finalCounterpartTurn.text.trim() ||
  /\?\s*$/.test(finalCounterpartTurn.text)
) {
  throw new Error(
    `The rehearsal did not finish with an unmistakable counterpart closing line: ${JSON.stringify(finalCounterpartTurn)}`,
  );
}

const evaluatorResponse = await fetch(`${baseUrl}/api/rehearsal/evaluate`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    scenarioId: 'former-peer',
    scenarioVersion: 1,
    scenarioDefinition: null,
    transcript,
    finalState: state,
  }),
});
const evaluatorPayload = await evaluatorResponse.json();
if (!evaluatorResponse.ok) {
  throw new Error(`Evaluator failed: ${JSON.stringify(evaluatorPayload)}`);
}

for (const moment of evaluatorPayload.debrief.moments) {
  const sourceTurn = transcript.find((turn) => turn.id === moment.turnId);
  if (
    sourceTurn?.speaker !== 'manager' ||
    !sourceTurn.text.includes(moment.quote)
  ) {
    throw new Error(`Moment ${moment.id} is not backed by an exact manager quote.`);
  }
}

console.log(
  JSON.stringify(
    {
      actorModels: Array.from(new Set(actorModels)),
      actorTurns: state.turnNumber,
      evaluatorModel: evaluatorPayload.model,
      finalCounterpartLine: finalCounterpartTurn.text,
      finalPhase: state.phase,
      moments: evaluatorPayload.debrief.moments.length,
      revealedFactIds: state.revealedFactIds,
      resolution: state.resolution,
    },
    null,
    2,
  ),
);
