import { useQuery } from "@tanstack/react-query";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { Sizing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { SessionListScreen } from "@/screens/session-list-screen";
import {
  loadSessionLibrary,
  sessionQueryKeys,
} from "@/services/query/session-detail";

export default function SessionsRoute() {
  const router = useRouter();
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const sessionsQuery = useQuery({
    queryKey: sessionQueryKeys.library,
    queryFn: loadSessionLibrary,
    retry: false,
  });
  const refetchSessions = sessionsQuery.refetch;
  const closeSessions = useCallback(() => router.back(), [router]);
  const nativeCloseItems = useCallback(
    () => [
      {
        type: "button" as const,
        label: "Close",
        accessibilityLabel: "Close sessions",
        icon: { type: "sfSymbol" as const, name: "xmark" as const },
        onPress: closeSessions,
      },
    ],
    [closeSessions],
  );

  useFocusEffect(
    useCallback(() => {
      void refetchSessions();
    }, [refetchSessions]),
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: ({ tintColor }) => (
            <Pressable
              accessibilityLabel="Close sessions"
              accessibilityRole="button"
              hitSlop={8}
              onPress={closeSessions}
              style={styles.headerButton}
            >
              <SymbolView
                name="xmark"
                size={Sizing.icon.medium}
                tintColor={tintColor ?? theme.text}
              />
            </Pressable>
          ),
          headerSearchBarOptions: {
            autoCapitalize: "none",
            hideWhenScrolling: false,
            onCancelButtonPress: () => setSearchQuery(""),
            onChangeText: (event) => setSearchQuery(event.nativeEvent.text),
            placeholder: "Search sessions",
          },
          title: "Sessions",
          unstable_headerLeftItems: nativeCloseItems,
        }}
      />
      <SessionListScreen
        isLoading={sessionsQuery.isPending}
        isRefreshing={sessionsQuery.isRefetching && !sessionsQuery.isPending}
        onRefresh={() => void refetchSessions()}
        searchQuery={searchQuery}
        sessionLibrary={sessionsQuery.data ?? []}
        sessionsUnavailable={sessionsQuery.isError}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    alignItems: "center",
    height: Sizing.control.compact,
    justifyContent: "center",
    width: Sizing.control.compact,
  },
});
