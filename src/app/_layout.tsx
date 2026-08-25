import { ConversationTransitionProvider } from "@/components/conversation-transition-provider";
import { Colors } from "@/constants/theme";
import { DatabaseProvider } from "@/db/provider";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppQueryProvider } from "@/providers/app-query-provider";
import { HapticsProvider } from "@/providers/haptics-provider";
import { RevenueCatProvider } from "@/providers/revenuecat-provider";
import { posthog } from "@/services/analytics/posthog";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack } from "expo-router/stack";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import {
  PostHogErrorBoundary,
  PostHogProvider,
} from "posthog-react-native";

function RootErrorFallback() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text>Something went wrong. Please restart the app.</Text>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === "dark" ? "dark" : "light";
  const colors = Colors[scheme];
  const baseTheme = scheme === "dark" ? DarkTheme : DefaultTheme;

  const navigationTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HapticsProvider>
        <KeyboardProvider>
          <AppQueryProvider>
            <RevenueCatProvider>
              <DatabaseProvider
                fallback={
                  <View style={{ flex: 1, backgroundColor: colors.background }} />
                }
              >
                <ThemeProvider value={navigationTheme}>
                  <PostHogProvider client={posthog ?? undefined}>
                    <PostHogErrorBoundary fallback={RootErrorFallback}>
                      <ConversationTransitionProvider>
                        <Stack screenOptions={{ headerShown: false }}>
                          <Stack.Screen name="index" />
                          <Stack.Screen
                            name="(onboarding)"
                            options={{ headerShown: false }}
                          />
                          <Stack.Screen
                            name="(paywalls)"
                            options={{
                              headerShown: false,
                            }}
                          />
                          <Stack.Screen
                            name="(app)"
                            options={{
                              headerShown: false,
                              gestureEnabled: false,
                            }}
                          />
                        </Stack>
                      </ConversationTransitionProvider>
                    </PostHogErrorBoundary>
                  </PostHogProvider>
                </ThemeProvider>
              </DatabaseProvider>
            </RevenueCatProvider>
          </AppQueryProvider>
        </KeyboardProvider>
      </HapticsProvider>
    </GestureHandlerRootView>
  );
}
