import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback } from "react";

export default function SessionStackLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const liquidGlassAvailable = isLiquidGlassAvailable();
  const headerBackgroundColor = liquidGlassAvailable
    ? "transparent"
    : colors.background;
  const nativeHeaderLeftItems = useCallback(
    () => [
      {
        type: "button" as const,
        label: "Settings",
        accessibilityLabel: "Settings",
        accessibilityHint: "Opens app settings",
        icon: { type: "sfSymbol" as const, name: "chevron.left" as const },
        onPress: router.back,
      },
    ],
    [router],
  );
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        unstable_headerLeftItems: nativeHeaderLeftItems,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Session",
          headerTransparent: liquidGlassAvailable,
          headerStyle: { backgroundColor: headerBackgroundColor },
        }}
      />
      <Stack.Screen
        name="rehearsal"
        options={{
          title: "Practice",
          headerTransparent: liquidGlassAvailable,
          headerStyle: { backgroundColor: headerBackgroundColor },
        }}
      />
      <Stack.Screen
        name="debrief"
        options={{
          title: "Debrief",
          headerTransparent: liquidGlassAvailable,
          headerStyle: { backgroundColor: headerBackgroundColor },
        }}
      />
      <Stack.Screen
        name="rewind/[momentId]"
        options={{
          title: "Rewind",
          headerTransparent: liquidGlassAvailable,
          headerStyle: { backgroundColor: headerBackgroundColor },
        }}
      />
      <Stack.Screen
        name="plan"
        options={{
          title: "Before you go in",
          headerTransparent: liquidGlassAvailable,
          headerStyle: { backgroundColor: headerBackgroundColor },
        }}
      />
    </Stack>
  );
}
