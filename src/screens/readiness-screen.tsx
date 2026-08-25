import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReadinessSelector } from "@/components/readiness-selector";
import { ThemedText } from "@/components/themed-text";
import { FontSize, MaxContentWidth, Sizing, Spacing } from "@/constants/theme";
import type { ReadinessValue } from "@/domain/session";
import { useTheme } from "@/hooks/use-theme";

type ReadinessScreenProps = {
  onStartPractice: (value: ReadinessValue) => Promise<void>;
};

type ReadinessFallbackScreenProps = {
  body: string;
  title: string;
};

const COLOR_TRANSITION = {
  duration: 180,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
} as const;

type StartPracticeButtonProps = {
  disabled: boolean;
  isSubmitting: boolean;
  onPress: () => void;
  selectionProgress: SharedValue<number>;
};

function StartPracticeButton({
  disabled,
  isSubmitting,
  onPress,
  selectionProgress,
}: StartPracticeButtonProps) {
  const theme = useTheme();
  const surfaceStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      selectionProgress.get(),
      [0, 1],
      [theme.backgroundElement, theme.primary],
      "LAB",
    ),
  }));
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      selectionProgress.get(),
      [0, 1],
      [theme.textSecondary, theme.onPrimary],
      "LAB",
    ),
  }));

  return (
    <Pressable
      accessibilityHint="Saves your readiness and enters the rehearsal room"
      accessibilityLabel="Start practice"
      accessibilityRole="button"
      accessibilityState={{ busy: isSubmitting, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButtonPressable,
        pressed && styles.pressed,
      ]}
    >
      <Animated.View style={[styles.primaryButtonSurface, surfaceStyle]}>
        <Animated.Text style={[styles.primaryButtonText, textStyle]}>
          {isSubmitting ? "Starting…" : "Start practice"}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export function ReadinessScreen({ onStartPractice }: ReadinessScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedValue, setSelectedValue] = useState<ReadinessValue | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const actionProgress = useSharedValue(0);

  const handleSelect = (value: ReadinessValue) => {
    if (isSubmitting) {
      return;
    }

    actionProgress.set(withTiming(1, COLOR_TRANSITION));
    setSelectedValue(value);
    setErrorMessage(null);
  };

  const handleStartPractice = async () => {
    if (selectedValue === null || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    actionProgress.set(withTiming(0, COLOR_TRANSITION));

    try {
      await onStartPractice(selectedValue);
    } catch {
      setErrorMessage("Couldn’t start practice. Please try again.");
      setIsSubmitting(false);
      actionProgress.set(withTiming(1, COLOR_TRANSITION));
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View
        style={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, Spacing.three) },
        ]}
      >
        <View style={styles.questionGroup}>
          <ThemedText selectable style={styles.title}>
            How ready do you feel to have this conversation right now?
          </ThemedText>
        </View>

        <ReadinessSelector
          disabled={isSubmitting}
          onChange={handleSelect}
          value={selectedValue}
        />

        <View style={styles.actionSpacer} />

        <View style={styles.actionGroup}>
          {errorMessage ? (
            <ThemedText
              accessibilityLiveRegion="polite"
              selectable
              style={styles.errorText}
            >
              {errorMessage}
            </ThemedText>
          ) : null}

          <StartPracticeButton
            disabled={selectedValue === null || isSubmitting}
            isSubmitting={isSubmitting}
            onPress={handleStartPractice}
            selectionProgress={actionProgress}
          />
        </View>
      </View>
    </View>
  );
}

export function ReadinessFallbackScreen({
  body,
  title,
}: ReadinessFallbackScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen]}>
      <View
        style={[
          styles.fallbackContent,
          { paddingBottom: Math.max(insets.bottom, Spacing.three) },
        ]}
      >
        <ThemedText selectable style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText selectable style={styles.body} themeColor="textSecondary">
          {body}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    height: "100%",
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    justifyContent: "flex-start",
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  fallbackContent: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    justifyContent: "center",
    gap: Spacing.three,
    padding: Spacing.four,
  },
  questionGroup: {
    gap: Spacing.two,
  },
  title: {
    fontSize: FontSize.titleSmall,
    textAlign: "center",
    fontWeight: "500",
  },
  body: {
    fontSize: FontSize.body,
  },
  actionGroup: {
    width: "100%",
    maxWidth: MaxContentWidth,
    gap: Spacing.two,
  },
  actionSpacer: {
    flex: 1,
    minHeight: Spacing.four,
  },
  errorText: {
    fontSize: FontSize.small,
    textAlign: "center",
  },
  primaryButtonPressable: {
    minHeight: Sizing.control.large,
    borderRadius: Sizing.radius.pill,
  },
  primaryButtonSurface: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Sizing.radius.pill,
  },
  primaryButtonText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.82,
  },
});
