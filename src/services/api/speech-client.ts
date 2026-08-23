import type { SpeechWordTiming } from '@/domain/speech-caption';
import type { SpeechResponsePayload } from '@/services/api/speech-contract';

const SPEECH_ENDPOINT = '/api/rehearsal/speech';
const REQUEST_TIMEOUT_MS = 60_000;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 12 * 1024 * 1024;
const MAX_WORD_TIMINGS = 256;

export class SpeechApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'SpeechApiError';
    this.status = status;
    this.code = code;
  }
}

export type SpeechAudioRequest = {
  readonly scenarioId: string;
  readonly scenarioVersion: number;
  readonly counterpart: {
    readonly name: string;
    readonly role: string;
  };
  readonly text: string;
};

export async function requestSpeechAudio(
  input: SpeechAudioRequest,
  signal?: AbortSignal,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const response = await fetch(SPEECH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      const error = readErrorBody(payload);
      throw new SpeechApiError(
        error?.message ?? 'The rehearsal voice could not be generated.',
        response.status,
        error?.code ?? 'request_failed',
      );
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new SpeechApiError(
        'The voice response was too large.',
        response.status,
        'response_too_large',
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
      throw new SpeechApiError(
        'The voice response was not valid.',
        response.status,
        'invalid_response',
      );
    }

    const payload: unknown = await response.json();
    const speech = parseSpeechResponse(payload, response.status);
    const audio = decodeBase64(speech.audioBase64, response.status);
    if (audio.byteLength <= 44 || audio.byteLength > MAX_AUDIO_BYTES) {
      throw new SpeechApiError(
        'The voice response had an unexpected size.',
        response.status,
        'invalid_audio',
      );
    }

    return {
      audio,
      duration: speech.duration,
      words: speech.words,
      model: speech.model,
      voice: speech.voice,
      alignmentModel: speech.alignmentModel,
    } as const;
  } catch (error) {
    if (error instanceof SpeechApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new SpeechApiError(
        'The voice request was interrupted. Please try again.',
        0,
        signal?.aborted ? 'aborted' : 'timeout',
      );
    }

    throw new SpeechApiError(
      'The rehearsal room could not reach the voice service.',
      0,
      'network_error',
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

function parseSpeechResponse(value: unknown, status: number): SpeechResponsePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw invalidResponse(status);
  }

  const object = value as Record<string, unknown>;
  if (
    typeof object.audioBase64 !== 'string' ||
    object.audioBase64.length === 0 ||
    object.audioBase64.length > MAX_RESPONSE_BYTES ||
    object.audioContentType !== 'audio/wav' ||
    typeof object.duration !== 'number' ||
    !Number.isFinite(object.duration) ||
    object.duration <= 0 ||
    typeof object.model !== 'string' ||
    !object.model ||
    typeof object.voice !== 'string' ||
    !object.voice ||
    typeof object.alignmentModel !== 'string' ||
    !object.alignmentModel ||
    !Array.isArray(object.words) ||
    object.words.length === 0 ||
    object.words.length > MAX_WORD_TIMINGS
  ) {
    throw invalidResponse(status);
  }

  const words: SpeechWordTiming[] = [];
  let previousStart = -1;
  for (const value of object.words) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw invalidResponse(status);
    }

    const wordObject = value as Record<string, unknown>;
    if (
      typeof wordObject.word !== 'string' ||
      !wordObject.word.trim() ||
      typeof wordObject.start !== 'number' ||
      !Number.isFinite(wordObject.start) ||
      wordObject.start < previousStart ||
      typeof wordObject.end !== 'number' ||
      !Number.isFinite(wordObject.end) ||
      wordObject.end < wordObject.start ||
      wordObject.end > object.duration + 0.5
    ) {
      throw invalidResponse(status);
    }

    previousStart = wordObject.start;
    words.push({
      word: wordObject.word.trim(),
      start: wordObject.start,
      end: wordObject.end,
    });
  }

  return {
    audioBase64: object.audioBase64,
    audioContentType: 'audio/wav',
    duration: object.duration,
    words,
    model: object.model,
    voice: object.voice,
    alignmentModel: object.alignmentModel,
  };
}

function decodeBase64(value: string, status: number) {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    throw new SpeechApiError(
      'The voice response was not valid audio.',
      status,
      'invalid_audio',
    );
  }
}

function invalidResponse(status: number) {
  return new SpeechApiError(
    'The voice response did not include valid word timing.',
    status,
    'invalid_response',
  );
}

function readErrorBody(payload: unknown) {
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
