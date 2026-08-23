const OPENAI_TRANSCRIPTION_URL =
  'https://api.openai.com/v1/audio/transcriptions';
const REQUEST_TIMEOUT_MS = 30_000;
const MAX_PROMPT_CHARACTERS = 500;
const MAX_TRANSCRIPT_CHARACTERS = 8_000;

export class OpenAITranscriptionError extends Error {
  readonly code:
    | 'missing-key'
    | 'invalid-config'
    | 'no-speech'
    | 'provider-error';

  constructor(code: OpenAITranscriptionError['code'], message: string) {
    super(message);
    this.name = 'OpenAITranscriptionError';
    this.code = code;
  }
}

export async function requestOpenAITranscription(
  audio: Uint8Array,
  prompt?: string,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAITranscriptionError(
      'missing-key',
      'OPENAI_API_KEY is not configured on the server.',
    );
  }

  const model =
    process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() ||
    'gpt-4o-mini-transcribe';
  if (!model || model.length > 100) {
    throw new OpenAITranscriptionError(
      'invalid-config',
      'OPENAI_TRANSCRIPTION_MODEL is invalid.',
    );
  }

  const normalizedPrompt = prompt?.replace(/\s+/g, ' ').trim();
  if (normalizedPrompt && normalizedPrompt.length > MAX_PROMPT_CHARACTERS) {
    throw new OpenAITranscriptionError(
      'invalid-config',
      `Transcription prompt exceeds ${MAX_PROMPT_CHARACTERS} characters.`,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const audioBuffer = audio.buffer.slice(
      audio.byteOffset,
      audio.byteOffset + audio.byteLength,
    ) as ArrayBuffer;
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([audioBuffer], { type: 'audio/wav' }),
      'manager-turn.wav',
    );
    formData.append('model', model);
    formData.append('language', 'en');
    formData.append('response_format', 'json');
    if (normalizedPrompt) {
      formData.append('prompt', normalizedPrompt);
    }

    const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      throw new OpenAITranscriptionError(
        'provider-error',
        `OpenAI Transcription API returned ${response.status}: ${getProviderErrorMessage(payload)}`,
      );
    }

    const payload: unknown = await response.json();
    const text = parseTranscript(payload);
    return { text, model } as const;
  } catch (error) {
    if (error instanceof OpenAITranscriptionError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenAITranscriptionError(
        'provider-error',
        'OpenAI transcription timed out.',
      );
    }

    throw new OpenAITranscriptionError(
      'provider-error',
      error instanceof Error
        ? error.message
        : 'OpenAI transcription failed.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

function parseTranscript(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new OpenAITranscriptionError(
      'provider-error',
      'OpenAI transcription returned an invalid response.',
    );
  }

  const text = (payload as Record<string, unknown>).text;
  if (typeof text !== 'string') {
    throw new OpenAITranscriptionError(
      'provider-error',
      'OpenAI transcription returned no text.',
    );
  }

  const normalizedText = text.replace(/\s+/g, ' ').trim();
  if (!normalizedText) {
    throw new OpenAITranscriptionError(
      'no-speech',
      'OpenAI transcription did not detect speech.',
    );
  }

  if (normalizedText.length > MAX_TRANSCRIPT_CHARACTERS) {
    throw new OpenAITranscriptionError(
      'provider-error',
      'OpenAI transcription returned too much text.',
    );
  }

  return normalizedText;
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

