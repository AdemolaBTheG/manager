import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { PressableScale } from "pressto";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { FontSize, Sizing, Spacing } from "@/constants/theme";
import type { PreparationCard } from "@/domain/coaching";
import type { ScenarioEvidenceAnchor } from "@/domain/scenario";
import type { ReadinessValue } from "@/domain/session";
import { useTheme } from "@/hooks/use-theme";

type PreparationPlanScreenProps = {
  afterRating: ReadinessValue | null;
  beforeRating: ReadinessValue;
  evidenceAnchors: readonly ScenarioEvidenceAnchor[];
  onDone: () => void;
  onRateReadiness: () => void;
  preparationCard: PreparationCard;
};

const DISCLOSURE_TRANSITION = LinearTransition.duration(180).reduceMotion(
  ReduceMotion.System,
);
const DISCLOSURE_ENTERING = FadeIn.duration(160).reduceMotion(
  ReduceMotion.System,
);
const DISCLOSURE_EXITING = FadeOut.duration(120).reduceMotion(
  ReduceMotion.System,
);

export function PreparationPlanScreen({
  afterRating,
  beforeRating,
  evidenceAnchors,
  onDone,
  onRateReadiness,
  preparationCard,
}: PreparationPlanScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [isPushbackExpanded, setIsPushbackExpanded] = useState(false);
  const isComplete = afterRating !== null;
  const visibleEvidence = evidenceAnchors.slice(0, 2);
  const visibleCuriosity = preparationCard.stayCuriousAbout.slice(0, 2);
  const visiblePushback = preparationCard.likelyPushback.slice(0, 3);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              Sizing.control.large +
              Math.max(insets.bottom, Spacing.three) +
              Spacing.five,
          },
        ]}
        style={styles.scrollView}
      >
        <View style={styles.content}>
          <View style={styles.purposeSection}>
            <ThemedText selectable style={styles.purposeText}>
              {preparationCard.purpose}
            </ThemedText>
          </View>

          {visibleEvidence.length > 0 ? (
            <View style={styles.section}>
              <SectionLabel>Evidence</SectionLabel>
              <View style={styles.evidenceList}>
                {visibleEvidence.map((anchor, index) => (
                  <EvidenceRow
                    key={anchor.id}
                    anchor={anchor}
                    index={index}
                    showDivider={index < visibleEvidence.length - 1}
                  />
                ))}
              </View>
            </View>
          ) : null}

          <View style={[styles.askBlock, { backgroundColor: theme.primary }]}>
            <ThemedText
              selectable
              style={[styles.askLabel, { color: theme.onPrimary }]}
            >
              YOUR ASK
            </ThemedText>
            <ThemedText
              selectable
              style={[styles.askText, { color: theme.onPrimary }]}
            >
              {preparationCard.requestOrBoundary}
            </ThemedText>
          </View>

          {visibleCuriosity.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.curiosityHeading}>
                <SymbolView
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  name={{
                    ios: "questionmark.bubble",
                    android: "help_outline",
                    web: "help_outline",
                  }}
                  size={Sizing.icon.small}
                  tintColor={theme.primary}
                />
                <SectionLabel>Stay curious about</SectionLabel>
              </View>
              <View style={styles.curiosityList}>
                {visibleCuriosity.map((item) => (
                  <ThemedText
                    key={item}
                    selectable
                    style={styles.compactListText}
                  >
                    {item}
                  </ThemedText>
                ))}
              </View>
            </View>
          ) : null}

          {visiblePushback.length > 0 ? (
            <Animated.View
              layout={DISCLOSURE_TRANSITION}
              style={[
                styles.pushbackCard,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <PressableScale
                accessibilityHint="Shows or hides the reactions to prepare for"
                accessibilityRole="button"
                accessibilityState={{ expanded: isPushbackExpanded }}
                onPress={() => setIsPushbackExpanded((current) => !current)}
                style={styles.pushbackDisclosure}
              >
                <View style={styles.pushbackHeading}>
                  <SectionLabel>Likely pushback</SectionLabel>
                  <ThemedText
                    selectable
                    style={styles.pushbackSummary}
                    themeColor="textSecondary"
                  >
                    {visiblePushback.length} reactions to prepare for
                  </ThemedText>
                </View>
                <SymbolView
                  name={{
                    ios: isPushbackExpanded ? "chevron.up" : "chevron.down",
                    android: isPushbackExpanded
                      ? "keyboard_arrow_up"
                      : "keyboard_arrow_down",
                    web: isPushbackExpanded
                      ? "keyboard_arrow_up"
                      : "keyboard_arrow_down",
                  }}
                  size={Sizing.icon.small}
                  tintColor={theme.textSecondary}
                />
              </PressableScale>

              {isPushbackExpanded ? (
                <Animated.View
                  entering={DISCLOSURE_ENTERING}
                  exiting={DISCLOSURE_EXITING}
                  style={styles.pushbackList}
                >
                  {visiblePushback.map((item) => (
                    <View key={item} style={styles.pushbackRow}>
                      <SymbolView
                        name={{
                          ios: "message",
                          android: "chat_bubble_outline",
                          web: "chat_bubble_outline",
                        }}
                        size={Sizing.icon.small}
                        style={styles.pushbackIcon}
                        tintColor={theme.primary}
                      />
                      <ThemedText selectable style={styles.compactListText}>
                        {item}
                      </ThemedText>
                    </View>
                  ))}
                </Animated.View>
              ) : null}
            </Animated.View>
          ) : null}

          {isComplete ? (
            <Animated.View
              entering={DISCLOSURE_ENTERING}
              exiting={DISCLOSURE_EXITING}
              layout={DISCLOSURE_TRANSITION}
              style={styles.comparison}
            >
              <SectionLabel>How ready you feel</SectionLabel>
              <View style={styles.comparisonRows}>
                <ReadinessSegmentRow
                  activeColor={theme.textSecondary}
                  inactiveColor={theme.backgroundSelected}
                  label="Before"
                  value={beforeRating}
                />
                <ReadinessSegmentRow
                  activeColor={theme.primary}
                  inactiveColor={theme.backgroundSelected}
                  label="Now"
                  value={afterRating}
                />
              </View>
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={[
          styles.floatingAction,
          { bottom: Math.max(insets.bottom, Spacing.three) },
        ]}
      >
        <LinearGradient
          accessible={false}
          colors={[`${theme.background}00`, theme.background]}
          locations={[0, 0.52]}
          pointerEvents="none"
          style={styles.actionScrim}
        />
        <PressableScale
          accessibilityHint={
            isComplete
              ? "Returns to Home"
              : "Opens a short readiness check"
          }
          accessibilityRole="button"
          onPress={isComplete ? onDone : onRateReadiness}
          style={[
            styles.primaryButton,
            { backgroundColor: theme.primary },
          ]}
        >
          <ThemedText style={styles.primaryButtonText} themeColor="onPrimary">
            {isComplete ? "Done" : "Check my readiness"}
          </ThemedText>
          <SymbolView
            name={{
              ios: isComplete ? "checkmark" : "arrow.right",
              android: isComplete ? "check" : "arrow_forward",
              web: isComplete ? "check" : "arrow_forward",
            }}
            size={Sizing.icon.medium}
            tintColor={theme.onPrimary}
          />
        </PressableScale>
      </View>
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <ThemedText selectable style={styles.sectionLabel} themeColor="primary">
      {children.toUpperCase()}
    </ThemedText>
  );
}

function EvidenceRow({
  anchor,
  index,
  showDivider,
}: {
  anchor: ScenarioEvidenceAnchor;
  index: number;
  showDivider: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.evidenceRow,
        showDivider && {
          borderBottomColor: theme.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View
        style={[
          styles.evidenceIndex,
          { backgroundColor: theme.backgroundSelected },
        ]}
      >
        <ThemedText
          selectable
          style={styles.evidenceIndexText}
          themeColor="primary"
        >
          {String(index + 1).padStart(2, "0")}
        </ThemedText>
      </View>
      <View style={styles.evidenceCopy}>
        <ThemedText
          selectable
          style={styles.evidenceLabel}
          themeColor="textSecondary"
        >
          {anchor.label.toUpperCase()}
        </ThemedText>
        <ThemedText selectable style={styles.evidenceText}>
          {anchor.statement}
        </ThemedText>
      </View>
    </View>
  );
}

function ReadinessSegmentRow({
  activeColor,
  inactiveColor,
  label,
  value,
}: {
  activeColor: string;
  inactiveColor: string;
  label: string;
  value: ReadinessValue;
}) {
  return (
    <View
      accessibilityLabel={`${label}: ${value} out of 5`}
      accessible
      style={styles.readinessRow}
    >
      <ThemedText
        selectable
        style={styles.readinessRowLabel}
        themeColor="textSecondary"
      >
        {label}
      </ThemedText>
      <View style={styles.readinessSegments}>
        {Array.from({ length: 5 }, (_, index) => (
          <View
            key={`${label}-${index}`}
            style={[
              styles.readinessSegment,
              {
                backgroundColor:
                  index < value ? activeColor : inactiveColor,
              },
            ]}
          />
        ))}
      </View>
      <ThemedText
        selectable
        style={[styles.readinessRowValue, { color: activeColor }]}
      >
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  content: {
    gap: Spacing.three,
    maxWidth: Sizing.content.compact,
    width: "100%",
  },
  purposeSection: {
    alignItems: "center",
    paddingHorizontal: Spacing.two,
  },
  purposeText: {
    fontSize: FontSize.headingLarge,
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: FontSize.label,
    fontWeight: "700",
  },
  evidenceList: {
    gap: 0,
  },
  evidenceRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  evidenceIndex: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.small,
    height: Sizing.control.compact,
    justifyContent: "center",
    width: Sizing.control.compact,
  },
  evidenceIndexText: {
    fontSize: FontSize.caption,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  evidenceCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  evidenceLabel: {
    fontSize: FontSize.labelSmall,
    fontWeight: "700",
  },
  evidenceText: {
    fontSize: FontSize.body,
  },
  askBlock: {
    borderCurve: "continuous",
    borderRadius: Sizing.radius.medium,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  askLabel: {
    fontSize: FontSize.label,
    fontWeight: "700",
    opacity: 0.72,
  },
  askText: {
    fontSize: FontSize.heading,
    fontWeight: "600",
  },
  curiosityHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  curiosityList: {
    gap: Spacing.two,
    paddingLeft: Sizing.icon.small + Spacing.two,
  },
  compactListText: {
    flex: 1,
    fontSize: FontSize.body,
  },
  pushbackCard: {
    borderCurve: "continuous",
    borderRadius: Sizing.radius.medium,
    overflow: "hidden",
  },
  pushbackDisclosure: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
    justifyContent: "space-between",
    minHeight: Sizing.control.large,
    padding: Spacing.three,
  },
  pushbackHeading: {
    flex: 1,
    gap: Spacing.one,
  },
  pushbackSummary: {
    fontSize: FontSize.small,
  },
  pushbackList: {
    gap: Spacing.two,
    padding: Spacing.three,
  },
  pushbackRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: Spacing.three,
  },
  pushbackIcon: {
    marginTop: 3,
  },
  comparison: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  comparisonRows: {
    gap: Spacing.two,
  },
  readinessRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  readinessRowLabel: {
    fontSize: FontSize.small,
    fontWeight: "600",
    width: 52,
  },
  readinessSegments: {
    flex: 1,
    flexDirection: "row",
    gap: Spacing.one,
  },
  readinessSegment: {
    borderRadius: Sizing.radius.pill,
    flex: 1,
    height: 9,
  },
  readinessRowValue: {
    fontSize: FontSize.body,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    minWidth: 16,
    textAlign: "right",
  },
  floatingAction: {
    alignItems: "center",
    left: 0,
    paddingHorizontal: Spacing.four,
    position: "absolute",
    right: 0,
  },
  actionScrim: {
    bottom: -Spacing.six,
    height: Sizing.control.large + Spacing.six + Spacing.five,
    left: 0,
    position: "absolute",
    right: 0,
  },
  primaryButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.22)",
    flexDirection: "row",
    justifyContent: "space-between",
    maxWidth: Sizing.content.compact,
    minHeight: Sizing.control.large,
    paddingHorizontal: Spacing.four,
    width: "100%",
  },
  primaryButtonText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "700",
  },
});
