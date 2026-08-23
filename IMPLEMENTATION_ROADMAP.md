# Implementation Roadmap

> **The conversation before the conversation.**  
> A private rehearsal room for new managers.

Last updated: 2026-08-19

## The answer: what to build first

Start with one complete, text-based vertical slice of the hero scenario:

> **You were promoted. Your former peer was not.**

The first slice should let a user:

1. read the scenario;
2. rate their readiness;
3. conduct a short rehearsal;
4. encounter one believable challenge;
5. finish the conversation;
6. receive a debrief citing their exact words;
7. rewind one consequential moment;
8. answer differently and see a different branch;
9. receive a short **Before you go in** card;
10. rate their readiness again.

Build this with text input and a plain visual treatment first. Once the state model, actor behavior, evidence links, and branching work, replace text input/output with turn-based voice. Do not start with the custom situation form, realtime speech, a large scenario library, a sophisticated Skia shader, subscriptions, notifications, or a calendar.

This ordering proves the actual product advantage before investing in presentation and infrastructure.

## Why this is the right sequence

The research supports four implementation principles:

1. **Practice must lead back into practice.** The *Rehearsal* study found that counterfactual simulated practice outperformed lecture-only instruction in a later unaided conflict task. Participants reduced escalating strategies and increased cooperative strategies. The product should therefore connect feedback directly to a retry, not end with an essay.
2. **Realism needs structure.** The CommCoach study found demand for realistic, adaptive, low-risk practice, contextual feedback, and user control over personas. It also highlights tension between open-ended AI behavior and consistent training objectives.
3. **The system must control state.** The language model may generate natural dialogue, but the application must own facts, revealed information, relationship state, resistance, objectives, and valid transitions.
4. **Voice is an interface, not the learning model.** Expo SDK 57 already supports recording, metering, playback, and realtime PCM microphone capture. We can add voice after the simulation contract is reliable without changing the underlying domain model.

## Product boundary

### Build

- A simulator for difficult workplace conversations.
- A focused experience for new managers.
- A real upcoming conversation as the primary use case.
- Curated scenarios with authored facts, motives, and resistance.
- Evidence-linked coaching about clarity, curiosity, boundaries, accountability, and next steps.
- Stateful Rewind and Pressure Test.
- A practical preparation card, not a generated script.

### Do not build

- A generic chatbot.
- A general career coach.
- A course or content library.
- A perfect-script generator.
- Arbitrary leadership, confidence, empathy, or tone scores.
- Camera or body-language analysis.
- Streaks, XP, achievements, or leaderboards.
- A calendar in the MVP.
- Full-duplex voice before the turn-based loop works.
- A large scenario catalog before the hero scenario is excellent.

## MVP definition

The smallest credible MVP contains:

- one excellent authored hero scenario;
- one guided flow for a real upcoming conversation;
- a pre-rehearsal readiness rating;
- turn-based voice rehearsal;
- a structured employee state that persists across turns;
- a separate actor and evaluator;
- an outcome-first debrief with two or three evidence-linked moments;
- one stateful rewind;
- one pressure-test reaction;
- a **Before you go in** card;
- a post-rehearsal readiness rating;
- private-session behavior and clear privacy language.

Three curated scenarios are enough for the first usable beta. Expand to eight to twelve only after the hero scenario passes the quality bar.

## Core loop

```text
Home
  -> Choose a curated scenario or bring a real conversation
  -> Confirm the situation model
  -> Rate readiness
  -> Rehearse
  -> Debrief
  -> Rewind one moment
  -> Compare what changed
  -> Pressure Test another reaction
  -> Before you go in
  -> Rate readiness again
```

The primary product loop is complete only when feedback returns the user to practice.

## Navigation and screen map

Use a native stack, not tabs. This product is one focused workflow, and tabs would imply multiple equally important destinations that do not exist yet.

| Route | Purpose | MVP |
| --- | --- | --- |
| `/` | Home: bring a real conversation or choose a scenario | Yes |
| `/scenarios` | Small curated scenario list | Yes |
| `/scenarios/[scenarioId]` | Scenario briefing and goal | Yes |
| `/prepare` | Guided real-situation builder | Yes |
| `/prepare/confirm` | Editable AI interpretation of the situation | Yes |
| `/session/[sessionId]/readiness` | Pre-rehearsal readiness | Yes |
| `/session/[sessionId]/rehearse` | Voice-first rehearsal room | Yes |
| `/session/[sessionId]/debrief` | Outcome, moments, and foundations | Yes |
| `/session/[sessionId]/rewind/[momentId]` | Retry from an exact snapshot | Yes |
| `/session/[sessionId]/pressure-test` | Select and run another reaction | Yes |
| `/session/[sessionId]/plan` | Preparation card and post-readiness | Yes |
| `/history` | Saved sessions | Later |
| `/settings` | Privacy, account, subscription | Later |

Route files should contain routing and screen configuration only. Full-screen UI belongs under `src/screens`; reusable UI, data, and services stay in their dedicated folders.

Suggested structure:

```text
src/
  app/
    _layout.tsx
    index.tsx
    prepare.tsx
    prepare/
      confirm.tsx
    scenarios/
      index.tsx
      [scenarioId].tsx
    session/
      [sessionId]/
        readiness.tsx
        rehearse.tsx
        debrief.tsx
        pressure-test.tsx
        plan.tsx
        rewind/
          [momentId].tsx
  screens/
    home-screen.tsx
    scenario-list-screen.tsx
    scenario-briefing-screen.tsx
    preparation-screen.tsx
    rehearsal-screen.tsx
    debrief-screen.tsx
    rewind-screen.tsx
    pressure-test-screen.tsx
    preparation-plan-screen.tsx
  domain/
    scenario.ts
    session.ts
    simulation-state.ts
    coaching.ts
  services/
    api/
    audio/
    storage/
  data/
    scenarios.ts
```

## The domain model to establish before more screens

### Scenario definition

Every curated or generated scenario should normalize to the same contract:

```ts
type ScenarioDefinition = {
  id: string;
  version: number;
  title: string;
  relationship: {
    counterpartName: string;
    counterpartRole: string;
    relationshipType: 'direct-report' | 'former-peer' | 'manager' | 'stakeholder';
    history: string[];
  };
  managerObjective: string;
  counterpartObjective: string;
  coreFacts: ScenarioFact[];
  hiddenFacts: ScenarioFact[];
  beliefs: Belief[];
  openingState: EmotionalState;
  resistanceMoves: ResistanceMove[];
  triggers: StateTrigger[];
  successConditions: SuccessCondition[];
  coachingFocus: CoachingDimension[];
};
```

Facts need stable IDs. The application should track whether each fact is hidden, revealed, disputed, or acknowledged.

### Simulation state

Create the simulation state before calling any model:

```ts
type SimulationState = {
  phase: 'opening' | 'exploration' | 'resistance' | 'resolution' | 'closed';
  turnNumber: number;
  revealedFactIds: string[];
  acknowledgedFactIds: string[];
  unresolvedObjectionIds: string[];
  issueWasMadeSpecific: boolean;
  managerAskedForPerspective: boolean;
  expectationIsClear: boolean;
  managerBackedAway: boolean;
  nextStepEstablished: boolean;
  trust: number;
  openness: number;
  resolution: 'none' | 'collaborative' | 'reluctant' | 'unresolved' | 'damaged';
};
```

Numbers such as `trust` and `openness` are internal implementation details. Never show an “Alex is 72% angry” meter to the user.

### Actor response

The actor endpoint should return structured output, not prose alone:

```ts
type ActorTurn = {
  spokenText: string;
  statePatch: Partial<SimulationState>;
  revealedFactIds: string[];
  invokedResistanceMoveId: string | null;
  endConversation: boolean;
};
```

Validate the result against a strict schema on the server. Reject unknown fact IDs, impossible phase changes, and out-of-range values. The model proposes a transition; application code decides whether it is legal.

### Evidence-linked debrief

```ts
type Debrief = {
  outcome: string;
  foundations: Array<{
    key: 'purpose' | 'specificity' | 'evidence' | 'perspective' | 'boundary' | 'path';
    status: 'clear' | 'partial' | 'missing';
  }>;
  moments: Array<{
    id: string;
    turnId: string;
    quote: string;
    observation: string;
    consequence: string;
    rewindable: boolean;
    approaches: Array<{
      style: 'direct' | 'curious' | 'relational';
      principle: string;
    }>;
  }>;
  preparationCard: PreparationCard;
};
```

Every quoted phrase must be validated as an exact substring of the referenced transcript turn. If evidence validation fails, omit the claim rather than inventing support.

### Preparation card

The final card should contain:

- purpose;
- facts to anchor on;
- the request or boundary;
- what to remain curious about;
- likely pushback;
- one principle to remember.

It must not be a word-for-word script.

## Session and branch model

Do not model a rehearsal as one mutable chat transcript. Model it as an immutable tree of branches.

```text
Session
  Branch A (original)
    Turn 1
    Snapshot 1
    Turn 2
    Snapshot 2  <- consequential moment
    Turn 3
  Branch B (rewind from Snapshot 2)
    Replacement Turn 3
    New actor response
  Branch C (pressure test)
    Same scenario facts
    Different reaction profile
```

Before every manager turn, save a state snapshot. Stateful Rewind should:

1. select the snapshot immediately before the chosen manager turn;
2. create a new branch referencing the original branch and fork turn;
3. copy the transcript only up to that point;
4. restore the exact scenario state;
5. accept the replacement manager response;
6. continue through the normal actor pipeline;
7. preserve the original branch for comparison.

Pressure Test should create a new branch from the scenario's opening state. It may change only the reaction profile and resistance ordering. It must preserve the core facts, relationship, and managerial objective.

## Application state machines

### Session lifecycle

```text
draft
  -> confirmed
  -> readiness-recorded
  -> rehearsing
  -> debriefing
  -> debrief-ready
  -> rewinding or pressure-testing
  -> plan-ready
  -> complete
```

### Rehearsal UI

```text
idle
  -> listening
  -> transcribing
  -> thinking
  -> speaking
  -> listening
  -> complete

Any state -> recoverable-error -> prior safe state
```

Persist the session lifecycle, but keep transient microphone and playback state in memory.

## Backend boundaries

Use a backend for every AI request. Never ship model API secrets in the Expo app.

Recommended services:

```text
Expo app
  -> authenticated API
      -> scenario builder
      -> actor
      -> evaluator
      -> speech transcription
      -> speech generation
  -> Supabase
      -> authentication
      -> session/branch/turn records
      -> private temporary audio storage
```

Keep provider-specific code behind application interfaces:

```ts
interface ActorService {
  respond(input: ActorInput): Promise<ActorTurn>;
}

interface EvaluatorService {
  evaluate(input: EvaluationInput): Promise<Debrief>;
}

interface SpeechService {
  transcribe(audioUri: string): Promise<string>;
  synthesize(text: string, voiceId: string): Promise<AudioResult>;
}
```

This lets the simulation engine remain stable if the model or speech provider changes.

## Persistence model

Suggested server tables:

| Table | Important fields |
| --- | --- |
| `scenarios` | `id`, `slug`, `title`, `published_version` |
| `scenario_versions` | `scenario_id`, `version`, `definition_json`, `created_at` |
| `practice_sessions` | `id`, `user_id`, `scenario_version_id`, `privacy_mode`, `status`, timestamps |
| `branches` | `id`, `session_id`, `parent_branch_id`, `fork_turn_id`, `reaction_profile` |
| `turns` | `id`, `branch_id`, `sequence`, `speaker`, `text`, `audio_path`, timestamps |
| `state_snapshots` | `id`, `branch_id`, `before_turn_id`, `state_json` |
| `debriefs` | `id`, `branch_id`, `debrief_json`, `model_version`, `prompt_version` |
| `readiness_ratings` | `session_id`, `stage`, `rating`, `created_at` |

Use Row Level Security so authenticated users can access only their own sessions and storage objects. Private-session data should either remain local or be deleted from the server after the session according to an explicit retention policy.

For the first local engine prototype, fixtures and in-memory data are sufficient. Add remote persistence only after a complete branch can be created, evaluated, and rewound locally.

## Voice implementation

### MVP: turn-based voice

Use `expo-audio` and keep the interaction explicit:

```text
Tap or hold to speak
  -> record one manager turn
  -> stop recording
  -> upload or send audio to backend
  -> transcribe
  -> run actor and state transition
  -> synthesize counterpart speech
  -> play response
  -> return to listening
```

Recommended voice settings:

- mono input;
- speech-oriented sample rate and encoding;
- visible listening, thinking, and speaking states;
- a manual stop control before automatic turn detection;
- transcript correction when transcription confidence is poor;
- no background recording;
- immediate cleanup of temporary audio when retention is disabled.

Expo SDK 57's `expo-audio` supports recorder metering for the listening visual and realtime PCM capture through `useAudioStream`. Keep realtime PCM capture for a later iteration; a recorded turn is easier to retry, audit, and attach to transcript evidence.

### Stretch: realtime speech

Only begin realtime speech after the turn-based loop meets its quality bar. A realtime implementation may use WebRTC for low-latency speech-to-speech, server voice activity detection, and eventual interruption/barge-in. Preserve the same actor state contract and persist a normalized transcript plus state transitions.

Realtime speech does not replace the application-controlled simulation state.

## Conversation Field implementation

Treat the field as a state indicator, not an independent product milestone.

### First version

- simple layered circles or gradients;
- Reanimated scale and opacity;
- microphone metering drives restrained amplitude;
- distinct behavior for listening, thinking, speaking, and complete;
- reduced-motion fallback.

### Later Skia version

- manager speaking: energy affects the outer membrane;
- counterpart speaking: energy moves through the interior;
- thinking: field contracts inward;
- complete: field flattens into the debrief timeline;
- rewind: the selected timeline point reforms into the field.

Do not block the rehearsal engine on shaders, displacement maps, or custom runtime effects.

## Implementation phases

### Phase 0 — Foundation and contracts

**Goal:** establish the product skeleton and make invalid simulation state impossible to ignore.

Tasks:

- Keep the existing focused home screen.
- Add the stack routes listed above with placeholder screens.
- Create domain types for scenarios, sessions, turns, branches, state, debriefs, and preparation cards.
- Add runtime schema validation for all AI-shaped data.
- Author the former-peer scenario as versioned structured data.
- Add a deterministic actor fixture with three possible responses.
- Add an in-memory session repository.
- Add unit tests for state transition validation.

Exit criteria:

- The app can create a session from the former-peer scenario.
- Invalid fact IDs and illegal state transitions are rejected.
- The scenario can be replayed deterministically without a model.

### Phase 1 — Text rehearsal vertical slice

**Goal:** prove the simulator before adding audio.

Tasks:

- Build scenario briefing and readiness screens.
- Build a minimal rehearsal screen with text input.
- Save every turn and pre-turn state snapshot.
- Implement actor API boundary and a mock adapter.
- Implement an end-conversation action.
- Ensure the actor remains in character and never coaches the user.
- Display no hints, scores, or state meters during rehearsal.

Exit criteria:

- A user can complete a five-to-eight-turn rehearsal.
- The counterpart challenges the manager for a scenario-backed reason.
- The hidden scope-change fact is revealed only after a relevant question or trigger.
- The transcript and snapshots are internally consistent.

### Phase 2 — Actor service and state engine

**Goal:** replace scripted replies with controlled natural dialogue.

Tasks:

- Implement the server actor endpoint.
- Send the scenario, current state, allowed transitions, transcript summary, and latest manager turn.
- Require a strict structured actor response.
- Validate and clamp state patches in application code.
- Version actor prompts and model configuration.
- Add retries for transient provider failures, but never replay a committed turn silently.
- Add a small regression suite of manager inputs for the hero scenario.

Exit criteria:

- The actor does not instantly concede after generic politeness.
- Facts remain stable across ten repeated runs.
- A resistance move follows authored triggers rather than random aggression.
- The same input and starting state produce behavior within an acceptable bounded range.

### Phase 3 — Evidence-based debrief

**Goal:** deliver coaching that is specific, short, and defensible.

Tasks:

- Implement a separate evaluator endpoint.
- Evaluate purpose, specificity, evidence, perspective, boundary, and path.
- Return one outcome sentence and no more than three moments.
- Require a turn ID and exact quote for every observation.
- Validate evidence against the stored transcript.
- Offer direct, curious, and relational principles without presenting a correct script.
- Generate the preparation card.
- Capture post-rehearsal readiness.

Exit criteria:

- Every coaching claim points to real transcript evidence.
- The outcome explains what remained resolved or unresolved.
- The evaluator does not reward verbosity as leadership.
- The preparation card is concise enough to scan immediately before a meeting.

### Phase 4 — Stateful Rewind

**Goal:** prove the memorable hero mechanic.

Tasks:

- Mark one or more debrief moments as rewindable.
- Fork an immutable branch from the snapshot before the selected manager turn.
- Replay the counterpart's preceding line.
- Accept a replacement response.
- Run the normal actor pipeline from restored state.
- Show a short **What changed** comparison based on state and outcome differences.
- Preserve the original branch.

Exit criteria:

- Rewind restores the exact facts, objections, and relationship state.
- The replacement response creates a new branch, not a rewritten transcript.
- A materially different response can reveal a different fact or produce a different outcome.
- The comparison is evidence-based and does not claim causal certainty beyond the simulation.

### Phase 5 — Turn-based voice

**Goal:** let managers practice their actual words aloud.

Tasks:

- Add microphone permission onboarding at the moment of first rehearsal.
- Implement recording, stop, cancel, upload, transcription, and cleanup.
- Let users correct a bad transcript before it becomes a committed turn.
- Add synthesized counterpart speech and playback controls.
- Implement listening, transcribing, thinking, and speaking UI states.
- Drive the simple Conversation Field from metering and playback samples.
- Test phone calls, headphones, Bluetooth disconnects, app backgrounding, and permission denial.

Exit criteria:

- A complete session can be performed without typing.
- Failed transcription never silently changes what the user meant.
- Audio interruption leaves the session recoverable.
- No microphone capture continues after leaving the rehearsal screen.

### Phase 6 — Real-situation builder

**Goal:** make tomorrow's actual conversation the hero use case.

Collect only:

- conversation type;
- relationship;
- observable facts;
- what needs to change;
- feared response;
- relationship context.

Tasks:

- Build short guided steps rather than one blank prompt.
- Show a privacy warning before free-text entry.
- Normalize input into the scenario contract.
- Show **Here is the situation I will simulate**.
- Let the user edit inferred facts, motivations, and context.
- Clearly distinguish user-provided facts from model-created possibilities.
- Add private-session mode.

Exit criteria:

- The user can correct every material inference before rehearsal.
- The model does not silently turn speculation into fact.
- The resulting custom scenario runs through the same engine as a curated one.

### Phase 7 — Pressure Test

**Goal:** train principles rather than memorized dialogue.

Tasks:

- Add defensive, upset, dismissive, quiet, blame-shifting, and authority-challenging reaction profiles.
- Start with defensive and authority-challenging only.
- Clone the base scenario and reset to its opening state.
- Preserve the facts and objective.
- Change resistance style, emotional expression, and ordering only.
- Compare how the manager adapted across runs.

Exit criteria:

- The reaction feels different without changing the underlying case.
- No pressure profile becomes a theatrical boss battle.
- The debrief recognizes multiple valid leadership styles.

### Phase 8 — Privacy, safety, and reliability

**Goal:** make the product safe enough for real workplace context.

Tasks:

- Add anonymous-use guidance: use first names or placeholders and omit confidential HR, medical, customer, and company information.
- Define retention rules for transcripts and audio.
- Delete private-session audio after transcription and private-session transcripts after completion or expiry.
- Apply authentication, Row Level Security, and private storage policies.
- Keep model and service keys server-side.
- Add rate limiting and abuse controls.
- Refuse to act as an HR, legal, disciplinary, or termination decision engine.
- Add a path for deleting all session data.
- Log model version, prompt version, latency, and validation errors without logging sensitive transcript content into analytics.

Exit criteria:

- One user cannot access another user's sessions or audio.
- Private sessions leave no retained server transcript after the defined cleanup point.
- Provider failures do not corrupt committed branches.
- Safety boundaries are visible and tested.

### Phase 9 — Monetization and launch instrumentation

**Goal:** satisfy the business requirement without obstructing the core demo.

Suggested entitlement:

- Free: hero scenarios and a limited number of real-situation rehearsals.
- Pro: additional real situations, saved history, additional rewinds, and Pressure Test profiles.

Tasks:

- Configure RevenueCat products, offering, entitlement, and customer identity.
- Build and test with an Expo development client; RevenueCat native purchases do not run in Expo Go.
- Put the paywall after the user has experienced the core value.
- Instrument setup completion, rehearsal completion, debrief viewed, rewind started/completed, pressure test completed, preparation card viewed, and readiness change.
- Never send transcript text or entered workplace details to product analytics.

Exit criteria:

- The judge or first-time user can experience the hero loop before a frustrating paywall.
- Restore purchases and entitlement refresh work.
- Analytics measure funnel behavior without collecting conversation content.

### Phase 10 — Stretch work

Only consider after the MVP is reliable:

- realtime speech-to-speech;
- automatic end-of-turn detection;
- barge-in and interruptions;
- richer Skia field and field-to-timeline transition;
- additional voices;
- post-real-conversation follow-up;
- saved history;
- calendar/reminder integration;
- role reversal;
- deliberate silence as a scenario mechanic.

## Exact first implementation backlog

Complete these in order:

1. Create the domain types and runtime schemas.
2. Author `former-peer` scenario version 1.
3. Add a deterministic state transition function.
4. Add session, branch, turn, and snapshot repositories in memory.
5. Create the scenario briefing route.
6. Create the readiness route.
7. Create the text rehearsal route.
8. Implement a scripted actor adapter.
9. Complete one five-turn branch.
10. Add the evaluator contract and fixture debrief.
11. Verify every debrief quote against a turn.
12. Implement Rewind as a branch fork.
13. Show **What changed**.
14. Replace the scripted actor with the server actor endpoint.
15. Replace the fixture evaluator with the server evaluator endpoint.
16. Add turn-based voice.
17. Add the guided real-situation builder.
18. Add one Pressure Test profile.
19. Add persistence and private-session cleanup.
20. Only then improve the Conversation Field.

## Quality and evaluation plan

### Actor regression cases

The hero scenario should be tested against at least these manager behaviors:

- vague criticism;
- specific observable evidence;
- asking for the counterpart's perspective;
- asserting authority without listening;
- backing away after fairness pushback;
- acknowledging scope change while maintaining an expectation;
- over-explaining to preserve approval;
- establishing a concrete next step.

For each case, assert allowed state changes and forbidden behavior. Example: generic empathy alone must not reveal the hidden scope-change fact or resolve the issue.

### Evaluator tests

Maintain representative transcripts with expected evidence:

- clear issue, weak path;
- warm but evasive;
- direct but incurious;
- curious but boundary abandoned;
- clear, curious, and concrete;
- new information invalidates part of the manager's assumption.

Test that:

- quoted evidence exists exactly;
- unsupported claims are rejected;
- the evaluator can recognize more than one successful style;
- no numeric personality score is produced;
- the output stays within the intended length.

### Manual experience tests

- Microphone permission denied.
- User cancels mid-turn.
- Transcription is wrong.
- Network drops after recording but before actor response.
- Actor response times out.
- TTS fails while text exists.
- User backgrounds the app while recording.
- User rewinds twice from the same moment.
- User pressure-tests after a rewind branch.
- User selects private-session mode.
- Accessibility with screen reader and reduced motion.

## Product metrics

Use metrics to validate the loop, not to gamify it:

- percentage of users who begin a rehearsal after setup;
- percentage who complete a rehearsal;
- percentage who open a moment that mattered;
- percentage who complete a rewind;
- percentage whose rewind branch has a different outcome or state trajectory;
- percentage who complete a pressure test;
- preparation-card view or share rate;
- before/after readiness change;
- evidence-validation failure rate;
- actor schema-validation failure rate;
- median time from manager turn end to counterpart audio start;
- private-session selection rate and cleanup success rate.

Do not optimize for session length, streaks, or the number of messages sent.

## Performance budgets

Initial product budgets, to be validated on real devices:

- visual response to microphone activity: immediate and frame-stable;
- transition to thinking state: under 100 ms after turn submission;
- text actor response: target median under 2.5 seconds;
- counterpart audio start in turn-based voice: target median under 4 seconds;
- debrief generation: target under 8 seconds with progressive status;
- branch restoration: under 250 ms after local data is available;
- no dropped frames caused by transcript rendering or the Conversation Field.

These are engineering targets, not externally promised guarantees.

## Package usage: now, later, and unnecessary for MVP

### Use now

- `expo-router`: stack navigation.
- `expo-audio`: recording, metering, playback, and later PCM streaming.
- `expo-symbols`: native iconography.
- `react-native-reanimated`: state transitions.
- `react-native-gesture-handler`: rehearsal controls and timeline gestures.
- `zustand`: transient session UI state if component state becomes unwieldy.

### Use when persistence/backend begins

- `@supabase/supabase-js`: auth, database, and private storage.
- `expo-sqlite`: local drafts and recoverable session state.
- `expo-secure-store`: sensitive tokens only.
- `@tanstack/react-query`: remote queries and mutations.
- `react-native-url-polyfill`: Supabase compatibility.

### Use after the engine works

- `@shopify/react-native-skia`: the richer Conversation Field and timeline transformation.
- `posthog-react-native`: privacy-safe product events without transcript content.
- `react-native-purchases` and `react-native-purchases-ui`: monetization.
- `burnt`: restrained native completion/error feedback if needed.

### Do not wire into the MVP without a demonstrated need

- OneSignal and notifications.
- Widgets and quick actions.
- Image picker, media library, document picker, sharing, and clipboard.
- Confetti.
- Galeria.
- Pulsar.
- Localization beyond keeping strings ready for extraction.

Installed dependencies do not need to dictate product scope.

## Launch readiness checklist

- [ ] One hero scenario is excellent across repeated runs.
- [ ] The real-situation builder distinguishes facts from inferred possibilities.
- [ ] Voice works on a physical iPhone and Android device.
- [ ] The actor remains believable without becoming needlessly hostile.
- [ ] Every debrief claim has transcript evidence.
- [ ] Rewind restores exact state and preserves the original branch.
- [ ] Pressure Test preserves facts while changing the reaction.
- [ ] The preparation card is not a script.
- [ ] Before/after readiness is captured honestly as self-report.
- [ ] Private-session retention and deletion work.
- [ ] AI and storage secrets remain server-side.
- [ ] RevenueCat purchase and restore flows work in a development build.
- [ ] Analytics contain no sensitive conversation text.
- [ ] Accessibility and reduced-motion behavior are tested.
- [ ] The two-minute demo completes reliably from a clean install.

## Recommended two-minute demo path

1. Open with **What conversation are you dreading?**
2. Choose **You were promoted. Your former peer was not.**
3. Set readiness to 2/5.
4. Begin the voice rehearsal.
5. Let the counterpart challenge fairness.
6. Deliberately soften the expectation.
7. End and show: **You abandoned the standard when challenged.**
8. Rewind the exact moment.
9. Hold the expectation while asking what got in the way.
10. Reveal the hidden scope-change fact and show a changed branch.
11. Preview an authority-challenge Pressure Test.
12. Show the preparation card and readiness moving from 2/5 to 4/5.

## Decision log

| Decision | Choice | Reason |
| --- | --- | --- |
| Navigation | Stack, no tabs | The app has one primary workflow. |
| First scenario | Former peer after promotion | Immediately demonstrates the audience and core tension. |
| First engine UI | Text, internal milestone | Fastest way to validate state, evidence, and branching. |
| MVP voice | Turn-based | Lower risk and easier transcript/evidence integrity. |
| Audio library | `expo-audio` | SDK 57 supports the required recording, playback, metering, and PCM capture. |
| Actor/evaluator | Separate services | Prevents the roleplayed employee from turning into a coach. |
| Model output | Strict structured contracts | Keeps facts and state under application control. |
| Rewind storage | Immutable branch fork | Preserves the original and enables meaningful comparison. |
| Feedback | Evidence-linked moments | More useful and credible than arbitrary scores. |
| Visual priority | Simple field before advanced Skia | The simulation engine is the differentiator. |
| Calendar | Post-MVP | Scheduling does not prove the core learning loop. |
| Realtime speech | Stretch | Latency polish is not the product moat. |

## Research and technical sources

- [Shaikh et al., *Rehearsal: Simulating Conflict to Teach Conflict Resolution*](https://arxiv.org/abs/2309.12309) — counterfactual conflict practice and the reported controlled study.
- [Wilhelm et al., *How Managers Perceive AI-Assisted Conversational Training for Workplace Communication*](https://arxiv.org/abs/2505.14452) — manager needs around realism, contextual feedback, control, personalization, and low-risk practice.
- [Expo SDK 57: `expo-audio`](https://docs.expo.dev/versions/v57.0.0/sdk/audio/) — recording, playback, metering, audio samples, and realtime PCM microphone capture.
- [OpenAI Realtime API reference](https://platform.openai.com/docs/api-reference/realtime) — WebRTC/WebSocket realtime audio and server voice activity detection for the stretch architecture.
- [OpenAI Responses API reference](https://developers.openai.com/api/reference) — strict JSON-schema structured outputs for actor and evaluator contracts.
- [Supabase Expo React Native guide](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) — Expo client setup and database security guidance.
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) — private object access through Row Level Security.
- [RevenueCat Expo installation](https://www.revenuecat.com/docs/getting-started/installation/expo) — development-build requirement and Expo purchase integration.
- [React Native Audio API compatibility](https://docs.swmansion.com/react-native-audio-api/docs/other/compatibility/) — reason to retain `expo-audio` for the current React Native 0.86 project.

## Final rule

If a proposed task does not improve one of these, it waits:

1. believable stateful resistance;
2. evidence-linked feedback;
3. meaningful counterfactual retry;
4. preparation for a real conversation.

The next code to write is therefore not the orb, calendar, subscription screen, or realtime transport. It is the former-peer scenario contract, its simulation state, and one complete branch that can be debriefed and rewound.
