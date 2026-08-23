import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableScale } from "pressto";
import { forwardRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { FontSize, MaxContentWidth, Sizing, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import type { SessionDetailData } from "@/services/query/session-detail";

type SessionDetailScreenProps = {
  readonly appleZoomPrimaryAction?: boolean;
  readonly categoryColor: string;
  readonly data: SessionDetailData;
  readonly onOpenPlan: (() => void) | null;
  readonly onPress?: Parameters<typeof PressableScale>[0]["onPress"];
  readonly onPrimaryAction: (() => void) | null;
  readonly onReviewDebrief: (() => void) | null;
};

export const SessionDetailScreen = forwardRef<View, SessionDetailScreenProps>(
  function SessionDetailScreen(
    {
      appleZoomPrimaryAction = false,
      categoryColor,
      data,
      onOpenPlan,
      onPress,
      onPrimaryAction,
      onReviewDebrief,
    },
    ref,
  ) {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
    const theme = useTheme();
    const { scenario, session } = data;
    const primaryAction = data.action;
    const outcome = data.debrief?.debrief.outcome ?? null;
    const ask = data.debrief?.debrief.preparationCard.requestOrBoundary ?? null;
    const hasFloatingAction =
      primaryAction !== null &&
      (appleZoomPrimaryAction || onPrimaryAction !== null);
    const completedDate = new Date(session.completedAt ?? session.updatedAt);
    const counterpartName = scenario.relationship.counterpartName;
    const avatarStyle = StyleSheet.flatten([
      styles.avatar,
      { backgroundColor: categoryColor },
    ]);

    return (
      <View
        ref={ref}
        style={[styles.screen, { backgroundColor: theme.background }]}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                Math.max(insets.bottom, Spacing.three) +
                (hasFloatingAction
                  ? Sizing.control.large + Spacing.six
                  : Spacing.four),
            },
          ]}
        >
          <View style={styles.content}>
            <View style={styles.hero}>
              {appleZoomPrimaryAction ? (
                <Link.AppleZoom>
                  <View
                    accessibilityLabel={`${counterpartName} avatar`}
                    accessibilityRole="image"
                    collapsable={false}
                    style={avatarStyle}
                  >
                    <ThemedText
                      style={styles.avatarText}
                      themeColor="onPrimary"
                    >
                      {getInitials(counterpartName)}
                    </ThemedText>
                  </View>
                </Link.AppleZoom>
              ) : (
                <View
                  accessibilityLabel={`${counterpartName} avatar`}
                  accessibilityRole="image"
                  collapsable={false}
                  style={avatarStyle}
                >
                  <ThemedText style={styles.avatarText} themeColor="onPrimary">
                    {getInitials(counterpartName)}
                  </ThemedText>
                </View>
              )}

              <View style={styles.heroCopy}>
                <ThemedText selectable style={styles.counterpartName}>
                  {counterpartName}
                </ThemedText>
                <ThemedText
                  selectable
                  style={[styles.relationship, { color: categoryColor }]}
                >
                  {scenario.presentation.relationshipLabel}
                </ThemedText>
                <ThemedText
                  selectable
                  style={styles.scenarioTitle}
                  themeColor="textSecondary"
                >
                  {scenario.presentation.fullTitle}
                </ThemedText>
              </View>

              <View style={styles.metaRow}>
                <ThemedText
                  selectable
                  style={styles.metaText}
                  themeColor="textSecondary"
                >
                  {formatSessionDate(completedDate)}
                </ThemedText>
                <View
                  style={[
                    styles.metaDot,
                    { backgroundColor: theme.textSecondary },
                  ]}
                />
                <ThemedText
                  selectable
                  style={styles.metaText}
                  themeColor="textSecondary"
                >
                  {formatStatus(session.status)}
                </ThemedText>
              </View>
            </View>

            {data.beforeRating ? (
              <Section title="READINESS" titleColor={categoryColor}>
                <ReadinessComparison
                  after={data.afterRating}
                  before={data.beforeRating}
                  categoryColor={categoryColor}
                  inactiveColor={theme.border}
                  neutralColor={theme.textSecondary}
                />
              </Section>
            ) : null}

            {outcome ? (
              <Section title="OUTCOME" titleColor={categoryColor}>
                <ThemedText selectable style={styles.outcome}>
                  {outcome}
                </ThemedText>
              </Section>
            ) : null}

            {ask ? (
              <Section title="BEFORE YOU GO IN" titleColor={categoryColor}>
                <PressableScale
                  accessibilityHint={
                    onOpenPlan ? "Opens your full preparation plan" : undefined
                  }
                  accessibilityRole={onOpenPlan ? "button" : "text"}
                  disabled={!onOpenPlan}
                  onPress={onOpenPlan ?? undefined}
                  style={styles.planPreview}
                >
                  <View
                    accessible={false}
                    style={[
                      styles.planRail,
                      { backgroundColor: categoryColor },
                    ]}
                  />
                  <View style={styles.planCopy}>
                    <ThemedText selectable style={styles.ask}>
                      {ask}
                    </ThemedText>
                    {onOpenPlan ? (
                      <View accessible={false} style={styles.planLink}>
                        <ThemedText
                          accessible={false}
                          style={[styles.planLinkText, { color: theme.primary }]}
                        >
                          View full plan
                        </ThemedText>
                        <SymbolView
                          accessible={false}
                          name={{
                            ios: "arrow.right",
                            android: "arrow_forward",
                            web: "arrow_forward",
                          }}
                          size={Sizing.icon.small}
                          tintColor={theme.primary}
                        />
                      </View>
                    ) : null}
                  </View>
                </PressableScale>
              </Section>
            ) : null}

            <Section title="PRACTICE ATTEMPTS" titleColor={categoryColor}>
              <AttemptsSurface
                accessibilityLabel={formatAttemptAccessibilityLabel(
                  data.attempts,
                )}
                colorScheme={colorScheme}
                fallbackColor={theme.backgroundElement}
              >
                <Attempt
                  icon={{
                    ios: "play.fill",
                    android: "play_arrow",
                    web: "play_arrow",
                  }}
                  iconColor={categoryColor}
                  label="Original"
                  value={data.attempts.original}
                />
                <Attempt
                  icon={{
                    ios: "arrow.counterclockwise",
                    android: "replay",
                    web: "replay",
                  }}
                  iconColor={categoryColor}
                  label="Rewind"
                  value={data.attempts.rewinds}
                />
                <Attempt
                  icon={{
                    ios: "gauge.with.dots.needle.67percent",
                    android: "speed",
                    web: "speed",
                  }}
                  iconColor={categoryColor}
                  label="Pressure test"
                  value={data.attempts.pressureTests}
                />
              </AttemptsSurface>
            </Section>

            {onReviewDebrief ? (
              <PressableScale
                accessibilityHint="Opens the detailed feedback from this rehearsal"
                accessibilityRole="button"
                onPress={onReviewDebrief}
                style={[
                  styles.secondaryButton,
                  { backgroundColor: theme.backgroundElement },
                ]}
              >
                <ThemedText style={styles.secondaryButtonText}>
                  Review debrief
                </ThemedText>
                <SymbolView
                  name={{
                    ios: "text.magnifyingglass",
                    android: "rate_review",
                    web: "rate_review",
                  }}
                  size={Sizing.icon.medium}
                  tintColor={theme.text}
                />
              </PressableScale>
            ) : null}

            {!primaryAction ? (
              <ThemedText
                selectable
                style={styles.unavailable}
                themeColor="textSecondary"
              >
                This pressure test can’t be resumed in this build. Your saved
                session is still here.
              </ThemedText>
            ) : null}
          </View>
        </ScrollView>

        {hasFloatingAction ? (
          <View
            pointerEvents="box-none"
            style={[
              styles.floatingAction,
              { paddingBottom: Math.max(insets.bottom, Spacing.three) },
            ]}
          >
            <LinearGradient
              colors={[
                `${theme.background}00`,
                theme.background,
                theme.background,
              ]}
              locations={[0, 0.28, 1]}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <PressableScale
              accessibilityLabel={primaryAction.label}
              accessibilityRole="button"
              onPress={
                appleZoomPrimaryAction
                  ? onPress
                  : (onPrimaryAction ?? undefined)
              }
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            >
              <ThemedText
                style={styles.primaryButtonText}
                themeColor="onPrimary"
              >
                {primaryAction.label}
              </ThemedText>
              <SymbolView
                name={{
                  ios: "arrow.right",
                  android: "arrow_forward",
                  web: "arrow_forward",
                }}
                size={Sizing.icon.medium}
                tintColor={theme.onPrimary}
              />
            </PressableScale>
          </View>
        ) : null}
      </View>
    );
  },
);

function Section({
  children,
  title,
  titleColor,
}: {
  readonly children: React.ReactNode;
  readonly title: string;
  readonly titleColor: string;
}) {
  return (
    <View style={styles.section}>
      <ThemedText
        selectable
        style={[styles.sectionLabel, { color: titleColor }]}
      >
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function ReadinessComparison({
  after,
  before,
  categoryColor,
  inactiveColor,
  neutralColor,
}: {
  readonly after: number | null;
  readonly before: number;
  readonly categoryColor: string;
  readonly inactiveColor: string;
  readonly neutralColor: string;
}) {
  const change = after === null ? null : after - before;

  return (
    <View style={styles.readiness}>
      <ReadinessSegmentRow
        activeColor={neutralColor}
        inactiveColor={inactiveColor}
        label="Before"
        value={before}
      />
      <ReadinessSegmentRow
        activeColor={categoryColor}
        change={change}
        inactiveColor={inactiveColor}
        label="Now"
        value={after}
      />
    </View>
  );
}

function ReadinessSegmentRow({
  activeColor,
  change = null,
  inactiveColor,
  label,
  value,
}: {
  readonly activeColor: string;
  readonly change?: number | null;
  readonly inactiveColor: string;
  readonly label: string;
  readonly value: number | null;
}) {
  const changeLabel = formatReadinessChange(change);
  const accessibilityLabel =
    value === null
      ? `${label}: not rated yet`
      : `${label}: ${value} out of 5${
          changeLabel ? `, ${formatReadinessChangeForSpeech(change)}` : ""
        }`;

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
      accessible
      style={styles.readinessRow}
    >
      <ThemedText
        accessible={false}
        selectable
        style={styles.readinessLabel}
        themeColor="textSecondary"
      >
        {label}
      </ThemedText>
      <View accessible={false} style={styles.readinessSegments}>
        {Array.from({ length: 5 }, (_, index) => (
          <View
            key={`${label}-${index}`}
            style={[
              styles.readinessSegment,
              {
                backgroundColor:
                  value !== null && index < value ? activeColor : inactiveColor,
              },
            ]}
          />
        ))}
      </View>
      <View accessible={false} style={styles.readinessScore}>
        <ThemedText accessible={false} selectable style={styles.readinessValue}>
          {value ?? "—"}
        </ThemedText>
        <ThemedText
          accessible={false}
          style={[
            styles.readinessChange,
            { color: activeColor, opacity: changeLabel ? 1 : 0 },
          ]}
        >
          {changeLabel ?? "+0"}
        </ThemedText>
      </View>
    </View>
  );
}

function formatReadinessChange(change: number | null) {
  if (change === null || change === 0) {
    return null;
  }

  return change > 0 ? `+${change}` : `${change}`;
}

function formatReadinessChangeForSpeech(change: number | null) {
  if (change === null || change === 0) {
    return "";
  }

  return change > 0
    ? `up ${change} ${change === 1 ? "point" : "points"} from before`
    : `down ${Math.abs(change)} ${Math.abs(change) === 1 ? "point" : "points"} from before`;
}

function Attempt({
  icon,
  iconColor,
  label,
  value,
}: {
  readonly icon: Parameters<typeof SymbolView>[0]["name"];
  readonly iconColor: string;
  readonly label: string;
  readonly value: number;
}) {
  return (
    <View accessible={false} style={styles.attempt}>
      <SymbolView
        accessible={false}
        name={icon}
        size={Sizing.icon.small}
        tintColor={iconColor}
        weight="semibold"
      />
      <ThemedText selectable style={styles.attemptValue}>
        {value}
      </ThemedText>
      <ThemedText style={styles.attemptLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function AttemptsSurface({
  accessibilityLabel,
  children,
  colorScheme,
  fallbackColor,
}: {
  readonly accessibilityLabel: string;
  readonly children: React.ReactNode;
  readonly colorScheme: "dark" | "light";
  readonly fallbackColor: string;
}) {
  const commonProps = {
    accessibilityLabel,
    accessibilityRole: "text" as const,
    accessible: true,
  };

  if (process.env.EXPO_OS === "ios" && isGlassEffectAPIAvailable()) {
    return (
      <GlassView
        glassEffectStyle={"regular"}
        isInteractive
        {...commonProps}
        style={styles.attempts}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      {...commonProps}
      style={[styles.attempts, { backgroundColor: fallbackColor }]}
    >
      {children}
    </View>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatSessionDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year:
      date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  }).format(date);
}

function formatStatus(status: SessionDetailData["session"]["status"]) {
  switch (status) {
    case "draft":
      return "Not started";
    case "confirmed":
    case "readiness-recorded":
      return "Ready to practice";
    case "rehearsing":
      return "In progress";
    case "debriefing":
      return "Preparing debrief";
    case "debrief-ready":
      return "Debrief ready";
    case "rewinding":
      return "Rewind in progress";
    case "pressure-testing":
      return "Pressure test in progress";
    case "plan-ready":
      return "Plan ready";
    case "complete":
      return "Complete";
  }
}

function formatAttemptAccessibilityLabel(
  attempts: SessionDetailData["attempts"],
) {
  return `${attempts.original} original, ${attempts.rewinds} rewinds, ${attempts.pressureTests} pressure tests`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
  content: {
    width: "100%",
    maxWidth: MaxContentWidth,
    gap: Spacing.five,
  },
  hero: {
    alignItems: "center",
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  avatar: {
    width: Sizing.avatar.large,
    height: Sizing.avatar.large,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Sizing.radius.pill,
  },
  avatarText: {
    fontSize: FontSize.title,
    fontWeight: "700",
  },
  heroCopy: {
    alignItems: "center",
    gap: Spacing.one,
  },
  counterpartName: {
    fontSize: FontSize.title,
    fontWeight: "700",
    textAlign: "center",
  },
  relationship: {
    fontSize: FontSize.small,
    fontWeight: "700",
    textAlign: "center",
  },
  scenarioTitle: {
    fontSize: FontSize.body,
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  metaText: {
    fontSize: FontSize.caption,
    fontWeight: "600",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: Sizing.radius.pill,
  },
  section: {
    gap: Spacing.three,
  },
  sectionLabel: {
    fontSize: FontSize.label,
    fontWeight: "800",
  },
  readiness: {
    gap: Spacing.two,
  },
  readinessRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
  },
  readinessLabel: {
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
    height: 10,
  },
  readinessScore: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: Spacing.one,
    justifyContent: "flex-end",
    minWidth: 54,
  },
  readinessValue: {
    fontSize: FontSize.body,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    minWidth: 10,
    textAlign: "right",
  },
  readinessChange: {
    fontSize: FontSize.labelSmall,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    minWidth: 20,
  },
  outcome: {
    fontSize: FontSize.body,
    fontWeight: "500",
  },
  planPreview: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  planRail: {
    width: 3,
    borderRadius: Sizing.radius.pill,
  },
  planCopy: {
    flex: 1,
    gap: Spacing.two,
  },
  ask: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "600",
  },
  planLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: Spacing.one,
  },
  planLinkText: {
    fontSize: FontSize.small,
    fontWeight: "700",
  },
  attempts: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.three,
    overflow: "hidden",
    padding: Spacing.three,
    borderRadius: Sizing.radius.medium,
    borderCurve: "continuous",
  },
  attempt: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.one,
  },
  attemptValue: {
    fontSize: FontSize.titleSmall,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  attemptLabel: {
    fontSize: FontSize.caption,
    fontWeight: "600",
    textAlign: "center",
  },
  secondaryButton: {
    minHeight: Sizing.control.large,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    borderRadius: Sizing.radius.pill,
  },
  secondaryButtonText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "700",
  },
  unavailable: {
    fontSize: FontSize.small,
    textAlign: "center",
  },
  floatingAction: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
  },
  primaryButton: {
    width: "100%",
    maxWidth: MaxContentWidth,
    minHeight: Sizing.control.large,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    borderRadius: Sizing.radius.pill,
    boxShadow: "0 12px 30px rgba(24, 17, 22, 0.18)",
  },
  primaryButtonText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "700",
  },
});
