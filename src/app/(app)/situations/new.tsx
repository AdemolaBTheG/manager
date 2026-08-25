import { randomUUID } from 'expo-crypto';
import { SymbolView } from 'expo-symbols';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { KeyboardController } from 'react-native-keyboard-controller';

import {
  buildPrivateScenario,
  type ConfirmedRealSituation,
} from '@/domain/real-situation';
import { createOpeningSimulationState } from '@/domain/simulation-state';
import { Sizing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  RealSituationBuilderScreen,
  type BuilderStep,
} from '@/screens/real-situation-builder-screen';
import {
  SituationApiError,
  useSituationNormalizationMutation,
} from '@/services/query/situation-mutations';
import { posthog } from '@/services/analytics/posthog';
import { sessionRepository } from '@/services/storage';

export default function NewSituationRoute() {
  const router = useRouter();
  const theme = useTheme();
  const [currentStep, setCurrentStep] = useState<BuilderStep>(0);
  const [isStarting, setIsStarting] = useState(false);
  const normalization = useSituationNormalizationMutation();
  const isBusy = isStarting || normalization.isPending;

  const handleClose = () => {
    if (!isBusy) {
      KeyboardController.dismiss();
      router.back();
    }
  };

  const handleStart = async (situation: ConfirmedRealSituation) => {
    if (isStarting) {
      return;
    }
    setIsStarting(true);
    KeyboardController.dismiss();
    try {
      const scenario = buildPrivateScenario(`private-${randomUUID()}`, situation);
      const session = await sessionRepository.createSession({
        scenarioId: scenario.id,
        scenarioVersion: scenario.version,
        scenarioDefinition: scenario,
        privacyMode: 'private',
        initialState: createOpeningSimulationState(scenario.openingState),
        resistanceMoveOrder: scenario.resistanceMoves.map((move) => move.id),
      });
      await sessionRepository.transitionSession(session.id, 'confirmed');
      posthog?.capture('private_practice_session_started', {
        conversation_type: situation.conversationType,
        relationship_type: situation.relationshipType,
      });
      router.replace({
        pathname: '/session/[sessionId]/readiness',
        params: { sessionId: session.id },
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          gestureEnabled: !isBusy,
          headerBackVisible: false,
          headerLeft: ({ tintColor }) => (
            <Pressable
              accessibilityHint="Closes the conversation builder"
              accessibilityLabel="Close"
              accessibilityRole="button"
              disabled={isBusy}
              hitSlop={8}
              onPress={handleClose}
              style={styles.headerButton}
            >
              <SymbolView
                name="xmark"
                size={Sizing.icon.medium}
                tintColor={tintColor ?? theme.text}
              />
            </Pressable>
          ),
          headerShown: true,
          headerTitleAlign: 'center',
          title: `Step ${currentStep + 1} of 4`,
          unstable_headerLeftItems: () => [
            {
              type: 'button',
              label: 'Close',
              accessibilityLabel: 'Close',
              accessibilityHint: 'Closes the conversation builder',
              disabled: isBusy,
              icon: { type: 'sfSymbol', name: 'xmark' },
              onPress: handleClose,
            },
          ],
        }}
      />
      <RealSituationBuilderScreen
        isNormalizing={normalization.isPending}
        isStarting={isStarting}
        normalizationError={
          normalization.error instanceof SituationApiError
            ? normalization.error.message
            : normalization.isError
              ? 'We couldn’t prepare this simulation. Please try again.'
              : null
        }
        onNormalize={async (input) => {
          const result = await normalization.mutateAsync(input);
          posthog?.capture('private_situation_normalized', {
            conversation_type: input.conversationType,
            relationship_type: input.relationshipType,
          });
          return result;
        }}
        onStart={handleStart}
        onStepChange={setCurrentStep}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    alignItems: 'center',
    height: Sizing.control.regular,
    justifyContent: 'center',
    width: Sizing.control.regular,
  },
});
