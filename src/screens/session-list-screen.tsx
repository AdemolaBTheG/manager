import { SymbolView } from "expo-symbols";
import { PressableScale } from "pressto";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { SessionListRow } from "@/components/session-list-row";
import { ThemedText } from "@/components/themed-text";
import {
  FontSize,
  MaxContentWidth,
  PracticeCategoryColors,
  Sizing,
  Spacing,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import {
  getSessionStatusLabel,
  type SessionSummary,
} from "@/services/query/session-detail";

type SessionSection = {
  readonly data: readonly SessionSummary[];
  readonly title: string;
};

const SESSION_FILTERS = ["all", "in-progress", "completed"] as const;
type SessionFilter = (typeof SESSION_FILTERS)[number];

const SESSION_FILTER_LABELS: Record<SessionFilter, string> = {
  all: "All",
  "in-progress": "In progress",
  completed: "Completed",
};

export function SessionListScreen({
  isLoading,
  isRefreshing,
  onRefresh,
  searchQuery,
  sessionLibrary,
  sessionsUnavailable,
}: {
  readonly isLoading: boolean;
  readonly isRefreshing: boolean;
  readonly onRefresh: () => void;
  readonly searchQuery: string;
  readonly sessionLibrary: readonly SessionSummary[];
  readonly sessionsUnavailable: boolean;
}) {
  const theme = useTheme();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("all");
  const selectedFilterIndex = useSharedValue(0);
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const sections = useMemo<readonly SessionSection[]>(() => {
    const searchMatches = normalizedSearch
      ? sessionLibrary.filter(({ scenario, session }) =>
          [
            scenario.presentation.shortTitle,
            scenario.relationship.counterpartName,
            scenario.presentation.relationshipLabel,
            scenario.category,
            getSessionStatusLabel(session),
          ].some((value) =>
            value.toLocaleLowerCase().includes(normalizedSearch),
          ),
        )
      : sessionLibrary;
    const matchingSessions = searchMatches.filter(({ session }) => {
      if (sessionFilter === "in-progress") return session.status !== "complete";
      if (sessionFilter === "completed") return session.status === "complete";
      return true;
    });
    const inProgress = matchingSessions.filter(
      ({ session }) => session.status !== "complete",
    );
    const completed = matchingSessions.filter(
      ({ session }) => session.status === "complete",
    );

    return [
      ...(inProgress.length > 0
        ? [{ data: inProgress, title: "In progress" }]
        : []),
      ...(completed.length > 0
        ? [{ data: completed, title: "Completed" }]
        : []),
    ];
  }, [normalizedSearch, sessionFilter, sessionLibrary]);

  function selectFilter(filter: SessionFilter, index: number) {
    setSessionFilter(filter);
    selectedFilterIndex.value = withTiming(index, {
      duration: 180,
      reduceMotion: ReduceMotion.System,
    });
  }

  return (
    <SectionList
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyExtractor={(item) => item.session.id}
      ListHeaderComponent={
        sessionLibrary.length > 0 ? (
          <View
            accessibilityLabel="Filter sessions"
            accessibilityRole="tablist"
            style={styles.filterRow}
          >
            {SESSION_FILTERS.map((filter, index) => (
              <SessionFilterPill
                index={index}
                isSelected={sessionFilter === filter}
                key={filter}
                label={SESSION_FILTER_LABELS[filter]}
                onPress={() => selectFilter(filter, index)}
                selectedIndex={selectedFilterIndex}
              />
            ))}
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          {isLoading ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <>
              <SymbolView
                accessible={false}
                name={{
                  ios: sessionsUnavailable
                    ? "exclamationmark.arrow.circlepath"
                    : "clock.arrow.circlepath",
                  android: sessionsUnavailable ? "sync_problem" : "history",
                  web: sessionsUnavailable ? "sync_problem" : "history",
                }}
                size={Sizing.icon.large}
                tintColor={theme.primary}
              />
              <ThemedText selectable style={styles.emptyTitle}>
                {sessionsUnavailable
                  ? "Sessions unavailable"
                  : normalizedSearch
                    ? "No matching sessions"
                  : "No saved sessions yet"}
              </ThemedText>
              <ThemedText
                selectable
                style={styles.emptyBody}
                themeColor="textSecondary"
              >
                {sessionsUnavailable
                  ? "Pull down to try loading your saved sessions again."
                  : normalizedSearch
                    ? `Nothing matches “${searchQuery.trim()}”.`
                  : "Your rehearsals will appear here after you start one."}
              </ThemedText>
            </>
          )}
        </View>
      }
      onRefresh={onRefresh}
      refreshing={isRefreshing}
      renderItem={({ index, item }) => (
        <SessionListRow
          color={PracticeCategoryColors[colorScheme][item.scenario.category]}
          showSeparator={index > 0}
          summary={item}
        />
      )}
      renderSectionHeader={({ section }) => (
        <ThemedText
          selectable
          style={[styles.sectionTitle, { color: theme.primary }]}
        >
          {section.title}
        </ThemedText>
      )}
      sections={sections}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      style={{ backgroundColor: theme.background }}
    />
  );
}

function SessionFilterPill({
  index,
  isSelected,
  label,
  onPress,
  selectedIndex,
}: {
  readonly index: number;
  readonly isSelected: boolean;
  readonly label: string;
  readonly onPress: () => void;
  readonly selectedIndex: SharedValue<number>;
}) {
  const theme = useTheme();
  const pillStyle = useAnimatedStyle(() => {
    const selectedAmount = interpolate(
      selectedIndex.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );

    return {
      backgroundColor: interpolateColor(
        selectedAmount,
        [0, 1],
        [theme.backgroundElement, theme.primary],
      ),
    };
  }, [index, theme.backgroundElement, theme.primary]);
  const labelStyle = useAnimatedStyle(() => {
    const selectedAmount = interpolate(
      selectedIndex.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );

    return {
      color: interpolateColor(
        selectedAmount,
        [0, 1],
        [theme.textSecondary, theme.onPrimary],
      ),
    };
  }, [index, theme.onPrimary, theme.textSecondary]);

  return (
    <PressableScale
      accessibilityLabel={`${label} sessions`}
      accessibilityRole="tab"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={styles.filterPressable}
    >
      <Animated.View style={[styles.filterPill, pillStyle]}>
        <Animated.Text style={[styles.filterLabel, labelStyle]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    maxWidth: MaxContentWidth,
    minHeight: "100%",
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.three,
    width: "100%",
  },
  emptyBody: {
    fontSize: FontSize.small,
    maxWidth: 300,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.two,
    justifyContent: "center",
    minHeight: 360,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: {
    fontSize: FontSize.headingLarge,
    fontWeight: "700",
    marginTop: Spacing.two,
  },
  filterLabel: {
    fontSize: FontSize.small,
    fontWeight: "700",
  },
  filterPill: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    justifyContent: "center",
    minHeight: Sizing.control.compact,
    paddingHorizontal: Spacing.three,
    width: "100%",
  },
  filterPressable: {
    flex: 1,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  sectionTitle: {
    fontSize: FontSize.caption,
    fontWeight: "800",
    letterSpacing: 1.2,
    paddingBottom: Spacing.two,
    paddingTop: Spacing.four,
    textTransform: "uppercase",
  },
});
