import {
  REAL_SITUATION_LIMITS,
  REAL_SITUATION_RELATIONSHIPS,
  parseNormalizedRealSituation,
  type NormalizedRealSituation,
  type RealSituationInput,
} from '@/domain/real-situation';
import { getPracticeCategory } from '@/domain/scenario';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const REQUEST_TIMEOUT_MS = 20_000;

const NORMALIZER_INSTRUCTIONS = `You prepare private workplace-conversation simulations for new managers.

Transform only the user's supplied situation into a concise rehearsal setup. Never invent additional observable events, dates, quotes, performance claims, or outcomes. User-provided observable facts are the only facts.

Possible motivations are explicitly hypotheses for roleplay, not claims about the real person. Make them plausible, distinct, and non-diagnostic. Avoid protected-class inferences, mental-health diagnoses, and moral judgments. Likely resistance describes conversational behavior, not personality.

Write each possible motivation as a compact label of 3–10 words and no more than 80 characters. Do not repeat the counterpart's name and do not begin with "may," "might," or "could"; the UI already labels these as possibilities. Ground every motivation in the supplied facts, relationship context, or feared response.

Write in plain, natural workplace language. The opening line must be a short first-person line spoken by the counterpart that begins the conversation without exposing a hidden motivation.`;

export class SituationNormalizerError extends Error {
  readonly code: 'missing-key' | 'provider-error' | 'invalid-response';

  constructor(code: SituationNormalizerError['code'], message: string) {
    super(message);
    this.name = 'SituationNormalizerError';
    this.code = code;
  }
}

export async function normalizeRealSituation(
  input: RealSituationInput,
): Promise<{ normalized: NormalizedRealSituation; model: string }> {
  if (process.env.SITUATION_NORMALIZER_PROVIDER === 'fixture') {
    return {
      normalized: buildFixtureNormalization(input),
      model: 'fixture-situation-normalizer-v1',
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new SituationNormalizerError(
      'missing-key',
      'OPENAI_API_KEY is not configured on the server.',
    );
  }

  const model =
    process.env.OPENAI_NORMALIZER_MODEL?.trim() || 'gpt-5.6-luna';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions: NORMALIZER_INSTRUCTIONS,
        input: JSON.stringify({
          ...input,
          conversationTypeLabel: getPracticeCategory(input.conversationType).label,
          relationshipLabel:
            REAL_SITUATION_RELATIONSHIPS[input.relationshipType],
        }),
        max_output_tokens: 650,
        reasoning: { effort: 'none' },
        store: false,
        text: {
          format: {
            type: 'json_schema',
            name: 'real_situation_normalization',
            strict: true,
            schema: NORMALIZED_SITUATION_SCHEMA,
          },
        },
      }),
      signal: controller.signal,
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new SituationNormalizerError(
        'provider-error',
        `OpenAI Responses API returned ${response.status}: ${providerMessage(payload)}`,
      );
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      throw new SituationNormalizerError(
        'invalid-response',
        'OpenAI returned no normalized situation.',
      );
    }

    try {
      return {
        normalized: parseNormalizedRealSituation(JSON.parse(outputText)),
        model,
      };
    } catch (error) {
      throw new SituationNormalizerError(
        'invalid-response',
        error instanceof Error ? error.message : 'Invalid normalized situation.',
      );
    }
  } catch (error) {
    if (error instanceof SituationNormalizerError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SituationNormalizerError(
        'provider-error',
        'The normalization request timed out.',
      );
    }
    throw new SituationNormalizerError(
      'provider-error',
      error instanceof Error ? error.message : 'Normalization failed.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

const NORMALIZED_SITUATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'summary',
    'managerObjective',
    'counterpartObjective',
    'openingLine',
    'possibleMotivations',
    'likelyResistance',
  ],
  properties: {
    title: { type: 'string', minLength: 1, maxLength: 120 },
    summary: { type: 'string', minLength: 1, maxLength: 700 },
    managerObjective: { type: 'string', minLength: 1, maxLength: 500 },
    counterpartObjective: { type: 'string', minLength: 1, maxLength: 500 },
    openingLine: { type: 'string', minLength: 1, maxLength: 300 },
    possibleMotivations: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'string',
        minLength: 1,
        maxLength: REAL_SITUATION_LIMITS.generatedPossibility,
      },
    },
    likelyResistance: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: { type: 'string', minLength: 1, maxLength: 240 },
    },
  },
} as const;

function buildFixtureNormalization(
  input: RealSituationInput,
): NormalizedRealSituation {
  const name = input.counterpartAlias || 'Alex';
  return {
    title: `A difficult conversation with ${name}`,
    summary: input.observableFacts.join(' '),
    managerObjective: input.desiredChange,
    counterpartObjective:
      'Protect their perspective and avoid committing before they feel heard.',
    openingLine: 'You wanted to talk—what’s going on?',
    possibleMotivations: [
      'Relevant context behind the observable facts',
      'Protecting their position before agreeing',
    ],
    likelyResistance: [
      input.fearedResponse,
      'Question the manager’s interpretation of the facts.',
    ],
  };
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return null;
  }
  for (const item of output) {
    const content =
      item && typeof item === 'object'
        ? (item as { content?: unknown }).content
        : null;
    if (!Array.isArray(content)) {
      continue;
    }
    for (const part of content) {
      if (
        part &&
        typeof part === 'object' &&
        (part as { type?: unknown }).type === 'output_text' &&
        typeof (part as { text?: unknown }).text === 'string'
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}

function providerMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return 'Unknown provider error';
  }
  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== 'object') {
    return 'Unknown provider error';
  }
  const message = (error as { message?: unknown }).message;
  return typeof message === 'string' ? message : 'Unknown provider error';
}
