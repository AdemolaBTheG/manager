import { ConversationTransitionProvider } from "@/components/conversation-transition-provider";
import { Colors } from "@/constants/theme";
import { DatabaseProvider } from "@/db/provider";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { AppQueryProvider } from "@/providers/app-query-provider";
import { RevenueCatProvider } from "@/providers/revenuecat-provider";
import { DarkTheme, DefaultTheme, Slot, ThemeProvider } from "expo-router";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

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
      <KeyboardProvider>
        <AppQueryProvider>
          <RevenueCatProvider>
            <DatabaseProvider
              fallback={
                <View style={{ flex: 1, backgroundColor: colors.background }} />
              }
            >
              <ThemeProvider value={navigationTheme}>
                <ConversationTransitionProvider>
                  <Slot />
                </ConversationTransitionProvider>
              </ThemeProvider>
            </DatabaseProvider>
          </RevenueCatProvider>
        </AppQueryProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
