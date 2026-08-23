import type { ScenarioDefinition } from '@/domain/scenario';
import type { Debrief } from '@/domain/coaching';
import {
  parseDebrief,
  type EvaluatorRequest,
} from '@/services/api/evaluator-contract';

import { buildDebriefJsonSchema } from './evaluator-schema';
import { EVALUATOR_INSTRUCTIONS, buildEvaluatorInput } from './evaluator-prompt';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const REQUEST_TIMEOUT_MS = 30_000;

export class OpenAIEvaluatorError extends Error {
  readonly code: 'missing-key' | 'provider-error' | 'invalid-response';

  constructor(code: OpenAIEvaluatorError['code'], message: string) {
    super(message);
    this.name = 'OpenAIEvaluatorError';
    this.code = code;
  }
}

export async function requestOpenAIDebrief(
  scenario: ScenarioDefinition,
  request: EvaluatorRequest,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAIEvaluatorError(
      'missing-key',
      'OPENAI_API_KEY is not configured on the server.',
    );
  }

  const model = process.env.OPENAI_EVALUATOR_MODEL?.trim() || 'gpt-5.6-luna';
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
        instructions: EVALUATOR_INSTRUCTIONS,
        input: buildEvaluatorInput(scenario, request),
        max_output_tokens: 1_800,
        reasoning: { effort: 'low' },
        store: false,
        text: {
          format: {
            type: 'json_schema',
            name: 'rehearsal_debrief',
            strict: true,
            schema: buildDebriefJsonSchema(scenario, request.finalState),
          },
        },
      }),
      signal: controller.signal,
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      throw new OpenAIEvaluatorError(
        'provider-error',
        `OpenAI Responses API returned ${response.status}: ${getProviderErrorMessage(payload)}`,
      );
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      throw new OpenAIEvaluatorError(
        'invalid-response',
        'OpenAI returned no evaluator output text.',
      );
    }

    let debrief: Debrief;
    try {
      debrief = parseDebrief(
        JSON.parse(outputText),
        scenario,
        request.transcript,
        request.finalState,
      );
    } catch (error) {
      throw new OpenAIEvaluatorError(
        'invalid-response',
        error instanceof Error
          ? `OpenAI evaluator output failed validation: ${error.message}`
          : 'OpenAI evaluator output failed validation.',
      );
    }

    return { debrief, model } as const;
  } catch (error) {
    if (error instanceof OpenAIEvaluatorError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenAIEvaluatorError(
        'provider-error',
        'OpenAI evaluator request timed out.',
      );
    }
    throw new OpenAIEvaluatorError(
      'provider-error',
      error instanceof Error ? error.message : 'OpenAI evaluator request failed.',
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
