import type { StyleProp, TextStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import type { SpeechCaptionSnapshot } from "@/domain/speech-caption";

type LiveSpeechCaptionProps = {
  readonly activeColor: string;
  readonly activeWordPosition: SharedValue<number>;
  readonly caption: SpeechCaptionSnapshot;
  readonly highlightProgress: SharedValue<number>;
  readonly inactiveColor: string;
  readonly numberOfLines?: number;
  readonly style?: StyleProp<TextStyle>;
};

export function LiveSpeechCaption({
  activeColor,
  activeWordPosition,
  caption,
  highlightProgress,
  inactiveColor,
  numberOfLines = 2,
  style,
}: LiveSpeechCaptionProps) {
  const phrase = caption.words.join(" ");

  return (
    <ThemedText
      accessibilityLabel={phrase}
      numberOfLines={numberOfLines}
      style={[style, { color: inactiveColor }]}
    >
      {caption.words.map((word, index) => (
        <LiveSpeechCaptionWord
          activeColor={activeColor}
          activeWordPosition={activeWordPosition}
          highlightProgress={highlightProgress}
          inactiveColor={inactiveColor}
          key={`${caption.phraseIndex}-${index}-${word}`}
          prefix={index > 0 ? " " : ""}
          word={word}
          wordPosition={caption.wordOffset + index}
        />
      ))}
    </ThemedText>
  );
}

function LiveSpeechCaptionWord({
  activeColor,
  activeWordPosition,
  highlightProgress,
  inactiveColor,
  prefix,
  word,
  wordPosition,
}: {
  readonly activeColor: string;
  readonly activeWordPosition: SharedValue<number>;
  readonly highlightProgress: SharedValue<number>;
  readonly inactiveColor: string;
  readonly prefix: string;
  readonly word: string;
  readonly wordPosition: number;
}) {
  const colorStyle = useAnimatedStyle(() => {
    const distanceFromActiveWord = Math.abs(
      activeWordPosition.get() - wordPosition,
    );
    const colorProgress =
      Math.max(0, 1 - distanceFromActiveWord) * highlightProgress.get();

    return {
      color: interpolateColor(
        colorProgress,
        [0, 1],
        [inactiveColor, activeColor],
        "LAB",
      ),
    };
  }, [activeColor, inactiveColor, wordPosition]);

  return (
    <Animated.Text style={colorStyle}>
      {prefix}
      {word}
    </Animated.Text>
  );
}
