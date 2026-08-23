import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { FontSize, Sizing, Spacing } from "@/constants/theme";
import { getScenarioDefinitionForSession } from "@/data/scenarios";
import type { TurnSpeaker } from "@/domain/session";
import { useTheme } from "@/hooks/use-theme";
import {
  TranscriptScreen,
  type TranscriptEntry,
} from "@/screens/transcript-screen";
import { sessionRepository } from "@/services/storage";

export default function TranscriptRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const transcriptQuery = useQuery({
    enabled: Boolean(sessionId),
    queryKey: ["rehearsal", "transcript", sessionId],
    queryFn: () => loadTranscript(sessionId),
    refetchOnMount: "always",
    staleTime: 0,
  });

  if (transcriptQuery.data) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: "Transcript" }} />
        <TranscriptScreen
          counterpartName={transcriptQuery.data.counterpartName}
          entries={transcriptQuery.data.entries}
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Transcript" }} />
      <TranscriptStatusScreen
        errorMessage={
          transcriptQuery.error instanceof Error
            ? transcriptQuery.error.message
            : transcriptQuery.isError
              ? "The transcript could not be loaded."
              : null
        }
        onRetry={() => transcriptQuery.refetch()}
      />
    </>
  );
}

async function loadTranscript(sessionId: string) {
  if (!sessionId) {
    throw new Error("This rehearsal session could not be found.");
  }

  const session = await sessionRepository.getSession(sessionId);
  if (!session?.activeBranchId) {
    throw new Error("This rehearsal session could not be found.");
  }

  const scenario = getScenarioDefinitionForSession(session);
  if (!scenario) {
    throw new Error("This saved scenario version is unavailable.");
  }

  const turns = await sessionRepository.listTranscript(session.activeBranchId);
  const entries: readonly TranscriptEntry[] = [
    {
      id: `${scenario.id}-${scenario.version}-opening`,
      speaker: "counterpart",
      text: scenario.openingLine,
    },
    ...turns.map((turn) => ({
      id: turn.id,
      speaker: turn.speaker satisfies TurnSpeaker,
      text: turn.text,
    })),
  ];

  return {
    counterpartName: scenario.relationship.counterpartName,
    entries,
  } as const;
}

function TranscriptStatusScreen({
  errorMessage,
  onRetry,
}: {
  errorMessage: string | null;
  onRetry: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.statusScreen, { backgroundColor: theme.background }]}>
      {errorMessage ? null : <ActivityIndicator color={theme.primary} />}
      <ThemedText selectable style={styles.statusTitle}>
        {errorMessage ? "Transcript unavailable" : "Loading transcript…"}
      </ThemedText>
      {errorMessage ? (
        <ThemedText
          selectable
          style={styles.statusMessage}
          themeColor="textSecondary"
        >
          {errorMessage}
        </ThemedText>
      ) : null}
      {errorMessage ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            {
              backgroundColor: pressed ? theme.primaryPressed : theme.primary,
            },
          ]}
        >
          <ThemedText style={styles.retryLabel} themeColor="onPrimary">
            Try again
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statusScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    padding: Spacing.four,
  },
  statusTitle: {
    fontSize: FontSize.headingLarge,
    fontWeight: "700",
    lineHeight: 28,
    textAlign: "center",
  },
  statusMessage: {
    maxWidth: 320,
    fontSize: FontSize.body,
    lineHeight: 24,
    textAlign: "center",
  },
  retryButton: {
    minHeight: Sizing.control.regular,
    minWidth: 140,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Sizing.radius.pill,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  retryLabel: {
    fontSize: FontSize.body,
    fontWeight: "700",
    lineHeight: 24,
  },
});
