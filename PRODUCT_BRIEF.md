# The Conversation Before the Conversation

## Product thesis

Build a private rehearsal room for new managers who have a real difficult conversation coming up.

This is not a generic coaching chatbot, a script generator, or another library of roleplay exercises. It is a focused space where a manager can safely rehearse a specific conversation, experience believable resistance, learn from the moments that matter, and try again before speaking to the real person.

## Positioning

> **The conversation before the conversation.**
>
> A private rehearsal room for new managers.

## Core experience

The strongest product loop is:

1. **Describe the real situation.**
2. **Rehearse it.**
3. **Encounter resistance.**
4. **Debrief what happened.**
5. **Rewind a key moment.**
6. **Try another approach.**
7. **Pressure-test a different reaction.**
8. **Leave with a concise plan and higher confidence.**

The product should help the manager prepare for a real conversation, not reward them for spending more time in the app.

## Target user

The initial audience is a new manager facing an imminent, emotionally difficult workplace conversation. The product is especially relevant when the manager:

- was recently promoted over former peers;
- needs to set or restore a clear standard;
- is worried about damaging a relationship;
- tends toward people-pleasing or over-explaining;
- expects defensiveness, dismissal, emotion, or a challenge to their authority;
- knows the issue matters but is unsure how to say it clearly.

## Hero scenario

### You were promoted. Your former peer was not.

This scenario immediately exposes the tensions the product is designed to address: changed authority, loyalty, resentment, unclear boundaries, fear of conflict, and the need to remain both direct and curious.

It is a strong first-run scenario because it is easy to understand, emotionally specific, and closely aligned with the needs of new managers.

## Strategic findings

### AI roleplay is already commoditized

Products including iGrow, Simuverse, Nerve Arena, Oraton, Yoodli, and Compass already offer combinations of:

- voice roleplay;
- pushback and simulated resistance;
- personas;
- replay;
- scoring;
- generic coaching on how to respond better.

The product cannot win merely by adding an AI character that talks back.

### The coaching model is the differentiation

Heather's current material repeatedly emphasizes:

- clarity;
- boundaries;
- accountability;
- curiosity;
- people-pleasing;
- difficult feedback structured as **Purpose → Problem → Proof → Path**.

That philosophy should shape the simulation, debrief, and retry experience. It gives the product a coherent point of view rather than a collection of generic communication scores.

### The real whitespace

The most promising differentiation is the combination of:

- rehearsal for a real upcoming conversation;
- former-peer dynamics;
- hidden employee motivations;
- evidence-linked feedback;
- **stateful rewind** into the exact conversational moment where the manager's approach mattered;
- **pressure testing** the same situation against different employee reactions.

The moat is the quality and statefulness of the simulation engine, not the visual treatment of the AI.

## Learning model

Research on simulated conflict supports counterfactual practice: people benefit from revisiting a conversational moment and trying a different path, rather than only receiving a lecture after the fact.

The CHI *Rehearsal* work found that participants who practiced alternative conversational paths later used fewer escalating strategies and more cooperative strategies than a lecture-only group.

The implication for this product is direct: feedback should lead back into practice. The app should identify a consequential moment, preserve the state of the conversation, and let the manager try another response from that exact point.

## Coaching and feedback principles

Avoid arbitrary scorecards with six generic dimensions. Feedback should be concrete, traceable to the conversation, and connected to the manager's intent.

Good feedback sounds like:

- “You made the issue concrete.”
- “You abandoned the standard when Alex challenged you.”
- “You never explored the scope-change explanation.”

The debrief should answer:

1. What did the manager make clear?
2. Where did they soften, abandon, or confuse the standard?
3. What evidence did they use or fail to use?
4. What explanation or motivation did they explore or overlook?
5. Which moment is most useful to rewind?
6. What should they carry into the real conversation?

The product should not claim there is one perfect script. It should help the manager remain clear, curious, and accountable under pressure.

## Hidden employee state

Believable resistance should come from an internal employee state, not random hostility. A simulated employee may be affected by factors such as:

- resentment about the manager's promotion;
- fear of losing status or autonomy;
- an undisclosed scope change;
- confusion about expectations;
- lack of trust in the evidence;
- embarrassment;
- stress outside the immediate issue;
- a belief that the manager is acting unfairly.

The manager should not see this state directly. They should discover relevant parts of it through curiosity, evidence, and the way they handle resistance.

## Feature priorities

### Must ship

- Curated manager scenarios.
- An “I have a real conversation coming up” entry point.
- Voice rehearsal.
- Hidden employee state and believable resistance.
- Evidence-based debrief tied to specific moments.
- Pre- and post-rehearsal readiness checks.
- A concise **Before you go in** card.

### Hero features

#### Stateful Rewind

Return to the exact conversational moment where a different choice could change the outcome. Preserve the employee's state, the known facts, and the path that led there so the retry is a meaningful counterfactual rather than a fresh chat.

#### Pressure Test

Replay the same underlying issue with a different reaction profile, such as:

- defensive;
- upset;
- dismissive;
- authority-challenging.

The facts and managerial objective stay stable while the interpersonal pressure changes.

### Stretch

- Full-duplex real-time voice.
- Interruptions and barge-in.
- Richer audio-reactive visuals.

### Explicitly cut

- Streaks.
- XP or gamified progression.
- Broad career coaching.
- A generic chatbot mode.
- Body-language scoring.
- A large content library at launch.
- “Perfect script” generation.

## Technical direction

Recommended application stack:

- **Expo** for the cross-platform application;
- **expo-audio** for recording and playback;
- **React Native Skia** for the conversation field and expressive visual state;
- **React Native Reanimated** for transitions and interaction feedback;
- a backend AI actor for the employee simulation;
- a backend evaluator for evidence-linked debriefing and rewind selection.

The Skia conversation field remains a strong visual direction, but it should communicate conversational state rather than become the product's central claim. The simulation engine, hidden state, evaluation model, and ability to branch from a precise moment are the defensible system.

## Product guardrails

- Optimize for a real conversation happening soon.
- Keep the experience private and psychologically safe.
- Make employee resistance plausible, not theatrical.
- Tie coaching claims to observable moments in the transcript.
- Preserve nuance: curiosity must not replace accountability, and accountability must not eliminate curiosity.
- Prefer repeated practice over long explanations.
- End every session with a short, usable plan.
- Do not present the AI as an oracle or promise a perfect outcome.

## MVP success criteria

The MVP is working when a new manager can:

1. enter a real or curated situation;
2. state their purpose, the problem, the proof, and the desired path;
3. rehearse by voice with an employee who resists for believable reasons;
4. receive a short debrief grounded in what they actually said;
5. rewind one important moment and try another response;
6. pressure-test the situation against a second reaction style;
7. leave with a concise plan and report greater readiness for the real conversation.

## One-sentence product definition

**A private, voice-first rehearsal room that helps new managers practice a real difficult conversation, learn from consequential moments, and retry them under different kinds of pressure.**

---

### Research note

This brief packages the conclusions supplied from the prior deep-research report. Competitor capabilities and research claims should be linked back to the original source list before they are used in external marketing, investor materials, or formal product claims.

---


# Full Deep Research Report

## Deep Research: What I Would Build for the Leadership Heather Career Coaching Award

The research points to a much sharper product than a generic “AI career coach.”

I would build a private rehearsal room for first-time managers who have a real difficult conversation coming up. The user describes what is happening, rehearses it aloud against an AI employee who has believable motivations and resistance, sees the few moments that materially changed the conversation, rewinds one of those moments and tries another approach, then pressure-tests the same conversation against a different reaction before going into the real meeting.

The central loop should be:

Describe the real situation → rehearse it → encounter resistance → debrief → rewind a key moment → try another approach → pressure-test → leave with a plan and greater confidence.

That recommendation comes from four places that line up unusually well: RevenueCat’s judging criteria, Heather Elkington’s actual current leadership philosophy, gaps in existing AI-roleplay competitors, and research on simulated conflict and manager communication training.


## 1. What the challenge is actually rewarding

The official Shipaton rules are much narrower than “career coaching” sounds.

RevenueCat says the project should help new managers practice difficult workplace conversations, receive useful feedback, and build confidence before handling the real situation.

The judging criteria emphasize:

realistic scenarios;
active practice rather than passive advice;
useful feedback around feedback, boundaries, and saying no;
authentic leadership rather than prescribing one perfect script;
confidence building;
a safe place to experiment;
something practical enough to use before a real conversation.
That means I would not spend meaningful time building:

generic leadership chatbot;
résumé/career planning;
leadership courses;
article/content library;
goal setting;
personality tests;
Slack assistant;
script generator;
huge management dashboard.
Those might make sense as a commercial SaaS eventually.

They do not maximize this judging rubric.

The winning interaction needs to make it immediately obvious:

“I am practicing something I’m actually scared to say in real life.”

Heather’s own Fresh Start program similarly emphasizes difficult conversations, underperformance, boundaries, confidence, and practical management systems rather than abstract theory.


## 2. “Flight simulator” should determine the product architecture

This phrase matters more than it initially appears.

A conventional chatbot:

user says something → AI responds → AI gives advice.

A flight simulator:

user acts → system reacts → consequences occur → user can fail safely → user changes their behavior → runs the situation again.

That distinction is important.

The strongest implementation of “flight simulator for hard conversations” is therefore not merely AI roleplay.

It is:

Scenario state

The other person has:

beliefs;
facts;
hidden information;
motivations;
relationship history;
resistance;
possible reactions.
User action

The manager actually speaks.

Consequences

The employee changes depending on what the manager does.

Replay

The manager can revisit the moment.

Counterfactual

A different response leads to a genuinely different future.

That is much closer to a simulator than “ChatGPT pretending to be your employee.”


## 3. Map every judging criterion directly into the product

I would literally build backward from the rubric.

Judge needs to see	Product should visibly prove it
Realistic scenarios	Real upcoming situations, relationship context, employee motives, former-peer dynamics, believable resistance
Active practice	User speaks their own words; no multiple-choice answer system
Useful feedback	Feedback cites exact moments from what the user actually said
Feedback / boundaries / saying no	Make these the primary practice categories
Confidence building	Ask readiness before and after rehearsal
Authentic leadership	Offer multiple viable approaches rather than one “correct” sentence
Safe experimentation	Private rehearsal, unlimited retries, no leaderboard
Practical before the real thing	End with a concise prep card for the actual meeting
One product principle captures this:

Don’t answer the conversation for the manager. Train the manager to stay in the conversation.


## 4. Heather’s own philosophy gives us a much better feedback model

This is one of the most valuable discoveries from the research.

Heather has a current framework for difficult feedback:

Purpose → Problem → Proof → Path

Purpose

Why are we having this conversation?

What needs to come out of it?

Problem

What specifically needs addressing?

Keep it factual.

Proof

What evidence makes this objective rather than personal?

Path

What needs to happen next?

That gives us a much stronger evaluation framework than generic AI metrics such as:

Empathy: 83
Confidence: 74
Clarity: 91

Instead, the evaluator can ask:

Purpose

Did the manager establish what the conversation was trying to achieve?

Specificity

Did they name observable behavior rather than attack the employee’s character?

Evidence / impact

Did they establish why the issue matters?

Path

Did both parties leave knowing what happens next?

I would not call this “Heather’s 4Ps” in the product without permission.

But it can absolutely inform our internal evaluation model.

Sources: Heather’s 2026 “Steal my script for giving difficult feedback” material and her earlier difficult-feedback content.


## 5. But Heather is not advocating robotic directness

This is critical.

Her current content repeatedly argues for being firm, not harsh.

One of her recommended phrases is essentially:

“Help me understand your thinking here.”

She emphasizes:

curiosity;
clarity;
consequences where needed;
separating behavior from intent;
keeping standards without humiliating people.
So our evaluator should not merely ask:

Did you deliver Purpose → Problem → Proof → Path?

It should also ask:

Did you actually listen?

Consider:

Manager

“You’ve missed the last three project deadlines and it’s becoming a problem.”

Alex

“Two of those deadlines changed because you added requirements after we scoped the work. I raised that in both planning meetings.”

A dumb simulator knows the objective is “give feedback” and eventually makes Alex concede.

A good simulator forces the manager to decide:

“Do I keep prosecuting the case I came in with, or do I become curious because I may have missed important context?”

That is a much more realistic leadership skill.


## 6. The app should specifically detect people-pleasing

This could become one of the strongest pieces of behavioral intelligence in the whole product.

Heather repeatedly talks about new managers being afraid of being disliked.

The pattern looks like:

soften the feedback;
over-explain;
avoid accountability;
say yes when they mean no;
absorb other people’s work;
abandon boundaries when challenged.
Example:

Alex

“Honestly, this feels unfair. Everyone has missed deadlines recently.”

User

“Yeah, that’s fair. I don’t want to make a big thing of it. Just maybe keep an eye on it.”

A generic communication coach might reward the user for empathy.

Our app should say:

You backed away from the standard when Alex challenged you.

You opened with a clear concern, but after resistance you turned the expectation into an optional suggestion.

That feels much more intelligent.

And it maps directly into Heather’s repeated:

“Stop being nice, start being kind.”

The app can differentiate:

Nice

Avoids discomfort to protect immediate approval.

Kind

Tells the truth respectfully because ambiguity hurts everyone longer-term.

Again, I would not necessarily brand Heather’s language explicitly without permission, but it strongly informs the model.


## 7. Boundaries need their own simulation logic

Heather’s content repeatedly discusses different kinds of boundaries:

time boundaries;
friendship boundaries;
energy boundaries;
workload/capacity boundaries;
role boundaries.
The former-peer scenario in the official prompt is especially valuable.

Imagine:

Alex

“Seriously? We used to complain about this policy together. Now you’re going to enforce it because you got promoted?”

The manager has to balance:

relationship + honesty + authority + fairness.

There is no magical sentence.

That is exactly the sort of thing where the prompt’s phrase “authentic leadership” becomes important.

We should not teach:

“Here’s the corporate approved answer.”

We should teach:

“Here are the things your response needs to accomplish, but how you sound doing it can still be you.”


## 8. Competitor reality check: AI roleplay itself is already commodity

This was probably the most important competitive finding.

There are already multiple apps whose core pitch is essentially:

Practice the difficult conversation with AI before the real thing.

iGrow

Already markets:

difficult feedback;
hard conversations;
job interviews;
salary negotiation;
adaptive AI characters;
voice/text;
pushback;
scoring;
feedback.
Simuverse

Already markets:

difficult real-world conversations;
leadership roleplay;
missed-moment identification;
stronger alternatives;
focused retry.
This is particularly important because “Moment that mattered → retry it” is already close to our initial Rewind idea.

Nerve Arena

Already has:

voice;
AI personas;
deflection;
escalation;
difficult conversation training;
custom personas/scenarios;
replay;
difficulty/pressure;
scoring on boundaries, clarity, empathy, composure, rapport, etc.
It explicitly targets scenarios such as new managers giving hard feedback.

Oraton

Already has:

live roleplay;
AI personas;
pushback;
interruptions;
difficult conversations;
authority/clarity coaching.
Yoodli

Already has:

AI roleplay;
manager training;
private practice;
custom scenarios;
feedback;
multiple personas.
Compass by Radical Candor

This is an especially important benchmark.

It differentiates itself through an established management methodology rather than merely generic LLM communication coaching.

Its positioning is essentially:

AI can write your email; Compass helps you actually have the workplace conversation.

That is close to our opportunity.


## 9. Therefore, these are table stakes

Feature	Competitive status
AI conversation	Commodity
AI “pushes back”	Commodity
Voice	Increasingly commodity
Custom scenario	Already exists
Post-conversation score	Commodity
Communication dimensions	Commodity
Persona selection	Already exists
“Better way to say this”	Already exists
Replay	Already exists
Generic confidence score	Already exists
“This isn’t a chatbot, it’s rehearsal”	Already being marketed
This means:

Do not build the entire differentiation around:

“Our AI pushes back!”

Competitors already do that.

Do not build the differentiation around:

“You can retry a missed moment!”

Simuverse is already close.

Do not build:

six animated communication stat bars.

Nerve Arena already does that.


## 10. Where I think actual whitespace still exists

I have not found this exact combination presented as one highly focused consumer product:

new-manager-only

real upcoming conversation as the primary use case

former-peer / people-pleasing dynamics

management-behavior evaluation rather than speaking-style evaluation

editable situation understanding

exact-state counterfactual rewind

multiple valid leadership approaches

pressure-testing the same issue against different reactions

explicit before/after readiness for the real meeting

That combination is our wedge.

And the narrowness is an advantage.

A home screen saying:

What conversation are you dreading?

is stronger for this award than:

Interview
Sales pitch
Negotiation
Networking
Presentation
Leadership
Difficult conversation

The broad competitors already own that generic space.


## 11. Real upcoming situations should be the hero

A 2025 manager communication study called CommCoach is very relevant.

Researchers interviewed managers and examined an AI-assisted managerial communication training system.

Managers valued:

realistic scenarios;
customizable scenarios;
contextual feedback;
persona control;
iterative practice;
adaptation to communication styles;
low-risk experimentation.
One criticism of generic roleplay was that canned situations can feel sterile when they don’t resemble the real complexity of a user’s workplace problem.

That strongly supports making:

I have a real conversation coming up

the hero feature.

Not hidden under “Custom scenario.”

The app should revolve around it.


## 12. How “My Situation” should work

Do not give the user a blank 2,000-character prompt.

Guide them.

What kind of conversation is this?

Give difficult feedback
Set a boundary
Say no / push back
Address underperformance
Something else
Who is it with?

Direct report
Former peer
My manager
Stakeholder
Other
What happened?

User describes observable facts.

What needs to change?

Short input.

What are you worried they’ll say?

This is important.

What is your relationship like?

Possible choices:

former peer;
close friend;
new relationship;
strained;
older/more experienced employee;
otherwise healthy.
Then AI creates an interpretation:

Here’s the situation I’ll simulate

You’re speaking to Alex, a former peer who now reports to you.

Alex has missed three agreed project dates.

You need more reliable delivery, but you’re worried they’ll think you’ve changed since your promotion.

Alex believes at least one deadline was unrealistic and thinks you have become overly formal.

Edit anything that’s wrong.

That last control matters.

The AI should not invent psychology and then silently treat it as truth.


## 13. Pre-practice readiness should be explicit

Before the rehearsal:

How ready do you feel to have this conversation today?

Something simple:

Not ready ○ ○ ● ○ ○ Ready

Then ask the exact same thing afterward.

Do not dress it up as an objective “confidence score.”

It is a self-report.

This directly proves the judging criterion:

Does the product help build confidence?

rather than expecting Heather to infer it.


## 14. The simulator needs hidden state

This is one of the strongest technical/product recommendations from the research.

Do not simply prompt:

“You are Alex. You are defensive. Behave realistically.”

That will eventually turn into inconsistent LLM mush.

Build structured scenario state.

For example:

ROLE
Alex Morgan
Product Designer
Former peer of user

BELIEFS
- believes two deadlines were unrealistic
- thinks manager is becoming overly formal after promotion
- doesn't believe lateness has hurt customers

EMOTIONAL START
guarded, not hostile

WANTS
- autonomy
- fairness
- acknowledgment of changing scope

RESISTANCE
1. minimizes issue
2. compares behavior with rest of team
3. invokes former friendship
4. becomes more open if manager asks for specifics

FACTS
- three deadlines missed
- scope changed on one
- one delay was avoidable
- teammate covered work twice

POSSIBLE OUTCOMES
- collaborative commitment
- reluctant compliance
- unresolved disagreement
- relationship damage
The language model generates natural dialogue.

But our application controls the world.

That is a huge conceptual difference.


## 15. Why hidden state matters

Without it, LLMs tend to become agreeable.

Classic failure:

Manager

“I just wanted to let you know the delays are causing issues.”

AI employee

“Thank you for sharing that with me. I completely understand and will improve moving forward.”

That is useless rehearsal.

The employee needs reasons for behaving how they behave.

And those reasons need persistence.

If Alex genuinely believes:

“one of those deadlines was caused by scope changes,”

that belief should not disappear because the manager uses polite language.


## 16. Realistic does not mean adversarial

This distinction matters.

Nerve Arena uses an “opponent” model.

That fits its brand.

I would not do that.

We do not want every employee to behave like:

narcissistic boss battle level 5.

Sometimes Alex should say:

“You’re right. I should’ve told you sooner.”

Sometimes:

“I completely disagree.”

Sometimes:

“Can I be honest? I don’t actually know which priority you want me to drop.”

Sometimes:

“Is this coming from you or has someone complained?”

Sometimes:

“You’re my manager now, but we both know these targets are unrealistic.”

Ordinary humans under tension.

That fits Heather much better than combat metaphors.


## 17. Rewind is still an excellent idea — but it needs to be deeper

The strongest evidence here comes from the CHI 2024 paper Rehearsal: Simulating Conflict to Teach Conflict Resolution.

The system let people:

interact with simulated counterparts;
explore counterfactual conversational paths;
practice conflict-resolution strategies;
receive theory-grounded feedback.
In a between-subjects study with 40 participants, those using the simulation later used substantially fewer escalating competitive strategies and more cooperative strategies than people who received lecture material covering the same underlying theory.

That is highly relevant.

But we need to make Rewind stronger than:

Here’s a better answer. Retry.


## 18. Stateful Rewind

Example:

Moment that mattered

Alex

“Everyone else misses these internal deadlines too. Why are you making an example out of me?”

You

“I’m not trying to make a big deal out of it. Just try to be a bit more careful.”

What changed here

You had established a clear expectation. When Alex challenged its fairness, you turned it into a suggestion.

Then:

↶ Rewind

The app restores the exact conversational state from before that turn.

Alex says again:

“Everyone else misses these internal deadlines too. Why are you making an example out of me?”

You respond differently:

“I hear that there may be a wider issue and I’ll look at that separately. Right now I’m talking about the three dates you and I agreed. Help me understand what got in the way.”

Now Alex might respond:

“Fine. On the last one, the scope changed two days before delivery.”

That gives us a new branch.

That is actual counterfactual learning.


## 19. Technically, Rewind should restore state

This is why the hidden-state architecture matters.

At every important turn, store a snapshot such as:

{
  "phase": "resistance",
  "issueAcknowledged": true,
  "managerAskedForPerspective": false,
  "expectationIsClear": true,
  "managerBackedAway": false,
  "revealedFacts": [
    "deadline_1",
    "deadline_2"
  ],
  "hiddenFacts": [
    "scope_changed_deadline_2"
  ],
  "relationshipTrust": 0.63,
  "resolution": null
}
Then Rewind means:

restore state snapshot → replace user’s next turn → continue from new branch.

Rather than:

“Hey LLM, imagine what might’ve happened differently.”

That makes the simulation much more credible and controllable.


## 20. Hero feature #2: Pressure Test

This might actually be as important as Rewind.

After completing a scenario:

Think you’re ready? Try a different reaction.

Options:

Gets defensive
Becomes upset
Challenges your authority
Minimizes the issue
Goes quiet
Pushes blame elsewhere
Pick for me
Same underlying conversation.

Different human reaction.

This is excellent because:

One scenario now has massive replay value.
User learns principles rather than memorizing one sequence.
It directly reinforces “no perfect script.”
It feels much closer to an actual simulator.

## 21. Pressure Test should change reaction style, not facts

This is subtle.

If the user rehearses:

employee missed three deadlines,

Pressure Test should not randomly rewrite reality.

Instead:

Defensive version

“Why are you singling me out?”

Upset version

“I’ve been working late every night. I don’t know what else you want from me.”

Authority-challenge version

“You’ve been my manager for three months. You don’t understand this project.”

Minimizing version

“They’re internal dates. Nothing actually went wrong.”

Same problem.

Different interpersonal pressure.


## 22. No perfect answer

This is essential to satisfy the “authentic leadership” part of the prompt.

After a weak moment, do not show:

Correct answer:

And probably do not show:

You should have said:

Instead:

Approaches you could try

More direct

Hold the expectation first, then explore the objection.

More curious

Explore why the commitment was missed before deciding what needs to happen next.

More relational

Acknowledge the awkwardness of your changed relationship without allowing it to override the standard.

Then:

Choose what sounds most like you.

The underlying behaviors still matter:

clarity;
facts;
listening;
boundary maintenance;
forward direction.
But the exact sentence belongs to the manager.


## 23. Feedback should be evidence-based, not personality-based

I would strongly avoid:

Leadership: 82
Confidence: 79
Empathy: 91

Those numbers look impressive but are often meaningless.

Instead:

You made the issue concrete

“We’ve missed the agreed date three times in the past six weeks.”

Why it helped

You described observable behavior rather than judging Alex’s character.

You lost the boundary when challenged

“I don’t want to make a huge issue of it…”

Why it mattered

Your expectation became ambiguous as soon as Alex pushed back.

You never explored what was getting in the way

Alex mentioned changing priorities twice, but the conversation moved on without exploring them.

That is useful.


## 24. If we score, score only what is meaningful

I would consider one compact summary such as:

Conversation foundations

Clear issue ✓
Evidence anchored ✓
Perspective explored △
Boundary held ✕
Next step established △
That is much better than:

Empathy 84.7/100.

And even these checks should be backed by transcript evidence.


## 25. The debrief should start with outcome, not stats

Something like:

Conversation complete

You addressed the missed deadlines, but the next expectation remained unclear.

Alex understood that the issue mattered but left unsure what needs to change.

Then:

Moments that mattered

Perhaps only two or three.

Not a huge AI essay.


## 26. The strongest “Before you go in” mechanic

At the end:

Ready for the real conversation

Your purpose

Address repeated missed deadlines before they affect the wider team.

Facts to anchor on

3 missed agreed dates in 6 weeks
2 required another teammate to step in
What you’re asking for

Flag a delivery risk before the deadline, not after it is missed.

Stay curious about

Whether changing scope is contributing.

Likely pushback

“Everyone misses deadlines.”

Your principle

A wider team problem does not mean this conversation no longer matters.

That is not a script.

It is a set of anchors.

Then:

How ready do you feel now?

Before 2/5 → Now 4/5

This is one of the cleanest ways to prove the category’s confidence objective.


## 27. The scenario library should be small and excellent

Do not build 100 mediocre cards.

Build maybe 8–12 excellent base scenarios with carefully designed hidden state.

Recommended initial set:

1. You’re their manager now

A former peer keeps missing expectations and jokes that you’ve “gone corporate.”

Skills

feedback;
friendship boundary;
authority;
new-manager insecurity.
2. The high performer with a bad attitude

Excellent output, but gossip/behavior is damaging the rest of the team.

Skills

behavioral specificity;
accountability;
avoiding “but they perform well” excuses.
3. They get defensive about feedback

Employee says your criticism is unfair.

Skills

clarity;
listening;
staying in the conversation.
4. Your friend expects an exception

A friend/direct report expects flexible treatment.

Skills

fairness;
friendship boundary.
5. They keep messaging outside your boundaries

Employee expects instant after-hours responses.

Skills

time boundary;
consistency.
6. Your boss gives an impossible deadline

You need to push back upward.

Skills

saying no;
capacity;
evidence;
alternatives.
7. Stakeholder adds last-minute scope

They want a major addition without moving the deadline.

Skills

boundaries;
stakeholder management;
saying no.
8. Experienced employee challenges your authority

“I’ve been here longer than you.”

Skills

confidence;
authority without authoritarianism.
9. Underperformance without obvious misconduct

Employee is trying but not reaching the required standard.

Skills

clarity;
kindness;
expectations.
10. Employee becomes upset

The conversation triggers tears or visible emotion.

Skills

stay human without abandoning the issue.
11. The excuse may actually be valid

Employee gives new information that weakens your original assumption.

Skills

curiosity;
adaptability;
fairness.
12. Saying no to extra work for your team

Senior stakeholder tries to dump an unrealistic request onto the team.

Skills

protecting team capacity;
diplomacy.

## 28. Hero scenario: former peer

This should be the demo scenario.

It maps almost perfectly to the prompt.

Something like:

You were promoted. Your former peer wasn’t.

Jamie Carter
Senior Account Manager

You and Jamie joined the company around the same time and became close friends.

Three months ago, you were promoted to lead the team.

Jamie has recently started arriving late to the weekly team meeting and joking that you’ve become “corporate” when you challenge it.

The rest of the team has noticed.

Your goal

Address the behavior without hiding behind your friendship — or overcompensating with authority.

What makes it hard

Jamie thinks the relationship should protect them from formal boundaries.

Heather should be able to see this screen and immediately think:

“This was built for my audience.”


## 29. The home screen should be brutally focused

I would do:

What conversation are you dreading?

Primary CTA:

I have a real conversation coming up

Secondary:

Practice a scenario

Then below, maybe:

Give difficult feedback
Set a boundary
Say no / push back
That’s essentially it.

No giant dashboard.

No “Daily leadership insight.”

No streak card.

No motivational quote.

No feed.


## 30. During rehearsal: strip everything away

This is where our visual research fits.

I would keep:

ALEX MORGAN
Product Designer · Former peer

Then the conversation field.

That’s basically it.

No:

score;
hints;
tips;
“great response!”;
anger meter;
emotional-state icon;
suggested sentence;
visible objective checklist.
You are in the meeting.

Coaching happens after.


## 31. Keep the abstract Skia conversation field

After looking at the actual product rather than just animation possibilities, I still think our no-mascot direction is stronger.

There is already one social entity:

Alex.

Adding a mascot creates:

user + Alex + coach + mascot.

Too much conceptual clutter.

The abstract field simply means:

The conversation is live.

That is enough.


## 32. Conversation Field behavior

The visual rule we discussed still makes sense:

User speaking

Outer membrane responds

Your voice creates subtle outward deformation/ripples.

Alex speaking

Interior moves

The perimeter remains calmer while motion travels inside.

Thinking / generating

Field contracts

Everything pulls inward.

Conversation complete

Field collapses into timeline

Rewind

Timeline marker expands back into the field

That is an actual visual system rather than decorative AI goo.


## 33. Why Skia works technically

Current React Native Skia + Expo supports the primitives we need:

gradients;
custom shaders;
Perlin noise;
displacement maps;
composition;
runtime uniforms.
So the field can be driven by:

time
audioEnergy
speaker
conversationState
rewindProgress
No prerecorded video.

No Blender.

No 3D engine required.


## 34. Expo is not a meaningful limitation

For the core experience, Expo is absolutely viable.

Recommended:

Expo / React Native
│
├── expo-audio
│   ├── microphone capture
│   ├── audio playback
│   └── metering / sample data
│
├── React Native Skia
│   └── conversation field
│
├── Reanimated
│   └── UI + timeline transitions
│
└── Backend
    ├── transcription
    ├── scenario state
    ├── actor generation
    ├── TTS
    └── evaluator

## 35. Voice architecture: do not make perfect realtime speech the bottleneck

I would initially build:

user speaks
↓
record audio
↓
speech-to-text
↓
simulation updates state
↓
actor generates reply
↓
text-to-speech
↓
Alex speaks
This is technically safer.

Then, if we have time:

automatic end-of-turn detection;
barge-in;
realtime speech;
interruption.
Do not let full-duplex voice consume two weeks.

The product value is:

simulation + feedback + counterfactual practice.

Not:

shaving 250 ms off latency.


## 36. Real-time voice is a stretch feature, not the moat

If the voice feels polished with a short:

listening → thinking → Alex speaks

cycle, that’s already enough.

The Conversation Field can elegantly cover the generation delay.

If latency is:

~700ms–1.5 seconds,

the thinking contraction gives that wait purpose.


## 37. Separate Actor and Coach

Very important.

Actor

Only cares about:

What would Alex say next?

Knows:

facts;
relationship;
motives;
beliefs;
hidden state;
what has been revealed;
current trust;
unresolved objections.
The Actor should not care whether the user is learning.

It plays the person.

Coach / evaluator

Only cares about:

What happened in this conversation?

Looks at:

transcript;
objectives;
scenario facts;
behavior markers;
turning points.
Then produces evidence-backed feedback.

That separation gives much stronger prompt control.


## 38. Semi-deterministic simulation > pure LLM improvisation

The model should generate language.

Our system should control:

scenario facts;
state transitions;
revealed information;
whether the issue is resolved;
whether an expectation has been set;
whether manager backed down;
employee openness.
That protects us against sycophancy and randomness.

There is even very recent research specifically addressing structured LLM sparring partners for difficult workplace conversations (ConvoDojo, ACM CUI 2026), which is directionally aligned with this approach.


## 39. No emotion meter

I remain strongly against:

😡 Alex anger 72%

It breaks immersion.

The user should infer:

“Alex is becoming defensive”

because Alex says:

“I don’t think that’s fair at all.”

That’s what the real meeting will require.

The product should train perception, not replace it.


## 40. Privacy is part of the experience

A user may enter:

“Sarah is on her second warning and HR told me…”

That can become confidential quickly.

So before real-situation setup:

Keep it anonymous

Use first names or placeholders. Avoid confidential company, employee, customer, medical, or HR information.

And potentially offer:

Private session

Do not save this transcript after the rehearsal.

Even if the MVP is simple, this communicates psychological safety.


## 41. Do not become an HR decision engine

We should train:

how to communicate.

We should not decide:

“Put Alex on a PIP.”

or:

“Fire them.”

or:

“This is legally harassment.”

or:

“Issue a written warning.”

If formal consequences are involved:

Practice how you’ll communicate a decision you have already confirmed with the relevant policy/HR process.

That is safer and more aligned with the app’s purpose.


## 42. What I would actually ship


### MUST SHIP

Real-situation builder

The actual conversation happening tomorrow.

Curated scenarios

8–12 excellent scenarios.

Voice rehearsal

User says their own words.

Hidden employee state

Believable consistent behavior.

Realistic pushback

Not random aggression.

Evidence-based debrief

Exact transcript moments.

Moment detection

Identify where the conversation materially changed.

Pre/post readiness

Tiny implementation, huge judging leverage.

Before-you-go-in card

Immediately practical.


## 43. HERO FEATURES

1. Stateful Rewind

Return to exact conversational state.

Say something different.

Create a different branch.

2. Pressure Test

Same real-world problem.

Different plausible employee reaction.

These are the two features I would make visually and functionally excellent.


## 44. SHOULD SHIP

Conversation Field

Polished but restrained.

Alternate approaches

Direct / curious / relational instead of “correct answer.”

Session history

Only if easy.

Private-session mode

Useful for real work situations.

A handful of different voices

Enough to prevent every scenario feeling identical.


## 45. STRETCH

True realtime duplex voice

Only after everything else works.

Barge-in / interruptions

Useful, but complexity increases.

Employee interruptions

Interesting for higher difficulty.

Post-real-meeting follow-up

“How did it actually go?”

Potentially excellent product feature, but not necessary for judging.


## 46. CUT

Do not build:

streaks;
XP;
achievements;
leadership courses;
social feed;
leaderboard;
huge analytics dashboard;
résumé coaching;
career-planning chatbot;
body-language/camera analysis;
emotion detection;
personality typing;
dozens of arbitrary communication scores;
100 scenarios;
giant script library.
Those dilute the experience.


## 47. Suggested visual direction

I’d keep the product serious but not corporate.

Think:

dark / restrained / cinematic

rather than:

blue SaaS dashboard.

The rehearsal is almost a room.

The rest of the app can be lighter/warmer if desired, but the actual simulation should shift visually into a focused environment.

Something like:

MEETING ROOM 04

Alex Morgan
Product Designer · Former peer

             ◉
      conversation field

       Begin when ready
Then once it starts:

metadata fades;
field becomes active;
conversation becomes central.

## 48. Timeline transition

This remains one of the strongest visual ideas.

Conversation ends.

Field contracts:

FIELD
 ↓
concentric pressure layers flatten
 ↓
horizontal path
 ↓
TIMELINE
Then:

●────────●────────◉────────●──────●
0:22     0:54     1:31     2:10   2:48
                   ↑
            Moment that mattered
Tap it.

The point expands.

Field reforms.

You are back inside the conversation.

This gives the animation actual semantic meaning.


## 49. Ideal judging demo — 90–120 seconds

This is how I’d intentionally construct it.

0:00–0:10

Open with:

The conversation before the conversation.

Practice the hard management conversation before the stakes are real.

Tap:

I have a real conversation coming up

0:10–0:25

Very quickly define:

Former peer
Repeated lateness / missed commitments
Worried they’ll think I changed after promotion

App builds scenario.

Readiness:

2/5

0:25–0:55

Enter rehearsal.

Alex:

“I don’t understand why this is suddenly such a big issue.”

User responds.

Alex escalates slightly:

“Everyone misses these dates. Why are you making an example out of me?”

User intentionally gives a weak response:

“I’m not trying to make a huge issue of it. Just try to keep an eye on it.”

End.

0:55–1:15

Conversation field collapses into debrief.

App identifies:

Moment that mattered

You abandoned the standard when Alex challenged you.

Shows exact quote.

Tap:

↶ Rewind

1:15–1:35

Field reforms.

Alex repeats:

“Everyone misses these dates. Why are you making an example out of me?”

User responds better:

“There may be a wider issue and I’ll look at that separately. Right now I want to understand what happened with the dates we agreed.”

Alex now reveals:

“The last one changed because the scope changed two days beforehand.”

Different branch.

1:35–1:50

Show:

What changed

You held the expectation while still inviting context.

Then:

Pressure Test

Try this again if Alex challenges your authority.

Maybe just flash the option.

1:50–2:00

Final:

Ready for the real conversation

Before: 2/5
Now: 4/5

Prep card appears.

End.

That demo hits:

realistic scenario;
active practice;
feedback;
boundary management;
authentic leadership;
experimentation;
confidence building;
practicality.
All in under two minutes.


## 50. Competitive advantage in one sentence

Most competitors are:

AI communication coaches that include difficult conversations.

We should be:

A difficult-conversation simulator built specifically for new managers.

That difference sounds small.

Product-wise, it is enormous.


## 51. Positioning

My preferred positioning:

The conversation before the conversation.

A private rehearsal room for new managers.

Alternative App Store copy:

Rehearse feedback, boundaries and difficult workplace conversations before the stakes are real.

Potential screenshot sequence:

The conversation you’re dreading?

Practice it first.

They push back.

You adjust.

See the moment that changed the conversation.

Rewind it.

Try another way.

Pressure-test what might happen next.

Walk into the real meeting ready.


## 52. Most important conceptual decision

Do not measure how eloquent the user sounds.

Measure whether they actually led.

For example:

User:

“I really appreciate everything you do and I want to be sensitive to how challenging the last few weeks have been and I really value your contributions…”

Generic AI:

Empathy: 96.

Our evaluator:

You still haven’t told Alex what the problem is.

That is the product.


## 53. Authentic leadership implementation

The prompt specifically says not to prescribe one perfect script.

So the evaluator should distinguish:

Invariant principles

Things that matter regardless of personality:

clear issue;
observable facts;
listening;
relevant boundary;
next step.
from:

Personal style

Things that can vary:

warm vs concise;
direct vs exploratory;
conversational vs formal;
slower vs faster.
Two managers can succeed with different wording.

That is how we satisfy “authentic leadership” technically, rather than just mentioning it in marketing.


## 54. One feature I’d consider after the MVP: Role Reversal

This did not make my Must Ship list because Rewind/Pressure Test are stronger.

But it could be interesting:

See it from their side

The AI gives the user a short moment as Alex.

For example:

You are Alex now.

Then the app replays the manager’s words from the other perspective.

User receives:

“How would that land if you genuinely believed the deadline was caused by changing scope?”

This could train perspective-taking.

But I’d only implement it if everything else is excellent.


## 55. Another possible stretch: Silence

Real conversations contain silence.

A sophisticated version could occasionally let Alex pause instead of immediately replying.

That forces the manager not to fill every uncomfortable second.

Could be very powerful for:

emotional reactions;
feedback;
confrontation.
But again: stretch.


## 56. Another high-value future mechanic: real follow-up

After the scheduled real-world conversation:

How did it go?

User answers:

Better than expected
About as expected
Harder than expected
Then:

What surprised you?

This could eventually improve future simulations.

It also turns the app from:

training toy

into:

manager preparation habit.

But contest-wise it’s optional.


## 57. Why I don’t think video avatars are worth it

Video/avatar systems could increase social presence.

But for this app they bring:

uncanny-valley risk;
huge implementation burden;
more latency;
more bandwidth;
more complexity;
visual distraction;
demographic/avatar representation questions.
Voice + name + relationship + excellent dialogue is enough.

We should spend realism budget on behavior rather than facial animation.


## 58. Why I don’t think the mascot is right

The mascot would give us strong brand identity.

But inside this product it creates an identity problem.

Who is it?

Alex?
coach?
app?
user’s companion?
If Alex is already the roleplayed employee, we do not need another social character.

The abstract field is cleaner.


## 59. Why I don’t want a normal chat interface

Chat bubbles make the experience feel like:

texting an AI.

This should feel like:

rehearsing a meeting.

We can still retain a transcript.

But it should be visually secondary.

Audio/voice should dominate.


## 60. Why I don’t want a waveform as the hero visual

Waveforms are very clear.

But they say:

recorder / transcription / phone call.

They lack a unique identity.

The Conversation Field can still communicate audio activity while feeling more ownable.


## 61. Why the visual is not the moat

This is worth repeating.

If we end up choosing:

simple beautiful circle reacting to audio

instead of:

insane custom shader,

that is fine.

The winning value is:

**scenario engine

hidden state
real situation
evidence-linked feedback
stateful rewind
pressure test.**
A mediocre orb around an incredible simulator can still win.

An incredible orb around generic ChatGPT roleplay probably will not.


## 62. Technical implementation strategy

I’d break backend logic into four services/concepts.

Scenario Builder

Input:

conversation type;
relationship;
facts;
concern;
expected pushback.
Output structured JSON:

{
  "relationship": {},
  "facts": [],
  "beliefs": [],
  "goals": [],
  "resistance": [],
  "hiddenFacts": [],
  "evaluationCriteria": []
}
Actor

Input:

scenario;
current state;
transcript;
latest user turn.
Output:

employee reply;
state transitions;
newly revealed facts.
Evaluator

Input:

completed transcript;
scenario objective;
relevant rubric.
Output:

outcome summary;
2–3 moments;
transcript evidence;
reasoning;
possible alternative approaches.
Rewind engine

Input:

state snapshot;
transcript up to timestamp;
replacement user response.
Output:

new branch.

## 63. This architecture helps prevent LLM sycophancy

Very relevant recent research notes that LLM sparring partners can suffer from sycophancy/over-agreeableness.

Structured state helps.

If state says:

employeeBelievesManagerIsWrong = true
one polite sentence should not instantly convert them.

The actor can only become more open after certain conditions occur:

specific evidence;
acknowledgment;
perspective question;
fairness concern addressed.
That makes the AI feel far more human.


## 64. Scenario authoring structure

Each curated scenario should define something like:

SCENARIO
Former peer missing commitments

USER OBJECTIVE
Address missed commitments while maintaining fairness.

EMPLOYEE OBJECTIVE
Avoid being treated differently because of manager's promotion.

CORE FACTS
3 dates missed.

NUANCE
One deadline was caused by late scope changes.

HIDDEN BELIEF
"They only care now because they got promoted."

OPENING STATE
Guarded.

TRIGGERS
- vague criticism -> asks for examples
- authority assertion -> relationship trust decreases
- factual examples -> accepts some responsibility
- curiosity -> reveals scope-change fact
- manager backs down -> issue remains unresolved

SUCCESS CONDITIONS
- issue made specific
- employee perspective explored
- relevant expectation maintained
- concrete next step
This will produce dramatically better conversations than giant prompts.


## 65. Monetization should be simple

Because the award requires RevenueCat usage, do not overthink monetization.

Potential:

Free

3 curated rehearsals
one custom rehearsal
Pro

unlimited custom situations
unlimited rewinds
Pressure Test
saved history
But for the contest demo, make sure Heather can experience the key value without hitting a frustrating paywall immediately.

The contest judging should never depend on a judge figuring out your subscription funnel.


## 66. Naming direction

Not part of the deep research mandate, but based on positioning I would avoid names that sound like:

AI Coach Pro;
Leadership AI;
Manager GPT.
Potential semantic directions:

Rehearse
Before
Prelude
Brief
Runthrough
Practice Room
Second Take
Rewind
Cue
Ready
Ahead
I particularly like the “conversation before the conversation” territory.

But naming can come after product flow.


## 67. What would make Heather remember it?

Not:

“It had a really pretty orb.”

Not:

“It had an AI chatbot.”

But:

“That was the app where I could rewind the exact moment I lost control of the conversation, answer differently, and see what happened.”

That is memorable.

And:

“Then I could run the exact same situation again with a completely different reaction.”

That makes it feel like a simulator.


## 68. The strongest overall product loop

Putting everything together:

1. What conversation are you dreading?

Real or practice scenario.

2. Build the situation

Relationship + facts + fear.

3. Confirm the model

User corrects what AI inferred.

4. Readiness check

“How ready do you feel?”

5. Rehearsal

Voice-first.

No coaching interruptions.

6. Consequence

AI counterpart reacts according to scenario state.

7. Debrief

Outcome first.

8. Moments that mattered

Evidence-linked.

9. Rewind

Try a different move.

10. See what changed

Short counterfactual branch.

11. Pressure Test

Different plausible reaction.

12. Before you go in

Mental anchors, not script.

13. Readiness check

Show before → after.

That is the product I would ship.


## 69. Final scope prioritization

Feature	Judge leverage	Differentiation	Effort	Decision
Curated scenarios	Very high	Medium	Low	Must
Real-situation builder	Very high	High	Medium	Must
Voice rehearsal	High	Medium	Medium	Must
Hidden employee state	Very high	High	Medium	Must
Realistic pushback	Very high	Medium	Medium	Must
Evidence-based debrief	Very high	High	Medium	Must
Moment detection	Very high	Medium	Medium	Must
Stateful Rewind	Very high	Very high	Medium-high	Hero
Pressure Test	High	Very high	Medium	Hero
Pre/post readiness	Very high	Medium	Tiny	Must
Before-you-go-in card	High	High	Low	Must
Skia field	Medium	High visual	Medium	Ship V1
Full realtime duplex	Medium	Low-medium	High	Stretch
Tone analytics	Low	Low	High	Cut
Camera/body language	Low	Low	High	Cut
Courses	Very low	Low	High	Cut
XP/streaks	Low	Low	Medium	Cut
Leaderboards	Negative	Low	Medium	Cut

## 70. Final recommendation

If we are building specifically to compete for the Leadership Heather Influencer Award, I would build:

The conversation before the conversation.

A private rehearsal room for new managers.

The user brings the difficult conversation they are actually preparing for.

The app turns it into a structured simulation.

The employee has:

motives;
facts;
beliefs;
resistance;
hidden information.
The manager speaks naturally.

The app does not coach them mid-conversation.

When it ends, it identifies a tiny number of meaningful moments using their exact words.

Then:

↶ Rewind

They return to the exact state and try another approach.

The future changes.

Then:

Pressure Test

They run the same situation against another plausible reaction.

Finally, the app gives them:

purpose;
facts;
boundary/ask;
things to stay curious about;
likely pushback;
a short principle to remember.
Not a script.

And then:

Before: 2/5 ready
After: 4/5 ready

Why I think this has a credible competitive advantage

Heather’s own teaching emphasizes:

clarity;
evidence;
curiosity;
accountability;
boundaries;
courage;
stopping people-pleasing;
being firm rather than harsh.
Manager-training research supports:

realistic customizable scenarios;
low-risk simulation;
iterative practice;
contextual feedback;
persona control.
The Rehearsal research gives real support to counterfactual conversational practice.

Meanwhile, the commercial market shows that:

basic AI roleplay;
voice;
pushback;
scores;
personas;
generic retries
are already table stakes.

So our differentiation should not be:

AI that talks to you.

It should be:

A structured new-manager simulator where conversations have state, your decisions have consequences, and you can revisit the exact point where things went wrong.

The practical differentiator

My Situation

Practice the conversation happening tomorrow.

The learning differentiator

Stateful Rewind

Different response → genuinely different branch.

The resilience differentiator

Pressure Test

Same problem → different human reaction.

The coaching differentiator

Evaluate leadership behavior, not eloquence.

The philosophical differentiator

There is no one perfect script.

The emotional differentiator

You don’t merely learn what you should do.

You experience yourself handling the moment you were afraid of.

The visual differentiator

A restrained Skia Conversation Field that becomes the review timeline and reforms during Rewind — not a mascot and not a generic glowing AI marble.

Key research sources

The most important sources behind the report were:

RevenueCat Shipaton 2026 rules / Leadership Heather criteria
Heather Elkington — In The Making, especially her 2025–2026 material on the 4P framework, people-pleasing, difficult feedback, boundaries, being firm-not-harsh, and new-manager respect
Fresh Leadership World / Fresh Start
Heather’s LinkedIn, Instagram, podcast and public leadership material
Shaikh et al., “Rehearsal: Simulating Conflict to Teach Conflict Resolution,” CHI 2024
Wilhelm et al., “How Managers Perceive AI-Assisted Conversational Training for Workplace Communication,” CUI 2025 / CommCoach
Cross et al., “ConvoDojo: Structured LLM-based Sparring Partners for Difficult Workplace Conversations,” CUI 2026
Current competitor listings for iGrow, Simuverse, Nerve Arena, Oraton, Compass by Radical Candor, Yoodli, VirtualSpeech
Current Expo Audio, React Native Skia, and Reanimated documentation
That’s the full research result.

