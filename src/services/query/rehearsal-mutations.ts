import { useMutation } from '@tanstack/react-query';

import type { ScenarioDefinition } from '@/domain/scenario';
import {
  ActorApiError,
  requestActorTurn,
  type ActorTurnRequest,
} from '@/services/api/actor-client';
import {
  requestDebrief,
  type DebriefRequest,
} from '@/services/api/evaluator-client';
import {
  requestSpeechAudio,
  SpeechApiError,
  type SpeechAudioRequest,
} from '@/services/api/speech-client';
import {
  requestTranscription,
  TranscriptionApiError,
  type TranscriptionRequest,
} from '@/services/api/transcription-client';

export { ActorApiError, SpeechApiError, TranscriptionApiError };

export const rehearsalMutationKeys = {
  actorTurn: (branchId: string, scenarioId: string, scenarioVersion: number) =>
    ['rehearsal', 'actor-turn', branchId, scenarioId, scenarioVersion] as const,
  debrief: (sessionId: string) =>
    ['rehearsal', 'debrief', sessionId] as const,
  speech: (scenarioId: string, scenarioVersion: number) =>
    ['rehearsal', 'speech', scenarioId, scenarioVersion] as const,
  transcription: (sessionId: string) =>
    ['rehearsal', 'transcription', sessionId] as const,
};

export function useActorTurnMutation({
  branchId,
  scenarioId,
  scenarioVersion,
}: {
  branchId: string;
  scenarioId: string;
  scenarioVersion: number;
}) {
  return useMutation({
    mutationKey: rehearsalMutationKeys.actorTurn(
      branchId,
      scenarioId,
      scenarioVersion,
    ),
    mutationFn: (request: ActorTurnRequest) => requestActorTurn(request),
  });
}

export function useDebriefMutation(sessionId: string) {
  return useMutation({
    mutationKey: rehearsalMutationKeys.debrief(sessionId),
    mutationFn: ({ scenario, request }: DebriefMutationVariables) =>
      requestDebrief(scenario, request),
  });
}

export function useSpeechAudioMutation({
  scenarioId,
  scenarioVersion,
}: {
  scenarioId: string;
  scenarioVersion: number;
}) {
  return useMutation({
    gcTime: 0,
    mutationKey: rehearsalMutationKeys.speech(scenarioId, scenarioVersion),
    mutationFn: ({ request, signal }: SpeechMutationVariables) =>
      requestSpeechAudio(request, signal),
  });
}

export function useTranscriptionMutation(sessionId: string) {
  return useMutation({
    gcTime: 0,
    mutationKey: rehearsalMutationKeys.transcription(sessionId),
    mutationFn: (request: TranscriptionRequest) =>
      requestTranscription(request),
  });
}

type DebriefMutationVariables = {
  readonly request: DebriefRequest;
  readonly scenario: ScenarioDefinition;
};

type SpeechMutationVariables = {
  readonly request: SpeechAudioRequest;
  readonly signal?: AbortSignal;
};
