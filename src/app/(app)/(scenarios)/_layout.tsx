import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { useCallback } from "react";

export default function ScenariosStackLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
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
        headerTransparent: isLiquidGlassAvailable(),
        contentStyle: { backgroundColor: colors.background },
        unstable_headerLeftItems: nativeHeaderLeftItems,
        headerStyle: {
          backgroundColor: isLiquidGlassAvailable()
            ? "transparent"
            : colors.background,
        },
      }}
    >
      <Stack.Screen name="[scenarioId]" options={{ title: "Briefing" }} />
    </Stack>
  );
}
