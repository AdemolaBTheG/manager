import Storage from "expo-sqlite/kv-store";

const ONBOARDING_COMPLETION_KEY = "manager.onboarding.completed.v1";
const COMPLETED_VALUE = "1";

export async function hasCompletedOnboarding() {
  return (await Storage.getItem(ONBOARDING_COMPLETION_KEY)) === COMPLETED_VALUE;
}

export async function markOnboardingCompleted() {
  await Storage.setItem(ONBOARDING_COMPLETION_KEY, COMPLETED_VALUE);
}
