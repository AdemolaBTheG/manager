import type { File } from 'expo-file-system';

import type { TranscriptionResponsePayload } from '@/services/api/transcription-contract';

const TRANSCRIPTION_ENDPOINT = '/api/rehearsal/transcribe';
const REQUEST_TIMEOUT_MS = 45_000;
const MAX_TRANSCRIPT_CHARACTERS = 8_000;

export class TranscriptionApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'TranscriptionApiError';
    this.status = status;
    this.code = code;
  }
}

export type TranscriptionRequest = {
  readonly audioFile: File;
  readonly prompt?: string;
  readonly signal?: AbortSignal;
};

export async function requestTranscription({
  audioFile,
  prompt,
  signal,
}: TranscriptionRequest): Promise<TranscriptionResponsePayload> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const audioBytes = await audioFile.bytes();
    const response = await fetch(TRANSCRIPTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'audio/wav',
        ...(prompt?.trim()
          ? { 'X-Rehearsal-Prompt': encodeURIComponent(prompt.trim()) }
          : {}),
      },
      body: audioBytes,
      signal: controller.signal,
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = readErrorBody(payload);
      throw new TranscriptionApiError(
        error?.message ?? 'Your response could not be transcribed.',
        response.status,
        error?.code ?? 'request_failed',
      );
    }

    return parseTranscriptionResponse(payload, response.status);
  } catch (error) {
    if (error instanceof TranscriptionApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new TranscriptionApiError(
        signal?.aborted
          ? 'Transcription was cancelled.'
          : 'Transcription took too long. Please try again.',
        0,
        signal?.aborted ? 'aborted' : 'timeout',
      );
    }

    throw new TranscriptionApiError(
      'The rehearsal room could not reach the transcription service.',
      0,
      'network_error',
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

function parseTranscriptionResponse(
  value: unknown,
  status: number,
): TranscriptionResponsePayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw invalidResponse(status);
  }

  const object = value as Record<string, unknown>;
  if (
    Object.keys(object).length !== 2 ||
    typeof object.text !== 'string' ||
    !object.text.trim() ||
    object.text.length > MAX_TRANSCRIPT_CHARACTERS ||
    typeof object.model !== 'string' ||
    !object.model.trim()
  ) {
    throw invalidResponse(status);
  }

  return {
    text: object.text.replace(/\s+/g, ' ').trim(),
    model: object.model.trim(),
  };
}

function invalidResponse(status: number) {
  return new TranscriptionApiError(
    'The transcription service returned an invalid response.',
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
