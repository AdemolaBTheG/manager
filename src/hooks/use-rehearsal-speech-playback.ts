import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioSampleListener,
  type AudioSample,
  type AudioStatus,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Easing,
  ReduceMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  getSpeechCaptionSnapshot,
  groupSpeechCaptionPhrases,
  type SpeechCaptionPhrase,
  type SpeechCaptionSnapshot,
} from '@/domain/speech-caption';
import {
  SpeechApiError,
  useSpeechAudioMutation,
} from '@/services/query/rehearsal-mutations';

export type RehearsalSpeechPlaybackState =
  | 'idle'
  | 'generating'
  | 'loading'
  | 'playing'
  | 'error';

type PlaybackFinishReason = 'done' | 'error' | 'stopped';

const WORD_HIGHLIGHT_TRANSITION = {
  duration: 110,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

type UseRehearsalSpeechPlaybackOptions = {
  counterpart: {
    readonly name: string;
    readonly role: string;
  };
  onFinish?: (reason: PlaybackFinishReason) => void;
  onLevel?: (level: number) => void;
  onStart?: () => void;
  scenarioId: string;
  scenarioVersion: number;
};

export function useRehearsalSpeechPlayback({
  counterpart,
  onFinish,
  onLevel,
  onStart,
  scenarioId,
  scenarioVersion,
}: UseRehearsalSpeechPlaybackOptions) {
  const player = useAudioPlayer(null, { updateInterval: 80 });
  const [playbackState, setPlaybackState] =
    useState<RehearsalSpeechPlaybackState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [caption, setCaption] = useState<SpeechCaptionSnapshot | null>(null);
  const activeCaptionWordPosition = useSharedValue(-1);
  const captionHighlightProgress = useSharedValue(0);
  const activePlaybackIdRef = useRef<number | null>(null);
  const activeCaptionKeyRef = useRef<string | null>(null);
  const activeCaptionWordTargetRef = useRef<number | null>(null);
  const audioFileRef = useRef<File | null>(null);
  const captionPhrasesRef = useRef<readonly SpeechCaptionPhrase[]>([]);
  const generationControllerRef = useRef<AbortController | null>(null);
  const hasStartedRef = useRef(false);
  const requestIdRef = useRef(0);
  const onFinishRef = useRef(onFinish);
  const onLevelRef = useRef(onLevel);
  const onStartRef = useRef(onStart);
  const {
    mutateAsync: generateSpeechAudio,
    reset: resetSpeechMutation,
  } = useSpeechAudioMutation({ scenarioId, scenarioVersion });

  useEffect(() => {
    onFinishRef.current = onFinish;
    onLevelRef.current = onLevel;
    onStartRef.current = onStart;
  }, [onFinish, onLevel, onStart]);

  const publishCaption = useCallback(
    (currentTime: number, highlightActiveWord: boolean) => {
      const nextCaption = getSpeechCaptionSnapshot(
        captionPhrasesRef.current,
        currentTime,
        highlightActiveWord,
      );
      const nextKey = nextCaption
        ? `${nextCaption.phraseIndex}:${nextCaption.activeWordIndex ?? 'none'}`
        : null;

      if (nextKey === activeCaptionKeyRef.current) {
        return;
      }

      activeCaptionKeyRef.current = nextKey;

      if (nextCaption?.activeWordIndex === null) {
        captionHighlightProgress.set(
          withTiming(0, WORD_HIGHLIGHT_TRANSITION),
        );
      } else if (nextCaption) {
        const nextWordPosition =
          nextCaption.wordOffset + nextCaption.activeWordIndex;
        const previousWordTarget = activeCaptionWordTargetRef.current;

        if (
          previousWordTarget === null ||
          Math.abs(nextWordPosition - previousWordTarget) > 1
        ) {
          activeCaptionWordPosition.set(nextWordPosition);
          captionHighlightProgress.set(1);
        } else {
          activeCaptionWordPosition.set(
            withTiming(nextWordPosition, WORD_HIGHLIGHT_TRANSITION),
          );
          captionHighlightProgress.set(
            withTiming(1, WORD_HIGHLIGHT_TRANSITION),
          );
        }

        activeCaptionWordTargetRef.current = nextWordPosition;
      }

      setCaption(nextCaption);
    },
    [activeCaptionWordPosition, captionHighlightProgress],
  );

  const publishFinalCaption = useCallback(() => {
    const finalPhrase = captionPhrasesRef.current.at(-1);
    if (!finalPhrase) {
      return;
    }

    publishCaption(finalPhrase.end, false);
  }, [publishCaption]);

  const clearCaption = useCallback(() => {
    activeCaptionKeyRef.current = null;
    activeCaptionWordTargetRef.current = null;
    captionPhrasesRef.current = [];
    activeCaptionWordPosition.set(-1);
    captionHighlightProgress.set(0);
    setCaption(null);
  }, [activeCaptionWordPosition, captionHighlightProgress]);

  const deleteAudioFile = useCallback(() => {
    const audioFile = audioFileRef.current;
    audioFileRef.current = null;

    if (!audioFile) {
      return;
    }

    try {
      audioFile.delete();
    } catch {
      // Cache cleanup is best-effort and never blocks the conversation.
    }
  }, []);

  const releasePlayer = useCallback(() => {
    try {
      player.pause();
      player.replace(null);
    } catch {
      // Native playback may already be released during route teardown.
    }

    deleteAudioFile();
  }, [deleteAudioFile, player]);

  const finishPlayback = useCallback(
    (reason: PlaybackFinishReason, message?: string) => {
      if (activePlaybackIdRef.current === null) {
        return;
      }

      activePlaybackIdRef.current = null;
      hasStartedRef.current = false;
      onLevelRef.current?.(0);
      if (reason === 'done') {
        publishFinalCaption();
      }
      releasePlayer();

      if (reason === 'error') {
        setErrorMessage(
          message ??
            'The reply is available as text, but audio playback failed.',
        );
        setPlaybackState('error');
      } else {
        setPlaybackState('idle');
      }

      onFinishRef.current?.(reason);
    },
    [publishFinalCaption, releasePlayer],
  );

  useEffect(() => {
    const subscription = player.addListener(
      'playbackStatusUpdate',
      (status: AudioStatus) => {
        if (activePlaybackIdRef.current === null) {
          return;
        }

        if (status.error) {
          finishPlayback('error');
          return;
        }

        if (status.playing && !hasStartedRef.current) {
          hasStartedRef.current = true;
          setPlaybackState('playing');
          onStartRef.current?.();
        }

        if (status.playing) {
          publishCaption(status.currentTime, true);
        }

        if (status.didJustFinish) {
          finishPlayback('done');
        }
      },
    );

    return () => subscription.remove();
  }, [finishPlayback, player, publishCaption]);

  const handleAudioSample = useCallback((sample: AudioSample) => {
    if (
      activePlaybackIdRef.current === null ||
      !hasStartedRef.current
    ) {
      return;
    }

    onLevelRef.current?.(audioSampleToLevel(sample));
  }, []);

  useAudioSampleListener(player, handleAudioSample);

  const speak = useCallback(
    async (text: string) => {
      const normalizedText = text.replace(/\s+/g, ' ').trim();
      if (!normalizedText) {
        return false;
      }

      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      generationControllerRef.current?.abort();
      generationControllerRef.current = new AbortController();

      if (activePlaybackIdRef.current !== null) {
        finishPlayback('stopped');
      } else {
        releasePlayer();
      }

      setErrorMessage(null);
      setPlaybackState('generating');
      onLevelRef.current?.(0);
      clearCaption();

      let audioFile: File | null = null;

      try {
        const speech = await generateSpeechAudio({
          request: {
            scenarioId,
            scenarioVersion,
            counterpart,
            text: normalizedText,
          },
          signal: generationControllerRef.current.signal,
        });

        if (requestIdRef.current !== requestId) {
          return false;
        }

        await setAudioModeAsync({
          allowsRecording: false,
          interruptionMode: 'doNotMix',
          playsInSilentMode: true,
        });

        audioFile = new File(
          Paths.cache,
          `jamie-reply-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`,
        );
        audioFile.create({ overwrite: false });
        const captionPhrases = groupSpeechCaptionPhrases(speech.words);
        if (captionPhrases.length === 0) {
          throw new SpeechApiError(
            'The voice response did not include usable captions.',
            200,
            'invalid_alignment',
          );
        }

        captionPhrasesRef.current = captionPhrases;
        activeCaptionKeyRef.current = null;
        audioFile.write(speech.audio);

        if (requestIdRef.current !== requestId) {
          audioFile.delete();
          return false;
        }

        audioFileRef.current = audioFile;
        activePlaybackIdRef.current = requestId;
        hasStartedRef.current = false;
        setPlaybackState('loading');
        player.replace({ uri: audioFile.uri });
        player.play();
        return true;
      } catch (error) {
        if (audioFile && audioFileRef.current !== audioFile) {
          try {
            audioFile.delete();
          } catch {
            // The temporary file may already have been removed.
          }
        }

        if (requestIdRef.current !== requestId) {
          return false;
        }

        activePlaybackIdRef.current = requestId;
        finishPlayback(
          'error',
          error instanceof SpeechApiError
            ? error.message
            : 'The reply is available as text, but audio playback failed.',
        );
        return false;
      } finally {
        if (requestIdRef.current === requestId) {
          generationControllerRef.current = null;
          resetSpeechMutation();
        }
      }
    },
    [
      finishPlayback,
      clearCaption,
      player,
      releasePlayer,
      generateSpeechAudio,
      resetSpeechMutation,
      scenarioId,
      scenarioVersion,
      counterpart,
    ],
  );

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    generationControllerRef.current?.abort();
    generationControllerRef.current = null;

    if (activePlaybackIdRef.current !== null) {
      finishPlayback('stopped');
    } else {
      releasePlayer();
      setPlaybackState('idle');
      onLevelRef.current?.(0);
    }
  }, [finishPlayback, releasePlayer]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      generationControllerRef.current?.abort();
      generationControllerRef.current = null;
      activePlaybackIdRef.current = null;
      activeCaptionKeyRef.current = null;
      activeCaptionWordTargetRef.current = null;
      captionPhrasesRef.current = [];
      activeCaptionWordPosition.set(-1);
      captionHighlightProgress.set(0);
      hasStartedRef.current = false;
      onLevelRef.current?.(0);
      releasePlayer();
    };
  }, [
    activeCaptionWordPosition,
    captionHighlightProgress,
    releasePlayer,
  ]);

  return {
    activeCaptionWordPosition,
    caption,
    captionHighlightProgress,
    clearCaption,
    errorMessage,
    isBusy:
      playbackState === 'generating' ||
      playbackState === 'loading' ||
      playbackState === 'playing',
    playbackState,
    speak,
    stop,
  } as const;
}

function audioSampleToLevel(sample: AudioSample) {
  let frameCount = 0;
  let sumOfSquares = 0;

  for (const channel of sample.channels) {
    const stride = Math.max(1, Math.floor(channel.frames.length / 256));

    for (let index = 0; index < channel.frames.length; index += stride) {
      const frame = channel.frames[index];
      sumOfSquares += frame * frame;
      frameCount += 1;
    }
  }

  if (frameCount === 0) {
    return 0;
  }

  const rootMeanSquare = Math.sqrt(sumOfSquares / frameCount);
  return Math.min(1, Math.max(0, (rootMeanSquare - 0.015) * 7.5));
}
