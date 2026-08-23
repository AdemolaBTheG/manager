import type { Href } from 'expo-router';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import {
  Spacing,
  type PracticeCategoryColor,
} from '@/constants/theme';

import { CarouselItem } from './carousel-item';

export type CarouselCard = {
  id: string;
  href: Href;
  category: PracticeCategoryColor;
  eyebrow: string;
  title: string;
  relationship?: string;
};

type CarouselProps = {
  data: readonly CarouselCard[];
};

const CARD_GAP = Spacing.three;
const CAROUSEL_EDGE_PADDING = Spacing.three;
const CARD_WIDTH_RATIO = 0.4;
const MIN_CARD_WIDTH = 140;
const MAX_CARD_WIDTH = 152;

export function Carousel({ data }: CarouselProps) {
  const { width: windowWidth } = useWindowDimensions();
  const availableWidth = windowWidth - CAROUSEL_EDGE_PADDING * 2;
  const cardWidth = Math.min(
    MAX_CARD_WIDTH,
    Math.max(MIN_CARD_WIDTH, availableWidth * CARD_WIDTH_RATIO),
  );
  const snapInterval = cardWidth + CARD_GAP;
  const scrollOffset = useSharedValue(0);
  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollOffset.value = event.contentOffset.x;
    },
  });

  return (
    <Animated.ScrollView
      accessibilityLabel="Guided practice scenarios"
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="never"
      decelerationRate="fast"
      disableIntervalMomentum
      horizontal
      onScroll={handleScroll}
      scrollEventThrottle={16}
      showsHorizontalScrollIndicator={false}
      snapToAlignment="start"
      snapToInterval={snapInterval}
      style={[styles.scroll, { width: windowWidth }]}>
      {data.map((item, index) => (
        <CarouselItem
          cardWidth={cardWidth}
          contentPadding={CAROUSEL_EDGE_PADDING}
          index={index}
          item={item}
          key={item.id}
          scrollOffset={scrollOffset}
          snapInterval={snapInterval}
          viewportWidth={windowWidth}
        />
      ))}
    </Animated.ScrollView>
  );
}

export default Carousel;

const styles = StyleSheet.create({
  scroll: {
    alignSelf: 'center',
  },
  content: {
    gap: CARD_GAP,
    paddingHorizontal: CAROUSEL_EDGE_PADDING,
  },
});
