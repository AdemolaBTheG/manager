# Hero Scenario Specification

## Status

Implementation-ready product specification for the first complete rehearsal slice.

- Scenario ID: `former-peer`
- Version: `1`
- Primary category: `boundary`
- Category label: `Set a boundary`
- Working title: **You were promoted. Jamie wasn’t.**
- Counterpart: Jamie Carter
- Relationship: Former peer → direct report

This is the scenario to complete before adding more scenario depth, voice interaction, or visual polish.

## Product purpose

The scenario should let a newly promoted manager rehearse holding a clear standard with a former peer without:

- hiding behind the friendship;
- becoming unnecessarily authoritarian;
- abandoning the standard when challenged;
- or skipping the employee’s perspective.

The experience should prove the first part of the core loop:

```text
Briefing → readiness → rehearsal → resistance → debrief
```

Rewind, pressure testing, and the preparation card build on this same scenario after the text rehearsal works end to end.

## Briefing screen

### Information hierarchy

Keep the current single-column structure:

1. counterpart avatar;
2. counterpart name;
3. relationship;
4. scenario title;
5. situation;
6. three rehearsal goals;
7. one primary action.

Do not add cards, a job title, framework teaching, category explanations, or the counterpart’s hidden motivation.

### Exact visible copy

**Counterpart**

> Jamie Carter

**Relationship**

> Former peer → direct report

**Title**

> You were promoted. Jamie wasn’t.

**Section label**

> THE SITUATION

**Situation**

> Three months after your promotion, Jamie has arrived 10–15 minutes late to the last three weekly team meetings. Twice, the team had to repeat decisions Jamie missed. When you raise it, Jamie jokes that you’ve “gone corporate.”

**Section label**

> GOALS

**Goals**

1. Make the pattern and its impact concrete.
2. Hear Jamie’s perspective without dropping the expectation.
3. Agree what changes before the next team meeting.

**Primary action**

> Practice this conversation

**Accessibility label**

> Practice this conversation with Jamie

### Optional manager-facing pressure line

Only add this if the screen still has enough breathing room after Dynamic Type testing:

**Section label**

> THE PRESSURE

**Copy**

> You’re worried that holding the boundary could damage the friendship—or that avoiding it could undermine your authority.

This line describes the manager’s dilemma. It must not reveal what Jamie privately thinks or wants.

### Remove for the text-rehearsal slice

Remove **Voice rehearsal · About 8 minutes** until both voice rehearsal and a defensible duration exist. The first vertical slice is text-based.

## What the manager knows before rehearsal

These are visible facts and may be used in the manager’s opening:

| Fact ID | Observable fact |
| --- | --- |
| `promotion-three-months` | The manager was promoted three months ago. |
| `late-meeting-1` | Jamie was 12 minutes late three meetings ago. |
| `late-meeting-2` | Jamie was 15 minutes late two meetings ago. |
| `late-meeting-3` | Jamie was 10 minutes late to the most recent meeting. |
| `meeting-impact` | The team repeated decisions in two meetings because Jamie missed them. |
| `corporate-joke` | Jamie joked that the manager had “gone corporate” when challenged. |

The briefing may summarize these facts, but the underlying scenario must retain stable fact IDs for evaluation and rewind.

## Hidden counterpart state

None of this content appears on the briefing or during readiness.

### Jamie’s objective

Preserve the informal equality and friendship that existed before the promotion, avoid feeling publicly subordinated, and leave without accepting a formal attendance boundary if possible.

### Hidden facts

| Fact ID | Hidden fact | Reveal rule |
| --- | --- | --- |
| `client-call-overrun` | Two late arrivals followed a client call that repeatedly ran over. | Reveal when the manager asks an open, non-accusatory question about what is causing the lateness. |
| `promotion-disappointment` | Jamie also applied for the team-lead role and has not discussed the disappointment directly. | Reveal only after the manager acknowledges that the promotion may have changed the relationship or asks directly about the tension. |
| `public-correction` | Jamie felt embarrassed when the manager challenged the latest arrival in front of the team. | Reveal when asked how the manager’s approach landed, or after the manager shows curiosity without dropping the standard. |

The client call explains part of the pattern but does not erase the expectation. Jamie could warn the team, move the call, or ask for help.

### Beliefs

- `friendship-protection`: Our friendship should protect me from formal correction.
- `authority-performance`: The manager is overcompensating to prove they deserve the promotion.
- `being-singled-out`: My contribution is being ignored while my lateness is being magnified.

### Opening emotional state

- Guarded
- Mildly amused on the surface
- Resentful underneath
- Willing to engage, but not yet willing to concede

### Opening line

> So, is this an official manager talk now?

## Resistance sequence

Jamie should not deliver every resistance move automatically. The state engine chooses an appropriate move based on what the manager has said and what has already been revealed.

| Move ID | Example response | When it should appear |
| --- | --- | --- |
| `minimize-pattern` | “It’s been a few minutes here and there. The work still gets done.” | The manager raises lateness vaguely or without evidence. |
| `invoke-friendship` | “You never used to care about this before you got promoted.” | The manager states the boundary but ignores the relationship change. |
| `challenge-authority` | “You don’t need to act like my boss every second.” | The manager becomes overly formal, controlling, or status-focused. |
| `raise-context` | “Those client calls have been running over. It’s not like I’m just sleeping in.” | The manager asks what is behind the pattern. |
| `fairness-challenge` | “Why am I the one getting pulled up when other people miss things too?” | The manager generalizes, moralizes, or implies Jamie is uniquely unreliable. |
| `soften` | “Okay. I can message ahead and move that client call on meeting days.” | The manager combines specificity, curiosity, a maintained boundary, and a practical next step. |

## State triggers

| Trigger ID | Condition | State effect |
| --- | --- | --- |
| `specific-evidence-used` | The manager accurately names at least two late meetings or the repeated-decisions impact. | Mark the issue as specific; Jamie can no longer credibly deny the pattern. |
| `perspective-invited` | The manager asks an open question about what is happening. | Reveal `client-call-overrun`; reduce defensiveness one level. |
| `relationship-acknowledged` | The manager acknowledges that the promotion changed the relationship without apologizing for managing. | Make `promotion-disappointment` revealable; reduce authority challenge. |
| `standard-abandoned` | The manager retracts the expectation after pushback or says the lateness is not important. | Mark `managerBackedAway`; Jamie becomes superficially agreeable without committing to change. |
| `authority-overused` | The manager relies on title, threat, or “because I’m your manager.” | Increase resentment; prefer `challenge-authority`. |
| `clear-path-offered` | The manager asks for or proposes a concrete prevention and notification plan. | Move toward resolution if the expectation remains explicit. |

## Success conditions

A successful rehearsal does not require perfect phrasing. The branch succeeds when the manager:

1. states the observable pattern and impact without exaggeration;
2. asks for Jamie’s perspective;
3. acknowledges relevant context without treating it as an exemption;
4. makes the attendance and communication expectation explicit;
5. agrees on a concrete action before the next meeting;
6. preserves respect without using friendship to soften the standard;
7. does not rely on rank, threats, or a “because I said so” posture.

### Concrete resolution target

The conversation should ideally end with an agreement that Jamie will:

- move the recurring client call on meeting days or flag when that is impossible;
- message the manager before the meeting if delayed;
- review missed decisions asynchronously without requiring the whole team to repeat them;
- and revisit the arrangement after two weekly meetings.

## Coaching focus

Use the existing coaching dimensions:

- `specificity`
- `evidence`
- `perspective`
- `boundary`
- `path`

`purpose` may be evaluated when the manager clearly frames the conversation as protecting team effectiveness and the working relationship. It is not required as a rehearsed script.

## Evidence-linked debrief expectations

The debrief should not show arbitrary numeric trait scores. It should select a small number of claims and link each claim to exact turns.

Examples:

- “You made the pattern concrete by naming the last three meetings and the repeated decisions.”
- “You explored the client-call explanation without dropping the expectation.”
- “When Jamie challenged your authority, you shifted from the team impact to your title.”
- “You agreed on advance notice, but the plan did not address the recurring client call.”

Each debrief claim must reference one or more stable turn IDs and the relevant fact, trigger, or success-condition ID.

## Readiness handoff

Tapping **Practice this conversation** must:

1. create or reuse one draft session for `former-peer@1`;
2. transition the session from `draft` to `confirmed`;
3. navigate to `/session/[sessionId]/readiness`;
4. show a 1–5 readiness control;
5. save exactly one `before` readiness rating for the session;
6. transition the session to `readiness-recorded`;
7. continue to the text rehearsal.

### Readiness copy

**Eyebrow**

> BEFORE YOU BEGIN

**Question**

> How ready do you feel to have this conversation right now?

**Scale anchors**

- 1 — Not ready
- 3 — Unsure
- 5 — Ready

**Primary action after selection**

> Start practice

The button remains disabled until a rating is selected. While the session or rating is being saved, the action must expose a loading/busy state and ignore duplicate presses.

## Briefing UI requirements

- Use an explicit display line height so the two-line title never overlaps.
- Use themed primary, pressed, and on-primary tokens in both color schemes.
- Keep category color decorative; the visible category label carries the meaning.
- Do not expose hidden state through color, labels, hints, or progress meters.
- Support Dynamic Type without placing content behind the floating action.
- Constrain the reading column on tablets.
- Hide decorative goal dots, avatar initials, and the button arrow from assistive technologies when the parent already has a complete accessibility label.
- The CTA must provide disabled and busy feedback during session creation.

## Canonical data rule

Author this scenario once as a versioned `ScenarioDefinition`. Briefing presentation fields may be added to that canonical definition or derived through a typed presenter.

Do not maintain independently authored `ScenarioBrief` and `ScenarioDefinition` fixtures. Separate copies will drift and can cause the UI, evaluator, and actor to use different facts.

Presentation-only fields may include:

- `shortTitle`
- `briefingSummary`
- `briefingGoals`
- `managerPressure`

Simulation-only fields must never be passed to the briefing component:

- `counterpartObjective`
- `hiddenFacts`
- `beliefs`
- unrevealed triggers
- reaction ordering

## Deterministic first rehearsal

Before connecting a model, the scenario must support a deterministic five-to-eight-turn rehearsal using the resistance moves above.

Minimum deterministic branches:

1. **Manager is vague:** Jamie minimizes the pattern.
2. **Manager uses evidence but no curiosity:** Jamie invokes the friendship or challenges authority.
3. **Manager uses evidence and curiosity:** Jamie reveals the client-call context.
4. **Manager abandons the standard:** Jamie agrees superficially without a prevention plan.
5. **Manager holds the standard and builds a path:** Jamie accepts a concrete next step.

This fixture is the reference behavior for repository, state-transition, debrief, and rewind tests.

## Definition of done

- [ ] The briefing renders the exact visible facts and three goals above.
- [ ] No hidden fact or belief is visible before rehearsal.
- [ ] The scenario is represented by one canonical `ScenarioDefinition` with stable IDs.
- [ ] The briefing title does not overlap at default or enlarged text sizes.
- [ ] The CTA has valid light- and dark-mode contrast and a busy state.
- [ ] The readiness screen saves a 1–5 `before` rating and enters rehearsal.
- [ ] The text rehearsal runs for at least five turns using deterministic actor behavior.
- [ ] Jamie’s client-call context appears only after an appropriate question or trigger.
- [ ] Backing away from the standard is recorded in simulation state.
- [ ] The successful branch ends with a concrete attendance and notification plan.
- [ ] Debrief claims cite exact turn IDs instead of returning generic scores.
- [ ] Session, turns, state snapshots, and readiness survive an app restart through SQLite.

## Explicitly deferred

- realtime voice;
- interruptions and barge-in;
- audio-reactive visuals;
- pressure-test reaction profiles;
- stateful rewind UI;
- generated real-conversation scenarios;
- additional deeply authored scenarios;
- streaks, XP, and broad career coaching.

The next implementation milestone is complete when a user can go from this briefing through readiness and a deterministic text rehearsal with persistent, evidence-linked state.
