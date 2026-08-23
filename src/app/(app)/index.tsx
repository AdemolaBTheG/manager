import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

import { HomeScreen } from "@/screens/home-screen";
import {
  loadSessionLibrary,
  sessionQueryKeys,
} from "@/services/query/session-detail";

export default function HomeRoute() {
  const sessionsQuery = useQuery({
    queryKey: sessionQueryKeys.library,
    queryFn: loadSessionLibrary,
    retry: false,
  });
  const refetchSessions = sessionsQuery.refetch;

  useFocusEffect(
    useCallback(() => {
      void refetchSessions();
    }, [refetchSessions]),
  );

  return (
    <HomeScreen
      sessionLibrary={sessionsQuery.data ?? []}
      sessionsUnavailable={sessionsQuery.isError}
    />
  );
}
