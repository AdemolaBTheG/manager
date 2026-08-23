import { BlurTargetView, BlurView } from "expo-blur";
import { LinearGradient, type LinearGradientProps } from "expo-linear-gradient";
import { Link } from "expo-router";
import { PressableScale } from "pressto";
import { memo, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { easeGradient } from "react-native-easing-gradient";
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import {
  FontSize,
  PracticeCardColors,
  PracticeCategoryColors,
  Sizing,
  Spacing,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

import type { CarouselCard } from "./index";

const CATEGORY_LABELS = {
  feedback: "FEEDBACK",
  boundary: "BOUNDARY",
  pushback: "PUSHBACK",
} as const;

type CarouselItemProps = {
  cardWidth: number;
  contentPadding: number;
  index: number;
  item: CarouselCard;
  scrollOffset: SharedValue<number>;
  snapInterval: number;
  viewportWidth: number;
};

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

function ScenarioCarouselItem({
  cardWidth,
  contentPadding,
  index,
  item,
  scrollOffset,
  snapInterval,
  viewportWidth,
}: CarouselItemProps) {
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const reduceMotion = useReducedMotion();
  const blurTargetRef = useRef<View | null>(null);
  const categoryColor = PracticeCategoryColors[colorScheme][item.category];
  const cardColors = PracticeCardColors[colorScheme];
  const gradient = useMemo(
    () =>
      createCategoryGradient(
        cardColors.surface,
        categoryColor,
        cardColors.tintStrength,
      ),
    [cardColors, categoryColor],
  );
  const accessibilityLabel = [item.eyebrow, item.title, item.relationship]
    .filter(Boolean)
    .join(". ");
  const animatedCardStyle = useAnimatedStyle(() => {
    const overflow = getOverflowProgress({
      cardWidth,
      contentPadding,
      index,
      scrollOffset: scrollOffset.value,
      snapInterval,
      viewportWidth,
    });

    return {
      opacity: interpolate(
        overflow,
        [0, 1],
        [1, 0.72],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: reduceMotion
            ? 1
            : interpolate(
                overflow,
                [0, 1],
                [1, 0.92],
                Extrapolation.CLAMP,
              ),
        },
      ],
    };
  });
  const animatedBlurProps = useAnimatedProps(() => {
    const overflow = getOverflowProgress({
      cardWidth,
      contentPadding,
      index,
      scrollOffset: scrollOffset.value,
      snapInterval,
      viewportWidth,
    });

    return {
      intensity: interpolate(
        overflow,
        [0, 1],
        [1, 22],
        Extrapolation.CLAMP,
      ),
    };
  });
  const animatedBlurStyle = useAnimatedStyle(() => {
    const overflow = getOverflowProgress({
      cardWidth,
      contentPadding,
      index,
      scrollOffset: scrollOffset.value,
      snapInterval,
      viewportWidth,
    });

    return {
      opacity: interpolate(
        overflow,
        [0, 0.08, 1],
        [0, 0, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  return (
    <Animated.View
      style={[styles.item, { width: cardWidth }, animatedCardStyle]}>
      <Link href={item.href} asChild>
        <Link.AppleZoom>
          <PressableScale
            accessibilityLabel={accessibilityLabel}
            accessibilityHint="Open this practice scenario"
            accessibilityRole="link"
            style={StyleSheet.flatten([
              styles.card,
              {
                backgroundColor: cardColors.surface,
              },
            ])}>
            <BlurTargetView
              ref={blurTargetRef}
              style={[
                styles.blurTarget,
                { backgroundColor: cardColors.surface },
              ]}>
              <View style={styles.cardContent}>
                <LinearGradient
                  accessible={false}
                  colors={gradient.colors}
                  end={{ x: 0.5, y: 1 }}
                  locations={gradient.locations}
                  pointerEvents="none"
                  start={{ x: 0.5, y: 0 }}
                  style={styles.gradient}
                />

                <ThemedText
                  numberOfLines={1}
                  style={[styles.eyebrow, { color: categoryColor }]}>
                  {CATEGORY_LABELS[item.category]}
                </ThemedText>

                <View style={styles.copy}>
                  <ThemedText style={styles.title}>{item.title}</ThemedText>
                  {item.relationship ? (
                    <ThemedText
                      numberOfLines={1}
                      style={[
                        styles.relationship,
                        { color: cardColors.metaText },
                      ]}>
                      {item.relationship}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            </BlurTargetView>

            <AnimatedBlurView
              accessible={false}
              animatedProps={animatedBlurProps}
              blurMethod="dimezisBlurViewSdk31Plus"
              blurReductionFactor={1}
              blurTarget={blurTargetRef}
              intensity={0}
              pointerEvents="none"
              style={[styles.blurOverlay, animatedBlurStyle]}
              tint={
                colorScheme === "dark"
                  ? "systemUltraThinMaterialDark"
                  : "systemUltraThinMaterialLight"
              }
            />
          </PressableScale>
        </Link.AppleZoom>
      </Link>
    </Animated.View>
  );
}

export const CarouselItem = memo(ScenarioCarouselItem);

function createCategoryGradient(
  surfaceColor: string,
  categoryColor: string,
  tintStrength: number,
) {
  const eased = easeGradient({
    colorStops: {
      0: { color: surfaceColor },
      1: {
        color: mixHexColors(surfaceColor, categoryColor, tintStrength),
      },
    },
  });

  return {
    colors: toGradientTuple(eased.colors),
    locations: toGradientTuple(eased.locations),
  } satisfies Pick<LinearGradientProps, "colors" | "locations">;
}

function toGradientTuple<T>(values: T[]): [T, T, ...T[]] {
  const [first, second, ...rest] = values;

  if (first === undefined || second === undefined) {
    throw new Error("A gradient requires at least two stops.");
  }

  return [first, second, ...rest];
}

function mixHexColors(baseHex: string, tintHex: string, amount: number) {
  const base = parseHexColor(baseHex);
  const tint = parseHexColor(tintHex);
  const mix = (baseChannel: number, tintChannel: number) =>
    Math.round(baseChannel + (tintChannel - baseChannel) * amount);

  return `rgb(${mix(base.red, tint.red)}, ${mix(base.green, tint.green)}, ${mix(base.blue, tint.blue)})`;
}

function parseHexColor(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);

  return {
    red: (value >> 16) & 255,
    green: (value >> 8) & 255,
    blue: value & 255,
  };
}

function getOverflowProgress({
  cardWidth,
  contentPadding,
  index,
  scrollOffset,
  snapInterval,
  viewportWidth,
}: {
  cardWidth: number;
  contentPadding: number;
  index: number;
  scrollOffset: number;
  snapInterval: number;
  viewportWidth: number;
}) {
  "worklet";

  const cardLeft = contentPadding + index * snapInterval - scrollOffset;
  const cardRight = cardLeft + cardWidth;
  const clippedOnLeft = Math.max(0, -cardLeft);
  const clippedOnRight = Math.max(0, cardRight - viewportWidth);

  return Math.min(1, Math.max(clippedOnLeft, clippedOnRight) / cardWidth);
}

const styles = StyleSheet.create({
  item: {
    flexShrink: 0,
  },
  card: {
    width: "100%",
    aspectRatio: 3 / 4,
    overflow: "hidden",
    borderRadius: Sizing.radius.large,
    borderCurve: "continuous",
  },
  blurTarget: {
    flex: 1,
  },
  cardContent: {
    position: "relative",
    flex: 1,
    justifyContent: "space-between",
    gap: Spacing.three,
    padding: Spacing.three,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    borderRadius: Sizing.radius.large,
    borderCurve: "continuous",
  },
  gradient: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  eyebrow: {
    fontSize: FontSize.labelSmall,
    fontWeight: "700",
    letterSpacing: 0,
  },
  copy: {
    gap: Spacing.one,
  },
  title: {
    fontSize: FontSize.small,
    fontWeight: "700",
  },
  relationship: {
    fontSize: FontSize.label,
    fontWeight: "600",
  },
});
