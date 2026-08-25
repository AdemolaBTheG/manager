import {
  useNavigation,
  useRouter,
  type NativeStackNavigationProp,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import type { CustomerInfo } from "react-native-purchases";
import RevenueCatUI from "react-native-purchases-ui";

import { ThemedText } from "@/components/themed-text";
import { FontSize, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  MANAGER_PRO_ENTITLEMENT,
  hasEntitlement,
  useRevenueCat,
} from "@/providers/revenuecat-provider";
import { posthog } from "@/services/analytics/posthog";
import { createOnboardingPaywallVariables } from "@/services/revenuecat/paywall-variables";

type PaywallSource = "onboarding" | "startup" | "subscription";
type RootStackParamList = {
  readonly "(app)": undefined;
  readonly "(onboarding)": undefined;
  readonly "(paywalls)": undefined;
  readonly index: undefined;
};

export function RevenueCatPaywallScreen({
  category,
  focus,
  source,
}: {
  readonly category?: string;
  readonly focus?: string;
  readonly source?: string;
}) {
  const router = useRouter();
  const rootNavigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>("/");
  const theme = useTheme();
  const { currentOffering, hasManagerPro, isLoading, refresh } =
    useRevenueCat();
  const hasExitedRef = useRef(false);
  const paywallSource: PaywallSource =
    source === "subscription"
      ? "subscription"
      : source === "startup"
        ? "startup"
        : "onboarding";
  const customVariables = useMemo(
    () =>
      paywallSource === "onboarding"
        ? createOnboardingPaywallVariables({ category, focus })
        : undefined,
    [category, focus, paywallSource],
  );

  const exitPaywall = useCallback(() => {
    if (hasExitedRef.current) return;

    hasExitedRef.current = true;
    if (paywallSource === "subscription" && router.canGoBack()) {
      router.back();
      return;
    }

    rootNavigation.reset({
      index: 0,
      routes: [{ name: "(app)" }],
    });
  }, [paywallSource, rootNavigation, router]);

  useEffect(() => {
    if (!isLoading && hasManagerPro) {
      exitPaywall();
    }
  }, [exitPaywall, hasManagerPro, isLoading]);

  const completePurchase = useCallback(
    (customerInfo: CustomerInfo) => {
      if (!hasEntitlement(customerInfo, MANAGER_PRO_ENTITLEMENT)) {
        Alert.alert(
          "Purchase received",
          "The purchase completed, but Manager Pro is not active yet. Try Restore Purchases or contact support.",
        );
        return;
      }

      posthog?.capture("subscription_purchase_completed", {
        source: paywallSource,
      });
      void refresh().catch(() => undefined);
      exitPaywall();
    },
    [exitPaywall, paywallSource, refresh],
  );

  const completeRestore = useCallback(
    (customerInfo: CustomerInfo) => {
      if (!hasEntitlement(customerInfo, MANAGER_PRO_ENTITLEMENT)) {
        Alert.alert(
          "Nothing to restore",
          "No active Manager Pro purchase was found for this store account.",
        );
        return;
      }

      posthog?.capture("subscription_restore_completed", {
        source: paywallSource,
      });
      void refresh().catch(() => undefined);
      exitPaywall();
    },
    [exitPaywall, paywallSource, refresh],
  );

  if (isLoading) {
    return (
      <View
        accessibilityLabel="Loading subscription plans"
        accessibilityRole="progressbar"
        style={[styles.loading, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator color={theme.primary} size="large" />
        <ThemedText selectable style={styles.loadingLabel}>
          Loading plans…
        </ThemedText>
      </View>
    );
  }

  if (hasManagerPro) {
    return (
      <View
        accessibilityLabel="Opening Manager Pro"
        accessibilityRole="progressbar"
        style={[styles.loading, { backgroundColor: theme.background }]}
      >
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <RevenueCatUI.Paywall
        onDismiss={exitPaywall}
        onPurchaseCompleted={({ customerInfo }) =>
          completePurchase(customerInfo)
        }
        onPurchaseError={({ error }) =>
          Alert.alert("Purchase not completed", error.message)
        }
        onRestoreCompleted={({ customerInfo }) =>
          completeRestore(customerInfo)
        }
        onRestoreError={({ error }) =>
          Alert.alert("Restore failed", error.message)
        }
        options={{
          customVariables,
          displayCloseButton: true,
          offering: currentOffering ?? undefined,
        }}
        style={styles.paywall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.three,
    justifyContent: "center",
    padding: Spacing.four,
  },
  loadingLabel: {
    fontSize: FontSize.body,
  },
  paywall: {
    flex: 1,
  },
  screen: {
    flex: 1,
  },
});
