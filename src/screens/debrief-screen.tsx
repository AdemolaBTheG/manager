import { LinearGradient } from "expo-linear-gradient";
import { SymbolView } from "expo-symbols";
import { PressableScale } from "pressto";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  LinearTransition,
  ReduceMotion,
} from "react-native-reanimated";

import { DebriefAtmosphere } from "@/components/debrief-atmosphere";
import { ThemedText } from "@/components/themed-text";
import { FontSize, Sizing, Spacing } from "@/constants/theme";
import type {
  CoachingApproachStyle,
  Debrief,
  DebriefMoment,
  FoundationKey,
  FoundationStatus,
} from "@/domain/coaching";
import type { CounterpartLineByTurnId } from "@/services/query/debrief-context";

type DebriefScreenProps = {
  accentColor: string;
  counterpartLineByTurnId: CounterpartLineByTurnId;
  counterpartName: string;
  continueError: string | null;
  debrief: Debrief;
  embedded?: boolean;
  isContinuing: boolean;
  isRewinding: boolean;
  onContinue: (() => void) | null;
  onRewind: ((moment: DebriefMoment) => void) | null;
  rewindError: string | null;
};

const TEXT = "rgba(255, 255, 255, 0.96)";
const TEXT_SECONDARY = "rgba(255, 255, 255, 0.68)";
const HAIRLINE = "rgba(255, 255, 255, 0.16)";
const SURFACE = "rgba(0, 0, 0, 0.20)";
const SURFACE_SECONDARY = "rgba(255, 255, 255, 0.09)";
const BUTTON_TEXT = "#211018";

const FOUNDATION_LABELS: Record<FoundationKey, string> = {
  purpose: "Purpose",
  specificity: "Specificity",
  evidence: "Evidence",
  perspective: "Perspective",
  boundary: "Boundary",
  path: "Next step",
};

const FOUNDATION_STATUS_LABELS: Record<FoundationStatus, string> = {
  clear: "Clear",
  partial: "Partial",
  missing: "Missing",
};

const FOUNDATION_SEGMENT_COUNTS: Record<FoundationStatus, number> = {
  clear: 3,
  partial: 2,
  missing: 1,
};

const FOUNDATION_SEGMENTS = [0, 1, 2] as const;

const CONTENT_ENTERING = FadeInUp.duration(620)
  .delay(120)
  .reduceMotion(ReduceMotion.System);
const DISCLOSURE_ENTERING = FadeIn.duration(180).reduceMotion(
  ReduceMotion.System,
);
const DISCLOSURE_EXITING = FadeOut.duration(120).reduceMotion(
  ReduceMotion.System,
);
const LAYOUT_TRANSITION = LinearTransition.duration(180).reduceMotion(
  ReduceMotion.System,
);

export function DebriefScreen({
  accentColor,
  counterpartLineByTurnId,
  counterpartName,
  continueError,
  debrief,
  embedded = false,
  isContinuing,
  isRewinding,
  onContinue,
  onRewind,
  rewindError,
}: DebriefScreenProps) {
  const { fontScale, width } = useWindowDimensions();
  const rewindMoment =
    debrief.moments.find((moment) => moment.rewindable) ?? debrief.moments[0];
  const supportingMoments = debrief.moments.filter(
    (moment) => moment !== rewindMoment,
  );
  const helpfulMoments = supportingMoments.filter(
    (moment) => moment.impact === "helped",
  );
  const watchMoments = supportingMoments.filter(
    (moment) => moment.impact !== "helped",
  );
  const [selectedApproachStyle, setSelectedApproachStyle] =
    useState<CoachingApproachStyle | null>(null);
  const [expandedSupportingTurnId, setExpandedSupportingTurnId] = useState<
    string | null
  >(null);
  const [foundationsExpanded, setFoundationsExpanded] = useState(false);
  const selectedApproach = rewindMoment?.approaches.find(
    (approach) => approach.style === selectedApproachStyle,
  );
  const clearFoundationCount = debrief.foundations.filter(
    (foundation) => foundation.status === "clear",
  ).length;
  const revisitFoundationCount =
    debrief.foundations.length - clearFoundationCount;
  const counterpartFirstName = counterpartName.split(" ")[0] || counterpartName;
  const foundationsUseSingleColumn = width < 340 || fontScale >= 1.3;
  const actionIsPending = isContinuing || isRewinding;

  return (
    <View style={[styles.scene, embedded && styles.embeddedScene]}>
      {embedded ? null : <DebriefAtmosphere accentColor={accentColor} />}
      <LinearGradient
        accessible={false}
        colors={[
          "rgba(11, 7, 10, 0.16)",
          "rgba(11, 7, 10, 0.32)",
          "rgba(11, 7, 10, 0.48)",
        ]}
        locations={[0, 0.46, 1]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.scrollContent}
        indicatorStyle="white"
        style={styles.scroll}
      >
        <Animated.View
          entering={embedded ? undefined : CONTENT_ENTERING}
          style={styles.content}
        >
          <View style={styles.hero}>
            <ThemedText selectable style={[styles.outcome, styles.whiteText]}>
              {debrief.outcome}
            </ThemedText>
          </View>

          {rewindMoment ? (
            <Animated.View layout={LAYOUT_TRANSITION} style={styles.section}>
              <ThemedText
                selectable
                style={[styles.featuredLabel, { color: accentColor }]}
              >
                MOMENT TO RETRY
              </ThemedText>

              <Animated.View
                layout={LAYOUT_TRANSITION}
                style={styles.featuredMoment}
              >
                <ConversationExchange
                  accentColor={accentColor}
                  counterpartFirstName={counterpartFirstName}
                  counterpartLine={counterpartLineByTurnId[rewindMoment.turnId]}
                  managerQuote={rewindMoment.quote}
                />

                <View style={styles.coachingCopy}>
                  <ThemedText
                    selectable
                    style={[styles.observation, styles.whiteText]}
                  >
                    {rewindMoment.observation}
                  </ThemedText>
                  <ThemedText selectable style={styles.consequence}>
                    {rewindMoment.consequence}
                  </ThemedText>
                </View>

                {rewindMoment.approaches.length > 0 ? (
                  <Animated.View
                    layout={LAYOUT_TRANSITION}
                    style={styles.approaches}
                  >
                    <ThemedText selectable style={styles.subsectionLabel}>
                      APPROACH TO TRY
                    </ThemedText>
                    <View style={styles.approachChoices}>
                      {rewindMoment.approaches.map((approach) => {
                        const isSelected =
                          approach.style === selectedApproachStyle;

                        return (
                          <PressableScale
                            accessibilityHint="Reveals this coaching principle"
                            accessibilityRole="button"
                            accessibilityState={{ selected: isSelected }}
                            key={approach.style}
                            onPress={() =>
                              setSelectedApproachStyle(
                                isSelected ? null : approach.style,
                              )
                            }
                            style={[
                              styles.approachChoice,
                              isSelected && {
                                backgroundColor: accentColor,
                              },
                            ]}
                          >
                            <ThemedText
                              style={[
                                styles.approachChoiceText,
                                isSelected && styles.approachChoiceTextSelected,
                              ]}
                            >
                              {capitalize(approach.style)}
                            </ThemedText>
                          </PressableScale>
                        );
                      })}
                    </View>

                    {selectedApproach ? (
                      <Animated.View
                        entering={DISCLOSURE_ENTERING}
                        exiting={DISCLOSURE_EXITING}
                        key={selectedApproach.style}
                        layout={LAYOUT_TRANSITION}
                      >
                        <ThemedText selectable style={styles.approachPrinciple}>
                          {selectedApproach.principle}
                        </ThemedText>
                      </Animated.View>
                    ) : null}
                  </Animated.View>
                ) : null}

                {onRewind || onContinue ? (
                  <View style={styles.rewindGroup}>
                    {onRewind ? (
                      <PressableScale
                        accessibilityHint="Restores the conversation immediately before this response"
                        accessibilityLabel="Rewind this moment"
                        accessibilityRole="button"
                        accessibilityState={{
                          busy: isRewinding,
                          disabled: actionIsPending,
                        }}
                        disabled={actionIsPending}
                        onPress={() => onRewind(rewindMoment)}
                        style={[
                          styles.rewindButton,
                          actionIsPending && styles.actionDisabled,
                        ]}
                      >
                        <ThemedText style={styles.rewindButtonText}>
                          {isRewinding ? "Restoring moment…" : "Rewind this moment"}
                        </ThemedText>
                        <SymbolView
                          name={{
                            ios: "arrow.counterclockwise",
                            android: "replay",
                            web: "replay",
                          }}
                          size={Sizing.icon.medium}
                          tintColor={BUTTON_TEXT}
                        />
                      </PressableScale>
                    ) : null}

                    {rewindError ? (
                      <ThemedText
                        accessibilityLiveRegion="polite"
                        selectable
                        style={styles.errorText}
                      >
                        {rewindError}
                      </ThemedText>
                    ) : null}

                    {onContinue ? (
                      <PressableScale
                        accessibilityHint="Skips rewind and opens your concise preparation plan"
                        accessibilityRole="button"
                        accessibilityState={{
                          busy: isContinuing,
                          disabled: actionIsPending,
                        }}
                        disabled={actionIsPending}
                        onPress={onContinue}
                        style={[
                          styles.continueButton,
                          actionIsPending && styles.actionDisabled,
                        ]}
                      >
                        <ThemedText style={styles.continueButtonText}>
                          {isContinuing
                            ? "Preparing your plan…"
                            : "Continue to my plan"}
                        </ThemedText>
                        <SymbolView
                          name={{
                            ios: "arrow.right",
                            android: "arrow_forward",
                            web: "arrow_forward",
                          }}
                          size={Sizing.icon.small}
                          tintColor={TEXT}
                        />
                      </PressableScale>
                    ) : null}

                    {continueError ? (
                      <ThemedText
                        accessibilityLiveRegion="polite"
                        selectable
                        style={styles.errorText}
                      >
                        {continueError}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}
              </Animated.View>
            </Animated.View>
          ) : null}

          <SupportingMomentGroup
            accentColor={accentColor}
            counterpartFirstName={counterpartFirstName}
            counterpartLineByTurnId={counterpartLineByTurnId}
            expandedMomentId={expandedSupportingTurnId}
            moments={helpfulMoments}
            onToggle={setExpandedSupportingTurnId}
            title="WHAT WORKED"
          />

          <SupportingMomentGroup
            accentColor={accentColor}
            counterpartFirstName={counterpartFirstName}
            counterpartLineByTurnId={counterpartLineByTurnId}
            expandedMomentId={expandedSupportingTurnId}
            moments={watchMoments}
            onToggle={setExpandedSupportingTurnId}
            title="WATCH NEXT"
          />

          {debrief.foundations.length > 0 ? (
            <Animated.View layout={LAYOUT_TRANSITION} style={styles.section}>
              <PressableScale
                accessibilityHint="Shows or hides all conversation foundations"
                accessibilityRole="button"
                accessibilityState={{ expanded: foundationsExpanded }}
                onPress={() => setFoundationsExpanded((expanded) => !expanded)}
                style={styles.disclosureHeader}
              >
                <View style={styles.disclosureHeaderCopy}>
                  <ThemedText
                    selectable
                    style={[styles.sectionTitle, styles.whiteText]}
                  >
                    Conversation foundations
                  </ThemedText>
                  <ThemedText selectable style={styles.disclosureSummary}>
                    {clearFoundationCount} clear
                    {revisitFoundationCount > 0
                      ? ` · ${revisitFoundationCount} to revisit`
                      : ""}
                  </ThemedText>
                </View>
                <SymbolView
                  name={{
                    ios: foundationsExpanded ? "chevron.up" : "chevron.down",
                    android: foundationsExpanded
                      ? "keyboard_arrow_up"
                      : "keyboard_arrow_down",
                    web: foundationsExpanded
                      ? "keyboard_arrow_up"
                      : "keyboard_arrow_down",
                  }}
                  size={Sizing.icon.small}
                  tintColor={TEXT}
                />
              </PressableScale>

              {foundationsExpanded ? (
                <Animated.View
                  entering={DISCLOSURE_ENTERING}
                  exiting={DISCLOSURE_EXITING}
                  layout={LAYOUT_TRANSITION}
                  style={styles.foundationGrid}
                >
                  {debrief.foundations.map((foundation) => {
                    const label = FOUNDATION_LABELS[foundation.key];
                    const statusLabel =
                      FOUNDATION_STATUS_LABELS[foundation.status];
                    const activeSegmentCount =
                      FOUNDATION_SEGMENT_COUNTS[foundation.status];

                    return (
                      <View
                        accessibilityLabel={`${label}, ${statusLabel}`}
                        accessibilityRole="text"
                        accessible
                        key={foundation.key}
                        style={[
                          styles.foundationTile,
                          foundationsUseSingleColumn &&
                            styles.foundationTileSingleColumn,
                        ]}
                      >
                        <View style={styles.foundationTileHeader}>
                          <ThemedText
                            accessible={false}
                            selectable
                            style={[styles.foundationLabel, styles.whiteText]}
                          >
                            {label}
                          </ThemedText>
                          <ThemedText
                            accessible={false}
                            selectable
                            style={[
                              styles.foundationStatus,
                              foundation.status === "clear"
                                ? styles.whiteText
                                : styles.secondaryText,
                            ]}
                          >
                            {statusLabel}
                          </ThemedText>
                        </View>

                        <View
                          accessible={false}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                          style={styles.foundationSegments}
                        >
                          {FOUNDATION_SEGMENTS.map((segmentIndex) => (
                            <View
                              key={segmentIndex}
                              style={[
                                styles.foundationSegment,
                                {
                                  backgroundColor:
                                    segmentIndex < activeSegmentCount
                                      ? accentColor
                                      : HAIRLINE,
                                },
                              ]}
                            />
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </Animated.View>
              ) : null}
            </Animated.View>
          ) : null}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function ConversationExchange({
  accentColor,
  counterpartFirstName,
  counterpartLine,
  managerQuote,
}: {
  accentColor: string;
  counterpartFirstName: string;
  counterpartLine: string | undefined;
  managerQuote: string;
}) {
  return (
    <View style={styles.exchange}>
      {counterpartLine ? (
        <View style={styles.counterpartMessage}>
          <ThemedText selectable style={styles.speakerLabel}>
            {counterpartFirstName}
          </ThemedText>
          <View style={styles.counterpartBubble}>
            <ThemedText
              selectable
              style={[styles.bubbleText, styles.whiteText]}
            >
              {counterpartLine}
            </ThemedText>
          </View>
        </View>
      ) : null}

      <View style={styles.managerMessage}>
        <ThemedText
          selectable
          style={[styles.speakerLabel, styles.managerLabel]}
        >
          You
        </ThemedText>
        <View style={[styles.managerBubble, { backgroundColor: accentColor }]}>
          <ThemedText selectable style={styles.managerBubbleText}>
            {managerQuote}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function SupportingMomentGroup({
  accentColor,
  counterpartFirstName,
  counterpartLineByTurnId,
  expandedMomentId,
  moments,
  onToggle,
  title,
}: {
  accentColor: string;
  counterpartFirstName: string;
  counterpartLineByTurnId: CounterpartLineByTurnId;
  expandedMomentId: string | null;
  moments: readonly DebriefMoment[];
  onToggle: (momentId: string | null) => void;
  title: string;
}) {
  if (moments.length === 0) {
    return null;
  }

  return (
    <Animated.View layout={LAYOUT_TRANSITION} style={styles.section}>
      <ThemedText
        selectable
        style={[styles.featuredLabel, { color: accentColor }]}
      >
        {title}
      </ThemedText>
      <View style={styles.supportingList}>
        {moments.map((moment, index) => {
          const momentKey = `${moment.turnId}:${index}`;
          const isExpanded = momentKey === expandedMomentId;

          return (
            <Animated.View
              key={momentKey}
              layout={LAYOUT_TRANSITION}
              style={[
                styles.supportingMoment,
                index > 0 && styles.supportingMomentBorder,
              ]}
            >
              <PressableScale
                accessibilityHint="Shows or hides the transcript evidence"
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                onPress={() => onToggle(isExpanded ? null : momentKey)}
                style={styles.supportingMomentHeader}
              >
                <ThemedText
                  numberOfLines={isExpanded ? undefined : 2}
                  selectable
                  style={[styles.supportingObservation, styles.whiteText]}
                >
                  {moment.observation}
                </ThemedText>
                <SymbolView
                  name={{
                    ios: isExpanded ? "chevron.up" : "chevron.down",
                    android: isExpanded
                      ? "keyboard_arrow_up"
                      : "keyboard_arrow_down",
                    web: isExpanded
                      ? "keyboard_arrow_up"
                      : "keyboard_arrow_down",
                  }}
                  size={Sizing.icon.small}
                  tintColor={TEXT}
                />
              </PressableScale>

              {isExpanded ? (
                <Animated.View
                  entering={DISCLOSURE_ENTERING}
                  exiting={DISCLOSURE_EXITING}
                  layout={LAYOUT_TRANSITION}
                  style={styles.supportingDetail}
                >
                  <ConversationExchange
                    accentColor={accentColor}
                    counterpartFirstName={counterpartFirstName}
                    counterpartLine={counterpartLineByTurnId[moment.turnId]}
                    managerQuote={moment.quote}
                  />
                  <ThemedText selectable style={styles.consequence}>
                    {moment.consequence}
                  </ThemedText>
                </Animated.View>
              ) : null}
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: "#181116",
    flex: 1,
  },
  embeddedScene: {
    backgroundColor: "transparent",
  },
  scroll: {
    backgroundColor: "transparent",
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  content: {
    gap: Spacing.five,
    maxWidth: Sizing.content.compact,
    width: "100%",
  },
  hero: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  whiteText: {
    color: TEXT,
  },
  secondaryText: {
    color: TEXT_SECONDARY,
  },
  eyebrow: {
    fontSize: FontSize.label,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  outcome: {
    fontSize: FontSize.headingLarge,
    fontWeight: "600",
    textAlign: "center",
  },
  section: {
    gap: Spacing.two,
  },
  featuredLabel: {
    fontSize: FontSize.label,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  featuredMoment: {
    backgroundColor: SURFACE,
    borderCurve: "continuous",
    borderRadius: Sizing.radius.card,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  exchange: {
    gap: Spacing.two,
  },
  counterpartMessage: {
    alignItems: "flex-start",
    maxWidth: "88%",
  },
  managerMessage: {
    alignItems: "flex-end",
    alignSelf: "flex-end",
    maxWidth: "88%",
  },
  speakerLabel: {
    color: TEXT_SECONDARY,
    fontSize: FontSize.labelSmall,
    fontWeight: "700",
    paddingBottom: Spacing.one,
    paddingHorizontal: Spacing.two,
    textTransform: "uppercase",
  },
  managerLabel: {
    textAlign: "right",
  },
  counterpartBubble: {
    backgroundColor: SURFACE_SECONDARY,
    borderCurve: "continuous",
    borderRadius: Sizing.radius.medium,
    borderBottomLeftRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  managerBubble: {
    borderCurve: "continuous",
    borderRadius: Sizing.radius.medium,
    borderBottomRightRadius: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  bubbleText: {
    fontSize: FontSize.body,
    fontWeight: "500",
  },
  managerBubbleText: {
    color: BUTTON_TEXT,
    fontSize: FontSize.body,
    fontWeight: "600",
  },
  coachingCopy: {
    gap: Spacing.one,
  },
  observation: {
    fontSize: FontSize.headingSmall,
    fontWeight: "700",
  },
  consequence: {
    color: TEXT_SECONDARY,
    fontSize: FontSize.small,
  },
  approaches: {
    gap: Spacing.two,
  },
  subsectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: FontSize.labelSmall,
    fontWeight: "700",
    letterSpacing: 1,
  },
  approachChoices: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  approachChoice: {
    alignItems: "center",
    backgroundColor: SURFACE_SECONDARY,
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    justifyContent: "center",
    minHeight: Sizing.control.compact,
    paddingHorizontal: Spacing.three,
  },
  approachChoiceText: {
    color: TEXT,
    fontSize: FontSize.small,
    fontWeight: "700",
  },
  approachChoiceTextSelected: {
    color: BUTTON_TEXT,
  },
  approachPrinciple: {
    color: TEXT_SECONDARY,
    fontSize: FontSize.small,
  },
  rewindGroup: {
    gap: Spacing.two,
  },
  rewindButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    width: "100%",
  },
  actionDisabled: {
    opacity: 0.62,
  },
  rewindButtonText: {
    color: BUTTON_TEXT,
    fontSize: FontSize.body,
    fontWeight: "700",
  },
  continueButton: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  continueButtonText: {
    color: TEXT,
    fontSize: FontSize.small,
    fontWeight: "700",
  },
  errorText: {
    color: TEXT,
    fontSize: FontSize.small,
    textAlign: "center",
  },
  supportingList: {
    borderBottomColor: HAIRLINE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: HAIRLINE,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  supportingMoment: {
    paddingVertical: Spacing.one,
  },
  supportingMomentBorder: {
    borderTopColor: HAIRLINE,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  supportingMomentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  supportingObservation: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: "600",
  },
  supportingDetail: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
  disclosureHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  disclosureHeaderCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  sectionTitle: {
    fontSize: FontSize.headingSmall,
    fontWeight: "600",
  },
  disclosureSummary: {
    color: TEXT_SECONDARY,
    fontSize: FontSize.small,
  },
  foundationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.three,
    paddingTop: Spacing.one,
  },
  foundationTile: {
    flexBasis: "45%",
    flexGrow: 1,
    gap: Spacing.two,
    minWidth: 0,
    paddingVertical: Spacing.one,
  },
  foundationTileSingleColumn: {
    flexBasis: "100%",
  },
  foundationTileHeader: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "space-between",
  },
  foundationLabel: {
    fontSize: FontSize.body,
    fontWeight: "600",
    flexShrink: 1,
  },
  foundationStatus: {
    fontSize: FontSize.small,
    fontWeight: "700",
  },
  foundationSegments: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  foundationSegment: {
    borderRadius: Sizing.radius.pill,
    flex: 1,
    height: Spacing.one,
  },
});
