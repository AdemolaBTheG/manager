import {
  OpenAISpeechError,
  requestOpenAISpeech,
  requestOpenAIWordAlignment,
} from '@/server/speech/openai-speech';
import { getScenarioDefinitionById } from '@/data/scenarios';
import type { SpeechResponsePayload } from '@/services/api/speech-contract';

const MAX_REQUEST_BYTES = 2 * 1024;
const MAX_SPEECH_CHARACTERS = 600;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return errorResponse(413, 'request_too_large', 'The speech request is too large.');
  }

  try {
    const input = parseSpeechRequest(await request.json());
    const scenario = getScenarioDefinitionById(
      input.scenarioId,
      input.scenarioVersion,
    );
    const counterpart = input.counterpart ??
      (scenario
        ? {
            name: scenario.relationship.counterpartName,
            role: scenario.relationship.counterpartRole,
          }
        : null);

    if (!counterpart) {
      return errorResponse(
        404,
        'scenario_not_found',
        'This scenario version is not available.',
      );
    }

    const speech = await requestOpenAISpeech(
      input.text,
      `Speak as ${counterpart.name}, a ${counterpart.role}, in a realistic private workplace conversation with their manager. Sound natural, conversational, emotionally restrained, and slightly guarded. Keep pauses and emphasis subtle. Never sound like a narrator, coach, announcer, or virtual assistant.`,
    );
    const alignment = await requestOpenAIWordAlignment(speech.audio, input.text);
    const payload: SpeechResponsePayload = {
      audioBase64: encodeBase64(speech.audio),
      audioContentType: 'audio/wav',
      duration: alignment.duration,
      words: alignment.words,
      model: speech.model,
      voice: speech.voice,
      alignmentModel: alignment.model,
    };

    return Response.json(payload, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof SpeechRequestError) {
      return errorResponse(
        400,
        'invalid_request',
        error instanceof SpeechRequestError
          ? error.message
          : 'The request is not valid JSON.',
      );
    }

    if (error instanceof OpenAISpeechError) {
      console.error('[speech-api]', error.code, error.message);
      return errorResponse(
        error.code === 'missing-key' || error.code === 'invalid-config'
          ? 503
          : 502,
        error.code,
        error.code === 'missing-key' || error.code === 'invalid-config'
          ? 'The rehearsal voice is not configured yet.'
          : 'The rehearsal voice could not be generated. Please try again.',
      );
    }

    console.error('[speech-api] unexpected error', error);
    return errorResponse(
      500,
      'internal_error',
      'The rehearsal voice could not be generated. Please try again.',
    );
  }
}

function encodeBase64(bytes: Uint8Array) {
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

class SpeechRequestError extends Error {}

function parseSpeechRequest(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SpeechRequestError('The speech request must be an object.');
  }

  const object = value as Record<string, unknown>;
  if (
    (Object.keys(object).length !== 3 && Object.keys(object).length !== 4) ||
    !Object.prototype.hasOwnProperty.call(object, 'text') ||
    !Object.prototype.hasOwnProperty.call(object, 'scenarioId') ||
    !Object.prototype.hasOwnProperty.call(object, 'scenarioVersion')
  ) {
    throw new SpeechRequestError(
      'The speech request must contain text and a scenario version.',
    );
  }

  let counterpart: { name: string; role: string } | null = null;
  if (object.counterpart !== undefined) {
    if (
      !object.counterpart ||
      typeof object.counterpart !== 'object' ||
      Array.isArray(object.counterpart)
    ) {
      throw new SpeechRequestError('Counterpart voice profile is invalid.');
    }
    const profile = object.counterpart as Record<string, unknown>;
    if (
      Object.keys(profile).length !== 2 ||
      typeof profile.name !== 'string' ||
      !profile.name.trim() ||
      profile.name.length > 80 ||
      typeof profile.role !== 'string' ||
      !profile.role.trim() ||
      profile.role.length > 100
    ) {
      throw new SpeechRequestError('Counterpart voice profile is invalid.');
    }
    counterpart = {
      name: profile.name.replace(/\s+/g, ' ').trim(),
      role: profile.role.replace(/\s+/g, ' ').trim(),
    };
  }

  if (typeof object.text !== 'string') {
    throw new SpeechRequestError('Speech text must be a string.');
  }

  if (
    typeof object.scenarioId !== 'string' ||
    !object.scenarioId.trim() ||
    object.scenarioId.length > 80
  ) {
    throw new SpeechRequestError('Scenario ID is invalid.');
  }

  if (
    typeof object.scenarioVersion !== 'number' ||
    !Number.isSafeInteger(object.scenarioVersion) ||
    object.scenarioVersion < 1
  ) {
    throw new SpeechRequestError('Scenario version is invalid.');
  }

  const text = object.text.replace(/\s+/g, ' ').trim();
  if (!text || text.length > MAX_SPEECH_CHARACTERS) {
    throw new SpeechRequestError(
      `Speech text must contain 1–${MAX_SPEECH_CHARACTERS} characters.`,
    );
  }

  return {
    scenarioId: object.scenarioId.trim(),
    scenarioVersion: object.scenarioVersion,
    counterpart,
    text,
  };
}

function errorResponse(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    },
  );
}
