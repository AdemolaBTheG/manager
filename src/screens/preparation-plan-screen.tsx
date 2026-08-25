import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableScale } from "pressto";
import { useEffect, useState } from "react";
import {
  LayoutAnimation,
  type LayoutAnimationConfig,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  ReduceMotion,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
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

const CONTENT_LAYOUT_ANIMATION = {
  duration: 220,
  create: {
    duration: 180,
    property: LayoutAnimation.Properties.opacity,
    type: LayoutAnimation.Types.easeOut,
  },
  update: {
    duration: 220,
    type: LayoutAnimation.Types.easeOut,
  },
  delete: {
    duration: 120,
    property: LayoutAnimation.Properties.opacity,
    type: LayoutAnimation.Types.easeOut,
  },
} satisfies LayoutAnimationConfig;
const COMPLETION_LAYOUT_ANIMATION = {
  duration: 220,
  update: {
    duration: 220,
    type: LayoutAnimation.Types.easeOut,
  },
} satisfies LayoutAnimationConfig;
const REDUCED_MOTION_LAYOUT_ANIMATION = {
  duration: 140,
  create: {
    duration: 140,
    property: LayoutAnimation.Properties.opacity,
    type: LayoutAnimation.Types.linear,
  },
  update: {
    duration: 1,
    type: LayoutAnimation.Types.linear,
  },
  delete: {
    duration: 100,
    property: LayoutAnimation.Properties.opacity,
    type: LayoutAnimation.Types.linear,
  },
} satisfies LayoutAnimationConfig;
const REDUCED_MOTION_COMPLETION_LAYOUT_ANIMATION = {
  duration: 1,
  update: {
    duration: 1,
    type: LayoutAnimation.Types.linear,
  },
} satisfies LayoutAnimationConfig;
const READINESS_REVEAL_DURATION = 280;
const READINESS_REVEAL_REDUCED_MOTION_DURATION = 140;
const READINESS_REVEAL_EASING = Easing.bezier(0.23, 1, 0.32, 1);
const READINESS_SECTION_ENTERING = FadeIn.duration(140)
  .easing(READINESS_REVEAL_EASING)
  .reduceMotion(ReduceMotion.Never);
const READINESS_VIEWPORT_BOTTOM_CLEARANCE = 100;
const READINESS_VISIBLE_HEIGHT = 100;
const READINESS_NOW_OFFSET = 0.18;
const READINESS_SEGMENT_STAGGER = 0.07;
const READINESS_SEGMENT_REVEAL_SPAN = 0.34;
const READINESS_VALUE_REVEAL_DELAY = 0.28;
const READINESS_VALUE_REVEAL_SPAN = 0.18;

export function PreparationPlanScreen({
  afterRating,
  beforeRating,
  evidenceAnchors,
  onDone,
  onRateReadiness,
  preparationCard,
}: PreparationPlanScreenProps) {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [isPushbackExpanded, setIsPushbackExpanded] = useState(false);
  const [displayedAfterRating, setDisplayedAfterRating] = useState(afterRating);
  const scrollOffset = useSharedValue(0);
  const scrollViewportHeight = useSharedValue(0);
  const contentTop = useSharedValue(-1);
  const comparisonTop = useSharedValue(-1);
  const comparisonHeight = useSharedValue(0);
  const readinessRevealProgress = useSharedValue(0);
  const hasRevealedReadiness = useSharedValue(false);
  const isComplete = displayedAfterRating !== null;
  const visibleEvidence = evidenceAnchors.slice(0, 2);
  const visibleCuriosity = preparationCard.stayCuriousAbout.slice(0, 2);
  const visiblePushback = preparationCard.likelyPushback.slice(0, 3);
  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.set(event.contentOffset.y);
    },
  });

  useEffect(() => {
    if (!isFocused || displayedAfterRating === afterRating) {
      return;
    }

    const animationFrame = requestAnimationFrame(() => {
      const completionStateChanged =
        (displayedAfterRating === null) !== (afterRating === null);
      if (completionStateChanged) {
        LayoutAnimation.configureNext(
          reduceMotion
            ? REDUCED_MOTION_COMPLETION_LAYOUT_ANIMATION
            : COMPLETION_LAYOUT_ANIMATION,
        );
      }
      setDisplayedAfterRating(afterRating);
    });

    return () => cancelAnimationFrame(animationFrame);
  }, [afterRating, displayedAfterRating, isFocused, reduceMotion]);

  const handleTogglePushback = () => {
    LayoutAnimation.configureNext(
      reduceMotion
        ? REDUCED_MOTION_LAYOUT_ANIMATION
        : CONTENT_LAYOUT_ANIMATION,
    );
    setIsPushbackExpanded((current) => !current);
  };

  useAnimatedReaction(
    () => {
      const viewportHeight = scrollViewportHeight.get();
      const sectionHeight = comparisonHeight.get();
      const sectionTop =
        contentTop.get() + comparisonTop.get() - scrollOffset.get();
      const sectionBottom = sectionTop + sectionHeight;
      const viewportBottom =
        viewportHeight - READINESS_VIEWPORT_BOTTOM_CLEARANCE;
      const visibleHeight =
        Math.min(sectionBottom, viewportBottom) - Math.max(sectionTop, 0);

      return (
        contentTop.get() >= 0 &&
        comparisonTop.get() >= 0 &&
        viewportHeight > 0 &&
        sectionHeight > 0 &&
        visibleHeight >= Math.min(READINESS_VISIBLE_HEIGHT, sectionHeight)
      );
    },
    (isMeaningfullyVisible) => {
      if (!isMeaningfullyVisible || hasRevealedReadiness.get()) {
        return;
      }

      hasRevealedReadiness.set(true);
      readinessRevealProgress.set(
        withTiming(1, {
          duration: reduceMotion
            ? READINESS_REVEAL_REDUCED_MOTION_DURATION
            : READINESS_REVEAL_DURATION,
          easing: READINESS_REVEAL_EASING,
          // Reduced motion still receives a short opacity-only confirmation.
          reduceMotion: ReduceMotion.Never,
        }),
      );
    },
    [reduceMotion],
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Animated.ScrollView
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
        onLayout={(event) => {
          scrollViewportHeight.set(event.nativeEvent.layout.height);
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        <View
          onLayout={(event) => {
            contentTop.set(event.nativeEvent.layout.y);
          }}
          style={styles.content}
        >
          <View style={styles.purposeSection}>
            <ThemedText selectable style={styles.purposeText}>
              {preparationCard.purpose}
            </ThemedText>
          </View>

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

          {displayedAfterRating !== null ? (
            <Animated.View
              entering={READINESS_SECTION_ENTERING}
              onLayout={(event) => {
                comparisonTop.set(event.nativeEvent.layout.y);
                comparisonHeight.set(event.nativeEvent.layout.height);
              }}
              style={styles.comparison}
            >
              <SectionLabel>How ready you feel</SectionLabel>
              <View style={styles.comparisonRows}>
                <ReadinessSegmentRow
                  activeColor={theme.textSecondary}
                  inactiveColor={theme.backgroundSelected}
                  label="Before"
                  reduceMotion={reduceMotion}
                  revealProgress={readinessRevealProgress}
                  revealStart={0}
                  value={beforeRating}
                />
                <ReadinessSegmentRow
                  activeColor={theme.primary}
                  inactiveColor={theme.backgroundSelected}
                  label="Now"
                  reduceMotion={reduceMotion}
                  revealProgress={readinessRevealProgress}
                  revealStart={READINESS_NOW_OFFSET}
                  value={displayedAfterRating}
                />
              </View>
            </Animated.View>
          ) : null}

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
            <View
              style={[
                styles.pushbackCard,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <PressableScale
                accessibilityHint="Shows or hides the reactions to prepare for"
                accessibilityRole="button"
                accessibilityState={{ expanded: isPushbackExpanded }}
                onPress={handleTogglePushback}
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
                <View style={styles.pushbackList}>
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
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>

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
            isComplete ? "Returns to Home" : "Opens a short readiness check"
          }
          accessibilityRole="button"
          onPress={isComplete ? onDone : onRateReadiness}
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
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
  reduceMotion,
  revealProgress,
  revealStart,
  value,
}: {
  activeColor: string;
  inactiveColor: string;
  label: string;
  reduceMotion: boolean;
  revealProgress: SharedValue<number>;
  revealStart: number;
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
          <ReadinessSegment
            active={index < value}
            activeColor={activeColor}
            inactiveColor={inactiveColor}
            index={index}
            key={`${label}-${index}`}
            reduceMotion={reduceMotion}
            revealProgress={revealProgress}
            revealStart={revealStart}
          />
        ))}
      </View>
      <ReadinessValueReveal
        activeColor={activeColor}
        revealProgress={revealProgress}
        revealStart={revealStart}
        value={value}
      />
    </View>
  );
}

function ReadinessSegment({
  active,
  activeColor,
  inactiveColor,
  index,
  reduceMotion,
  revealProgress,
  revealStart,
}: {
  active: boolean;
  activeColor: string;
  inactiveColor: string;
  index: number;
  reduceMotion: boolean;
  revealProgress: SharedValue<number>;
  revealStart: number;
}) {
  const segmentStart = revealStart + index * READINESS_SEGMENT_STAGGER;
  const segmentEnd = segmentStart + READINESS_SEGMENT_REVEAL_SPAN;
  const activeStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      revealProgress.get(),
      [segmentStart, segmentEnd],
      [0, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity: progress,
      transform: [
        {
          scaleX: reduceMotion
            ? 1
            : interpolate(
                progress,
                [0, 1],
                [0.95, 1],
                Extrapolation.CLAMP,
              ),
        },
      ],
    };
  }, [reduceMotion, segmentEnd, segmentStart]);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[styles.readinessSegment, { backgroundColor: inactiveColor }]}
    >
      {active ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.readinessSegmentFill,
            { backgroundColor: activeColor },
            activeStyle,
          ]}
        />
      ) : null}
    </View>
  );
}

function ReadinessValueReveal({
  activeColor,
  revealProgress,
  revealStart,
  value,
}: {
  activeColor: string;
  revealProgress: SharedValue<number>;
  revealStart: number;
  value: ReadinessValue;
}) {
  const valueStart =
    revealStart +
    (value - 1) * READINESS_SEGMENT_STAGGER +
    READINESS_VALUE_REVEAL_DELAY;
  const valueEnd = valueStart + READINESS_VALUE_REVEAL_SPAN;
  const valueStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(
        revealProgress.get(),
        [valueStart, valueEnd],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    }),
    [valueEnd, valueStart],
  );

  return (
    <Animated.View style={[styles.readinessRowValueContainer, valueStyle]}>
      <ThemedText
        selectable
        style={[styles.readinessRowValue, { color: activeColor }]}
      >
        {value}
      </ThemedText>
    </Animated.View>
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
    fontWeight: "600",
    opacity: 0.72,
  },
  askText: {
    fontSize: FontSize.heading,
    fontWeight: "500",
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
    overflow: "hidden",
  },
  readinessSegmentFill: {
    bottom: 0,
    borderRadius: Sizing.radius.pill,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  readinessRowValueContainer: {
    minWidth: 16,
  },
  readinessRowValue: {
    fontSize: FontSize.body,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
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
