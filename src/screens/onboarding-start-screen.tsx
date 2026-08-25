import { useRouter } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { PressableScale } from "pressto";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  interpolateColor,
  LinearTransition,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { OnboardingProgress } from "@/components/onboarding-progress";
import { ThemedText } from "@/components/themed-text";
import {
  FontSize,
  PracticeCategoryColors,
  Sizing,
  Spacing,
} from "@/constants/theme";
import { scenarios } from "@/data/scenarios";
import { PRACTICE_CATEGORIES, type PracticeCategory } from "@/domain/scenario";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSemanticHaptics } from "@/hooks/use-semantic-haptics";
import { useTheme } from "@/hooks/use-theme";
import { posthog } from "@/services/analytics/posthog";

const CATEGORY_OPTIONS: readonly {
  category: PracticeCategory;
  description: string;
  icon: Parameters<typeof SymbolView>[0]["name"];
}[] = [
  {
    category: "feedback",
    description: "Make the issue clear without making it personal.",
    icon: {
      ios: "text.bubble.fill",
      android: "chat",
      web: "chat",
    },
  },
  {
    category: "boundary",
    description: "Hold a standard without damaging the relationship.",
    icon: {
      ios: "hand.raised.fill",
      android: "front_hand",
      web: "front_hand",
    },
  },
  {
    category: "pushback",
    description: "Say no while keeping the conversation moving.",
    icon: {
      ios: "arrow.turn.up.left",
      android: "reply",
      web: "reply",
    },
  },
] as const;

const AnimatedPressableScale = Animated.createAnimatedComponent(PressableScale);
const AnimatedSymbolView = Animated.createAnimatedComponent(SymbolView);
const OPTION_LAYOUT = LinearTransition.duration(220);
const CATEGORY_SELECTION_TARGETS = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
] as const;

export function OnboardingStartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { playSelection } = useSemanticHaptics();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const selectionProgress = useSharedValue([0, 0, 0]);
  const continueProgress = useSharedValue(0);
  const [selectedCategory, setSelectedCategory] =
    useState<PracticeCategory | null>(null);

  const selectedScenario = selectedCategory
    ? scenarios.find((scenario) => scenario.category === selectedCategory)
    : undefined;

  const selectCategory = (category: PracticeCategory, index: number) => {
    if (category === selectedCategory) return;

    selectionProgress.value = withTiming(
      [...CATEGORY_SELECTION_TARGETS[index]],
      { duration: 240 },
    );
    continueProgress.value = withTiming(1, { duration: 240 });
    setSelectedCategory(category);
    posthog?.capture("onboarding_category_selected", { category });
    playSelection();
  };

  const animatedContinueStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      continueProgress.value,
      [0, 1],
      [theme.backgroundElement, theme.primary],
    ),
  }));

  const animatedContinueTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      continueProgress.value,
      [0, 1],
      [theme.textSecondary, theme.onPrimary],
    ),
  }));

  const openPractice = (category: PracticeCategory) => {
    router.push({
      pathname: "/(onboarding)/practice",
      params: { category },
    });
  };

  return (
    <ScrollView
      bounces={false}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: insets.bottom + Spacing.four,
          paddingTop: Spacing.four,
        },
      ]}
      contentInsetAdjustmentBehavior="never"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.background }}
    >
      <OnboardingProgress currentStep={1} />

      <View style={styles.intro}>
        <ThemedText accessibilityRole="header" style={styles.title}>
          What kind of conversation feels hardest right now?
        </ThemedText>
      </View>

      <View accessibilityRole="radiogroup" style={styles.options}>
        {CATEGORY_OPTIONS.map((option, index) => (
          <CategoryOption
            color={PracticeCategoryColors[colorScheme][option.category]}
            description={option.description}
            icon={option.icon}
            index={index}
            key={option.category}
            label={PRACTICE_CATEGORIES[option.category].label}
            onPress={() => selectCategory(option.category, index)}
            selected={selectedCategory === option.category}
            selectionProgress={selectionProgress}
            selectedText={theme.onPrimary}
            unselectedBackground={theme.backgroundElement}
            unselectedText={theme.text}
          />
        ))}
      </View>

      <View style={styles.actionsRegion}>
        <AnimatedPressableScale
          accessibilityHint="Starts a short voice practice for the selected conversation type"
          accessibilityRole="button"
          accessibilityState={{ disabled: !selectedScenario }}
          disabled={!selectedScenario}
          layout={OPTION_LAYOUT}
          onPress={() => selectedCategory && openPractice(selectedCategory)}
          style={[styles.primaryButton, animatedContinueStyle]}
        >
          <Animated.Text
            style={[styles.primaryLabel, animatedContinueTextStyle]}
          >
            Continue
          </Animated.Text>
          <Animated.Text
            style={[styles.primaryArrow, animatedContinueTextStyle]}
          >
            →
          </Animated.Text>
        </AnimatedPressableScale>
      </View>
    </ScrollView>
  );
}

function CategoryOption({
  color,
  description,
  icon,
  index,
  label,
  onPress,
  selected,
  selectionProgress,
  selectedText,
  unselectedBackground,
  unselectedText,
}: {
  readonly color: string;
  readonly description: string;
  readonly icon: Parameters<typeof SymbolView>[0]["name"];
  readonly index: number;
  readonly label: string;
  readonly onPress: () => void;
  readonly selected: boolean;
  readonly selectionProgress: SharedValue<number[]>;
  readonly selectedText: string;
  readonly unselectedBackground: string;
  readonly unselectedText: string;
}) {
  const animatedContainerStyle = useAnimatedStyle(() => {
    const selected = selectionProgress.value[index] ?? 0;

    return {
      backgroundColor: interpolateColor(
        selected,
        [0, 1],
        [unselectedBackground, color],
      ),
    };
  });

  const animatedLabelStyle = useAnimatedStyle(() => {
    const selected = selectionProgress.value[index] ?? 0;

    return {
      color: interpolateColor(selected, [0, 1], [unselectedText, selectedText]),
    };
  });

  const animatedIconProps = useAnimatedProps<SymbolViewProps>(() => {
    const selected = selectionProgress.value[index] ?? 0;

    return {
      tintColor: interpolateColor(selected, [0, 1], [color, selectedText]),
    };
  });

  return (
    <AnimatedPressableScale
      accessibilityLabel={`${label}. ${description}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      layout={OPTION_LAYOUT}
      onPress={onPress}
      style={[styles.option, animatedContainerStyle]}
    >
      <View style={styles.optionHeader}>
        <AnimatedSymbolView
          animatedProps={animatedIconProps}
          name={icon}
          size={Sizing.icon.medium}
          tintColor={color}
        />
        <View style={styles.optionCopy}>
          <Animated.Text style={[styles.optionLabel, animatedLabelStyle]}>
            {label}
          </Animated.Text>
        </View>
      </View>
      {selected ? (
        <Animated.Text
          entering={FadeInDown.duration(180)}
          exiting={FadeOutUp.duration(140)}
          style={[styles.optionDescription, { color: selectedText }]}
        >
          {description}
        </Animated.Text>
      ) : null}
    </AnimatedPressableScale>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    marginHorizontal: "auto",
    maxWidth: Sizing.content.compact,
    paddingHorizontal: Spacing.four,
    width: "100%",
  },
  intro: {
    paddingTop: Spacing.four,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: "600",
    textAlign: "center",
  },
  options: {
    gap: Spacing.two,
    marginTop: Spacing.five,
  },
  option: {
    alignItems: "stretch",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.medium,
    gap: Spacing.two,
    minHeight: 72,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  optionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: Sizing.icon.medium,
  },
  optionCopy: {
    flex: 1,
  },
  optionLabel: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "600",
  },
  optionDescription: {
    fontSize: FontSize.small,
    fontWeight: "500",
    opacity: 0.82,
  },
  actionsRegion: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingTop: Spacing.five,
  },
  primaryButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: Sizing.control.large,
    paddingHorizontal: Spacing.four,
  },
  primaryLabel: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "700",
  },
  primaryArrow: {
    fontSize: FontSize.title,
    fontWeight: "500",
  },
});
