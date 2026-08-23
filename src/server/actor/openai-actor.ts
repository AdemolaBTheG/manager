import type { ScenarioDefinition } from '@/domain/scenario';
import type { ActorTurn } from '@/domain/simulation-state';
import {
  parseActorTurn,
  type ActorRequest,
} from '@/services/api/actor-contract';

import { buildActorTurnJsonSchema } from './actor-schema';
import { ACTOR_INSTRUCTIONS, buildActorInput } from './actor-prompt';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const REQUEST_TIMEOUT_MS = 25_000;

export class OpenAIActorError extends Error {
  readonly code: 'missing-key' | 'provider-error' | 'invalid-response';

  constructor(
    code: OpenAIActorError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'OpenAIActorError';
    this.code = code;
  }
}

export async function requestOpenAIActorTurn(
  scenario: ScenarioDefinition,
  request: ActorRequest,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIActorError(
      'missing-key',
      'OPENAI_API_KEY is not configured on the server.',
    );
  }

  const model = process.env.OPENAI_ACTOR_MODEL?.trim() || 'gpt-5.6-luna';
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
        instructions: ACTOR_INSTRUCTIONS,
        input: buildActorInput(scenario, request),
        max_output_tokens: 700,
        reasoning: { effort: 'none' },
        store: false,
        text: {
          format: {
            type: 'json_schema',
            name: 'rehearsal_actor_turn',
            strict: true,
            schema: buildActorTurnJsonSchema(scenario, request.state),
          },
        },
      }),
      signal: controller.signal,
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new OpenAIActorError(
        'provider-error',
        `OpenAI Responses API returned ${response.status}: ${getProviderErrorMessage(payload)}`,
      );
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      throw new OpenAIActorError(
        'invalid-response',
        'OpenAI returned no actor output text.',
      );
    }

    let actorTurn: ActorTurn;
    try {
      actorTurn = parseActorTurn(JSON.parse(outputText));
    } catch (error) {
      throw new OpenAIActorError(
        'invalid-response',
        error instanceof Error
          ? `OpenAI actor output failed validation: ${error.message}`
          : 'OpenAI actor output failed validation.',
      );
    }

    return { actorTurn, model } as const;
  } catch (error) {
    if (error instanceof OpenAIActorError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenAIActorError(
        'provider-error',
        'OpenAI actor request timed out.',
      );
    }

    throw new OpenAIActorError(
      'provider-error',
      error instanceof Error ? error.message : 'OpenAI actor request failed.',
    );
  } finally {
    clearTimeout(timeout);
  }
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
    if (!item || typeof item !== 'object') {
      continue;
    }

    const content = (item as { content?: unknown }).content;
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

function getProviderErrorMessage(payload: unknown) {
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
