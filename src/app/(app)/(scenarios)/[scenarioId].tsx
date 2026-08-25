import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSize, Spacing } from '@/constants/theme';
import {
  getPublishedScenarioById,
  getScenarioDefinitionById,
} from '@/data/scenarios';
import { createOpeningSimulationState } from '@/domain/simulation-state';
import { ScenarioBriefingScreen } from '@/screens/scenario-briefing-screen';
import { posthog } from '@/services/analytics/posthog';
import { sessionRepository } from '@/services/storage';

export default function ScenarioBriefingRoute() {
  const router = useRouter();
  const isStartingRef = useRef(false);
  const { scenarioId } = useLocalSearchParams<{ scenarioId: string }>();
  const scenario = getPublishedScenarioById(scenarioId);
  const scenarioDefinition = getScenarioDefinitionById(
    scenario?.id,
    scenario?.version,
  );

  const handlePractice = async () => {
    if (!scenario || !scenarioDefinition || isStartingRef.current) {
      return;
    }

    isStartingRef.current = true;

    try {
      const session = await sessionRepository.createSession({
        scenarioId: scenario.id,
        scenarioVersion: scenario.version,
        initialState: createOpeningSimulationState(
          scenarioDefinition.openingState,
        ),
        resistanceMoveOrder: scenarioDefinition.resistanceMoves.map(
          (move) => move.id,
        ),
      });

      await sessionRepository.transitionSession(session.id, 'confirmed');
      posthog?.capture('practice_session_started', {
        category: scenario.category,
        scenario_id: scenario.id,
        privacy_mode: 'standard',
      });

      router.push({
        pathname: '/session/[sessionId]/readiness',
        params: { sessionId: session.id },
      });
    } catch {
      Alert.alert('Couldn’t start rehearsal', 'Please try again.');
    } finally {
      isStartingRef.current = false;
    }
  };

  if (!scenario) {
    return (
      <View style={styles.missing}>
        <Stack.Screen options={{ title: 'Scenario' }} />
        <ThemedText style={styles.missingTitle}>Scenario not found</ThemedText>
        <ThemedText themeColor="textSecondary">Choose another scenario from Home.</ThemedText>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Briefing' }} />
      <ScenarioBriefingScreen
        onPractice={handlePractice}
        scenario={scenario}
      />
    </>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  missingTitle: {
    fontSize: FontSize.title,
    lineHeight: 30,
    fontWeight: '700',
  },
});
