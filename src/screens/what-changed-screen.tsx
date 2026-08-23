import { SymbolView } from "expo-symbols";
import { PressableScale } from "pressto";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInUp, ReduceMotion } from "react-native-reanimated";

import { DebriefAtmosphere } from "@/components/debrief-atmosphere";
import { ThemedText } from "@/components/themed-text";
import { FontSize, MaxContentWidth, Sizing, Spacing } from "@/constants/theme";

const TEXT = "rgba(255, 255, 255, 0.96)";
const TEXT_SECONDARY = "rgba(255, 255, 255, 0.68)";
const HAIRLINE = "rgba(255, 255, 255, 0.16)";
const BUTTON_TEXT = "#211018";
const CONTENT_ENTERING = FadeInUp.duration(560)
  .delay(100)
  .reduceMotion(ReduceMotion.System);

export type RewindComparison = {
  counterpartName: string;
  counterpartReply: string;
  currentOutcome: string;
  originalManagerTurn: string;
  previousOutcome: string;
  replacementManagerTurn: string;
  stateChanges: readonly string[];
};

type WhatChangedScreenProps = {
  accentColor: string;
  comparison: RewindComparison;
  errorMessage: string | null;
  isContinuing: boolean;
  onContinue: () => void;
};

export function WhatChangedScreen({
  accentColor,
  comparison,
  errorMessage,
  isContinuing,
  onContinue,
}: WhatChangedScreenProps) {
  return (
    <View style={styles.scene}>
      <DebriefAtmosphere accentColor={accentColor} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        indicatorStyle="white"
        style={styles.scroll}
      >
        <Animated.View entering={CONTENT_ENTERING} style={styles.content}>
          <View style={styles.hero}>
            <ThemedText selectable style={styles.eyebrow}>
              REWIND COMPLETE
            </ThemedText>
            <ThemedText selectable style={styles.title}>
              You tried a different path.
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText selectable style={styles.sectionTitle}>
              The moment
            </ThemedText>

            <TurnExcerpt align="right" label="YOU · BEFORE">
              {comparison.originalManagerTurn}
            </TurnExcerpt>
            <TurnExcerpt align="right" label="YOU · THIS TIME">
              {comparison.replacementManagerTurn}
            </TurnExcerpt>
            <TurnExcerpt
              align="left"
              label={`${comparison.counterpartName.toUpperCase()} · RESPONSE`}
            >
              {comparison.counterpartReply}
            </TurnExcerpt>
          </View>

          <View style={styles.section}>
            <ThemedText selectable style={styles.sectionTitle}>
              What changed
            </ThemedText>
            <View style={styles.changeList}>
              {comparison.stateChanges.map((change) => (
                <View key={change} style={styles.changeRow}>
                  <ThemedText style={styles.bullet}>•</ThemedText>
                  <ThemedText selectable style={styles.changeText}>
                    {change}
                  </ThemedText>
                </View>
              ))}
            </View>
            <OutcomeComparison
              label="Before"
              value={comparison.previousOutcome}
            />
            <OutcomeComparison
              label="After rewind"
              value={comparison.currentOutcome}
            />
            <ThemedText selectable style={styles.disclaimer}>
              This compares two simulated branches; it doesn’t prove that one
              response caused the difference.
            </ThemedText>
          </View>

          {errorMessage ? (
            <ThemedText
              accessibilityLiveRegion="polite"
              selectable
              style={styles.errorText}
            >
              {errorMessage}
            </ThemedText>
          ) : null}

          <PressableScale
            accessibilityHint="Opens your concise preparation plan"
            accessibilityRole="button"
            accessibilityState={{
              busy: isContinuing,
              disabled: isContinuing,
            }}
            disabled={isContinuing}
            onPress={onContinue}
            style={[
              styles.continueButton,
              isContinuing && styles.continueButtonDisabled,
            ]}
          >
            <ThemedText style={styles.continueText}>
              {isContinuing ? "Preparing your plan…" : "Before you go in"}
            </ThemedText>
            <SymbolView
              name={{
                ios: "arrow.right",
                android: "arrow_forward",
                web: "arrow_forward",
              }}
              size={Sizing.icon.medium}
              tintColor={BUTTON_TEXT}
            />
          </PressableScale>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function TurnExcerpt({
  align,
  children,
  label,
}: {
  align: "left" | "right";
  children: string;
  label: string;
}) {
  return (
    <View
      style={[
        styles.turn,
        align === "right" ? styles.turnRight : styles.turnLeft,
      ]}
    >
      <ThemedText
        selectable
        style={[styles.turnLabel, align === "right" && styles.textRight]}
      >
        {label}
      </ThemedText>
      <ThemedText
        selectable
        style={[styles.turnText, align === "right" && styles.textRight]}
      >
        “{children}”
      </ThemedText>
    </View>
  );
}

function OutcomeComparison({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.outcomeRow}>
      <ThemedText selectable style={styles.outcomeLabel}>
        {label}
      </ThemedText>
      <ThemedText selectable style={styles.outcomeText}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: "#181116",
    flex: 1,
  },
  scroll: {
    backgroundColor: "transparent",
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  content: {
    gap: Spacing.five,
    maxWidth: MaxContentWidth,
    width: "100%",
  },
  hero: {
    gap: Spacing.two,
  },
  eyebrow: {
    color: TEXT,
    fontSize: FontSize.label,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  title: {
    color: TEXT,
    fontSize: FontSize.display,
    fontWeight: "600",
    letterSpacing: -1.1,
  },
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: FontSize.titleSmall,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  turn: {
    backgroundColor: "rgba(0, 0, 0, 0.14)",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.large,
    gap: Spacing.one,
    maxWidth: "88%",
    padding: Spacing.three,
  },
  turnLeft: {
    alignSelf: "flex-start",
  },
  turnRight: {
    alignSelf: "flex-end",
  },
  turnLabel: {
    color: TEXT_SECONDARY,
    fontSize: FontSize.label,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  turnText: {
    color: TEXT,
    fontSize: FontSize.body,
    fontWeight: "600",
  },
  textRight: {
    textAlign: "right",
  },
  outcomeRow: {
    borderTopColor: HAIRLINE,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.one,
    paddingTop: Spacing.three,
  },
  changeList: {
    gap: Spacing.one,
  },
  changeRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.two,
  },
  bullet: {
    color: TEXT,
    fontSize: FontSize.body,
  },
  changeText: {
    color: TEXT,
    flex: 1,
    fontSize: FontSize.body,
  },
  disclaimer: {
    color: TEXT_SECONDARY,
    fontSize: FontSize.small,
  },
  outcomeLabel: {
    color: TEXT_SECONDARY,
    fontSize: FontSize.small,
    fontWeight: "700",
  },
  outcomeText: {
    color: TEXT,
    fontSize: FontSize.body,
  },
  errorText: {
    color: TEXT,
    fontSize: FontSize.small,
    textAlign: "center",
  },
  continueButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: Sizing.control.large,
    paddingHorizontal: Spacing.four,
    width: "100%",
  },
  continueButtonDisabled: {
    opacity: 0.62,
  },
  continueText: {
    color: BUTTON_TEXT,
    fontSize: FontSize.body,
    fontWeight: "700",
  },
});
