import {
  parseActorResponse,
  type ActorApiErrorBody,
  type ActorRequest,
} from './actor-contract';

export type ActorTurnRequest = ActorRequest;

const ACTOR_ENDPOINT = '/api/rehearsal/respond';
const REQUEST_TIMEOUT_MS = 30_000;

export class ActorApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ActorApiError';
    this.status = status;
    this.code = code;
  }
}

export async function requestActorTurn(input: ActorRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ACTOR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const error = readErrorBody(payload);
      throw new ActorApiError(
        error?.message ?? 'The other person couldn’t respond right now.',
        response.status,
        error?.code ?? 'request_failed',
      );
    }

    try {
      return parseActorResponse(payload);
    } catch {
      throw new ActorApiError(
        'The response could not be read. Please try again.',
        response.status,
        'invalid_response',
      );
    }
  } catch (error) {
    if (error instanceof ActorApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ActorApiError(
        'The other person took too long to respond. Please try again.',
        0,
        'timeout',
      );
    }

    throw new ActorApiError(
      'The rehearsal room couldn’t reach the server. Check your connection and try again.',
      0,
      'network_error',
    );
  } finally {
    clearTimeout(timeout);
  }
}

function readErrorBody(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const error = (payload as Partial<ActorApiErrorBody>).error;
  if (
    !error ||
    typeof error.code !== 'string' ||
    typeof error.message !== 'string'
  ) {
    return null;
  }

  return error;
}
