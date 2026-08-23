import {
  OpenAITranscriptionError,
  requestOpenAITranscription,
} from '@/server/transcription/openai-transcription';
import type { TranscriptionResponsePayload } from '@/services/api/transcription-contract';

const MAX_REQUEST_BYTES = 4 * 1024 * 1024;
const MAX_PROMPT_CHARACTERS = 500;
const WAV_HEADER_BYTES = 44;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return errorResponse(
      413,
      'request_too_large',
      'The recorded response is too large.',
    );
  }

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('audio/wav')) {
    return errorResponse(
      415,
      'unsupported_media_type',
      'The transcription request must include WAV audio.',
    );
  }

  try {
    const prompt = readPrompt(request.headers.get('x-rehearsal-prompt'));
    if (prompt && prompt.length > MAX_PROMPT_CHARACTERS) {
      return errorResponse(
        400,
        'invalid_prompt',
        `The transcription prompt must be at most ${MAX_PROMPT_CHARACTERS} characters.`,
      );
    }

    const audio = new Uint8Array(await request.arrayBuffer());
    if (audio.byteLength <= WAV_HEADER_BYTES || audio.byteLength > MAX_REQUEST_BYTES) {
      return errorResponse(
        audio.byteLength > MAX_REQUEST_BYTES ? 413 : 400,
        audio.byteLength > MAX_REQUEST_BYTES ? 'request_too_large' : 'invalid_audio',
        audio.byteLength > MAX_REQUEST_BYTES
          ? 'The recorded response is too large.'
          : 'The recorded response did not contain audio.',
      );
    }

    if (!isPcmWav(audio)) {
      return errorResponse(
        400,
        'invalid_audio',
        'The recorded response is not valid WAV audio.',
      );
    }

    const transcription = await requestOpenAITranscription(audio, prompt);
    const payload: TranscriptionResponsePayload = transcription;
    return Response.json(payload, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof TranscriptionRequestError) {
      return errorResponse(400, 'invalid_prompt', error.message);
    }

    if (error instanceof OpenAITranscriptionError) {
      console.error('[transcription-api]', error.code, error.message);
      if (error.code === 'no-speech') {
        return errorResponse(
          422,
          error.code,
          'I couldn’t hear a clear response. Please try again.',
        );
      }

      return errorResponse(
        error.code === 'missing-key' || error.code === 'invalid-config'
          ? 503
          : 502,
        error.code,
        error.code === 'missing-key' || error.code === 'invalid-config'
          ? 'Transcription is not configured yet.'
          : 'Your response could not be transcribed. Please try again.',
      );
    }

    console.error('[transcription-api] unexpected error', error);
    return errorResponse(
      500,
      'internal_error',
      'Your response could not be transcribed. Please try again.',
    );
  }
}

function readPrompt(value: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    return decodeURIComponent(value).replace(/\s+/g, ' ').trim();
  } catch {
    throw new TranscriptionRequestError('The transcription prompt is invalid.');
  }
}

class TranscriptionRequestError extends Error {}

function isPcmWav(audio: Uint8Array) {
  if (
    audio.length <= WAV_HEADER_BYTES ||
    readAscii(audio, 0, 4) !== 'RIFF' ||
    readAscii(audio, 8, 4) !== 'WAVE'
  ) {
    return false;
  }

  const view = new DataView(audio.buffer, audio.byteOffset, audio.byteLength);
  let hasPcmFormat = false;
  let hasAudioData = false;
  let offset = 12;

  while (offset + 8 <= audio.length) {
    const chunkId = readAscii(audio, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkSize;
    if (chunkEnd > audio.length) {
      return false;
    }

    if (chunkId === 'fmt ') {
      if (chunkSize < 16) {
        return false;
      }

      const audioFormat = view.getUint16(chunkStart, true);
      const channels = view.getUint16(chunkStart + 2, true);
      const sampleRate = view.getUint32(chunkStart + 4, true);
      const bitsPerSample = view.getUint16(chunkStart + 14, true);
      hasPcmFormat =
        audioFormat === 1 &&
        channels > 0 &&
        sampleRate > 0 &&
        bitsPerSample === 16;
    } else if (chunkId === 'data') {
      hasAudioData = chunkSize > 0;
    }

    if (hasPcmFormat && hasAudioData) {
      return true;
    }

    offset = chunkEnd + (chunkSize % 2);
  }

  return false;
}

function readAscii(bytes: Uint8Array, offset: number, length: number) {
  let value = '';
  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(bytes[offset + index]);
  }
  return value;
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
