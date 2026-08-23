import type { ScenarioDefinition } from "@/domain/scenario";

type FixturePreparationCopy = {
  readonly likelyPushback: readonly string[];
  readonly purpose: string;
  readonly stayCuriousAbout: readonly string[];
};

const FIXTURE_PREPARATION_COPY: Readonly<
  Record<string, FixturePreparationCopy>
> = {
  "former-peer": {
    purpose:
      "Address the lateness directly while protecting the working relationship.",
    stayCuriousAbout: [
      "What is driving the late arrivals?",
      "How has the promotion changed the relationship?",
    ],
    likelyPushback: [
      "It’s only a few minutes.",
      "We used to be equals.",
      "You’re overcompensating because you got promoted.",
    ],
  },
  "defensive-feedback": {
    purpose:
      "Clarify the missed commitments and agree how future scope changes will be handled.",
    stayCuriousAbout: [
      "What changed after the deadlines were agreed?",
      "What support or process would prevent a repeat?",
    ],
    likelyPushback: [
      "You’re ignoring the scope changes.",
      "Why am I the only one being called out?",
      "Those deadlines were never realistic.",
    ],
  },
  "impossible-deadline": {
    purpose:
      "Protect the team’s commitments while offering a credible path to Friday’s real need.",
    stayCuriousAbout: [
      "What does Friday actually need to achieve?",
      "Which tradeoff matters most?",
    ],
    likelyPushback: [
      "Friday isn’t optional.",
      "I need solutions, not reasons.",
      "Is the team fully committed to this?",
    ],
  },
  "repeated-quality-issues": {
    purpose:
      "Address the repeat errors and agree a reliable quality check without judging effort.",
    stayCuriousAbout: [
      "What changed in the reporting process?",
      "Is workload or missing support contributing?",
    ],
    likelyPushback: [
      "I corrected every issue before the client saw it.",
      "You’re overlooking how much extra work I’m carrying.",
      "A formal review step will slow me down.",
    ],
  },
  "after-hours-boundary": {
    purpose:
      "Set a dependable after-hours boundary while keeping a genuine urgency route open.",
    stayCuriousAbout: [
      "What makes waiting until morning feel risky?",
      "Which decisions can Sam make independently?",
    ],
    likelyPushback: [
      "My previous manager always replied.",
      "What if I make the wrong call alone?",
      "I thought being available was part of supporting the team.",
    ],
  },
  "last-minute-scope": {
    purpose:
      "Protect the launch from unplanned scope while offering a credible staged option.",
    stayCuriousAbout: [
      "What does the client truly need by Monday?",
      "How was the Friday expectation set?",
    ],
    likelyPushback: [
      "It’s a small request for an important client.",
      "The estimates must have some padding.",
      "Saying no makes the team look obstructive.",
    ],
  },
};

const FALLBACK_COPY: FixturePreparationCopy = {
  purpose: "Address the issue clearly and agree a workable next step.",
  stayCuriousAbout: [
    "What context could change the path forward?",
    "What is making the expectation hard to meet?",
  ],
  likelyPushback: [
    "That doesn’t feel fair.",
    "There’s more context you’re missing.",
    "I’m not sure that plan will work.",
  ],
};

export function getFixturePreparationCopy(
  scenario: ScenarioDefinition,
): FixturePreparationCopy {
  return FIXTURE_PREPARATION_COPY[scenario.id] ?? FALLBACK_COPY;
}
