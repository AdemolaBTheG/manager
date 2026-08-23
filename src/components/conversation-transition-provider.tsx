import { type ReactNode, useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import {
  ConversationTransitionContext,
  useConversationTransition,
} from "@/components/conversation-transition-context";
import type { ConversationTransitionRequest } from "@/components/conversation-transition.types";
import { DebriefTransitionField } from "@/components/debrief-atmosphere";

export { useConversationTransition };

export function ConversationTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const runningRef = useRef(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [scene, setScene] =
    useState<ConversationTransitionRequest | null>(null);

  const startConversationTransition = useCallback(
    async (request: ConversationTransitionRequest) => {
      if (runningRef.current) {
        return;
      }

      runningRef.current = true;
      setIsTransitioning(true);
      setScene(request);
      progress.set(0);
      await nextFrame();

      const duration = reduceMotion ? 100 : 300;
      progress.set(
        withTiming(0.5, {
          duration,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
      );
      await delay(duration);
      request.navigate();
      await nextFrame();
      progress.set(
        withTiming(1, {
          duration,
          easing: Easing.out(Easing.cubic),
          reduceMotion: ReduceMotion.Never,
        }),
      );
      await delay(duration);

      setScene(null);
      setIsTransitioning(false);
      runningRef.current = false;
    },
    [progress, reduceMotion],
  );

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.get(),
      [0, 0.5, 1],
      [0, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <ConversationTransitionContext.Provider
      value={{ isTransitioning, startConversationTransition }}
    >
      <View style={styles.root}>
        <View
          pointerEvents={isTransitioning ? "none" : "auto"}
          style={styles.root}
        >
          {children}
        </View>
        {scene ? (
          <Animated.View style={[styles.overlay, overlayStyle]}>
            <DebriefTransitionField
              accentColor={scene.accentColor}
              direction={scene.direction}
              progress={progress}
              progressMode="cover"
            />
          </Animated.View>
        ) : null}
      </View>
    </ConversationTransitionContext.Provider>
  );
}

function delay(duration: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, duration));
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1000,
  },
});
