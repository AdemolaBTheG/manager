import { useQuery } from "@tanstack/react-query";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback } from "react";
import { Pressable, StyleSheet } from "react-native";

import { Sizing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { HomeScreen } from "@/screens/home-screen";
import {
  loadSessionLibrary,
  sessionQueryKeys,
} from "@/services/query/session-detail";

export default function HomeRoute() {
  const router = useRouter();
  const theme = useTheme();
  const sessionsQuery = useQuery({
    queryKey: sessionQueryKeys.library,
    queryFn: loadSessionLibrary,
    retry: false,
  });
  const refetchSessions = sessionsQuery.refetch;
  const openSettings = useCallback(() => {
    router.push("/(app)/(settings)");
  }, [router]);
  const nativeHeaderLeftItems = useCallback(
    () => [
      {
        type: "button" as const,
        label: "Settings",
        accessibilityLabel: "Settings",
        accessibilityHint: "Opens app settings",
        icon: { type: "sfSymbol" as const, name: "gearshape" as const },
        onPress: openSettings,
      },
    ],
    [openSettings],
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
          headerLeft: ({ tintColor }) => (
            <Pressable
              accessibilityHint="Opens app settings"
              accessibilityLabel="Settings"
              accessibilityRole="button"
              hitSlop={8}
              onPress={openSettings}
              style={styles.headerButton}
            >
              <SymbolView
                name={{
                  ios: "gearshape",
                  android: "settings",
                  web: "settings",
                }}
                size={Sizing.icon.medium}
                tintColor={tintColor ?? theme.text}
              />
            </Pressable>
          ),
          unstable_headerLeftItems: nativeHeaderLeftItems,
        }}
      />
      <HomeScreen
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
