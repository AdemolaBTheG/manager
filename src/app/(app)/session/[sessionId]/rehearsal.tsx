import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import {
  getScenarioBriefForSession,
  getScenarioDefinitionForSession,
} from "@/data/scenarios";
import type { PracticeSession } from "@/domain/session";
import { ReadinessFallbackScreen } from "@/screens/readiness-screen";
import { RehearsalScreen } from "@/screens/rehearsal-screen";
import {
  sessionQueryKeys,
  type SessionDetailData,
  type SessionSummary,
} from "@/services/query/session-detail";
import { sessionRepository } from "@/services/storage";

type SessionLoadState =
  | { status: "loading" }
  | { status: "ready"; session: PracticeSession }
  | { status: "missing" }
  | { status: "error" };

export default function SessionRehearsalRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const queryClient = useQueryClient();
  const [loadState, setLoadState] = useState<SessionLoadState>(() => {
    const detail = queryClient.getQueryData<SessionDetailData>(
      sessionQueryKeys.detail(sessionId),
    );
    const library = queryClient.getQueryData<readonly SessionSummary[]>(
      sessionQueryKeys.library,
    );
    const cachedSession =
      detail?.session ??
      library?.find((summary) => summary.session.id === sessionId)?.session;

    return cachedSession
      ? { status: "ready", session: cachedSession }
      : { status: "loading" };
  });

  useEffect(() => {
    let isActive = true;

    sessionRepository
      .getSession(sessionId)
      .then((session) => {
        if (!isActive) {
          return;
        }

        setLoadState(
          session ? { status: "ready", session } : { status: "missing" },
        );
      })
      .catch(() => {
        if (isActive) {
          setLoadState({ status: "error" });
        }
      });

    return () => {
      isActive = false;
    };
  }, [sessionId]);

  if (loadState.status === "loading") {
    return (
      <ReadinessFallbackScreen
        body="Loading your saved rehearsal."
        title="Entering the rehearsal room…"
      />
    );
  }

  if (loadState.status === "missing" || loadState.status === "error") {
    return (
      <ReadinessFallbackScreen
        body="Return home and start the scenario again."
        title="This rehearsal isn’t available"
      />
    );
  }

  const scenario = getScenarioBriefForSession(loadState.session);
  const scenarioDefinition = getScenarioDefinitionForSession(loadState.session);

  if (
    loadState.session.status === "debriefing" ||
    loadState.session.status === "debrief-ready"
  ) {
    return (
      <Redirect
        href={{
          pathname: "/session/[sessionId]/debrief",
          params: { sessionId },
        }}
      />
    );
  }

  if (
    loadState.session.status === "plan-ready" ||
    loadState.session.status === "complete"
  ) {
    return (
      <Redirect
        href={{
          pathname: "/session/[sessionId]/plan",
          params: { sessionId },
        }}
      />
    );
  }

  if (
    !scenario ||
    !scenarioDefinition ||
    scenario.version !== loadState.session.scenarioVersion ||
    (loadState.session.status !== "rehearsing" &&
      loadState.session.status !== "rewinding")
  ) {
    return (
      <ReadinessFallbackScreen
        body="The saved session is not ready to rehearse."
        title="Rehearsal unavailable"
      />
    );
  }

  return (
    <>
      <StatusBar animated style="light" />
      <RehearsalScreen
        mode={loadState.session.status === "rewinding" ? "rewind" : "original"}
        scenario={scenario}
        scenarioDefinition={scenarioDefinition}
        session={loadState.session}
      />
    </>
  );
}
