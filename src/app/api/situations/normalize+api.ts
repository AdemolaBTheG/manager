import {
  RealSituationValidationError,
  parseRealSituationInput,
} from '@/domain/real-situation';
import {
  SituationNormalizerError,
  normalizeRealSituation,
} from '@/server/situation/normalize-situation';

const MAX_REQUEST_BYTES = 12 * 1024;
const headers = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
} as const;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return errorResponse(413, 'request_too_large', 'This situation is too large.');
  }

  try {
    const input = parseRealSituationInput(await request.json());
    const result = await normalizeRealSituation(input);
    return Response.json(result, { headers });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RealSituationValidationError) {
      return errorResponse(
        400,
        'invalid_request',
        error instanceof RealSituationValidationError
          ? error.message
          : 'The request is not valid JSON.',
      );
    }
    if (error instanceof SituationNormalizerError) {
      console.error('[situation-normalizer]', error.code, error.message);
      return errorResponse(
        error.code === 'missing-key' ? 503 : 502,
        error.code,
        error.code === 'missing-key'
          ? 'Situation preparation is not configured yet.'
          : 'We couldn’t prepare this simulation right now. Please try again.',
      );
    }
    console.error('[situation-normalizer] unexpected error', error);
    return errorResponse(
      500,
      'internal_error',
      'We couldn’t prepare this simulation right now. Please try again.',
    );
  }
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers },
  );
}
