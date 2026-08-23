import { useCallback, useEffect, useRef, useState } from 'react';

import type { ScenarioDefinition } from '@/domain/scenario';
import type { PracticeSession, Turn } from '@/domain/session';
import {
  createOpeningSimulationState,
  type SimulationState,
} from '@/domain/simulation-state';
import type { ActorResponse } from '@/services/api/actor-contract';
import {
  ActorApiError,
  useActorTurnMutation,
} from '@/services/query/rehearsal-mutations';
import { sessionRepository } from '@/services/storage';

export type RehearsalActorState =
  | 'hydrating'
  | 'idle'
  | 'ending'
  | 'responding'
  | 'responded'
  | 'complete'
  | 'error';

type UseRehearsalActorOptions = {
  scenario: ScenarioDefinition;
  session: PracticeSession;
};

type PendingManagerTurn = {
  readonly text: string;
  readonly turn: Turn;
};

export function useRehearsalActor({
  scenario,
  session,
}: UseRehearsalActorOptions) {
  const [actorState, setActorState] = useState<RehearsalActorState>('hydrating');
  const [actorReply, setActorReply] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [completedExchangeBranchId, setCompletedExchangeBranchId] = useState<
    string | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const simulationStateRef = useRef<SimulationState>(
    createOpeningSimulationState(scenario.openingState),
  );
  const pendingManagerTurnRef = useRef<PendingManagerTurn | null>(null);
  const pendingActorResponseRef = useRef<ActorResponse | null>(null);
  const isSubmittingRef = useRef(false);
  const isHydratedRef = useRef(false);
  const hasCompletedExchangeRef = useRef(false);

  const activeBranchId = session.activeBranchId;
  const { mutateAsync: generateActorTurn } = useActorTurnMutation({
    branchId: activeBranchId ?? 'unavailable',
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
  });

  useEffect(() => {
    let isCancelled = false;

    isHydratedRef.current = false;
    hasCompletedExchangeRef.current = false;
    pendingManagerTurnRef.current = null;
    pendingActorResponseRef.current = null;

    async function hydrateBranch() {
      if (!activeBranchId) {
        throw new Error('The rehearsal session does not have an active branch.');
      }

      const [branchState, transcript] = await Promise.all([
        sessionRepository.getBranchSimulationState(activeBranchId),
        sessionRepository.listTranscript(activeBranchId),
      ]);

      if (!branchState) {
        throw new Error('The rehearsal branch does not have a saved simulation state.');
      }

      if (isCancelled) {
        return;
      }

      simulationStateRef.current = branchState.state;
      hasCompletedExchangeRef.current = transcript.some(
        (turn) =>
          turn.branchId === activeBranchId && turn.speaker === 'counterpart',
      );
      setCompletedExchangeBranchId(
        hasCompletedExchangeRef.current ? activeBranchId : null,
      );
      const latestTurn = transcript.at(-1) ?? null;
      const latestCounterpartTurn = transcript.findLast(
        (turn) => turn.speaker === 'counterpart',
      );

      setActorReply(latestCounterpartTurn?.text ?? null);
      setErrorMessage(null);
      isHydratedRef.current = true;

      if (branchState.state.phase === 'closed') {
        setCanRetry(false);
        setActorState('complete');
        return;
      }

      if (latestTurn?.speaker === 'manager') {
        pendingManagerTurnRef.current = {
          text: latestTurn.text,
          turn: latestTurn,
        };
        setCanRetry(true);
        setErrorMessage(
          `Your last turn is saved. Continue when you’re ready for ${scenario.relationship.counterpartName.split(' ')[0]}’s response.`,
        );
        setActorState('error');
        return;
      }

      setCanRetry(false);
      setActorState(latestCounterpartTurn ? 'responded' : 'idle');
    }

    hydrateBranch().catch(() => {
      if (isCancelled) {
        return;
      }

      setCanRetry(false);
      setErrorMessage(
        'This rehearsal could not restore its saved state. Start a new session from the briefing.',
      );
      setActorState('error');
    });

    return () => {
      isCancelled = true;
      isHydratedRef.current = false;
    };
  }, [activeBranchId, scenario.relationship.counterpartName]);

  const runPendingTurn = useCallback(async () => {
    const pendingManagerTurn = pendingManagerTurnRef.current;
    if (
      !activeBranchId ||
      !pendingManagerTurn ||
      !isHydratedRef.current ||
      isSubmittingRef.current
    ) {
      return null;
    }

    isSubmittingRef.current = true;
    setActorState('responding');
    setErrorMessage(null);

    try {
      const branch = await sessionRepository.getBranch(activeBranchId);
      if (!branch) {
        throw new Error('The active rehearsal branch is missing.');
      }

      const transcript = await sessionRepository.listTranscript(activeBranchId);
      const actorResponse =
        pendingActorResponseRef.current ??
        (await generateActorTurn({
          scenarioId: scenario.id,
          scenarioVersion: scenario.version,
          scenarioDefinition: session.scenarioDefinition,
          reactionProfile: branch.reactionProfile,
          state: simulationStateRef.current,
          transcript: transcript.map((turn) => ({
            speaker: turn.speaker,
            text: turn.text,
          })),
          latestManagerTurn: pendingManagerTurn.text,
        }));

      pendingActorResponseRef.current = actorResponse;
      await sessionRepository.appendCounterpartTurn({
        branchId: activeBranchId,
        text: actorResponse.actorTurn.spokenText,
        nextState: actorResponse.nextState,
        modelVersion: actorResponse.model,
        promptVersion: actorResponse.promptVersion,
      });

      simulationStateRef.current = actorResponse.nextState;
      hasCompletedExchangeRef.current = true;
      setCompletedExchangeBranchId(activeBranchId);
      pendingActorResponseRef.current = null;
      pendingManagerTurnRef.current = null;
      setCanRetry(false);
      setActorReply(actorResponse.actorTurn.spokenText);
      setActorState(
        actorResponse.actorTurn.endConversation ? 'complete' : 'responded',
      );
      return actorResponse;
    } catch (error) {
      setErrorMessage(
        error instanceof ActorApiError
          ? error.message
          : `Your turn was saved, but ${scenario.relationship.counterpartName.split(' ')[0]} couldn’t respond. Please try again.`,
      );
      setActorState('error');
      return null;
    } finally {
      isSubmittingRef.current = false;
    }
  }, [
    activeBranchId,
    generateActorTurn,
    scenario.id,
    scenario.version,
    session.scenarioDefinition,
    scenario.relationship.counterpartName,
  ]);

  const submitManagerTurn = useCallback(
    async (text: string) => {
      const normalizedText = text.replace(/\s+/g, ' ').trim();
      if (
        !activeBranchId ||
        !normalizedText ||
        !isHydratedRef.current ||
        simulationStateRef.current.phase === 'closed' ||
        isSubmittingRef.current ||
        pendingManagerTurnRef.current
      ) {
        return null;
      }

      setErrorMessage(null);

      try {
        const { turn } = await sessionRepository.appendManagerTurn({
          branchId: activeBranchId,
          text: normalizedText,
        });

        pendingManagerTurnRef.current = { text: normalizedText, turn };
        setCanRetry(true);
        return await runPendingTurn();
      } catch {
        setCanRetry(false);
        setErrorMessage('Your turn couldn’t be saved. Please try again.');
        setActorState('error');
        return null;
      }
    },
    [activeBranchId, runPendingTurn],
  );

  const canEndPractice =
    Boolean(activeBranchId) &&
    completedExchangeBranchId === activeBranchId &&
    (actorState === 'idle' || actorState === 'responded');

  const endPractice = useCallback(async () => {
    if (
      !activeBranchId ||
      !isHydratedRef.current ||
      !hasCompletedExchangeRef.current ||
      pendingManagerTurnRef.current ||
      simulationStateRef.current.phase === 'closed' ||
      isSubmittingRef.current ||
      (actorState !== 'idle' && actorState !== 'responded')
    ) {
      return false;
    }

    isSubmittingRef.current = true;
    setActorState('ending');
    setErrorMessage(null);

    try {
      const result = await sessionRepository.endRehearsal({
        branchId: activeBranchId,
      });
      simulationStateRef.current = result.state.state;
      setCanRetry(false);
      setActorState('complete');
      return true;
    } catch (error) {
      setActorState(actorReply ? 'responded' : 'idle');
      throw error;
    } finally {
      isSubmittingRef.current = false;
    }
  }, [activeBranchId, actorReply, actorState]);

  return {
    actorReply,
    actorState,
    canEndPractice,
    canRetry,
    endPractice,
    errorMessage,
    retryActor: runPendingTurn,
    submitManagerTurn,
  } as const;
}
