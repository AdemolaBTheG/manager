import { Stack, useRouter } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useCallback, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  ReduceMotion,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { HoldToEndButton } from "@/components/hold-to-end-button";
import { OnboardingProgress } from "@/components/onboarding-progress";
import {
  Colors,
  FontSize,
  PracticeCategoryColors,
  Sizing,
  Spacing,
} from "@/constants/theme";
import {
  ONBOARDING_COMMITMENTS,
  getOnboardingCommitmentFocuses,
  isOnboardingCommitmentFocus,
  type OnboardingCommitmentFocus,
} from "@/data/onboarding-commitments";
import type { PracticeCategory } from "@/domain/scenario";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import { posthog } from "@/services/analytics/posthog";
import { markOnboardingCompleted } from "@/services/storage/onboarding-status";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const COMMIT_EASING = Easing.bezier(0.23, 1, 0.32, 1);
const COMMIT_DURATION = 760;
const CHECKMARK_LENGTH = 80;
const COMMITMENT_ICON_BY_FOCUS: Record<
  OnboardingCommitmentFocus,
  SymbolViewProps["name"]
> = {
  specificity: {
    ios: "doc.text.magnifyingglass",
    android: "find_in_page",
    web: "find_in_page",
  },
  perspective: {
    ios: "questionmark.bubble",
    android: "question_answer",
    web: "question_answer",
  },
  boundary: {
    ios: "hand.raised",
    android: "front_hand",
    web: "front_hand",
  },
  path: {
    ios: "arrow.right",
    android: "arrow_forward",
    web: "arrow_forward",
  },
};

export function OnboardingCommitmentScreen({
  category,
  focus,
}: {
  readonly category?: string;
  readonly focus?: string;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const theme = useTheme();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const practiceCategory = isPracticeCategory(category) ? category : "boundary";
  const commitmentFocus = isOnboardingCommitmentFocus(focus)
    ? focus
    : defaultFocusForCategory(practiceCategory);
  const commitments = getOnboardingCommitmentFocuses(
    practiceCategory,
    commitmentFocus,
  );
  const accentColor = PracticeCategoryColors[colorScheme][practiceCategory];
  const progress = useSharedValue(0);
  const checkmarkScale = useSharedValue(1);
  const committedRef = useRef(false);
  const [isCommitted, setIsCommitted] = useState(false);

  const finishCommitment = useCallback(() => {
    void markOnboardingCompleted()
      .then(() => {
        posthog?.capture("onboarding_commitment_completed", {
          category: practiceCategory,
          focus: commitmentFocus,
        });
        router.push({
          pathname: "/(paywalls)/manager-pro",
          params: {
            category: practiceCategory,
            focus: commitmentFocus,
            source: "onboarding",
          },
        });
      })
      .catch(() => {
        committedRef.current = false;
        setIsCommitted(false);
        progress.set(0);
        checkmarkScale.set(1);
        Alert.alert(
          "Couldn’t finish onboarding",
          "Manager couldn’t save your progress. Please hold to commit again.",
        );
      });
  }, [checkmarkScale, commitmentFocus, practiceCategory, progress, router]);

  const handleCommit = useCallback(() => {
    if (committedRef.current) return;

    committedRef.current = true;
    setIsCommitted(true);
    void AccessibilityInfo.announceForAccessibility("Committed");

    if (!reduceMotion) {
      checkmarkScale.set(
        withSequence(
          withTiming(1.075, { duration: 150, easing: COMMIT_EASING }),
          withSpring(1, { damping: 13, stiffness: 180 }),
        ),
      );
    }

    progress.set(
      withTiming(
        1,
        {
          duration: COMMIT_DURATION,
          easing: COMMIT_EASING,
          reduceMotion: ReduceMotion.Never,
        },
        (finished) => {
          if (finished) runOnJS(finishCommitment)();
        },
      ),
    );
  }, [checkmarkScale, finishCommitment, progress, reduceMotion]);

  const backgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value * 0.12,
      [0, 1],
      [theme.background, accentColor],
    ),
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
  }));

  const checkmarkAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: reduceMotion
      ? progress.value > 0
        ? 0
        : CHECKMARK_LENGTH
      : interpolate(
          progress.value,
          [0.08, 0.62],
          [CHECKMARK_LENGTH, 0],
          Extrapolation.CLAMP,
        ),
  }));

  return (
    <>
      <Stack.Screen
        options={{
          gestureEnabled: !isCommitted,
          headerBackVisible: !isCommitted,
        }}
      />
      <Animated.ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.four),
            paddingTop: Spacing.two,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        style={[styles.screen, backgroundStyle]}
      >
        <View style={styles.content}>
        <OnboardingProgress
          currentStep={4}
          style={styles.onboardingProgress}
        />

        <View style={styles.commitment}>
          <Animated.View
            accessible={false}
            importantForAccessibility="no"
            style={[styles.checkmark, checkmarkStyle]}
          >
            <Svg
              accessible={false}
              height={144}
              viewBox="0 0 64 64"
              width={144}
            >
              <Path
                d="M9 33 L25 48 L55 16"
                fill="none"
                opacity={0.18}
                stroke={accentColor}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={4.5}
              />
              <AnimatedPath
                animatedProps={checkmarkAnimatedProps}
                d="M9 33 L25 48 L55 16"
                fill="none"
                stroke={accentColor}
                strokeDasharray={`${CHECKMARK_LENGTH} ${CHECKMARK_LENGTH}`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={4.5}
              />
            </Svg>
          </Animated.View>

          <View style={styles.commitmentCard}>
            {commitments.map((commitment) => (
              <View key={commitment} style={styles.commitmentRow}>
                <SymbolView
                  accessible={false}
                  name={COMMITMENT_ICON_BY_FOCUS[commitment]}
                  size={Sizing.icon.medium}
                  tintColor={Colors.light.textSecondary}
                />
                <Text
                  selectable
                  style={[styles.commitmentText, { color: Colors.light.text }]}
                >
                  {ONBOARDING_COMMITMENTS[commitment]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <HoldToEndButton
          accessibilityHint="Hold until the button fills to confirm this promise and finish onboarding"
          accessibilityLabel={isCommitted ? "Committed" : "Hold to commit"}
          backgroundColor="#FFFFFF"
          completed={isCommitted}
          completedLabel="Committed"
          disabled={isCommitted}
          filledTextColor={theme.onPrimary}
          fillColor={accentColor}
          holdDurationMs={1_300}
          label="Hold to commit"
          onComplete={handleCommit}
          style={styles.commitButton}
          textColor={Colors.light.text}
        />
        </View>
      </Animated.ScrollView>
    </>
  );
}

function isPracticeCategory(
  value: string | undefined,
): value is PracticeCategory {
  return value === "feedback" || value === "boundary" || value === "pushback";
}

function defaultFocusForCategory(
  category: PracticeCategory,
): keyof typeof ONBOARDING_COMMITMENTS {
  if (category === "feedback") return "specificity";
  if (category === "pushback") return "path";
  return "boundary";
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
  },
  content: {
    alignSelf: "center",
    flex: 1,
    maxWidth: Sizing.content.compact,
    width: "100%",
  },
  onboardingProgress: {
    marginBottom: Spacing.two,
  },
  commitment: {
    flex: 1,
    gap: Spacing.five,
    justifyContent: "flex-start",
    paddingBottom: Spacing.five,
    paddingTop: Spacing.six,
  },
  checkmark: {
    alignSelf: "center",
    alignItems: "center",
    height: 152,
    justifyContent: "center",
    width: 152,
  },
  commitmentCard: {
    backgroundColor: "#FFFFFF",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.card,
    gap: Spacing.four,
    padding: Spacing.four,
  },
  commitmentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
  },
  commitmentText: {
    flex: 1,
    fontSize: FontSize.bodyLarge,
    fontWeight: "600",
  },
  commitButton: {
    flexShrink: 0,
  },
});
