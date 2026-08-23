import { getScenarioDefinitionById } from '@/data/scenarios';
import {
  EVALUATOR_PROMPT_VERSION,
  EvaluatorContractError,
  parseDebrief,
  parseEvaluatorRequest,
  type EvaluatorApiErrorBody,
  type EvaluatorResponse,
} from '@/services/api/evaluator-contract';
import { requestFixtureDebrief } from '@/server/evaluator/fixture-evaluator';
import {
  OpenAIEvaluatorError,
  requestOpenAIDebrief,
} from '@/server/evaluator/openai-evaluator';

const MAX_REQUEST_BYTES = 96 * 1024;
const responseHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
} as const;

export async function POST(request: Request) {
  let requestValidated = false;
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return errorResponse(413, 'request_too_large', 'The rehearsal transcript is too large.');
  }

  try {
    const input = parseEvaluatorRequest(await request.json());
    requestValidated = true;
    const scenario =
      input.scenarioDefinition ??
      getScenarioDefinitionById(input.scenarioId, input.scenarioVersion);

    if (!scenario) {
      return errorResponse(
        404,
        'scenario_not_found',
        'This scenario version is not available.',
      );
    }

    const providerResult =
      process.env.EVALUATOR_PROVIDER === 'fixture'
        ? requestFixtureDebrief(scenario, input)
        : await requestOpenAIDebrief(scenario, input);
    const debrief = parseDebrief(
      providerResult.debrief,
      scenario,
      input.transcript,
      input.finalState,
    );
    const body: EvaluatorResponse = {
      debrief,
      model: providerResult.model,
      promptVersion: EVALUATOR_PROMPT_VERSION,
    };

    return Response.json(body, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof EvaluatorContractError) {
      if (requestValidated) {
        console.error('[evaluator-api] invalid evaluator output', error.message);
        return errorResponse(
          502,
          'invalid_evaluator_response',
          'The debrief could not be tied safely to the transcript. Please try again.',
        );
      }
      return errorResponse(400, 'invalid_request', error.message);
    }

    if (error instanceof SyntaxError) {
      return errorResponse(400, 'invalid_request', 'The request is not valid JSON.');
    }

    if (error instanceof OpenAIEvaluatorError) {
      console.error('[evaluator-api]', error.code, error.message);
      return errorResponse(
        error.code === 'missing-key' ? 503 : 502,
        error.code,
        error.code === 'missing-key'
          ? 'The rehearsal evaluator is not configured yet.'
          : 'The debrief could not be generated right now. Please try again.',
      );
    }

    console.error('[evaluator-api] unexpected error', error);
    return errorResponse(
      500,
      'internal_error',
      'The debrief could not be generated right now. Please try again.',
    );
  }
}

function errorResponse(status: number, code: string, message: string) {
  const body: EvaluatorApiErrorBody = { error: { code, message } };
  return Response.json(body, { status, headers: responseHeaders });
}
