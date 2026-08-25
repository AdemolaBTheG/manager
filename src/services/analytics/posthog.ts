import PostHog from 'posthog-react-native';

const projectToken = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim();

function requirePostHogConfiguration() {
  if (!projectToken) {
    throw new Error(
      'EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN is configured',
    );
  }

  if (!host) {
    throw new Error(
      'EXPO_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_HOST is configured',
    );
  }
}

if (__DEV__) {
  requirePostHogConfiguration();
}

export const posthog =
  projectToken && host
    ? new PostHog(projectToken, {
        host,
        captureAppLifecycleEvents: true,
      })
    : null;
