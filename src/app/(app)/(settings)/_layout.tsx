import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback } from "react";
import { Pressable, StyleSheet } from "react-native";

import { Colors, Sizing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SettingsLayout() {
  const router = useRouter();
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const theme = Colors[scheme];
  const transparentHeader = isLiquidGlassAvailable();
  const closeSettings = useCallback(() => router.back(), [router]);
  const nativeCloseItems = useCallback(
    () => [
      {
        type: "button" as const,
        label: "Close",
        accessibilityLabel: "Close settings",
        icon: { type: "sfSymbol" as const, name: "xmark" as const },
        onPress: closeSettings,
      },
    ],
    [closeSettings],
  );

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: transparentHeader
            ? "transparent"
            : theme.background,
        },
        headerTintColor: theme.text,
        headerTransparent: transparentHeader,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerBackVisible: false,
          headerLeft: ({ tintColor }) => (
            <Pressable
              accessibilityLabel="Close settings"
              accessibilityRole="button"
              hitSlop={8}
              onPress={closeSettings}
              style={styles.headerButton}
            >
              <SymbolView
                name="xmark"
                size={Sizing.icon.medium}
                tintColor={tintColor ?? theme.text}
              />
            </Pressable>
          ),
          title: "Settings",
          unstable_headerLeftItems: nativeCloseItems,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    width: Sizing.control.compact,
    height: Sizing.control.compact,
    alignItems: "center",
    justifyContent: "center",
  },
});
