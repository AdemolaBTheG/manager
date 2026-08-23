import { Link, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableOpacity, PressableScale } from "pressto";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AnimatedHeroGradient } from "@/components/animated-hero-gradient";
import { Carousel, type CarouselCard } from "@/components/carousel";
import { ThemedText } from "@/components/themed-text";
import {
  FontSize,
  MaxContentWidth,
  PracticeCategoryColors,
  Sizing,
  Spacing,
} from "@/constants/theme";
import { scenarios } from "@/data/scenarios";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import {
  getSessionStatusLabel,
  type SessionSummary,
} from "@/services/query/session-detail";

const guidedPracticeCards: readonly CarouselCard[] = scenarios.map(
  (scenario) => ({
    id: scenario.id,
    category: scenario.category,
    eyebrow: scenario.eyebrow,
    href: {
      pathname: "/scenarios/[scenarioId]",
      params: { scenarioId: scenario.id },
    },
    title: scenario.title,
    relationship: scenario.counterpart.relationship.split("→")[0]?.trim(),
  }),
);

type HomeScreenProps = {
  readonly sessionLibrary: readonly SessionSummary[];
  readonly sessionsUnavailable: boolean;
};

export function HomeScreen({
  sessionLibrary,
  sessionsUnavailable,
}: HomeScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const activeSession = sessionLibrary.find(
    ({ action, session }) =>
      action !== null &&
      session.status !== "complete" &&
      session.status !== "draft",
  );
  const recentSessions = sessionLibrary
    .filter(
      ({ session }) =>
        session.status !== "draft" && session.id !== activeSession?.session.id,
    )
    .slice(0, 3);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.content}>
        <Pressable
          accessibilityLabel="Prepare a real conversation"
          accessibilityHint="Start preparing a real conversation"
          accessibilityRole="button"
          onPress={() => router.push("/situations/new")}
          style={({ pressed }) => [
            styles.primaryCard,
            { backgroundColor: pressed ? theme.primaryPressed : theme.primary },
          ]}
        >
          {({ pressed }) => (
            <>
              <AnimatedHeroGradient pressed={pressed} />

              <View style={styles.primaryCardBody}>
                <ThemedText
                  style={styles.primaryCardTitle}
                  themeColor="onPrimary"
                >
                  Prepare a real{`\n`}conversation
                </ThemedText>
                <ThemedText
                  style={styles.primaryCardDescription}
                  themeColor="onPrimary"
                >
                  Tell us what’s happening. Rehearse it privately when you’re
                  ready.
                </ThemedText>
              </View>

              <View
                style={[
                  styles.primaryAction,
                  { backgroundColor: theme.onPrimary },
                ]}
              >
                <ThemedText
                  style={[styles.primaryActionText, { color: theme.primary }]}
                >
                  Start preparing
                </ThemedText>
                <ThemedText
                  style={[styles.primaryActionArrow, { color: theme.primary }]}
                >
                  →
                </ThemedText>
              </View>
            </>
          )}
        </Pressable>

        {activeSession ? (
          <ContinueSessionRail
            color={
              PracticeCategoryColors[colorScheme][
                activeSession.scenario.category
              ]
            }
            onPress={() => openSessionAction(router, activeSession)}
            summary={activeSession}
          />
        ) : null}

        <View style={styles.scenarioSection}>
          <View style={styles.sectionHeader}>
            <ThemedText selectable style={styles.sectionTitle}>
              Start with a scenario
            </ThemedText>
            <ThemedText
              selectable
              style={styles.sectionDescription}
              themeColor="textSecondary"
            >
              Rehearse a common pressure point, then try another approach.
            </ThemedText>
          </View>

          <Carousel data={guidedPracticeCards} />
        </View>

        {recentSessions.length > 0 || sessionsUnavailable ? (
          <View style={styles.recentSection}>
            <ThemedText selectable style={styles.sectionTitle}>
              Recent sessions
            </ThemedText>
            {recentSessions.length > 0 ? (
              <View>
                {recentSessions.map((summary, index) => (
                  <RecentSessionRow
                    color={
                      PracticeCategoryColors[colorScheme][
                        summary.scenario.category
                      ]
                    }
                    key={summary.session.id}
                    onPress={() =>
                      router.push({
                        pathname: "/session/[sessionId]",
                        params: { sessionId: summary.session.id },
                      })
                    }
                    showSeparator={index > 0}
                    summary={summary}
                  />
                ))}
              </View>
            ) : (
              <ThemedText
                selectable
                style={styles.sessionError}
                themeColor="textSecondary"
              >
                Saved sessions are temporarily unavailable.
              </ThemedText>
            )}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function ContinueSessionRail({
  color,
  onPress,
  summary,
}: {
  readonly color: string;
  readonly onPress: () => void;
  readonly summary: SessionSummary;
}) {
  const theme = useTheme();
  const isRehearsalLink = summary.action?.destination === "rehearsal";
  const rail = (
    <PressableScale
      accessibilityHint="Returns to this saved rehearsal"
      accessibilityLabel={`${summary.action?.label}. ${summary.scenario.presentation.shortTitle}`}
      accessibilityRole="button"
      onPress={isRehearsalLink ? undefined : onPress}
      style={StyleSheet.flatten([
        styles.continueRail,
        { backgroundColor: theme.backgroundElement },
      ])}
    >
      {isRehearsalLink ? (
        <Link.AppleZoom>
          <SessionAvatar
            color={color}
            name={summary.scenario.relationship.counterpartName}
          />
        </Link.AppleZoom>
      ) : (
        <SessionAvatar
          color={color}
          name={summary.scenario.relationship.counterpartName}
        />
      )}
      <View style={styles.continueCopy}>
        <ThemedText
          accessible={false}
          style={[styles.continueEyebrow, { color }]}
        >
          {summary.action?.label.toUpperCase()}
        </ThemedText>
        <ThemedText accessible={false} style={styles.continueTitle}>
          {summary.scenario.presentation.shortTitle}
        </ThemedText>
      </View>
      <SymbolView
        name={{
          ios: "chevron.forward",
          android: "chevron_right",
          web: "chevron_right",
        }}
        size={Sizing.icon.small + 4}
        tintColor={theme.textSecondary}
      />
    </PressableScale>
  );

  if (!isRehearsalLink) {
    return rail;
  }

  return (
    <Link
      asChild
      href={{
        pathname: "/session/[sessionId]/rehearsal",
        params: { sessionId: summary.session.id },
      }}
    >
      {rail}
    </Link>
  );
}

function RecentSessionRow({
  color,
  onPress,
  showSeparator,
  summary,
}: {
  readonly color: string;
  readonly onPress: () => void;
  readonly showSeparator: boolean;
  readonly summary: SessionSummary;
}) {
  const theme = useTheme();

  return (
    <PressableOpacity
      accessibilityHint="Opens this saved session"
      accessibilityLabel={`${summary.scenario.presentation.shortTitle}. ${summary.scenario.relationship.counterpartName}. ${getSessionStatusLabel(summary.session)}. ${formatRecentDate(summary.session.updatedAt)}.`}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.recentRow}
    >
      {showSeparator ? (
        <View
          accessible={false}
          style={[styles.recentSeparator, { backgroundColor: theme.border }]}
        />
      ) : null}
      <SessionAvatar
        color={color}
        name={summary.scenario.relationship.counterpartName}
      />
      <View style={styles.recentCopy}>
        <ThemedText accessible={false} style={styles.recentTitle}>
          {summary.scenario.presentation.shortTitle}
        </ThemedText>
        <ThemedText
          accessible={false}
          style={styles.recentContext}
          themeColor="textSecondary"
        >
          <ThemedText style={styles.recentIdentity} themeColor="textSecondary">
            {summary.scenario.relationship.counterpartName}
          </ThemedText>{" "}
          ·{" "}
          <ThemedText style={styles.recentStatus} themeColor="textSecondary">
            {getSessionStatusLabel(summary.session)}
          </ThemedText>{" "}
          · {formatRecentDate(summary.session.updatedAt)}
        </ThemedText>
      </View>
      <SymbolView
        name={{
          ios: "chevron.right",
          android: "chevron_right",
          web: "chevron_right",
        }}
        size={Sizing.icon.small}
        tintColor={theme.textSecondary}
      />
    </PressableOpacity>
  );
}

function SessionAvatar({
  color,
  name,
}: {
  readonly color: string;
  readonly name: string;
}) {
  return (
    <View
      accessible={false}
      collapsable={false}
      style={[styles.sessionAvatar, { backgroundColor: color }]}
    >
      <ThemedText style={styles.sessionAvatarText} themeColor="onPrimary">
        {getInitials(name)}
      </ThemedText>
    </View>
  );
}

function openSessionAction(
  router: ReturnType<typeof useRouter>,
  summary: SessionSummary,
) {
  const action = summary.action;
  if (!action) {
    return;
  }

  switch (action.destination) {
    case "readiness":
      router.push({
        pathname: "/session/[sessionId]/readiness",
        params: { sessionId: summary.session.id },
      });
      return;
    case "rehearsal":
      router.push({
        pathname: "/session/[sessionId]/rehearsal",
        params: { sessionId: summary.session.id },
      });
      return;
    case "debrief":
      router.push({
        pathname: "/session/[sessionId]/debrief",
        params: { sessionId: summary.session.id },
      });
      return;
    case "plan":
      router.push({
        pathname: "/session/[sessionId]/plan",
        params: { sessionId: summary.session.id },
      });
      return;
    case "scenario":
      router.push({
        pathname: "/scenarios/[scenarioId]",
        params: { scenarioId: summary.session.scenarioId },
      });
      return;
    case "situation":
      router.push("/situations/new");
  }
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRecentDate(timestamp: string) {
  const date = new Date(timestamp);
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDifference = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000,
  );

  if (dayDifference === 0) {
    return "Today";
  }
  if (dayDifference === 1) {
    return "Yesterday";
  }
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(date);
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.three,
  },
  content: {
    width: "100%",
    maxWidth: MaxContentWidth,
    gap: Spacing.five,
  },
  intro: {
    gap: Spacing.two,
  },
  eyebrow: {
    fontSize: FontSize.label,
    fontWeight: "700",
  },
  headline: {
    fontSize: FontSize.hero,
    fontWeight: "600",
  },
  primaryCard: {
    overflow: "hidden",
    justifyContent: "space-between",
    padding: Spacing.two,
    borderRadius: Sizing.radius.feature,
    borderCurve: "continuous",
    boxShadow: "0 18px 50px rgba(66, 28, 49, 0.20)",
  },
  primaryCardBody: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    zIndex: 1,
  },
  primaryCardTitle: {
    fontSize: FontSize.headingSmall,
    fontWeight: "600",
    textAlign: "center",
  },
  primaryCardDescription: {
    fontSize: FontSize.caption,
    fontWeight: "500",
    textAlign: "center",
  },
  primaryAction: {
    minHeight: Sizing.control.regular,
    alignSelf: "stretch",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    borderRadius: Sizing.radius.pill,
    boxShadow: "0 8px 22px rgba(24, 17, 22, 0.16)",
    zIndex: 1,
  },
  primaryActionText: {
    fontSize: FontSize.small,
    fontWeight: "700",
  },
  primaryActionArrow: {
    fontSize: FontSize.heading,
    fontWeight: "600",
  },
  proRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Sizing.radius.medium,
    borderCurve: "continuous",
  },
  proRowCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  proRowTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "700",
  },
  proRowArrow: {
    fontSize: FontSize.headingLarge,
    fontWeight: "600",
  },
  scenarioSection: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  sectionHeader: {
    gap: Spacing.two,
  },
  sectionEyebrow: {
    fontSize: FontSize.labelSmall,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: FontSize.headingSmall,
    fontWeight: "600",
  },
  sectionDescription: {
    fontSize: FontSize.small,
  },
  continueRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Sizing.radius.medium,
    borderCurve: "continuous",
  },
  continueCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  continueEyebrow: {
    fontSize: FontSize.labelSmall,
    fontWeight: "800",
  },
  continueTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "600",
  },
  recentSection: {
    gap: Spacing.two,
  },
  recentRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    position: "relative",
  },
  recentSeparator: {
    position: "absolute",
    top: 0,
    left: Sizing.avatar.small + Spacing.three,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  recentCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.half,
  },
  recentTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "600",
  },
  recentContext: {
    fontSize: FontSize.caption,
  },
  recentIdentity: {
    fontSize: FontSize.caption,
    fontWeight: "500",
  },
  recentStatus: {
    fontSize: FontSize.caption,
    fontWeight: "600",
  },
  sessionAvatar: {
    width: Sizing.avatar.small,
    height: Sizing.avatar.small,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Sizing.radius.pill,
  },
  sessionAvatarText: {
    fontSize: FontSize.small,
    fontWeight: "800",
  },
  sessionError: {
    fontSize: FontSize.small,
    paddingVertical: Spacing.two,
  },
});
