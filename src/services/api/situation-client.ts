import {
  parseNormalizedRealSituation,
  type RealSituationInput,
} from '@/domain/real-situation';

const ENDPOINT = '/api/situations/normalize';
const REQUEST_TIMEOUT_MS = 25_000;

export class SituationApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'SituationApiError';
    this.status = status;
    this.code = code;
  }
}

export async function requestSituationNormalization(input: RealSituationInput) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = readError(payload);
      throw new SituationApiError(
        error?.message ?? 'We couldn’t prepare this simulation.',
        response.status,
        error?.code ?? 'request_failed',
      );
    }
    if (!payload || typeof payload !== 'object') {
      throw new SituationApiError(
        'The prepared simulation could not be read.',
        response.status,
        'invalid_response',
      );
    }
    return parseNormalizedRealSituation(
      (payload as { normalized?: unknown }).normalized,
    );
  } catch (error) {
    if (error instanceof SituationApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SituationApiError(
        'Preparation took too long. Please try again.',
        0,
        'timeout',
      );
    }
    throw new SituationApiError(
      'The app couldn’t reach the preparation service.',
      0,
      'network_error',
    );
  } finally {
    clearTimeout(timeout);
  }
}

function readError(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const error = (payload as { error?: unknown }).error;
  if (!error || typeof error !== 'object') {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  const message = (error as { message?: unknown }).message;
  return typeof code === 'string' && typeof message === 'string'
    ? { code, message }
    : null;
}
