import { useLocalSearchParams } from "expo-router";

import { OnboardingCommitmentScreen } from "@/screens/onboarding-commitment-screen";

export default function OnboardingCommitmentRoute() {
  const { category, focus } = useLocalSearchParams<{
    category?: string;
    focus?: string;
  }>();

  return <OnboardingCommitmentScreen category={category} focus={focus} />;
}
