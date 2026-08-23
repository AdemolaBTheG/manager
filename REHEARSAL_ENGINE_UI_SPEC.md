# Rehearsal Engine and UI Specification

## Decision

Yes: the rehearsal engine is the next major product slice.

The briefing screen is structurally complete enough to stop expanding it. The engine can begin now using the versioned former-peer scenario in [HERO_SCENARIO_SPEC.md](./HERO_SCENARIO_SPEC.md), while the small remaining briefing and readiness fixes are completed around it.

Do not wait for realtime voice or the final Skia animation before proving the engine. Build this sequence first:

```text
readiness recorded
  → enter rehearsal
  → Jamie opens
  → manager responds by text
  → state updates
  → Jamie resists for a scenario-backed reason
  → repeat for 5–8 turns
  → end practice
  → persist transcript and state snapshots
```

The product remains voice-first as an end state. Text is the first transport and the permanent accessibility fallback. Voice later uses the same scenario, state machine, turn pipeline, and screen.

## Sources reconciled

This specification combines:

- [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md), especially the requirements to strip coaching from live rehearsal, preserve hidden employee state, avoid a chat-first interface, and make the Conversation Field semantic;
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md), which calls for a deterministic text rehearsal before the audio layer;
- [HERO_SCENARIO_SPEC.md](./HERO_SCENARIO_SPEC.md), which defines Jamie’s facts, beliefs, triggers, resistance, and success conditions;
- the supplied **UI/UX Architecture for a Private Rehearsal Room for New Managers** report;
- current Mobbin iOS references listed below.

Where the documents pull in different directions, use this rule:

> Prove simulation state with text first. Preserve a voice-first interaction model. Add audio without redesigning the product.

## Product job of this screen

The live rehearsal screen has one job:

> Make the manager feel present in a consequential conversation with Jamie.

It is not where the app teaches, scores, suggests, praises, or explains.

During rehearsal, the manager should be able to answer only four questions from the interface:

1. Who am I speaking with?
2. Whose turn is it?
3. What did Jamie just say?
4. How do I respond or end the practice?

Everything else belongs before or after rehearsal.

## Mobbin benchmark

### Patterns to borrow

| Reference | What is visible | What to borrow |
| --- | --- | --- |
| [ChatGPT voice screen](https://mobbin.com/screens/64be7109-fd45-4292-9010-c6ad15a88d6d) | One central live object, lots of empty space, compact input and end controls | A singular visual focus and an unmistakable way to leave the mode |
| [ChatGPT voice-chat flow](https://mobbin.com/flows/8a834128-d249-425a-8bc6-029504038e5f) | A dedicated full-screen mode that clearly begins and ends | The rehearsal should feel like entering and leaving a room, not opening another content page |
| [LINE audio call](https://mobbin.com/screens/51e27726-a18e-47cf-b017-fa43983580b3) | Participant identity, explicit live state, controls anchored low | Keep identity and controls stable while the conversation state changes |
| [Meta AI voice screen](https://mobbin.com/screens/a13d716b-b9dc-4775-9934-b5c881b221a3) | Visual voice state plus readable spoken content | A readable caption is useful, especially when audio is unavailable |
| [Tolan voice screen](https://mobbin.com/screens/f46de34a-05c9-4fd5-b28e-7b5775830c89) | Dark immersive canvas with very compact controls | The visual transition into a focused environment can create presence |

### Patterns to reject

| Reference | Why it is wrong for this product |
| --- | --- |
| [Speak speaking-practice screen](https://mobbin.com/screens/3e01c79e-3175-4df8-9fc6-91966389ffb3) | Question counts, prompts, and lesson progress make the experience feel like completing an exercise rather than handling a person |
| [Speak avatar roleplay](https://mobbin.com/screens/bd1e2ff5-6a71-4579-b3c2-bd86055ef9f5) | A character avatar and illustrated environment make the experience feel simulated and game-like instead of private and professionally credible |
| [Grok voice screen](https://mobbin.com/screens/16fde1d6-8682-4e22-b9fe-26cc9a20dcf4) | Multiple modes and controls compete with the active conversation |
| [WhatsApp AI voice screen](https://mobbin.com/screens/6474d2b9-3803-4bd3-90ee-143cf9dda044) | A red hang-up control and call timer strongly frame the experience as a phone call |

The Mobbin references support a dedicated, minimal live mode. They do not provide the product’s differentiation. The ownable behavior is the scenario-backed resistance and later stateful Rewind.

## Recommended screen

### Route

```text
/session/[sessionId]/rehearsal
```

The route requires:

- a valid session;
- session status `readiness-recorded` or `rehearsing`;
- a valid active branch;
- a resolvable scenario ID and version.

If any requirement is missing, show a recoverable not-found or resume state. Do not silently create a different scenario.

### Visual mode

Preparation remains warm and light. Entering rehearsal moves into a dedicated dark room regardless of the system appearance.

Use a restrained room palette derived from the existing theme:

| Token | Starting value | Purpose |
| --- | --- | --- |
| `room.background` | `#181116` | Main room canvas |
| `room.text` | `rgba(255, 255, 255, 0.94)` | Jamie’s words and primary labels |
| `room.textSecondary` | `rgba(255, 255, 255, 0.60)` | Relationship and secondary status |
| `room.surface` | `rgba(255, 255, 255, 0.08)` | Composer and optional overlays |
| `room.border` | `rgba(255, 255, 255, 0.12)` | Quiet control boundaries |
| `room.accent` | `#BE95A3` | Boundary-scenario field and active control |
| `room.onAccent` | `#181116` | Text or icon on the active control |

Use a very subtle top wash from `rgba(190, 149, 163, 0.16)` into `room.background`. Do not turn the whole room mauve. The category tint establishes continuity with the briefing and then disappears into the room.

Do not use red or green for conversational quality. Error and success are expressed through text, symbols, and state changes.

### Native header

Use the native stack header instead of recreating navigation inside the screen.

- Center title: `Jamie Carter`
- Back affordance: minimal chevron
- Trailing action: `End`
- Header background: `room.background`
- Header tint: `room.text`
- No large title
- No timer

Tapping Back or End while a turn exists opens the same confirmation:

```text
End this practice?

Your conversation so far is saved.

[ Keep practicing ]
[ End and review ]
```

If no manager turn exists yet, the destructive action is `Leave practice` and returns to readiness without creating a debrief.

The End action should not be a red phone icon. This is practice, not an emergency call.

### Content hierarchy

Below the native header:

1. relationship label;
2. Conversation Field;
3. explicit conversational state;
4. the current Jamie utterance or live caption;
5. the manager response control;
6. a quiet transcript/captions affordance when needed.

Do not show the scenario title, situation paragraph, goals, category, score, or progress inside the room. The user already crossed the briefing threshold.

### Text-first wireframe

```text
┌─────────────────────────────────────┐
│  ‹            Jamie Carter      End │
│       Former peer → direct report   │
│                                     │
│                                     │
│                 ◎                   │
│          Conversation Field         │
│                                     │
│              YOUR TURN              │
│                                     │
│  “So, is this an official manager   │
│   talk now?”                         │
│                                     │
│                                     │
│  ┌────────────────────────────────┐ │
│  │ Say what you would say…      ↑ │ │
│  └────────────────────────────────┘ │
│              View transcript        │
└─────────────────────────────────────┘
```

The quotation is not a chat bubble. It is the current conversational moment. Previous turns are not stacked behind it.

### Voice-ready wireframe

```text
┌─────────────────────────────────────┐
│  ‹            Jamie Carter      End │
│       Former peer → direct report   │
│                                     │
│                                     │
│                 ◎                   │
│          Conversation Field         │
│                                     │
│              LISTENING              │
│                                     │
│       live caption, when enabled    │
│                                     │
│                                     │
│       [ Type ]       [ Done ]        │
│              Captions               │
└─────────────────────────────────────┘
```

The voice control changes by state rather than presenting microphone, pause, stop, send, and cancel simultaneously.

## Exact first-turn experience

On entry:

1. the warm readiness screen fades into the dark room over approximately 350–500 ms;
2. Jamie’s name and relationship settle first;
3. the Conversation Field fades in;
4. state reads `Jamie is speaking`;
5. Jamie delivers the exact authored opening:

> So, is this an official manager talk now?

6. the state changes to `Your turn`;
7. the response control becomes active.

Do not begin with instructions, a countdown, or “Here are your goals.”

## Conversation Field

The field represents **the live conversation**, not Jamie’s face, mood, or personality.

### Size and placement

- Target diameter: 232–264 dp on a 393 dp-wide phone
- Visually centered in the upper-middle portion of the available content
- Maintain clear space around it
- Scale down before it pushes controls below the bottom safe area
- Do not place text inside the Skia canvas

### V1 before custom Skia work

The engine does not need to wait for a shader. Start with a deterministic placeholder built from two or three restrained concentric shapes and Reanimated opacity/scale.

Required V1 behaviors:

| State | Field behavior |
| --- | --- |
| Entering | Fade and scale from `0.96` to `1` |
| Your turn | Very slow, low-amplitude breathing |
| Manager composing | Remain calm; do not react to keyboard activity |
| Manager recording | Outer boundary responds to microphone energy |
| Thinking | Contract to approximately `0.96–0.98`; inner bands drift inward |
| Jamie speaking | Perimeter stays calmer while movement travels inside |
| Recoverable error | Become still; text explains the problem |
| Complete | Contract toward the semantic timeline position |

Motion communicates system state only. It must never claim to measure Jamie’s emotions, the manager’s confidence, or conversational quality.

### Reduce Motion

With Reduce Motion enabled:

- replace spatial morphs with opacity changes;
- keep the explicit text state;
- do not pulse continuously;
- transition field → timeline with a crossfade instead of a morph.

## Live state model

The UI state is separate from `SimulationState`. The UI describes what the application is doing; simulation state describes what is true in the conversation.

```ts
type RehearsalUIState =
  | 'entering'
  | 'counterpart-speaking'
  | 'awaiting-manager'
  | 'manager-composing'
  | 'manager-recording'
  | 'submitting-turn'
  | 'actor-thinking'
  | 'slow-response'
  | 'recoverable-error'
  | 'completing';
```

### Visible copy by state

| UI state | Primary state copy | Available primary action |
| --- | --- | --- |
| `entering` | `Entering practice…` | None |
| `counterpart-speaking` | `Jamie is speaking` | Stop playback later; no barge-in in MVP |
| `awaiting-manager` | `Your turn` | Focus composer or start speaking |
| `manager-composing` | `Your turn` | Send |
| `manager-recording` | `Listening` | Done |
| `submitting-turn` | `Sending your response…` | None |
| `actor-thinking` | `Jamie is thinking` | None |
| `slow-response` | `Still with you…` | Cancel or Try again after a longer threshold |
| `recoverable-error` | `Jamie’s reply didn’t come through` | Try again |
| `completing` | `Practice complete` | None; transition to debrief |

Every state change must be available to assistive technology. Animation alone is never sufficient.

## Current utterance and transcript

### Default

Show only Jamie’s current or most recent utterance as centered, readable text below the field.

- No speech-bubble tail
- No left/right chat alignment
- No avatar beside every turn
- Maximum readable width around 560 dp
- Allow selection when text is static
- During voice playback, captions may reveal by phrase but must remain readable without motion

After the manager submits, their response may appear briefly as:

```text
You said
“I wanted to talk about the last three meetings…”
```

It then yields to `Jamie is thinking` and the next Jamie utterance.

### Full transcript

`View transcript` opens a sheet, not a permanent chat screen behind the field.

The sheet contains:

- speaker labels;
- ordered text turns;
- a close action;
- no coaching annotations;
- no hidden-state information;
- no edit or rewind actions during the original rehearsal.

Closing the sheet returns to the same live state. Opening it while Jamie is speaking does not stop playback unless the user explicitly pauses.

## Text response control

The first implementation uses text.

- Multiline input with placeholder `Say what you would say…`
- Maximum comfortable height before internal scrolling
- Send button becomes active only when trimmed input is non-empty
- Return inserts a line break; the explicit send control commits the turn
- Preserve draft text across keyboard dismissal and recoverable errors
- Disable duplicate submission while the manager turn is being persisted
- After send, dismiss the keyboard and move to `Jamie is thinking`
- Do not suggest replies, complete sentences, or display framework hints

The keyboard must not cover the current Jamie utterance or the response control.

## Voice control after the text engine works

Turn-based voice reuses the same screen:

```text
Tap Speak
  → manager-recording
  → Tap Done
  → transcribe
  → persist manager turn + pre-turn snapshot
  → actor-thinking
  → generate Jamie response
  → persist counterpart turn + state patch
  → synthesize/play response
  → counterpart-speaking
  → awaiting-manager
```

Voice requirements:

- `Type instead` always remains available;
- `Done` ends the turn; do not rely on automatic voice-activity detection initially;
- no full-duplex interruption or barge-in in the first voice version;
- retain the manager’s recorded/transcribed turn through retry;
- audio is transport, not the source of simulation truth;
- never infer confidence or emotion from microphone energy.

The package foundation is already present: `expo-audio`, React Native Skia, Reanimated, Gesture Handler, and SQLite are installed. No package choice blocks the engine.

## Engine boundary

Use three explicit layers:

```text
SCENARIO ENGINE
What is true, known, hidden, disputed, and resolved?

        ↓

ACTOR
What would Jamie say next from this exact state?

        ↓

EVALUATOR
What did the manager do, and which turn proves it?
```

The live screen interacts with the scenario engine and actor only. The evaluator runs after the rehearsal.

### Actor contract

The existing `ActorTurn` shape is the correct boundary:

```ts
type ActorTurn = {
  spokenText: string;
  statePatch: SimulationStatePatch;
  revealedFactIds: readonly string[];
  invokedResistanceMoveId: string | null;
  endConversation: boolean;
};
```

The actor must:

- remain Jamie;
- use only core facts and revealed hidden facts;
- reveal hidden facts only when a trigger permits it;
- choose resistance that follows from Jamie’s beliefs and current state;
- never coach, score, praise, or explain the exercise;
- return a validated state patch rather than replacing state wholesale.

### Turn pipeline

For every manager response:

1. load the active session, branch, scenario version, and current simulation state;
2. validate that the session can accept a turn;
3. save a state snapshot immediately before the manager turn;
4. append the manager turn;
5. run the deterministic actor fixture;
6. validate the actor’s fact IDs, resistance move, and state patch;
7. apply the permitted patch;
8. append Jamie’s turn;
9. persist the resulting state for the next turn;
10. render only Jamie’s `spokenText` and visible UI state.

Never stream unvalidated hidden state directly into the screen.

## Deterministic hero behavior

Implement the former-peer fixture before connecting a model.

### Opening

Jamie:

> So, is this an official manager talk now?

### Required branches

| Manager behavior | Jamie response behavior | State consequence |
| --- | --- | --- |
| Vague concern without facts | Minimize the pattern | `issueWasMadeSpecific = false` |
| Uses evidence but asks no question | Invoke friendship or challenge authority | Boundary remains unresolved |
| Uses evidence and asks what is happening | Reveal the client-call context | Add `client-call-overrun` to `revealedFactIds` |
| Backs away after pushback | Agree superficially without a prevention plan | `managerBackedAway = true` |
| Holds the expectation and builds a practical path | Accept the notification/moving-call plan | `nextStepEstablished = true` |

This fixture should produce a complete five-to-eight-turn conversation without any network dependency.

## Error and latency behavior

The rehearsal must preserve the manager’s work through failure.

| Situation | UI behavior |
| --- | --- |
| Saving manager turn | Keep submitted text visible; disable duplicate send |
| Actor takes longer than about 2.5 seconds | Change secondary copy to `Still with you…` |
| Actor request fails | Show `Jamie’s reply didn’t come through` and `Try again`; do not ask the manager to repeat |
| App backgrounds | Persist current committed turns; keep uncommitted draft locally |
| App restarts | Resume from the active branch and last committed state |
| Scenario version missing | Stop with a clear unavailable-state screen; never substitute a newer scenario silently |
| Audio permission denied later | Continue by text without blocking rehearsal |

An error does not reset the rehearsal or regenerate the manager’s turn.

## Accessibility

- Major targets are at least 48 dp.
- The current state is announced when it changes.
- The Conversation Field is decorative and hidden from the accessibility tree.
- The text state communicates everything the field motion communicates.
- Text input and transcript remain available when voice ships.
- Captions remain available when audio ships.
- Dynamic Type may reduce field size but must not hide current speech or controls.
- The composer stays above the keyboard and bottom safe area.
- Color is never the only state signal.
- Reduce Motion removes continuous pulsing and spatial morphing.
- `End` has an explicit accessibility hint explaining that the current conversation is saved.

## Explicitly absent from live rehearsal

- goals checklist;
- Purpose → Problem → Proof → Path progress;
- tips or suggested sentences;
- “Great response” praise;
- scores or percentages;
- confidence or emotion meter;
- Jamie’s hidden facts or beliefs;
- difficulty level;
- streak or XP;
- persistent transcript thread;
- visible branch tree;
- countdown or lesson progress;
- job title unless the relationship is otherwise ambiguous;
- a mascot, human avatar, or simulated video face.

## File seams

Keep route files thin and continue the project’s current `screens`, `components`, `domain`, and `services` separation. Do not introduce a `features` folder for this slice.

```text
src/
  app/
    session/[sessionId]/rehearsal.tsx
  screens/
    rehearsal-screen.tsx
  components/
    conversation-field.tsx
    rehearsal-turn-control.tsx
    current-utterance.tsx
    transcript-sheet.tsx
  data/
    scenarios.ts
    deterministic-former-peer-actor.ts
  domain/
    scenario.ts
    session.ts
    simulation-state.ts
  services/
    simulation/
      actor.ts
      scenario-engine.ts
    storage/
      session-repository.ts
      sqlite-session-repository.ts
```

The route resolves `sessionId`, handles not-found state, and delegates rendering and interaction to `RehearsalScreen`.

## Implementation order

### Slice 1 — engine without animation

1. Author `former-peer@1` as the canonical `ScenarioDefinition`.
2. Create the deterministic Jamie actor.
3. Add scenario-state validation and permitted state transitions.
4. Add the rehearsal route and session-resume guard.
5. Render Jamie’s opening and a text composer.
6. Persist manager snapshots, manager turns, Jamie turns, and current state.
7. Complete a five-to-eight-turn rehearsal entirely offline.

### Slice 2 — room presentation

1. Apply the dedicated dark room palette.
2. Add the native header, relationship label, state label, current utterance, and transcript sheet.
3. Add a simple V1 Conversation Field with state-driven Reanimated motion.
4. Add entry, error, completion, keyboard, Dynamic Type, and Reduce Motion behavior.

### Slice 3 — actor API boundary

1. Keep the deterministic fixture available.
2. Add an actor adapter that returns the existing `ActorTurn` contract.
3. Validate every response before persistence.
4. Fall back to a recoverable state rather than improvising invalid scenario facts.

### Slice 4 — turn-based voice

1. Request microphone permission at the moment it is needed.
2. Record with `expo-audio`.
3. Transcribe and reuse the same manager-turn pipeline.
4. Play Jamie’s synthesized response.
5. Drive field energy during manager recording and state-based motion during Jamie playback.
6. Keep `Type instead` and captions available.

### Slice 5 — debrief handoff

1. End the rehearsal explicitly or through `ActorTurn.endConversation`.
2. Transition `rehearsing → debriefing`.
3. Run the evaluator outside the actor loop.
4. Navigate to the evidence-linked debrief.

## Definition of done for the first rehearsal slice

- [ ] Readiness can enter `/session/[sessionId]/rehearsal`.
- [ ] The room shows Jamie’s identity, relationship, current utterance, and explicit state.
- [ ] No coaching or hidden state appears during rehearsal.
- [ ] Jamie opens with the authored line.
- [ ] The manager can respond using text.
- [ ] Each manager turn saves the exact pre-turn state snapshot.
- [ ] Each Jamie turn applies a validated state patch.
- [ ] Hidden facts reveal only through authored triggers.
- [ ] The deterministic fixture supports at least five manager turns.
- [ ] Vague, curious, backing-away, and boundary-holding responses create different state outcomes.
- [ ] A duplicate send cannot create duplicate turns.
- [ ] Failure preserves the manager’s submitted response.
- [ ] The session resumes after an app restart.
- [ ] The transcript is available in a secondary sheet, not as the main screen.
- [ ] Dynamic Type, keyboard, screen reader, and Reduce Motion behavior are usable.
- [ ] Ending practice transitions into debriefing without losing the branch.

## Final recommendation

Build the engine now, but do not start with audio or the final shader.

The first proof should be:

> I said something different, Jamie reacted differently for a reason, and the app preserved exactly what happened.

The first rehearsal UI should feel quiet, dark, and socially focused. Jamie’s current words and the manager’s next choice matter more than the field. The field gives the room identity; the engine gives it meaning.
