import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { PressableScale } from "pressto";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  ReduceMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingFoundationComparison } from "@/components/onboarding-foundation-comparison";
import { OnboardingProgress } from "@/components/onboarding-progress";
import { FontSize, Sizing, Spacing } from "@/constants/theme";
import {
  ONBOARDING_COMMITMENTS,
  type OnboardingCommitmentFocus,
} from "@/data/onboarding-commitments";
import {
  countClearFoundations,
  getNewlyClearFoundationLabels,
} from "@/data/onboarding-outcome";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import {
  useOnboardingFlow,
  type OnboardingProofSnapshot,
} from "@/providers/onboarding-flow-provider";

const ENTER_EASING = Easing.bezier(0.23, 1, 0.32, 1);
const HERO_ENTERING = FadeInDown.duration(360)
  .easing(ENTER_EASING)
  .reduceMotion(ReduceMotion.System);
const COMPARISON_ENTERING = FadeIn.duration(320)
  .delay(120)
  .easing(ENTER_EASING)
  .reduceMotion(ReduceMotion.System);
const CARD_ENTERING = FadeInUp.duration(340)
  .delay(220)
  .easing(ENTER_EASING)
  .reduceMotion(ReduceMotion.System);
const ACTION_ENTERING = FadeInUp.duration(300)
  .delay(300)
  .easing(ENTER_EASING)
  .reduceMotion(ReduceMotion.System);

const FOCUS_DETAIL: Record<OnboardingCommitmentFocus, string> = {
  specificity: "Lead with the observable behavior and the impact it had.",
  perspective: "Ask one honest question before returning to the standard.",
  boundary: "Acknowledge the reaction without dropping the standard.",
  path: "End by agreeing exactly what happens next.",
};

const FOCUS_ICON: Record<OnboardingCommitmentFocus, SymbolViewProps["name"]> = {
  specificity: {
    ios: "scope",
    android: "center_focus_strong",
    web: "center_focus_strong",
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

const DEV_PROOF_SNAPSHOT: OnboardingProofSnapshot = {
  category: "boundary",
  focus: "perspective",
  originalFoundations: [
    { key: "purpose", status: "clear" },
    { key: "specificity", status: "clear" },
    { key: "evidence", status: "partial" },
    { key: "perspective", status: "partial" },
    { key: "boundary", status: "partial" },
    { key: "path", status: "partial" },
  ],
  currentFoundations: [
    { key: "purpose", status: "clear" },
    { key: "specificity", status: "clear" },
    { key: "evidence", status: "partial" },
    { key: "perspective", status: "clear" },
    { key: "boundary", status: "clear" },
    { key: "path", status: "partial" },
  ],
};

const DEV_FIRST_PROOF_SNAPSHOT: OnboardingProofSnapshot = {
  ...DEV_PROOF_SNAPSHOT,
  originalFoundations: null,
};

export function OnboardingOutcomeScreen() {
  const router = useRouter();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const { proofSnapshot } = useOnboardingFlow();
  const snapshot =
    proofSnapshot ??
    (__DEV__
      ? preview === "1"
        ? DEV_PROOF_SNAPSHOT
        : preview === "first"
          ? DEV_FIRST_PROOF_SNAPSHOT
          : null
      : null);

  if (!snapshot) {
    return <Redirect href="/(onboarding)" />;
  }

  const { category, currentFoundations, focus, originalFoundations } = snapshot;
  const currentClear = countClearFoundations(currentFoundations);
  const originalClear = originalFoundations
    ? countClearFoundations(originalFoundations)
    : null;
  const difference =
    originalClear === null ? null : currentClear - originalClear;
  const newlyClear = originalFoundations
    ? getNewlyClearFoundationLabels(originalFoundations, currentFoundations)
    : [];
  const headline = getHeadline(currentClear, difference);
  const supportingCopy = getSupportingCopy(
    originalFoundations !== null,
    newlyClear,
  );

  const continueToCommitment = () => {
    router.push({
      pathname: "/(onboarding)/commit",
      params: { category, focus },
    });
  };

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <ScrollView
        bounces={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, Spacing.four),
            paddingTop: Spacing.three,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: theme.background }}
      >
        <View style={styles.content}>
          <OnboardingProgress currentStep={3} />

          <Animated.View entering={HERO_ENTERING} style={styles.hero}>
            <Text
              accessibilityRole="header"
              selectable
              style={[styles.title, { color: theme.text }]}
            >
              {headline}
            </Text>
            <Text
              selectable
              style={[styles.supportingCopy, { color: theme.textSecondary }]}
            >
              {supportingCopy}
            </Text>
          </Animated.View>

          <Animated.View
            entering={COMPARISON_ENTERING}
            style={styles.comparisonRegion}
          >
            <OnboardingFoundationComparison
              current={currentFoundations}
              previous={originalFoundations}
            />
          </Animated.View>

          <Animated.View
            entering={CARD_ENTERING}
            style={[
              styles.insightCard,
              {
                backgroundColor:
                  colorScheme === "dark" ? theme.backgroundElement : "#FFFFFF",
              },
            ]}
          >
            <SymbolView
              accessible={false}
              name={FOCUS_ICON[focus]}
              size={Sizing.icon.medium}
              tintColor={theme.textSecondary}
            />
            <View style={styles.insightCopy}>
              <Text
                selectable
                style={[styles.commitment, { color: theme.text }]}
              >
                {ONBOARDING_COMMITMENTS[focus]}
              </Text>
              <Text
                selectable
                style={[styles.insightDetail, { color: theme.textSecondary }]}
              >
                {FOCUS_DETAIL[focus]}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={ACTION_ENTERING} style={styles.actionRegion}>
            <PressableScale
              accessibilityHint="Opens your final commitment"
              accessibilityRole="button"
              onPress={continueToCommitment}
              style={[
                styles.continueButton,
                { backgroundColor: theme.primary },
              ]}
            >
              <Text style={[styles.continueLabel, { color: theme.onPrimary }]}>
                Make it stick
              </Text>
              <SymbolView
                name="arrow.right"
                size={Sizing.icon.medium}
                tintColor={theme.onPrimary}
              />
            </PressableScale>
          </Animated.View>
        </View>
      </ScrollView>
    </>
  );
}

function getHeadline(currentClear: number, difference: number | null) {
  if (difference === null) {
    if (currentClear === 0) {
      return "Your first rehearsal gave you a clear starting point.";
    }
    if (currentClear === 1) {
      return "One conversation foundation came through clearly.";
    }
    return `${currentClear} of 6 foundations came through clearly.`;
  }
  if (difference > 0) {
    return `${difference} more foundation${difference === 1 ? "" : "s"} became clear on your second try.`;
  }
  if (difference < 0) {
    return "Your second try showed you exactly what to work on next.";
  }
  return "You tested a different response to the same pressure.";
}

function getSupportingCopy(
  hasComparison: boolean,
  newlyClear: readonly string[],
) {
  if (newlyClear.length > 0) {
    return `${joinLabels(newlyClear)} became clear when you tried again.`;
  }
  if (hasComparison) {
    return "A second attempt lets you compare approaches instead of chasing a perfect script.";
  }
  return "Your first rehearsal shows what already works—and which part to strengthen before the real conversation.";
}

function joinLabels(labels: readonly string[]) {
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

const styles = StyleSheet.create({
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
  hero: {
    alignItems: "center",
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
  title: {
    fontSize: FontSize.headingLarge,
    fontWeight: "700",
    textAlign: "center",
  },
  supportingCopy: {
    fontSize: FontSize.body,
    fontWeight: "500",
    textAlign: "center",
  },
  comparisonRegion: {
    paddingTop: Spacing.four,
  },
  insightCard: {
    alignItems: "flex-start",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.medium,
    flexDirection: "row",
    gap: Spacing.three,
    marginTop: Spacing.four,
    padding: Spacing.three,
  },
  insightCopy: {
    flex: 1,
    gap: Spacing.two,
  },
  commitment: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "600",
  },
  insightDetail: {
    fontSize: FontSize.small,
    fontWeight: "500",
  },
  actionRegion: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingTop: Spacing.four,
  },
  continueButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: Sizing.control.large,
    paddingHorizontal: Spacing.four,
  },
  continueLabel: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "700",
  },
});
