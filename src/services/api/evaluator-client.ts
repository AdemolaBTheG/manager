import type { ScenarioDefinition } from '@/domain/scenario';
import {
  parseEvaluatorResponse,
  type EvaluatorApiErrorBody,
  type EvaluatorRequest,
} from './evaluator-contract';

export type DebriefRequest = EvaluatorRequest;

const REQUEST_TIMEOUT_MS = 35_000;

export class EvaluatorApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'EvaluatorApiError';
    this.status = status;
    this.code = code;
  }
}

export async function requestDebrief(
  scenario: ScenarioDefinition,
  input: EvaluatorRequest,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('/api/rehearsal/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...input,
        scenarioDefinition: scenario.id.startsWith('private-')
          ? scenario
          : null,
      }),
      signal: controller.signal,
    });
    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const error = payload as EvaluatorApiErrorBody | null;
      throw new EvaluatorApiError(
        error?.error?.message ?? 'The debrief request failed.',
        response.status,
        error?.error?.code ?? 'request_failed',
      );
    }

    return parseEvaluatorResponse(
      payload,
      scenario,
      input.transcript,
      input.finalState,
    );
  } catch (error) {
    if (error instanceof EvaluatorApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new EvaluatorApiError(
        'The debrief took too long. Please try again.',
        0,
        'timeout',
      );
    }
    throw new EvaluatorApiError(
      'The debrief service is unavailable. Check your connection and try again.',
      0,
      'network_error',
    );
  } finally {
    clearTimeout(timeout);
  }
}
