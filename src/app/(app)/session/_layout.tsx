import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router/stack";

export default function SessionModalLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const liquidGlassAvailable = isLiquidGlassAvailable();

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
          title: "Sessions",
          headerTransparent: liquidGlassAvailable,
          headerStyle: {
            backgroundColor: liquidGlassAvailable
              ? "transparent"
              : colors.background,
          },
        }}
      />
      <Stack.Screen name="[sessionId]" options={{ headerShown: false }} />
    </Stack>
  );
}
