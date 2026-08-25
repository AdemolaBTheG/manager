import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableOpacity } from "pressto";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { FontSize, Sizing, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  getSessionStatusLabel,
  type SessionSummary,
} from "@/services/query/session-detail";

export function SessionListRow({
  color,
  showSeparator,
  summary,
}: {
  readonly color: string;
  readonly showSeparator: boolean;
  readonly summary: SessionSummary;
}) {
  const theme = useTheme();
  const counterpartName = summary.scenario.relationship.counterpartName;
  const status = getSessionStatusLabel(summary.session);
  const date = formatSessionDate(summary.session.updatedAt);

  return (
    <Link
      asChild
      href={{
        pathname: "/session/[sessionId]",
        params: { sessionId: summary.session.id },
      }}
    >
      <PressableOpacity
        accessibilityHint="Opens this saved session"
        accessibilityLabel={`${summary.scenario.presentation.shortTitle}. ${counterpartName}. ${status}. ${date}.`}
        accessibilityRole="link"
        style={styles.row}
      >
        {showSeparator ? (
          <View
            accessible={false}
            style={[styles.separator, { backgroundColor: theme.border }]}
          />
        ) : null}
        <View
          accessible={false}
          style={[styles.avatar, { backgroundColor: color }]}
        >
          <ThemedText style={styles.avatarText} themeColor="onPrimary">
            {getInitials(counterpartName)}
          </ThemedText>
        </View>
        <View style={styles.copy}>
          <ThemedText accessible={false} style={styles.title}>
            {summary.scenario.presentation.shortTitle}
          </ThemedText>
          <ThemedText
            accessible={false}
            style={styles.context}
            themeColor="textSecondary"
          >
            <ThemedText style={styles.identity} themeColor="textSecondary">
              {counterpartName}
            </ThemedText>{" "}
            ·{" "}
            <ThemedText style={styles.status} themeColor="textSecondary">
              {status}
            </ThemedText>{" "}
            · {date}
          </ThemedText>
        </View>
        <SymbolView
          accessible={false}
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          size={Sizing.icon.small}
          tintColor={theme.textSecondary}
        />
      </PressableOpacity>
    </Link>
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

export function formatSessionDate(timestamp: string) {
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

  if (dayDifference === 0) return "Today";
  if (dayDifference === 1) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === today.getFullYear()
      ? {}
      : { year: "numeric" as const }),
  }).format(date);
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    height: Sizing.avatar.small,
    justifyContent: "center",
    width: Sizing.avatar.small,
  },
  avatarText: {
    fontSize: FontSize.small,
    fontWeight: "800",
  },
  context: {
    fontSize: FontSize.caption,
    fontWeight: "500",
  },
  copy: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  identity: {
    fontSize: FontSize.caption,
    fontWeight: "700",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
    minHeight: 68,
    paddingVertical: 10,
    position: "relative",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    left: Sizing.avatar.small + Spacing.three,
    position: "absolute",
    right: 0,
    top: 0,
  },
  status: {
    fontSize: FontSize.caption,
    fontWeight: "700",
  },
  title: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "600",
  },
});
