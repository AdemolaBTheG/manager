import * as Haptics from "expo-haptics";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

const TRANSITION_EASING = Easing.bezier(0.16, 1, 0.3, 1);

export { useConversationTransition };

export function ConversationTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const mountedRef = useRef(true);
  const runningRef = useRef(false);
  const progress = useSharedValue(0);
  const direction = useSharedValue(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [scene, setScene] =
    useState<ConversationTransitionRequest | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startConversationTransition = useCallback(
    async (request: ConversationTransitionRequest) => {
      if (runningRef.current) {
        return;
      }

      runningRef.current = true;
      setIsTransitioning(true);
      setScene(request);
      direction.set(request.direction === "into-debrief" ? 1 : -1);
      progress.set(0);

      if (process.env.EXPO_OS === "ios") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      await nextFrame();
      const outgoingDuration = reduceMotion ? 100 : 500;
      const incomingDuration = reduceMotion ? 140 : 560;

      progress.set(
        withTiming(0.5, {
          duration: outgoingDuration,
          easing: TRANSITION_EASING,
          reduceMotion: ReduceMotion.Never,
        }),
      );
      await delay(outgoingDuration);

      if (!mountedRef.current) {
        runningRef.current = false;
        return;
      }

      request.navigate();
      if (process.env.EXPO_OS === "ios") {
        void Haptics.selectionAsync();
      }
      await nextFrame();
      await nextFrame();

      progress.set(
        withTiming(1, {
          duration: incomingDuration,
          easing: TRANSITION_EASING,
          reduceMotion: ReduceMotion.Never,
        }),
      );
      await delay(incomingDuration);

      if (mountedRef.current) {
        setScene(null);
        setIsTransitioning(false);
      }
      runningRef.current = false;
    },
    [direction, progress, reduceMotion],
  );

  const contentStyle = useAnimatedStyle(() => {
    const value = progress.get();
    const routeDirection = direction.get();

    if (value <= 0.5) {
      const outgoing = value / 0.5;
      const scale =
        routeDirection > 0
          ? interpolate(outgoing, [0, 1], [1, 0.965], Extrapolation.CLAMP)
          : interpolate(outgoing, [0, 1], [1, 1.025], Extrapolation.CLAMP);

      return {
        opacity: reduceMotion
          ? interpolate(outgoing, [0, 1], [1, 0.28], Extrapolation.CLAMP)
          : interpolate(outgoing, [0, 1], [1, 0.14], Extrapolation.CLAMP),
        transform: [{ scale: reduceMotion ? 1 : scale }],
      };
    }

    const incoming = (value - 0.5) / 0.5;
    const scale =
      routeDirection > 0
        ? interpolate(incoming, [0, 1], [1.025, 1], Extrapolation.CLAMP)
        : interpolate(incoming, [0, 1], [0.965, 1], Extrapolation.CLAMP);

    return {
      opacity: interpolate(incoming, [0, 1], [0.18, 1], Extrapolation.CLAMP),
      transform: [{ scale: reduceMotion ? 1 : scale }],
    };
  });
  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.get(),
      [0, 0.18, 0.5, 0.76, 1],
      [0, 0.62, 1, 0.76, 0],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <ConversationTransitionContext.Provider
      value={{ isTransitioning, startConversationTransition }}
    >
      <View style={styles.root}>
        <Animated.View
          pointerEvents={isTransitioning ? "none" : "auto"}
          style={[styles.root, contentStyle]}
        >
          {children}
        </Animated.View>

        {scene ? (
          <Animated.View
            accessibilityLabel={
              scene.direction === "into-debrief"
                ? "Opening your conversation debrief"
                : "Rewinding to the selected conversation moment"
            }
            accessibilityLiveRegion="polite"
            accessibilityViewIsModal
            style={[styles.overlay, overlayStyle]}
          >
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
  root: {
    flex: 1,
  },
  overlay: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1000,
  },
});
