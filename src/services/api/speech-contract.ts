import type { SpeechWordTiming } from '@/domain/speech-caption';

export type SpeechResponsePayload = {
  readonly audioBase64: string;
  readonly audioContentType: 'audio/wav';
  readonly duration: number;
  readonly words: readonly SpeechWordTiming[];
  readonly model: string;
  readonly voice: string;
  readonly alignmentModel: string;
};
