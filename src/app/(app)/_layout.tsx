import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router/stack";

export default function AppStackLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === "dark" ? "dark" : "light";
  const colors = Colors[scheme];
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
          title: "Before",
          headerTransparent: liquidGlassAvailable,
          headerStyle: { backgroundColor: headerBackgroundColor },
        }}
      />
      <Stack.Screen
        name="situations"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(settings)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen name="(scenarios)" options={{ headerShown: false }} />
      <Stack.Screen
        name="session"
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(session-sheets)/session/[sessionId]/readiness"
        options={{
          presentation: "formSheet",
          headerShown: false,
          sheetAllowedDetents: "fitToContents",
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetExpandsWhenScrolledToEdge: false,
          headerTransparent: isLiquidGlassAvailable(),
          headerStyle: {
            backgroundColor: isLiquidGlassAvailable()
              ? "transparent"
              : colors.background,
          },
          contentStyle: {
            backgroundColor: isLiquidGlassAvailable()
              ? "transparent"
              : colors.background,
          },
        }}
      />
      <Stack.Screen
        name="(session-sheets)/session/[sessionId]/transcript"
        options={{
          title: "Transcript",
          presentation: "formSheet",
          sheetAllowedDetents: "fitToContents",
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          headerTransparent: isLiquidGlassAvailable(),
          headerStyle: {
            backgroundColor: isLiquidGlassAvailable()
              ? "transparent"
              : colors.background,
          },
          contentStyle: {
            backgroundColor: isLiquidGlassAvailable()
              ? "transparent"
              : colors.background,
          },
        }}
      />
      <Stack.Screen
        name="(session-sheets)/session/[sessionId]/post-readiness"
        options={{
          presentation: "formSheet",
          headerShown: false,
          sheetAllowedDetents: "fitToContents",
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          headerTransparent: isLiquidGlassAvailable(),
          headerStyle: {
            backgroundColor: isLiquidGlassAvailable()
              ? "transparent"
              : colors.background,
          },
          sheetExpandsWhenScrolledToEdge: false,
          contentStyle: {
            backgroundColor: isLiquidGlassAvailable()
              ? "transparent"
              : colors.background,
          },
        }}
      />
    </Stack>
  );
}
