import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router/stack";

export default function SessionStackLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const liquidGlassAvailable = isLiquidGlassAvailable();
  const headerBackgroundColor = liquidGlassAvailable
    ? "transparent"
    : colors.background;

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
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
        options={{ animation: "none", title: "Debrief" }}
      />
      <Stack.Screen
        name="rewind/[momentId]"
        options={{
          animation: "none",
          title: "Rewind",
          headerTransparent: liquidGlassAvailable,
          headerStyle: { backgroundColor: headerBackgroundColor },
        }}
      />
      <Stack.Screen name="plan" options={{ title: "Before you go in" }} />
    </Stack>
  );
}
