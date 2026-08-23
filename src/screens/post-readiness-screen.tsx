import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReadinessSelector } from "@/components/readiness-selector";
import { ThemedText } from "@/components/themed-text";
import { FontSize, Sizing, Spacing } from "@/constants/theme";
import type { ReadinessValue } from "@/domain/session";
import { useTheme } from "@/hooks/use-theme";

type PostReadinessScreenProps = {
  onSubmit: (rating: ReadinessValue) => Promise<void>;
};

type PostReadinessStatusScreenProps = {
  body: string;
  title: string;
};

export function PostReadinessScreen({ onSubmit }: PostReadinessScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [selectedRating, setSelectedRating] = useState<ReadinessValue | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (selectedRating === null || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit(selectedRating);
    } catch {
      setErrorMessage("Couldn’t save your readiness. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.screen]}>
      <View
        style={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, Spacing.three) },
        ]}
      >
        <View style={styles.heading}>
          <ThemedText selectable style={styles.title}>
            How ready do you feel now?
          </ThemedText>
          <ThemedText selectable style={styles.body} themeColor="textSecondary">
            Answer based on the real conversation ahead—not how polished the
            rehearsal felt.
          </ThemedText>
        </View>

        <ReadinessSelector
          disabled={isSubmitting}
          onChange={(rating) => {
            setSelectedRating(rating);
            setErrorMessage(null);
          }}
          value={selectedRating}
        />

        {errorMessage ? (
          <ThemedText
            accessibilityLiveRegion="polite"
            selectable
            style={styles.errorText}
          >
            {errorMessage}
          </ThemedText>
        ) : null}

        <Pressable
          accessibilityHint="Saves your readiness after rehearsal"
          accessibilityRole="button"
          accessibilityState={{
            busy: isSubmitting,
            disabled: isSubmitting || selectedRating === null,
          }}
          disabled={isSubmitting || selectedRating === null}
          onPress={handleSubmit}
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: pressed ? theme.primaryPressed : theme.primary,
              opacity: isSubmitting || selectedRating === null ? 0.42 : 1,
            },
          ]}
        >
          <ThemedText style={styles.primaryButtonText} themeColor="onPrimary">
            {isSubmitting ? "Saving…" : "Save readiness"}
          </ThemedText>
          <SymbolView
            name={{
              ios: "checkmark",
              android: "check",
              web: "check",
            }}
            size={Sizing.icon.medium}
            tintColor={theme.onPrimary}
          />
        </Pressable>
      </View>
    </View>
  );
}

export function PostReadinessStatusScreen({
  body,
  title,
}: PostReadinessStatusScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.statusContent,
          { paddingBottom: Math.max(insets.bottom, Spacing.four) },
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
    width: "100%",
  },
  content: {
    alignSelf: "center",
    gap: Spacing.four,
    maxWidth: Sizing.content.compact,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    width: "100%",
  },
  statusContent: {
    alignSelf: "center",
    gap: Spacing.two,
    maxWidth: Sizing.content.compact,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    width: "100%",
  },
  heading: {
    gap: Spacing.two,
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: "600",
    letterSpacing: -0.45,
    lineHeight: 30,
    textAlign: "center",
  },
  body: {
    fontSize: FontSize.small,
    lineHeight: 20,
    textAlign: "center",
  },
  errorText: {
    fontSize: FontSize.small,
    lineHeight: 20,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: Sizing.control.large,
    paddingHorizontal: Spacing.four,
    width: "100%",
  },
  primaryButtonText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "700",
    lineHeight: 24,
  },
});
