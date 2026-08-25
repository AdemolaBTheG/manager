import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { ThemedText } from "@/components/themed-text";
import { FontSize, Spacing } from "@/constants/theme";
import type {
  DebriefFoundation,
  FoundationKey,
  FoundationStatus,
} from "@/domain/coaching";

export type FoundationProgressRingProps = {
  readonly accentColor: string;
  readonly current: readonly DebriefFoundation[];
  readonly previous: readonly DebriefFoundation[];
  readonly size?: number;
};

const FOUNDATION_KEYS: readonly FoundationKey[] = [
  "purpose",
  "specificity",
  "evidence",
  "perspective",
  "boundary",
  "path",
];
const FOUNDATION_LABELS: Record<FoundationKey, string> = {
  purpose: "Purpose",
  specificity: "Specificity",
  evidence: "Evidence",
  perspective: "Perspective",
  boundary: "Boundary",
  path: "Next step",
};
const STROKE_WIDTH = 14;

/** Static web fallback while CanvasKit is not part of the web bootstrap. */
export function FoundationProgressRing({
  accentColor,
  current,
  previous,
  size = 184,
}: FoundationProgressRingProps) {
  const radius = (size - STROKE_WIDTH * 2) / 2;
  const circumference = Math.PI * 2 * radius;
  const segmentLength = circumference / FOUNDATION_KEYS.length;
  const visibleLength = segmentLength * 0.78;
  const currentByKey = useMemo(() => toStatusMap(current), [current]);
  const previousByKey = useMemo(() => toStatusMap(previous), [previous]);
  const clearCount = FOUNDATION_KEYS.filter(
    (key) => currentByKey[key] === "clear",
  ).length;
  const previousClearCount = FOUNDATION_KEYS.filter(
    (key) => previousByKey[key] === "clear",
  ).length;
  const summary = getProgressSummary(previousByKey, currentByKey);

  return (
    <View style={styles.summary}>
      <View
        accessibilityLabel={`Conversation foundations. Before, ${previousClearCount} of 6 clear. This time, ${clearCount} of 6 clear. ${summary}`}
        accessibilityRole="image"
        accessible
        style={{ height: size, width: size }}
      >
        <Svg
          accessibilityElementsHidden
          height={size}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          viewBox={`0 0 ${size} ${size}`}
          width={size}
        >
          {FOUNDATION_KEYS.map((key, index) => (
            <Circle
              cx={size / 2}
              cy={size / 2}
              fill="none"
              key={key}
              originX={size / 2}
              originY={size / 2}
              r={radius}
              rotation={-90}
              stroke={colorForStatus(
                currentByKey[key] ?? "missing",
                accentColor,
              )}
              strokeDasharray={`${visibleLength} ${circumference - visibleLength}`}
              strokeDashoffset={-index * segmentLength}
              strokeLinecap="round"
              strokeWidth={STROKE_WIDTH}
            />
          ))}
        </Svg>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.centerCopy}
        >
          <ThemedText style={styles.count}>
            {clearCount}
            <ThemedText style={styles.total}>/6</ThemedText>
          </ThemedText>
          <ThemedText style={styles.clearLabel}>clear</ThemedText>
        </View>
      </View>

      <View style={styles.resultCopy}>
        <ThemedText selectable style={styles.comparisonText}>
          Before {previousClearCount} · This time {clearCount}
        </ThemedText>
        <ThemedText selectable style={styles.summaryText}>
          {summary}
        </ThemedText>
      </View>
    </View>
  );
}

function toStatusMap(foundations: readonly DebriefFoundation[]) {
  return foundations.reduce<Partial<Record<FoundationKey, FoundationStatus>>>(
    (statuses, foundation) => {
      statuses[foundation.key] = foundation.status;
      return statuses;
    },
    {},
  );
}

function colorForStatus(status: FoundationStatus, accentColor: string) {
  if (status === "clear") return accentColor;
  if (status === "partial") return "rgba(255, 255, 255, 0.38)";
  return "rgba(255, 255, 255, 0.13)";
}

function getProgressSummary(
  previous: Partial<Record<FoundationKey, FoundationStatus>>,
  current: Partial<Record<FoundationKey, FoundationStatus>>,
) {
  const gained = FOUNDATION_KEYS.filter(
    (key) => previous[key] !== "clear" && current[key] === "clear",
  );
  const lost = FOUNDATION_KEYS.filter(
    (key) => previous[key] === "clear" && current[key] !== "clear",
  );
  const gainedCopy = gained.map((key) => FOUNDATION_LABELS[key]).join(" and ");
  const lostCopy = lost.map((key) => FOUNDATION_LABELS[key]).join(" and ");

  if (gained.length > 0 && lost.length > 0) {
    return `${gainedCopy} became clear · ${lostCopy} needs another look`;
  }
  if (gained.length > 0) return `${gainedCopy} became clear`;
  if (lost.length > 0) return `${lostCopy} needs another look`;
  return "Same foundations · new wording";
}

const styles = StyleSheet.create({
  summary: {
    alignItems: "center",
    gap: Spacing.two,
  },
  centerCopy: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  count: {
    color: "rgba(255, 255, 255, 0.96)",
    fontSize: FontSize.displaySmall,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  total: {
    color: "rgba(255, 255, 255, 0.60)",
    fontSize: FontSize.body,
    fontVariant: ["tabular-nums"],
    fontWeight: "600",
  },
  clearLabel: {
    color: "rgba(255, 255, 255, 0.68)",
    fontSize: FontSize.small,
    fontWeight: "600",
  },
  resultCopy: {
    alignItems: "center",
    gap: Spacing.one,
  },
  comparisonText: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: FontSize.small,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    textAlign: "center",
  },
  summaryText: {
    color: "rgba(255, 255, 255, 0.76)",
    fontSize: FontSize.small,
    fontWeight: "700",
    textAlign: "center",
  },
});
