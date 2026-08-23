import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router/stack";

export default function SituationsStackLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const liquidGlassAvailable = isLiquidGlassAvailable();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: liquidGlassAvailable
            ? "transparent"
            : colors.background,
        },
        headerTintColor: colors.text,
        headerTransparent: liquidGlassAvailable,
      }}
    >
      <Stack.Screen name="new" />
    </Stack>
  );
}
