import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { OnboardingFlowProvider } from "@/providers/onboarding-flow-provider";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router/stack";

export default function OnboardingLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
  const liquidGlassAvailable = isLiquidGlassAvailable();
  const headerBackgroundColor = liquidGlassAvailable
    ? "transparent"
    : colors.background;

  return (
    <OnboardingFlowProvider>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerShown: true,
          headerStyle: { backgroundColor: headerBackgroundColor },
          headerTintColor: colors.text,
          headerTransparent: liquidGlassAvailable,
        }}
      >
        <Stack.Screen name="index" options={{ title: "Before" }} />
        <Stack.Screen name="practice" options={{ title: "Practice" }} />
        <Stack.Screen name="outcome" options={{ title: "Your progress" }} />
        <Stack.Screen name="commit" options={{ title: "Commitment" }} />
      </Stack>
    </OnboardingFlowProvider>
  );
}
