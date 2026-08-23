import {
  PRACTICE_CATEGORIES,
  type ScenarioDefinition,
} from '@/domain/scenario';
import type { PracticeSession } from '@/domain/session';

export type ScenarioBrief = {
  id: string;
  version: number;
  category: ScenarioDefinition['category'];
  eyebrow: string;
  title: string;
  fullTitle: string;
  counterpart: {
    name: string;
    role: string;
    relationship: string;
  };
  context: string;
  goals: readonly string[];
  tension: string;
};

export const scenarioDefinitions = [
  {
    id: 'former-peer',
    version: 1,
    publicationStatus: 'published',
    category: 'boundary',
    title: 'You were promoted. Jamie wasn’t.',
    presentation: {
      shortTitle: 'You were promoted. They weren’t.',
      fullTitle: 'You were promoted. Jamie wasn’t.',
      relationshipLabel: 'Former peer → direct report',
      briefingSummary:
        'Three months after your promotion, Jamie has arrived 10–15 minutes late to the last three weekly team meetings. Twice, the team had to repeat decisions Jamie missed. When you raise it, Jamie jokes that you’ve “gone corporate.”',
      briefingGoals: [
        'Make the pattern and its impact concrete.',
        'Hear Jamie’s perspective without dropping the expectation.',
        'Agree what changes before the next team meeting.',
      ],
      managerPressure:
        'You’re worried that holding the boundary could damage the friendship—or that avoiding it could undermine your authority.',
      evidenceAnchors: [
        {
          id: 'lateness-pattern',
          label: 'Pattern',
          statement:
            'Late to the last three meetings — 12, 15, and 10 minutes.',
          factIds: ['late-meeting-1', 'late-meeting-2', 'late-meeting-3'],
        },
        {
          id: 'team-impact',
          label: 'Impact',
          statement: 'The team repeated decisions twice.',
          factIds: ['meeting-impact'],
        },
      ],
    },
    relationship: {
      counterpartName: 'Jamie Carter',
      counterpartRole: 'Senior Account Manager',
      relationshipType: 'former-peer',
      history: [
        'You and Jamie joined the company around the same time and became close friends.',
        'You were promoted to lead the team three months ago; Jamie also applied for the role.',
      ],
    },
    managerObjective:
      'Address the lateness and team impact without hiding behind the friendship or overcompensating with authority.',
    counterpartObjective:
      'Preserve the old informal equality and avoid accepting a formal attendance boundary.',
    openingLine: 'So, is this an official manager talk now?',
    coreFacts: [
      {
        id: 'promotion-three-months',
        statement: 'The manager was promoted three months ago.',
      },
      {
        id: 'late-meeting-1',
        statement: 'Jamie was 12 minutes late three meetings ago.',
      },
      {
        id: 'late-meeting-2',
        statement: 'Jamie was 15 minutes late two meetings ago.',
      },
      {
        id: 'late-meeting-3',
        statement: 'Jamie was 10 minutes late to the most recent meeting.',
      },
      {
        id: 'meeting-impact',
        statement:
          'The team repeated decisions in two meetings because Jamie missed them.',
      },
      {
        id: 'corporate-joke',
        statement:
          'Jamie joked that the manager had “gone corporate” when challenged.',
      },
    ],
    hiddenFacts: [
      {
        id: 'client-call-overrun',
        statement:
          'Two late arrivals followed a recurring client call that ran over.',
        revealRule:
          'Reveal after an open, non-accusatory question about what is causing the lateness.',
      },
      {
        id: 'promotion-disappointment',
        statement:
          'Jamie also applied for the team-lead role and is disappointed about the promotion.',
        revealRule:
          'Reveal only after the manager acknowledges the changed relationship or asks directly about the tension.',
      },
      {
        id: 'public-correction',
        statement:
          'Jamie felt embarrassed when the latest arrival was challenged in front of the team.',
        revealRule:
          'Reveal when asked how the manager’s approach landed, or after curiosity without retreating from the standard.',
      },
    ],
    beliefs: [
      {
        id: 'friendship-protection',
        statement:
          'Our friendship should protect me from formal correction.',
      },
      {
        id: 'authority-performance',
        statement:
          'The manager is overcompensating to prove they deserve the promotion.',
      },
      {
        id: 'being-singled-out',
        statement:
          'My contribution is being ignored while my lateness is magnified.',
      },
    ],
    openingState: { trust: 0.56, openness: 0.42 },
    resistanceMoves: [
      {
        id: 'minimize-pattern',
        description:
          'Minimize the lateness when the manager is vague or offers no evidence.',
      },
      {
        id: 'invoke-friendship',
        description:
          'Invoke the old friendship when a boundary is stated without acknowledging the relationship change.',
      },
      {
        id: 'challenge-authority',
        description:
          'Challenge the manager’s authority after rank, threats, or controlling language.',
      },
      {
        id: 'raise-context',
        description:
          'Explain the recurring client call after genuine curiosity about what is causing the pattern.',
      },
      {
        id: 'fairness-challenge',
        description:
          'Question why Jamie is singled out if the manager generalizes or moralizes.',
      },
      {
        id: 'soften',
        description:
          'Accept a practical next step after specificity, curiosity, a maintained boundary, and a credible path.',
      },
    ],
    triggers: [
      {
        id: 'specific-evidence-used',
        description:
          'The manager accurately names at least two late meetings or the repeated-decisions impact.',
      },
      {
        id: 'perspective-invited',
        description:
          'The manager asks an open question about what is causing the pattern.',
      },
      {
        id: 'relationship-acknowledged',
        description:
          'The manager acknowledges that the promotion changed the relationship without apologizing for managing.',
      },
      {
        id: 'standard-abandoned',
        description:
          'The manager retracts the expectation or says the lateness is unimportant after pushback.',
      },
      {
        id: 'authority-overused',
        description:
          'The manager relies on title, threat, or “because I’m your manager.”',
      },
      {
        id: 'clear-path-offered',
        description:
          'The manager asks for or proposes a concrete prevention and notification plan.',
      },
    ],
    successConditions: [
      {
        id: 'observable-pattern',
        description: 'State the observable pattern and impact without exaggeration.',
      },
      {
        id: 'perspective-heard',
        description: 'Ask for Jamie’s perspective.',
      },
      {
        id: 'context-not-exemption',
        description:
          'Acknowledge relevant context without treating it as an exemption.',
      },
      {
        id: 'expectation-explicit',
        description: 'Make attendance and communication expectations explicit.',
      },
      {
        id: 'concrete-action',
        description: 'Agree on a concrete action before the next meeting.',
      },
    ],
    coachingFocus: [
      'specificity',
      'evidence',
      'perspective',
      'boundary',
      'path',
    ],
  },
  {
    id: 'defensive-feedback',
    version: 1,
    publicationStatus: 'published',
    category: 'feedback',
    title: 'Alex says your feedback is unfair.',
    presentation: {
      shortTitle: 'They call your feedback unfair.',
      fullTitle: 'Alex says your feedback is unfair.',
      relationshipLabel: 'Direct report',
      briefingSummary:
        'Alex delivered a revised checkout flow two days late and a handoff prototype one business day late. The delay moved an engineering review from Friday to Monday. When you raise the pattern, Alex says the feedback is unfair and that you’re singling them out.',
      briefingGoals: [
        'Make the missed commitments specific.',
        'Explore what changed without losing the standard.',
        'Agree on support and next steps.',
      ],
      managerPressure:
        'If you retreat, the standard disappears. If you push too hard, you may miss a real explanation behind the missed work.',
      evidenceAnchors: [
        {
          id: 'missed-deadlines',
          label: 'Pattern',
          statement:
            'The checkout flow was two days late; the prototype was one business day late.',
          factIds: ['deadline-one', 'deadline-two'],
        },
        {
          id: 'engineering-impact',
          label: 'Impact',
          statement: 'The engineering review moved from Friday to Monday.',
          factIds: ['review-delayed'],
        },
      ],
    },
    relationship: {
      counterpartName: 'Alex Morgan',
      counterpartRole: 'Product Designer',
      relationshipType: 'direct-report',
      history: ['Alex has previously delivered strong work and values autonomy.'],
    },
    managerObjective:
      'Make the missed commitments clear, understand the scope changes, and agree a credible path.',
    counterpartObjective:
      'Avoid being blamed for deadlines that changed after scope expanded.',
    openingLine: 'I still think this feedback leaves out half the story.',
    coreFacts: [
      {
        id: 'deadline-one',
        statement:
          'Alex delivered the revised checkout flow on Wednesday, two days after the agreed Monday deadline.',
      },
      {
        id: 'deadline-two',
        statement:
          'Alex delivered the handoff prototype on Friday, one business day after the agreed Thursday deadline.',
      },
      {
        id: 'review-delayed',
        statement:
          'The engineering review moved from Friday to Monday because the prototype arrived late.',
      },
    ],
    hiddenFacts: [
      {
        id: 'late-scope-change',
        statement:
          'The product lead added two checkout states on Tuesday, two days before the prototype deadline, without resetting the delivery plan.',
        revealRule: 'Reveal after a specific, open question about what changed.',
      },
    ],
    beliefs: [
      {
        id: 'unfairly-singled-out',
        statement: 'I am being blamed for a wider planning problem.',
      },
    ],
    openingState: { trust: 0.5, openness: 0.38 },
    resistanceMoves: [
      { id: 'deny-fairness', description: 'Challenge the fairness of the feedback.' },
      { id: 'raise-scope', description: 'Reveal the late scope change after curiosity.' },
      { id: 'accept-path', description: 'Agree a clearer change-control path.' },
    ],
    triggers: [
      { id: 'specific-deadlines', description: 'Both deadlines are named accurately.' },
      { id: 'scope-invited', description: 'The manager asks what changed.' },
      { id: 'clear-path-offered', description: 'A concrete delivery process is proposed.' },
    ],
    successConditions: [
      { id: 'specific-feedback', description: 'Make the feedback evidence-linked.' },
      { id: 'scope-understood', description: 'Explore the scope-change explanation.' },
      { id: 'delivery-path', description: 'Agree how future changes affect commitments.' },
    ],
    coachingFocus: ['specificity', 'evidence', 'perspective', 'path'],
  },
  {
    id: 'impossible-deadline',
    version: 1,
    publicationStatus: 'published',
    category: 'pushback',
    title: 'Morgan gives your team an impossible deadline.',
    presentation: {
      shortTitle: 'Your boss wants it by Friday.',
      fullTitle: 'Morgan gives your team an impossible deadline.',
      relationshipLabel: 'Your manager',
      briefingSummary:
        'Morgan wants a major delivery by Friday. Meeting it means dropping committed work or cutting quality.',
      briefingGoals: [
        'Make the tradeoffs visible.',
        'Protect the team’s current commitments.',
        'Offer a credible alternative.',
      ],
      managerPressure:
        'The power difference makes honest pushback feel risky, especially when Morgan frames urgency as commitment.',
      evidenceAnchors: [
        {
          id: 'friday-deadline',
          label: 'Request',
          statement: 'Morgan requested delivery by Friday.',
          factIds: ['friday-request'],
        },
        {
          id: 'delivery-tradeoff',
          label: 'Tradeoff',
          statement:
            'Meeting it means dropping committed work or reducing quality.',
          factIds: ['existing-commitments', 'quality-tradeoff'],
        },
      ],
    },
    relationship: {
      counterpartName: 'Morgan Lee',
      counterpartRole: 'Department Director',
      relationshipType: 'manager',
      history: ['Morgan values urgency and concise options.'],
    },
    managerObjective:
      'Push back on the Friday deadline with explicit tradeoffs and a credible alternative.',
    counterpartObjective:
      'Secure the earliest viable delivery without appearing to retreat from urgency.',
    openingLine: 'I need the team to find a way to make Friday work.',
    coreFacts: [
      { id: 'friday-request', statement: 'Morgan requested delivery by Friday.' },
      {
        id: 'existing-commitments',
        statement: 'The team already has committed work due this week.',
      },
      {
        id: 'quality-tradeoff',
        statement: 'The Friday date requires dropping work or reducing quality.',
      },
    ],
    hiddenFacts: [
      {
        id: 'board-preview',
        statement: 'Morgan needs a credible preview for a board update, not the full release.',
        revealRule: 'Reveal after the manager asks what outcome Friday must achieve.',
      },
    ],
    beliefs: [
      {
        id: 'urgency-tests-commitment',
        statement: 'Leaders who are committed bring options instead of saying no.',
      },
    ],
    openingState: { trust: 0.62, openness: 0.46 },
    resistanceMoves: [
      { id: 'repeat-urgency', description: 'Repeat why Friday matters.' },
      { id: 'challenge-commitment', description: 'Question whether the team is committed.' },
      { id: 'clarify-outcome', description: 'Clarify the board-preview need.' },
      { id: 'accept-option', description: 'Accept a viable staged alternative.' },
    ],
    triggers: [
      { id: 'tradeoffs-named', description: 'The manager names concrete tradeoffs.' },
      { id: 'outcome-invited', description: 'The manager asks what Friday must achieve.' },
      { id: 'alternative-offered', description: 'A credible staged option is offered.' },
    ],
    successConditions: [
      { id: 'capacity-protected', description: 'Protect existing commitments.' },
      { id: 'tradeoffs-clear', description: 'Make the delivery tradeoffs explicit.' },
      { id: 'alternative-credible', description: 'Offer a credible alternative.' },
    ],
    coachingFocus: ['purpose', 'evidence', 'boundary', 'path'],
  },
  {
    id: 'repeated-quality-issues',
    version: 1,
    publicationStatus: 'published',
    category: 'feedback',
    title: 'Taylor keeps repeating the same reporting errors.',
    presentation: {
      shortTitle: 'The same mistakes keep returning.',
      fullTitle: 'Taylor keeps repeating the same reporting errors.',
      relationshipLabel: 'Direct report',
      briefingSummary:
        'Taylor’s last three weekly client reports required corrections before they could be sent. Two reused the prior week’s figures, and the latest omitted a known delivery risk. Correcting the reports delayed two sends until the following day.',
      briefingGoals: [
        'Make the repeated quality pattern concrete.',
        'Understand what is driving it without lowering the standard.',
        'Agree a dependable pre-send check.',
      ],
      managerPressure:
        'Taylor works hard and fixes issues quickly. You worry that naming the pattern will sound like you are questioning their effort.',
      evidenceAnchors: [
        {
          id: 'report-error-pattern',
          label: 'Pattern',
          statement: 'The last three weekly reports required corrections.',
          factIds: ['three-reports-corrected', 'stale-report-figures'],
        },
        {
          id: 'report-delay-impact',
          label: 'Impact',
          statement:
            'The latest report omitted a known risk, and corrections delayed two sends.',
          factIds: ['correction-impact'],
        },
      ],
    },
    relationship: {
      counterpartName: 'Taylor Nguyen',
      counterpartRole: 'Customer Success Manager',
      relationshipType: 'direct-report',
      history: [
        'Taylor is diligent, responds quickly to feedback, and has been trusted with increasingly complex accounts.',
      ],
    },
    managerObjective:
      'Address the repeated reporting errors, understand what is contributing to them, and agree a reliable quality-control path.',
    counterpartObjective:
      'Avoid being labelled careless or losing autonomy while keeping the conversation focused on fixes rather than capability.',
    openingLine:
      'I fixed everything you flagged, so I’m not sure why this needs a bigger conversation.',
    coreFacts: [
      {
        id: 'three-reports-corrected',
        statement:
          'Taylor’s last three weekly client reports required corrections before they could be sent.',
      },
      {
        id: 'stale-report-figures',
        statement:
          'Two of the three reports reused account figures from the prior week.',
      },
      {
        id: 'correction-impact',
        statement:
          'The latest report omitted a known delivery risk, and correcting the reports delayed two client sends until the following day.',
      },
    ],
    hiddenFacts: [
      {
        id: 'outdated-report-checklist',
        statement:
          'The reporting workflow changed five weeks ago, but the shared checklist still describes the old export steps.',
        revealRule:
          'Reveal after a specific, open question about how Taylor prepares or checks the reports.',
      },
      {
        id: 'peer-review-dropped',
        statement:
          'Taylor stopped asking for peer review after taking on two additional accounts and has not told the manager that capacity feels strained.',
        revealRule:
          'Reveal after the manager asks what changed, what support is missing, or whether workload is contributing.',
      },
    ],
    beliefs: [
      {
        id: 'quick-fixes-reduce-impact',
        statement:
          'Errors fixed before the client sees them should not be treated as a serious performance pattern.',
      },
      {
        id: 'asking-signals-incompetence',
        statement:
          'Asking for help with a familiar task will make the manager question my capability.',
      },
      {
        id: 'effort-is-overlooked',
        statement:
          'The manager notices mistakes but not the extra effort required by the larger account load.',
      },
    ],
    openingState: { trust: 0.58, openness: 0.4 },
    resistanceMoves: [
      {
        id: 'minimize-quality-impact',
        description:
          'Minimize the pattern by emphasizing that no incorrect report reached a client.',
      },
      {
        id: 'defend-correction-effort',
        description:
          'Focus on how quickly each issue was corrected when the manager treats the errors as carelessness.',
      },
      {
        id: 'raise-report-process',
        description:
          'Explain the outdated checklist or dropped peer review after genuine curiosity about the reporting process.',
      },
      {
        id: 'accept-quality-path',
        description:
          'Agree to a revised checklist and temporary peer review after the quality standard and support are both clear.',
      },
    ],
    triggers: [
      {
        id: 'report-pattern-used',
        description:
          'The manager accurately names the three-report pattern or the repeated stale figures.',
      },
      {
        id: 'report-impact-used',
        description:
          'The manager connects the errors to the omitted risk or delayed sends.',
      },
      {
        id: 'report-process-invited',
        description:
          'The manager asks an open question about preparation, review, workload, or support.',
      },
      {
        id: 'quality-standard-held',
        description:
          'The manager acknowledges Taylor’s effort while keeping the accuracy expectation explicit.',
      },
      {
        id: 'quality-standard-abandoned',
        description:
          'The manager treats quick correction as sufficient and withdraws the accuracy expectation.',
      },
      {
        id: 'quality-path-offered',
        description:
          'The manager proposes or asks for a concrete pre-send verification and follow-up plan.',
      },
    ],
    successConditions: [
      {
        id: 'quality-pattern-specific',
        description: 'State the repeated errors and their impact without labelling Taylor.',
      },
      {
        id: 'quality-cause-explored',
        description: 'Explore what is contributing to the errors.',
      },
      {
        id: 'quality-context-not-exemption',
        description:
          'Acknowledge process or workload context without lowering the accuracy standard.',
      },
      {
        id: 'quality-expectation-explicit',
        description: 'Make the pre-send quality expectation explicit.',
      },
      {
        id: 'quality-check-agreed',
        description: 'Agree a concrete verification step and review point.',
      },
    ],
    coachingFocus: [
      'specificity',
      'evidence',
      'perspective',
      'boundary',
      'path',
    ],
  },
  {
    id: 'after-hours-boundary',
    version: 1,
    publicationStatus: 'published',
    category: 'boundary',
    title: 'Sam expects you to answer after hours.',
    presentation: {
      shortTitle: 'They expect replies after hours.',
      fullTitle: 'Sam expects you to answer after hours.',
      relationshipLabel: 'Direct report',
      briefingSummary:
        'In the last two weeks, Sam sent eight work messages after 8 p.m. and followed up before 8 a.m. four times. Two messages marked urgent concerned internal decisions due the next day. You have never agreed an after-hours response expectation.',
      briefingGoals: [
        'Name the pattern without criticizing Sam for asking for help.',
        'Set a clear availability and urgency boundary.',
        'Agree how Sam handles decisions while you are offline.',
      ],
      managerPressure:
        'You want Sam to feel supported, and you worry that a firm boundary could make you seem unavailable.',
      evidenceAnchors: [
        {
          id: 'after-hours-pattern',
          label: 'Pattern',
          statement:
            'Eight messages arrived after 8 p.m.; four were followed up before 8 a.m.',
          factIds: ['eight-after-hours-messages', 'four-early-followups'],
        },
        {
          id: 'urgency-pattern',
          label: 'Urgency',
          statement:
            'Two next-day internal decisions were marked urgent despite no response agreement.',
          factIds: ['next-day-urgent-messages', 'no-response-agreement'],
        },
      ],
    },
    relationship: {
      counterpartName: 'Sam Patel',
      counterpartRole: 'Account Manager',
      relationshipType: 'direct-report',
      history: [
        'Sam joined the team four months ago and checks ambiguous decisions carefully before acting.',
      ],
    },
    managerObjective:
      'Set a dependable after-hours boundary while giving Sam a clear route for genuine urgency and independent decisions.',
    counterpartObjective:
      'Keep immediate access to the manager as a safety net and avoid being solely accountable for ambiguous calls.',
    openingLine:
      'If something comes up and you don’t answer, what am I supposed to do—just guess?',
    coreFacts: [
      {
        id: 'eight-after-hours-messages',
        statement:
          'Sam sent eight work messages after 8 p.m. during the last two weeks.',
      },
      {
        id: 'four-early-followups',
        statement:
          'Sam followed up before 8 a.m. on four of those message threads.',
      },
      {
        id: 'next-day-urgent-messages',
        statement:
          'Two messages marked urgent concerned internal decisions that were not due until the following day.',
      },
      {
        id: 'no-response-agreement',
        statement:
          'The manager and Sam have not agreed an after-hours response or escalation protocol.',
      },
    ],
    hiddenFacts: [
      {
        id: 'previous-manager-norm',
        statement:
          'Sam’s previous manager invited messages at any hour and usually responded immediately.',
        revealRule:
          'Reveal after the manager asks why Sam expects immediate replies or what availability previously looked like.',
      },
      {
        id: 'unsupported-decision-criticism',
        statement:
          'On a previous team, Sam was sharply criticized after making a customer concession without manager approval.',
        revealRule:
          'Reveal after curiosity about why Sam is reluctant to make ambiguous decisions alone.',
      },
    ],
    beliefs: [
      {
        id: 'availability-means-support',
        statement: 'A supportive manager is reachable when uncertainty appears.',
      },
      {
        id: 'manager-owns-risky-calls',
        statement:
          'Ambiguous customer decisions belong to the manager because getting one wrong is personally risky.',
      },
      {
        id: 'waiting-risks-trust',
        statement: 'Waiting for the next workday could damage customer trust.',
      },
    ],
    openingState: { trust: 0.64, openness: 0.44 },
    resistanceMoves: [
      {
        id: 'frame-access-as-support',
        description:
          'Frame immediate access as a basic expectation of managerial support.',
      },
      {
        id: 'compare-previous-manager',
        description:
          'Compare the boundary with the previous manager’s constant availability.',
      },
      {
        id: 'raise-decision-risk',
        description:
          'Explain the fear of making an unsupported decision after genuine curiosity.',
      },
      {
        id: 'accept-urgency-path',
        description:
          'Accept response hours and an escalation route once urgent cases and decision authority are clear.',
      },
    ],
    triggers: [
      {
        id: 'after-hours-pattern-used',
        description:
          'The manager accurately names the after-hours messages or early follow-ups.',
      },
      {
        id: 'access-expectation-invited',
        description:
          'The manager asks what Sam expects, fears, or previously experienced.',
      },
      {
        id: 'support-acknowledged',
        description:
          'The manager validates the need for support without promising constant availability.',
      },
      {
        id: 'availability-boundary-held',
        description:
          'The manager states when replies should and should not be expected.',
      },
      {
        id: 'urgency-defined',
        description:
          'The manager distinguishes genuine urgency from work that can wait.',
      },
      {
        id: 'offline-path-offered',
        description:
          'The manager establishes decision authority and a concrete escalation route.',
      },
      {
        id: 'availability-boundary-abandoned',
        description:
          'The manager promises to remain generally available after Sam pushes back.',
      },
    ],
    successConditions: [
      {
        id: 'availability-pattern-specific',
        description: 'Name the messaging pattern without judging Sam’s intent.',
      },
      {
        id: 'availability-perspective-heard',
        description: 'Understand what drives the expectation of immediate access.',
      },
      {
        id: 'response-expectation-explicit',
        description: 'Set a clear after-hours response expectation.',
      },
      {
        id: 'urgent-route-agreed',
        description: 'Define genuine urgency and a suitable escalation route.',
      },
      {
        id: 'decision-authority-agreed',
        description: 'Clarify what Sam can decide while the manager is offline.',
      },
    ],
    coachingFocus: [
      'purpose',
      'specificity',
      'perspective',
      'boundary',
      'path',
    ],
  },
  {
    id: 'last-minute-scope',
    version: 1,
    publicationStatus: 'published',
    category: 'pushback',
    title: 'Riley adds major scope days before launch.',
    presentation: {
      shortTitle: 'They added scope days before launch.',
      fullTitle: 'Riley adds major scope days before launch.',
      relationshipLabel: 'Senior stakeholder',
      briefingSummary:
        'Four days before Friday’s launch, Riley asks for a custom data export to be added without moving the date. Engineering estimates four days to build it plus QA. Adding it now means delaying the launch or dropping two committed stability fixes.',
      briefingGoals: [
        'Make the delivery cost and tradeoffs explicit.',
        'Clarify the outcome the stakeholder actually needs.',
        'Hold the scope boundary and offer a staged alternative.',
      ],
      managerPressure:
        'Riley calls it a small request for an important client. You worry that refusing will make your team seem obstructive.',
      evidenceAnchors: [
        {
          id: 'late-export-request',
          label: 'Request',
          statement:
            'A custom export was requested four days before the agreed Friday launch.',
          factIds: ['friday-launch', 'custom-export-request'],
        },
        {
          id: 'export-tradeoff',
          label: 'Tradeoff',
          statement:
            'The work needs four days plus QA and would delay launch or displace two fixes.',
          factIds: ['export-estimate', 'export-release-tradeoff'],
        },
      ],
    },
    relationship: {
      counterpartName: 'Riley Chen',
      counterpartRole: 'Sales Director',
      relationshipType: 'stakeholder',
      history: [
        'Riley owns a strategically important account and regularly advocates for urgent client requests.',
      ],
    },
    managerObjective:
      'Push back on adding unplanned production scope without a tradeoff, clarify the client outcome, and agree a credible staged option.',
    counterpartObjective:
      'Secure credible proof for the client quickly without admitting that production timing was mentioned before delivery confirmed it.',
    openingLine:
      'This account is too important. I need the export in Friday’s release.',
    coreFacts: [
      {
        id: 'friday-launch',
        statement: 'The current release is agreed for Friday.',
      },
      {
        id: 'custom-export-request',
        statement:
          'Riley requested a custom data export four days before the Friday launch.',
      },
      {
        id: 'export-estimate',
        statement:
          'Engineering estimates four working days to build the export before quality assurance.',
      },
      {
        id: 'export-release-tradeoff',
        statement:
          'Adding the export now would delay the launch or remove two committed stability fixes.',
      },
    ],
    hiddenFacts: [
      {
        id: 'client-demo-is-enough',
        statement:
          'The client has a review on Monday and needs a credible walkthrough with sample output, not a production-ready self-service export.',
        revealRule:
          'Reveal after the manager asks what the client must be able to see or accomplish and by when.',
      },
      {
        id: 'export-promise-unconfirmed',
        statement:
          'Riley described the export as planned during a sales call before confirming a delivery date with the team.',
        revealRule:
          'Reveal after the manager asks how the request or Friday expectation was established.',
      },
    ],
    beliefs: [
      {
        id: 'estimates-have-padding',
        statement: 'Engineering estimates include room that can be compressed for priority work.',
      },
      {
        id: 'important-clients-get-exceptions',
        statement: 'A strategically important account should receive an exception to normal planning.',
      },
      {
        id: 'no-without-option-blocks',
        statement: 'Saying no without an immediate alternative is obstructive stakeholder management.',
      },
    ],
    openingState: { trust: 0.55, openness: 0.36 },
    resistanceMoves: [
      {
        id: 'minimize-export-size',
        description:
          'Call the export a small request when the manager does not quantify the work.',
      },
      {
        id: 'invoke-client-importance',
        description:
          'Use the client’s importance to challenge a boundary that lacks a credible alternative.',
      },
      {
        id: 'challenge-partnership',
        description:
          'Suggest the team is not acting like a partner when the manager gives a process-only refusal.',
      },
      {
        id: 'clarify-client-outcome',
        description:
          'Explain the Monday review and demonstration need after an outcome-focused question.',
      },
      {
        id: 'accept-staged-export',
        description:
          'Accept a sample walkthrough followed by a properly planned production release.',
      },
    ],
    triggers: [
      {
        id: 'export-tradeoffs-named',
        description:
          'The manager names the delivery estimate and the specific launch tradeoffs.',
      },
      {
        id: 'client-outcome-invited',
        description:
          'The manager asks what the client must actually see or achieve and by when.',
      },
      {
        id: 'request-origin-invited',
        description:
          'The manager asks how the scope and Friday expectation were established.',
      },
      {
        id: 'scope-boundary-held',
        description:
          'The manager declines to add production scope without moving time or removing work.',
      },
      {
        id: 'staged-export-offered',
        description:
          'The manager offers a credible demonstration and a later production delivery path.',
      },
      {
        id: 'scope-boundary-abandoned',
        description:
          'The manager accepts the request without changing date, scope, or quality expectations.',
      },
    ],
    successConditions: [
      {
        id: 'export-request-specific',
        description: 'Make the request, estimate, and release tradeoffs concrete.',
      },
      {
        id: 'client-outcome-understood',
        description: 'Clarify the client’s real near-term outcome.',
      },
      {
        id: 'scope-boundary-explicit',
        description: 'Refuse silent overload while remaining collaborative.',
      },
      {
        id: 'staged-export-credible',
        description: 'Offer a credible staged alternative with explicit limits.',
      },
      {
        id: 'export-path-agreed',
        description: 'Agree what will be shown now and when production work will be planned.',
      },
    ],
    coachingFocus: ['purpose', 'evidence', 'perspective', 'boundary', 'path'],
  },
] as const satisfies readonly ScenarioDefinition[];

validateScenarioEvidenceAnchors(scenarioDefinitions);

const scenarioBriefs: readonly ScenarioBrief[] = scenarioDefinitions.map(toScenarioBrief);

export const scenarios: readonly ScenarioBrief[] = scenarioDefinitions
  .filter((scenario) => scenario.publicationStatus === 'published')
  .map(toScenarioBrief);

export function getScenarioDefinitionById(
  id: string | undefined,
  version?: number,
) {
  return scenarioDefinitions.find(
    (scenario) =>
      scenario.id === id && (version === undefined || scenario.version === version),
  );
}

export function getScenarioById(id: string | undefined) {
  return scenarioBriefs.find((scenario) => scenario.id === id);
}

export function getScenarioDefinitionForSession(
  session: Pick<
    PracticeSession,
    'scenarioDefinition' | 'scenarioId' | 'scenarioVersion'
  >,
) {
  return (
    session.scenarioDefinition ??
    getScenarioDefinitionById(session.scenarioId, session.scenarioVersion)
  );
}

export function getScenarioBriefForSession(
  session: Pick<
    PracticeSession,
    'scenarioDefinition' | 'scenarioId' | 'scenarioVersion'
  >,
) {
  const definition = getScenarioDefinitionForSession(session);
  return definition ? toScenarioBrief(definition) : undefined;
}

export function getPublishedScenarioById(id: string | undefined) {
  return scenarios.find((scenario) => scenario.id === id);
}

function validateScenarioEvidenceAnchors(
  definitions: readonly ScenarioDefinition[],
) {
  for (const scenario of definitions) {
    const anchors = scenario.presentation.evidenceAnchors;
    const minimumAnchorCount = scenario.publicationStatus === 'published' ? 2 : 1;
    if (anchors.length < minimumAnchorCount || anchors.length > 3) {
      throw new Error(
        `${scenario.id}@${scenario.version} must author ${minimumAnchorCount}–3 evidence anchors.`,
      );
    }

    const anchorIds = new Set<string>();
    const coreFactIds = new Set(scenario.coreFacts.map((fact) => fact.id));
    for (const anchor of anchors) {
      if (anchorIds.has(anchor.id)) {
        throw new Error(
          `${scenario.id}@${scenario.version} repeats evidence anchor ${anchor.id}.`,
        );
      }
      anchorIds.add(anchor.id);

      if (anchor.factIds.length === 0) {
        throw new Error(
          `${scenario.id}@${scenario.version} evidence anchor ${anchor.id} has no facts.`,
        );
      }
      const unavailableFactId = anchor.factIds.find(
        (factId) => !coreFactIds.has(factId),
      );
      if (unavailableFactId) {
        throw new Error(
          `${scenario.id}@${scenario.version} evidence anchor ${anchor.id} references non-core fact ${unavailableFactId}.`,
        );
      }
    }
  }
}

export function toScenarioBrief(scenario: ScenarioDefinition): ScenarioBrief {
  const category = PRACTICE_CATEGORIES[scenario.category];

  return {
    id: scenario.id,
    version: scenario.version,
    category: scenario.category,
    eyebrow: category.eyebrow,
    title: scenario.presentation.shortTitle,
    fullTitle: scenario.presentation.fullTitle,
    counterpart: {
      name: scenario.relationship.counterpartName,
      role: scenario.relationship.counterpartRole,
      relationship: scenario.presentation.relationshipLabel,
    },
    context: scenario.presentation.briefingSummary,
    goals: scenario.presentation.briefingGoals,
    tension: scenario.presentation.managerPressure,
  };
}
