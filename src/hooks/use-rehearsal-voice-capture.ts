import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
  type AudioStreamBuffer,
} from "expo-audio";
import { File, Paths } from "expo-file-system";
import { useCallback, useEffect, useRef, useState } from "react";

const CHANNELS = 1;
const SAMPLE_RATE = 16_000;
const BYTES_PER_SAMPLE = 2;
const MAX_TURN_SECONDS = 90;
const WAV_HEADER_BYTES = 44;

export type VoiceCaptureState =
  | "idle"
  | "requestingPermission"
  | "listening"
  | "stopping"
  | "transcribing"
  | "captured"
  | "permissionDenied"
  | "transcriptionError"
  | "error";

export type CapturedVoiceTurn = {
  readonly byteLength: number;
  readonly channels: number;
  readonly durationSeconds: number;
  readonly encoding: "int16";
  readonly sampleRate: number;
  readonly transcript: string;
  readonly transcriptionMode: "server";
  readonly transcriptionModel: string;
  readonly truncated: boolean;
};

type TranscriptionResult = {
  readonly text: string;
  readonly model: string;
};

type UseRehearsalVoiceCaptureOptions = {
  onLevel: (level: number) => void;
  onTranscript?: (turn: CapturedVoiceTurn) => void;
  transcribe: (audioFile: File, signal: AbortSignal) => Promise<TranscriptionResult>;
};

type CapturedAudioTurn = Omit<
  CapturedVoiceTurn,
  "transcript" | "transcriptionMode" | "transcriptionModel"
> & {
  readonly buffers: readonly ArrayBuffer[];
};

export function useRehearsalVoiceCapture({
  onLevel,
  onTranscript,
  transcribe,
}: UseRehearsalVoiceCaptureOptions) {
  const [captureState, setCaptureState] =
    useState<VoiceCaptureState>("idle");
  const [capturedTurn, setCapturedTurn] =
    useState<CapturedVoiceTurn | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const buffersRef = useRef<ArrayBuffer[]>([]);
  const byteLengthRef = useRef(0);
  const durationSecondsRef = useRef(0);
  const hasActiveStreamRef = useRef(false);
  const isAcceptingBuffersRef = useRef(false);
  const isMountedRef = useRef(true);
  const isStartingRef = useRef(false);
  const levelRef = useRef(0);
  const metadataRef = useRef({ channels: CHANNELS, sampleRate: SAMPLE_RATE });
  const onTranscriptRef = useRef(onTranscript);
  const temporaryAudioFileRef = useRef<File | null>(null);
  const transcriptionControllerRef = useRef<AbortController | null>(null);
  const truncatedRef = useRef(false);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const deleteTemporaryAudioFile = useCallback(() => {
    const audioFile = temporaryAudioFileRef.current;
    temporaryAudioFileRef.current = null;

    if (!audioFile) {
      return;
    }

    try {
      audioFile.delete();
    } catch {
      // Cache cleanup is best-effort and never blocks the rehearsal.
    }
  }, []);

  const handleBuffer = useCallback(
    (buffer: AudioStreamBuffer) => {
      if (!isAcceptingBuffersRef.current) {
        return;
      }

      metadataRef.current = {
        channels: buffer.channels,
        sampleRate: buffer.sampleRate,
      };

      const bufferDurationSeconds =
        buffer.data.byteLength /
        Math.max(
          1,
          buffer.sampleRate * buffer.channels * BYTES_PER_SAMPLE,
        );

      if (
        durationSecondsRef.current + bufferDurationSeconds <=
        MAX_TURN_SECONDS
      ) {
        const bufferCopy = buffer.data.slice(0);
        buffersRef.current.push(bufferCopy);
        byteLengthRef.current += bufferCopy.byteLength;
        durationSecondsRef.current += bufferDurationSeconds;
      } else {
        truncatedRef.current = true;
      }

      const targetLevel = pcm16ToVoiceLevel(buffer.data);
      const smoothing = targetLevel > levelRef.current ? 0.56 : 0.18;
      const nextLevel =
        levelRef.current + (targetLevel - levelRef.current) * smoothing;

      levelRef.current = nextLevel;
      onLevel(nextLevel);
    },
    [onLevel],
  );

  const { isStreaming, stream } = useAudioStream({
    channels: CHANNELS,
    encoding: "int16",
    onBuffer: handleBuffer,
    sampleRate: SAMPLE_RATE,
  });

  const resetCapture = useCallback(() => {
    transcriptionControllerRef.current?.abort();
    transcriptionControllerRef.current = null;
    deleteTemporaryAudioFile();
    buffersRef.current = [];
    byteLengthRef.current = 0;
    durationSecondsRef.current = 0;
    truncatedRef.current = false;
    levelRef.current = 0;
    setCapturedTurn(null);
    setErrorMessage(null);
    onLevel(0);
  }, [deleteTemporaryAudioFile, onLevel]);

  const startCapture = useCallback(async () => {
    if (isStartingRef.current || isStreaming) {
      return isStreaming;
    }

    if (process.env.EXPO_OS === "web") {
      setErrorMessage("Voice rehearsal is currently available in the native app.");
      setCaptureState("error");
      return false;
    }

    isStartingRef.current = true;
    setCaptureState("requestingPermission");
    setErrorMessage(null);

    try {
      const currentPermission = await getRecordingPermissionsAsync();
      const permission = currentPermission.granted
        ? currentPermission
        : await requestRecordingPermissionsAsync();

      if (!permission.granted) {
        setCaptureState("permissionDenied");
        return false;
      }

      resetCapture();
      await setAudioModeAsync({
        allowsRecording: true,
        interruptionMode: "doNotMix",
        playsInSilentMode: true,
      });

      isAcceptingBuffersRef.current = true;
      await stream.start();
      hasActiveStreamRef.current = true;
      setCaptureState("listening");
      return true;
    } catch {
      hasActiveStreamRef.current = false;
      isAcceptingBuffersRef.current = false;
      setErrorMessage("The microphone couldn’t start. Please try again.");
      setCaptureState("error");
      return false;
    } finally {
      isStartingRef.current = false;
    }
  }, [isStreaming, resetCapture, stream]);

  const stopCapture = useCallback(async () => {
    if (!isStreaming && captureState !== "listening") {
      return null;
    }

    setCaptureState("stopping");
    isAcceptingBuffersRef.current = false;
    hasActiveStreamRef.current = false;

    try {
      stream.stop();
    } catch {
      levelRef.current = 0;
      onLevel(0);
      setErrorMessage("The microphone couldn’t stop cleanly. Please try again.");
      setCaptureState("error");
      return null;
    }

    levelRef.current = 0;
    onLevel(0);

    const { channels, sampleRate } = metadataRef.current;
    const audioTurn: CapturedAudioTurn = {
      buffers: buffersRef.current.slice(),
      byteLength: byteLengthRef.current,
      channels,
      durationSeconds: durationSecondsRef.current,
      encoding: "int16",
      sampleRate,
      truncated: truncatedRef.current,
    };

    if (audioTurn.durationSeconds < 0.05 || audioTurn.byteLength === 0) {
      setErrorMessage("I couldn’t hear a clear response. Please try again.");
      setCaptureState("transcriptionError");
      buffersRef.current = [];
      return null;
    }

    const controller = new AbortController();
    transcriptionControllerRef.current = controller;

    try {
      const audioFile = writePcm16Wav(audioTurn);
      temporaryAudioFileRef.current = audioFile;
      buffersRef.current = [];
      setCaptureState("transcribing");

      const transcription = await transcribe(audioFile, controller.signal);
      const completedTurn: CapturedVoiceTurn = {
        byteLength: audioTurn.byteLength,
        channels: audioTurn.channels,
        durationSeconds: audioTurn.durationSeconds,
        encoding: audioTurn.encoding,
        sampleRate: audioTurn.sampleRate,
        transcript: normalizeTranscript(transcription.text),
        transcriptionMode: "server",
        transcriptionModel: transcription.model,
        truncated: audioTurn.truncated,
      };

      if (!isMountedRef.current || controller.signal.aborted) {
        return null;
      }

      setCapturedTurn(completedTurn);
      setCaptureState("captured");
      onTranscriptRef.current?.(completedTurn);
      return completedTurn;
    } catch (error) {
      if (!isMountedRef.current || controller.signal.aborted) {
        return null;
      }

      setErrorMessage(getTranscriptionErrorMessage(error));
      setCaptureState("transcriptionError");
      return null;
    } finally {
      if (transcriptionControllerRef.current === controller) {
        transcriptionControllerRef.current = null;
      }
      deleteTemporaryAudioFile();
      buffersRef.current = [];
    }
  }, [captureState, deleteTemporaryAudioFile, isStreaming, onLevel, stream, transcribe]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      isAcceptingBuffersRef.current = false;
      transcriptionControllerRef.current?.abort();
      transcriptionControllerRef.current = null;

      if (hasActiveStreamRef.current) {
        hasActiveStreamRef.current = false;

        try {
          stream.stop();
        } catch {
          // Fast Refresh may release the native stream before React cleanup runs.
        }
      }

      deleteTemporaryAudioFile();
      onLevel(0);
    };
  }, [deleteTemporaryAudioFile, onLevel, stream]);

  return {
    captureState,
    capturedTurn,
    errorMessage,
    isStreaming,
    startCapture,
    stopCapture,
  } as const;
}

function writePcm16Wav(turn: CapturedAudioTurn) {
  const wavBytes = new Uint8Array(WAV_HEADER_BYTES + turn.byteLength);
  const header = new DataView(wavBytes.buffer);
  const blockAlign = turn.channels * BYTES_PER_SAMPLE;
  const byteRate = turn.sampleRate * blockAlign;

  writeAscii(header, 0, "RIFF");
  header.setUint32(4, 36 + turn.byteLength, true);
  writeAscii(header, 8, "WAVE");
  writeAscii(header, 12, "fmt ");
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);
  header.setUint16(22, turn.channels, true);
  header.setUint32(24, turn.sampleRate, true);
  header.setUint32(28, byteRate, true);
  header.setUint16(32, blockAlign, true);
  header.setUint16(34, BYTES_PER_SAMPLE * 8, true);
  writeAscii(header, 36, "data");
  header.setUint32(40, turn.byteLength, true);

  let writeOffset = WAV_HEADER_BYTES;
  for (const buffer of turn.buffers) {
    const bufferBytes = new Uint8Array(buffer);
    wavBytes.set(bufferBytes, writeOffset);
    writeOffset += bufferBytes.byteLength;
  }

  const audioFile = new File(
    Paths.cache,
    `rehearsal-turn-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`,
  );
  audioFile.create({ overwrite: false });
  audioFile.write(wavBytes);
  return audioFile;
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function normalizeTranscript(transcript: string) {
  return transcript.replace(/\s+/g, " ").trim();
}

function getTranscriptionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Your audio was captured, but it couldn’t be transcribed. Please try again.";
}

function pcm16ToVoiceLevel(data: ArrayBuffer) {
  const samples = new Int16Array(data);
  if (samples.length === 0) {
    return 0;
  }

  const stride = Math.max(1, Math.floor(samples.length / 512));
  let sampleCount = 0;
  let sumOfSquares = 0;

  for (let index = 0; index < samples.length; index += stride) {
    const normalizedSample = samples[index] / 32_768;
    sumOfSquares += normalizedSample * normalizedSample;
    sampleCount += 1;
  }

  const rms = Math.sqrt(sumOfSquares / Math.max(1, sampleCount));
  const decibels = 20 * Math.log10(Math.max(rms, 0.000_01));
  return clamp((decibels + 55) / 38, 0, 1);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
