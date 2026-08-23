import type { SpeechWordTiming } from '@/domain/speech-caption';

const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
const OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';
const REQUEST_TIMEOUT_MS = 25_000;

const OPENAI_VOICES = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
  'verse',
  'marin',
  'cedar',
] as const;

type OpenAIVoice = (typeof OPENAI_VOICES)[number];

export class OpenAISpeechError extends Error {
  readonly code:
    | 'missing-key'
    | 'invalid-config'
    | 'provider-error'
    | 'alignment-error';

  constructor(code: OpenAISpeechError['code'], message: string) {
    super(message);
    this.name = 'OpenAISpeechError';
    this.code = code;
  }
}

export async function requestOpenAISpeech(text: string, instructions: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAISpeechError(
      'missing-key',
      'OPENAI_API_KEY is not configured on the server.',
    );
  }

  const model = process.env.OPENAI_TTS_MODEL?.trim() || 'gpt-4o-mini-tts';
  const configuredVoice = process.env.OPENAI_TTS_VOICE?.trim() || 'cedar';
  if (!isOpenAIVoice(configuredVoice)) {
    throw new OpenAISpeechError(
      'invalid-config',
      `OPENAI_TTS_VOICE is not supported: ${configuredVoice}`,
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_SPEECH_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice: configuredVoice,
        input: text,
        instructions,
        response_format: 'wav',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      throw new OpenAISpeechError(
        'provider-error',
        `OpenAI Speech API returned ${response.status}: ${getProviderErrorMessage(payload)}`,
      );
    }

    const audio = new Uint8Array(await response.arrayBuffer());
    if (audio.byteLength <= 44) {
      throw new OpenAISpeechError(
        'provider-error',
        'OpenAI Speech API returned invalid WAV audio.',
      );
    }

    return {
      audio,
      model,
      voice: configuredVoice,
    } as const;
  } catch (error) {
    if (error instanceof OpenAISpeechError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenAISpeechError(
        'provider-error',
        'OpenAI Speech API request timed out.',
      );
    }

    throw new OpenAISpeechError(
      'provider-error',
      error instanceof Error ? error.message : 'OpenAI Speech API failed.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestOpenAIWordAlignment(
  audio: Uint8Array,
  sourceText: string,
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new OpenAISpeechError(
      'missing-key',
      'OPENAI_API_KEY is not configured on the server.',
    );
  }

  const model = process.env.OPENAI_ALIGNMENT_MODEL?.trim() || 'whisper-1';
  if (model !== 'whisper-1') {
    throw new OpenAISpeechError(
      'invalid-config',
      'OPENAI_ALIGNMENT_MODEL must be whisper-1 for word timestamps.',
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
    formData.append('file', new Blob([audioBuffer], { type: 'audio/wav' }), 'jamie.wav');
    formData.append('model', model);
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('prompt', sourceText);

    const response = await fetch(OPENAI_TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload: unknown = await response.json().catch(() => null);
      throw new OpenAISpeechError(
        'alignment-error',
        `OpenAI Transcription API returned ${response.status}: ${getProviderErrorMessage(payload)}`,
      );
    }

    const payload: unknown = await response.json();
    return parseWordAlignment(payload, model);
  } catch (error) {
    if (error instanceof OpenAISpeechError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenAISpeechError(
        'alignment-error',
        'OpenAI word alignment timed out.',
      );
    }

    throw new OpenAISpeechError(
      'alignment-error',
      error instanceof Error ? error.message : 'OpenAI word alignment failed.',
    );
  } finally {
    clearTimeout(timeout);
  }
}

function isOpenAIVoice(value: string): value is OpenAIVoice {
  return OPENAI_VOICES.includes(value as OpenAIVoice);
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

function parseWordAlignment(payload: unknown, model: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new OpenAISpeechError(
      'alignment-error',
      'OpenAI word alignment returned an invalid response.',
    );
  }

  const object = payload as Record<string, unknown>;
  if (!Array.isArray(object.words)) {
    throw new OpenAISpeechError(
      'alignment-error',
      'OpenAI word alignment returned no word timestamps.',
    );
  }

  const words: SpeechWordTiming[] = [];
  for (const value of object.words) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      continue;
    }

    const word = (value as Record<string, unknown>).word;
    const start = (value as Record<string, unknown>).start;
    const end = (value as Record<string, unknown>).end;
    if (
      typeof word !== 'string' ||
      !word.trim() ||
      typeof start !== 'number' ||
      !Number.isFinite(start) ||
      typeof end !== 'number' ||
      !Number.isFinite(end) ||
      start < 0 ||
      end < start
    ) {
      continue;
    }

    words.push({ word: word.trim(), start, end });
  }

  if (words.length === 0) {
    throw new OpenAISpeechError(
      'alignment-error',
      'OpenAI word alignment returned no usable word timestamps.',
    );
  }

  const reportedDuration = object.duration;
  const duration =
    typeof reportedDuration === 'number' &&
    Number.isFinite(reportedDuration) &&
    reportedDuration >= words.at(-1)!.end
      ? reportedDuration
      : words.at(-1)!.end;

  return { duration, model, words } as const;
}
