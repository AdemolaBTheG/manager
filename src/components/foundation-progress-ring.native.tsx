import {
  BlurMask,
  Canvas,
  Group,
  interpolateColors,
  Path,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
  Easing,
  type SharedValue,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

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
const SEGMENT_GAP = 0.018;
const STROKE_WIDTH = 14;
const REVEAL_EASING = Easing.bezier(0.23, 1, 0.32, 1);

export function FoundationProgressRing({
  accentColor,
  current,
  previous,
  size = 184,
}: FoundationProgressRingProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const radius = (size - STROKE_WIDTH * 2) / 2;
  const currentByKey = useMemo(() => toStatusMap(current), [current]);
  const previousByKey = useMemo(() => toStatusMap(previous), [previous]);
  const previousClearCount = countClear(previousByKey);
  const clearCount = countClear(currentByKey);
  const summary = getProgressSummary(previousByKey, currentByKey);
  const path = useMemo(() => {
    const ring = Skia.Path.Make();
    ring.addCircle(size / 2, size / 2, radius);
    return ring;
  }, [radius, size]);

  useEffect(() => {
    progress.set(reduceMotion ? 1 : 0);

    if (!reduceMotion) {
      progress.set(
        withDelay(
          260,
          withTiming(1, {
            duration: 720,
            easing: REVEAL_EASING,
          }),
        ),
      );
    }
  }, [currentByKey, previousByKey, progress, reduceMotion]);

  return (
    <View style={styles.summary}>
      <View
        accessibilityLabel={`Conversation foundations. Before, ${previousClearCount} of 6 clear. This time, ${clearCount} of 6 clear. ${summary}`}
        accessibilityRole="image"
        accessible
        style={{ height: size, width: size }}
      >
        <Canvas
          accessible={false}
          colorSpace="srgb"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        >
          <Group
            origin={vec(size / 2, size / 2)}
            transform={[{ rotate: -Math.PI / 2 }]}
          >
            {FOUNDATION_KEYS.map((key, index) => {
              const previousStatus = previousByKey[key] ?? "missing";
              const currentStatus = currentByKey[key] ?? "missing";

              return (
                <FoundationArc
                  accentColor={accentColor}
                  currentStatus={currentStatus}
                  end={(index + 1) / FOUNDATION_KEYS.length - SEGMENT_GAP}
                  improved={
                    !reduceMotion &&
                    statusLevel(currentStatus) > statusLevel(previousStatus)
                  }
                  key={key}
                  path={path}
                  previousStatus={previousStatus}
                  progress={progress}
                  start={index / FOUNDATION_KEYS.length + SEGMENT_GAP}
                />
              );
            })}
          </Group>
        </Canvas>

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

function FoundationArc({
  accentColor,
  currentStatus,
  end,
  improved,
  path,
  previousStatus,
  progress,
  start,
}: {
  accentColor: string;
  currentStatus: FoundationStatus;
  end: number;
  improved: boolean;
  path: ReturnType<typeof Skia.Path.Make>;
  previousStatus: FoundationStatus;
  progress: SharedValue<number>;
  start: number;
}) {
  const previousColor = colorForStatus(previousStatus, accentColor);
  const currentColor = colorForStatus(currentStatus, accentColor);
  const color = useDerivedValue(() =>
    interpolateColors(
      progress.get(),
      [0, 1],
      [previousColor, currentColor],
    ),
  );
  const glowOpacity = useDerivedValue(() =>
    improved ? progress.get() * 0.82 : 0,
  );

  return (
    <>
      {improved ? (
        <Group opacity={glowOpacity}>
          <Path
            color={accentColor}
            end={end}
            path={path}
            start={start}
            strokeCap="round"
            strokeWidth={STROKE_WIDTH + 2}
            style="stroke"
          >
            <BlurMask blur={9} style="solid" />
          </Path>
        </Group>
      ) : null}

      <Path
        color={color}
        end={end}
        path={path}
        start={start}
        strokeCap="round"
        strokeWidth={STROKE_WIDTH}
        style="stroke"
      />
    </>
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

function countClear(
  statuses: Partial<Record<FoundationKey, FoundationStatus>>,
) {
  return FOUNDATION_KEYS.filter((key) => statuses[key] === "clear").length;
}

function getChangedKeys(
  previous: Partial<Record<FoundationKey, FoundationStatus>>,
  current: Partial<Record<FoundationKey, FoundationStatus>>,
) {
  return {
    gained: FOUNDATION_KEYS.filter(
      (key) =>
        previous[key] !== "clear" && current[key] === "clear",
    ),
    lost: FOUNDATION_KEYS.filter(
      (key) =>
        previous[key] === "clear" && current[key] !== "clear",
    ),
  };
}

function statusLevel(status: FoundationStatus) {
  if (status === "clear") return 2;
  if (status === "partial") return 1;
  return 0;
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
  const { gained, lost } = getChangedKeys(previous, current);
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
