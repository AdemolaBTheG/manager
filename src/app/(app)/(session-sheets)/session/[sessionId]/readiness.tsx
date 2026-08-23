import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { getScenarioBriefForSession } from '@/data/scenarios';
import type { PracticeSession, ReadinessValue } from '@/domain/session';
import {
  ReadinessFallbackScreen,
  ReadinessScreen,
} from '@/screens/readiness-screen';
import { sessionRepository } from '@/services/storage';

type SessionLoadState =
  | { status: 'loading' }
  | { status: 'ready'; session: PracticeSession }
  | { status: 'missing' }
  | { status: 'error' };

export default function SessionReadinessRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [loadState, setLoadState] = useState<SessionLoadState>({
    status: 'loading',
  });

  useEffect(() => {
    let isActive = true;

    sessionRepository
      .getSession(sessionId)
      .then((session) => {
        if (!isActive) {
          return;
        }

        setLoadState(session ? { status: 'ready', session } : { status: 'missing' });
      })
      .catch(() => {
        if (isActive) {
          setLoadState({ status: 'error' });
        }
      });

    return () => {
      isActive = false;
    };
  }, [sessionId]);

  if (loadState.status === 'loading') {
    return (
      <>
        <Stack.Screen options={{ title: 'Readiness' }} />
        <ReadinessFallbackScreen
          body="Loading your saved rehearsal."
          title="Getting things ready…"
        />
      </>
    );
  }

  if (loadState.status === 'missing' || loadState.status === 'error') {
    return (
      <>
        <Stack.Screen options={{ title: 'Readiness' }} />
        <ReadinessFallbackScreen
          body="Return home and start the scenario again."
          title="This rehearsal isn’t available"
        />
      </>
    );
  }

  const scenario = getScenarioBriefForSession(loadState.session);

  if (!scenario || scenario.version !== loadState.session.scenarioVersion) {
    return (
      <>
        <Stack.Screen options={{ title: 'Readiness' }} />
        <ReadinessFallbackScreen
          body="The saved scenario version no longer matches this build."
          title="Scenario update required"
        />
      </>
    );
  }

  const handleStartPractice = async (rating: ReadinessValue) => {
    await sessionRepository.saveReadinessRating({
      sessionId: loadState.session.id,
      stage: 'before',
      rating,
    });

    const currentSession = await sessionRepository.getSession(
      loadState.session.id,
    );

    if (currentSession?.status === 'confirmed') {
      await sessionRepository.transitionSession(
        loadState.session.id,
        'readiness-recorded',
      );
    }

    const readinessSession = await sessionRepository.getSession(
      loadState.session.id,
    );

    if (readinessSession?.status === 'readiness-recorded') {
      await sessionRepository.transitionSession(
        loadState.session.id,
        'rehearsing',
      );
    } else if (readinessSession?.status !== 'rehearsing') {
      throw new Error('Session is not ready to start practice.');
    }

    router.replace({
      pathname: '/session/[sessionId]/rehearsal',
      params: { sessionId: loadState.session.id },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Readiness' }} />
      <ReadinessScreen onStartPractice={handleStartPractice} />
    </>
  );
}
