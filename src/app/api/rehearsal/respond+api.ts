import { getScenarioDefinitionById } from '@/data/scenarios';
import {
  ACTOR_PROMPT_VERSION,
  ActorContractError,
  parseActorRequest,
  type ActorApiErrorBody,
  type ActorResponse,
} from '@/services/api/actor-contract';
import { resolveActorTransition } from '@/services/simulation/actor-transition';
import { requestFixtureActorTurn } from '@/server/actor/fixture-actor';
import {
  OpenAIActorError,
  requestOpenAIActorTurn,
} from '@/server/actor/openai-actor';

const MAX_REQUEST_BYTES = 64 * 1024;
const responseHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
} as const;

export async function POST(request: Request) {
  let requestValidated = false;
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return errorResponse(413, 'request_too_large', 'The rehearsal turn is too large.');
  }

  try {
    const input = parseActorRequest(await request.json());
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
      process.env.ACTOR_PROVIDER === 'fixture'
        ? requestFixtureActorTurn(scenario, input)
        : await requestOpenAIActorTurn(scenario, input);
    const resolved = resolveActorTransition(
      scenario,
      input.state,
      providerResult.actorTurn,
    );
    const body: ActorResponse = {
      ...resolved,
      model: providerResult.model,
      promptVersion: ACTOR_PROMPT_VERSION,
    };

    return Response.json(body, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof ActorContractError) {
      if (requestValidated) {
        console.error('[actor-api] invalid actor transition', error.message);
        return errorResponse(
          502,
          'invalid_actor_response',
          'The response was outside the scenario rules. Please try again.',
        );
      }

      return errorResponse(
        400,
        'invalid_request',
        error.message,
      );
    }

    if (error instanceof SyntaxError) {
      return errorResponse(400, 'invalid_request', 'The request is not valid JSON.');
    }

    if (error instanceof OpenAIActorError) {
      console.error('[actor-api]', error.code, error.message);
      return errorResponse(
        error.code === 'missing-key' ? 503 : 502,
        error.code,
        error.code === 'missing-key'
          ? 'The rehearsal actor is not configured yet.'
          : 'The other person couldn’t respond right now. Please try again.',
      );
    }

    console.error('[actor-api] unexpected error', error);
    return errorResponse(
      500,
      'internal_error',
      'The other person couldn’t respond right now. Please try again.',
    );
  }
}

function errorResponse(status: number, code: string, message: string) {
  const body: ActorApiErrorBody = { error: { code, message } };
  return Response.json(body, { status, headers: responseHeaders });
}
