import { Link, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableOpacity, PressableScale } from "pressto";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AnimatedHeroGradient } from "@/components/animated-hero-gradient";
import { Carousel, type CarouselCard } from "@/components/carousel";
import { SessionListRow } from "@/components/session-list-row";
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
import type { SessionSummary } from "@/services/query/session-detail";

const guidedPracticeCards: readonly CarouselCard[] = scenarios.map(
  (scenario) => ({
    id: scenario.id,
    category: scenario.category,
    eyebrow: scenario.eyebrow,
    href: {
      pathname: "/(app)/(scenarios)/[scenarioId]",
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
          style={({ pressed }) => [styles.primaryCard]}
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

        {sessionLibrary.length > 0 || sessionsUnavailable ? (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <ThemedText selectable style={styles.sectionTitle}>
                Recent sessions
              </ThemedText>
              {sessionLibrary.length > 0 ? (
                <Link asChild href="/session">
                  <PressableOpacity
                    accessibilityHint="Opens every saved practice session"
                    accessibilityLabel="See all sessions"
                    accessibilityRole="link"
                    hitSlop={8}
                    style={styles.seeAllButton}
                  >
                    <SymbolView
                      accessible={false}
                      name={{
                        ios: "chevron.forward",
                        android: "chevron_right",
                        web: "chevron_right",
                      }}
                      size={Sizing.icon.medium - 4}
                      weight={"semibold"}
                      tintColor={theme.textSecondary}
                    />
                  </PressableOpacity>
                </Link>
              ) : null}
            </View>
            {recentSessions.length > 0 ? (
              <View>
                {recentSessions.map((summary, index) => (
                  <SessionListRow
                    color={
                      PracticeCategoryColors[colorScheme][
                        summary.scenario.category
                      ]
                    }
                    key={summary.session.id}
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
        pathname: "/(app)/(scenarios)/[scenarioId]",
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
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  seeAllButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.one,
    minHeight: Sizing.control.compact,
    paddingLeft: Spacing.three,
  },
  seeAllText: {
    fontSize: FontSize.small,
    fontWeight: "700",
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
