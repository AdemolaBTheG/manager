import { useLocalSearchParams } from "expo-router";

import { RevenueCatPaywallScreen } from "@/screens/revenuecat-paywall-screen";

export default function ManagerProPaywallRoute() {
  const { category, focus, source } = useLocalSearchParams<{
    category?: string;
    focus?: string;
    source?: string;
  }>();

  return (
    <RevenueCatPaywallScreen
      category={category}
      focus={focus}
      source={source}
    />
  );
}
