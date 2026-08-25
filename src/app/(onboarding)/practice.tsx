import { useLocalSearchParams } from "expo-router";

import { OnboardingPracticeScreen } from "@/screens/onboarding-practice-screen";

export default function OnboardingPracticeRoute() {
  const { category } = useLocalSearchParams<{ category?: string }>();

  return <OnboardingPracticeScreen category={category} />;
}
