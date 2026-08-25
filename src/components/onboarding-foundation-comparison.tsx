import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInUp,
  ReduceMotion,
} from "react-native-reanimated";

import { FontSize, Sizing, Spacing } from "@/constants/theme";
import { countClearFoundations } from "@/data/onboarding-outcome";
import type { DebriefFoundation } from "@/domain/coaching";
import { useTheme } from "@/hooks/use-theme";

type OnboardingFoundationComparisonProps = {
  readonly current: readonly DebriefFoundation[];
  readonly previous?: readonly DebriefFoundation[] | null;
};

const FOUNDATION_COUNT = 6;
const ENTER_EASING = Easing.bezier(0.23, 1, 0.32, 1);
const CURRENT_ROW_ENTERING = FadeInUp.duration(260)
  .delay(100)
  .easing(ENTER_EASING)
  .reduceMotion(ReduceMotion.System);

export function OnboardingFoundationComparison({
  current,
  previous = null,
}: OnboardingFoundationComparisonProps) {
  const currentClear = countClearFoundations(current);
  const previousClear = previous ? countClearFoundations(previous) : null;

  return (
    <View style={styles.comparison}>
      {previousClear !== null ? (
        <FoundationRow
          clearCount={previousClear}
          label="First try"
          muted
        />
      ) : null}

      <Animated.View entering={CURRENT_ROW_ENTERING}>
        <FoundationRow
          clearCount={currentClear}
          label={previous ? "This try" : "Your rehearsal"}
        />
      </Animated.View>
    </View>
  );
}

function FoundationRow({
  clearCount,
  label,
  muted = false,
}: {
  readonly clearCount: number;
  readonly label: string;
  readonly muted?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityLabel={`${label}, ${clearCount} of ${FOUNDATION_COUNT} conversation foundations clear`}
      accessible
      style={styles.row}
    >
      <View style={styles.rowHeader}>
        <Text
          selectable
          style={[
            styles.rowLabel,
            { color: muted ? theme.textSecondary : theme.text },
          ]}
        >
          {label}
        </Text>
        <Text
          selectable
          style={[
            styles.rowValue,
            { color: muted ? theme.textSecondary : theme.text },
          ]}
        >
          {clearCount}/{FOUNDATION_COUNT} clear
        </Text>
      </View>

      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.segments}
      >
        {Array.from({ length: FOUNDATION_COUNT }, (_, index) => {
          const isFilled = index < clearCount;

          return (
            <View
              key={index}
              style={[
                styles.segmentTrack,
                { backgroundColor: theme.backgroundSelected },
              ]}
            >
              {isFilled ? (
                <Animated.View
                  entering={FadeIn.duration(180)
                    .delay((muted ? 0 : 130) + index * 45)
                    .easing(ENTER_EASING)
                    .reduceMotion(ReduceMotion.System)}
                  style={[
                    styles.segmentFill,
                    {
                      backgroundColor: muted
                        ? theme.textSecondary
                        : theme.primary,
                    },
                  ]}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  comparison: {
    gap: Spacing.four,
    width: "100%",
  },
  row: {
    gap: Spacing.two,
  },
  rowHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "700",
  },
  rowValue: {
    fontSize: FontSize.body,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
  },
  segments: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  segmentTrack: {
    borderRadius: Sizing.radius.pill,
    flex: 1,
    height: 12,
    overflow: "hidden",
  },
  segmentFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: Sizing.radius.pill,
  },
});
