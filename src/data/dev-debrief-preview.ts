import type { Debrief } from "@/domain/coaching";
import type { ScenarioDefinition } from "@/domain/scenario";
import { getFixturePreparationCopy } from "@/data/fixture-preparation-copy";

export function createDevDebriefPreview(
  scenario: ScenarioDefinition,
): Debrief {
  const counterpartFirstName =
    scenario.relationship.counterpartName.split(" ")[0] || "They";
  const preparationCopy = getFixturePreparationCopy(scenario);

  return {
    outcome: `${counterpartFirstName} understood why the issue mattered, but no concrete next step was agreed.`,
    foundations: [
      { key: "purpose", status: "clear" },
      { key: "specificity", status: "clear" },
      { key: "evidence", status: "partial" },
      { key: "perspective", status: "clear" },
      { key: "boundary", status: "partial" },
      { key: "path", status: "clear" },
    ],
    moments: [
      {
        id: "dev-rewind-moment",
        turnId: "dev-manager-turn",
        evidenceIds: [],
        impact: "mixed",
        quote: "I hear your concern. I still need us to agree what changes next.",
        observation:
          "You acknowledged the resistance without abandoning the standard.",
        consequence:
          `${counterpartFirstName} had room to explain the pressure while the conversation kept moving toward a concrete path.`,
        rewindable: true,
        approaches: [
          {
            style: "direct",
            principle: "Restate the standard, then ask for a workable next step.",
          },
          {
            style: "curious",
            principle: "Explore what is making the expectation hard to meet.",
          },
          {
            style: "relational",
            principle:
              "Name the relationship while keeping the expectation intact.",
          },
        ],
      },
      {
        id: "dev-strong-moment",
        turnId: "dev-manager-turn-two",
        evidenceIds: [],
        impact: "helped",
        quote:
          scenario.presentation.briefingGoals[0] ?? scenario.managerObjective,
        observation:
          "You connected the conversation to an observable issue instead of a character judgment.",
        consequence:
          "That gave the other person something specific they could respond to.",
        rewindable: false,
        approaches: [],
      },
    ],
    preparationCard: {
      purpose: preparationCopy.purpose,
      factIds: scenario.coreFacts.map((fact) => fact.id),
      requestOrBoundary:
        scenario.presentation.briefingGoals.at(-1) ?? scenario.managerObjective,
      stayCuriousAbout: preparationCopy.stayCuriousAbout,
      likelyPushback: preparationCopy.likelyPushback,
      principle: "Stay curious without backing away from the standard.",
    },
  };
}
