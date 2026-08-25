import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { useRevenueCat } from "@/providers/revenuecat-provider";
import { hasCompletedOnboarding } from "@/services/storage/onboarding-status";

type OnboardingStatus = "complete" | "incomplete" | "loading";

export default function IndexRoute() {
  const theme = useTheme();
  const { hasManagerPro, isLoading: isRevenueCatLoading } = useRevenueCat();
  const [onboardingStatus, setOnboardingStatus] =
    useState<OnboardingStatus>("loading");

  useEffect(() => {
    let cancelled = false;

    void hasCompletedOnboarding()
      .then((completed) => {
        if (!cancelled) {
          setOnboardingStatus(completed ? "complete" : "incomplete");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOnboardingStatus("incomplete");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (onboardingStatus === "incomplete") {
    return <Redirect href="/(onboarding)" />;
  }

  if (onboardingStatus === "complete" && !isRevenueCatLoading) {
    if (hasManagerPro) {
      return <Redirect href="/(app)" />;
    }

    return (
      <Redirect
        href={{
          pathname: "/(paywalls)/manager-pro",
          params: { source: "startup" },
        }}
      />
    );
  }

  return (
    <View
      accessibilityLabel="Opening Manager"
      accessibilityRole="progressbar"
      style={{
        alignItems: "center",
        backgroundColor: theme.background,
        flex: 1,
        justifyContent: "center",
      }}
    >
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  );
}
