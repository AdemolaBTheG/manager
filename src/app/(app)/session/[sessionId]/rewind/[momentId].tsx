import { useQuery } from "@tanstack/react-query";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ReadinessFallbackScreen } from "@/screens/readiness-screen";
import { RehearsalScreen } from "@/screens/rehearsal-screen";
import {
  loadRewind,
  rewindQueryKey,
} from "@/services/query/rewind-query";

export default function SessionRewindRoute() {
  const { momentId, sessionId } = useLocalSearchParams<{
    momentId: string;
    sessionId: string;
  }>();
  const rewindQuery = useQuery({
    enabled: Boolean(sessionId && momentId),
    queryKey: rewindQueryKey(sessionId, momentId),
    queryFn: () => loadRewind(sessionId, momentId),
    retry: false,
  });

  if (rewindQuery.isPending) {
    return (
      <>
        <Stack.Screen options={{ title: "Rewind" }} />
        <ReadinessFallbackScreen
          body="Restoring the exact state from before your response."
          title="Rewinding the conversation…"
        />
      </>
    );
  }

  if (rewindQuery.isError || !rewindQuery.data) {
    return (
      <>
        <Stack.Screen options={{ title: "Rewind" }} />
        <ReadinessFallbackScreen
          body={
            rewindQuery.error instanceof Error
              ? rewindQuery.error.message
              : "Return to the debrief and choose the moment again."
          }
          title="This rewind isn’t available"
        />
      </>
    );
  }

  if (rewindQuery.data.status === "complete") {
    return (
      <Redirect
        href={{
          pathname: "/session/[sessionId]/debrief",
          params: { sessionId },
        }}
      />
    );
  }

  if (rewindQuery.data.status === "plan") {
    return (
      <Redirect
        href={{
          pathname: "/session/[sessionId]/plan",
          params: { sessionId },
        }}
      />
    );
  }

  return (
    <>
      <StatusBar animated style="light" />
      <RehearsalScreen
        mode="rewind"
        scenario={rewindQuery.data.scenario}
        scenarioDefinition={rewindQuery.data.scenarioDefinition}
        session={rewindQuery.data.session}
      />
    </>
  );
}
