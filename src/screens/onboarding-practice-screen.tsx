import type { NativeStackHeaderItem } from "@react-navigation/native-stack";
import { BlurTargetView, BlurView } from "expo-blur";
import type { File } from "expo-file-system";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableScale } from "pressto";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInUp,
  FadeOut,
  interpolate,
  ReduceMotion,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DebriefTransitionField } from "@/components/debrief-atmosphere";
import { LiveSpeechCaption } from "@/components/live-speech-caption";
import { OnboardingProgress } from "@/components/onboarding-progress";
import {
  ReactiveInitialsAvatar,
  RehearsalAvatarPhase,
  type RehearsalAvatarPhaseValue,
} from "@/components/reactive-initials-avatar";
import { ThemedText } from "@/components/themed-text";
import {
  FontSize,
  MaxContentWidth,
  PracticeCategoryColors,
  Sizing,
  Spacing,
} from "@/constants/theme";
import { createDevDebriefPreview } from "@/data/dev-debrief-preview";
import { chooseOnboardingCommitmentFocus } from "@/data/onboarding-commitments";
import {
  createOnboardingFoundations,
  describeOnboardingRetryChange,
} from "@/data/onboarding-outcome";
import { scenarioDefinitions } from "@/data/scenarios";
import type { Debrief } from "@/domain/coaching";
import type {
  PracticeCategory,
  ScenarioDefinition,
} from "@/domain/scenario";
import {
  createOpeningSimulationState,
  type SimulationState,
} from "@/domain/simulation-state";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useDebriefTransitionHaptics } from "@/hooks/use-debrief-transition-haptics";
import { useRehearsalSpeechPlayback } from "@/hooks/use-rehearsal-speech-playback";
import {
  type CapturedVoiceTurn,
  useRehearsalVoiceCapture,
} from "@/hooks/use-rehearsal-voice-capture";
import { useSemanticHaptics } from "@/hooks/use-semantic-haptics";
import { useTheme } from "@/hooks/use-theme";
import { posthog } from "@/services/analytics/posthog";
import { useOnboardingFlow } from "@/providers/onboarding-flow-provider";
import {
  DebriefScreen,
  type DebriefRetryComparison,
} from "@/screens/debrief-screen";
import {
  useActorTurnMutation,
  useTranscriptionMutation,
} from "@/services/query/rehearsal-mutations";

type PracticeStage =
  | "opening"
  | "ready"
  | "listening"
  | "thinking"
  | "reply";
type SpeechPurpose = "opening" | "reply";
type OnboardingAttempt = {
  readonly managerLine: string;
  readonly state: SimulationState;
};

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SCENE_EASING = Easing.bezier(0.32, 0, 0.16, 1);
const DEBRIEF_ENTER_DURATION = 900;
const DEBRIEF_REWIND_DURATION = 680;
const STATE_TRANSITION = {
  duration: 220,
  easing: EASE_OUT,
  reduceMotion: ReduceMotion.System,
} as const;
const SPEECH_LEVEL_ATTACK = {
  duration: 70,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;
const SPEECH_LEVEL_RELEASE = {
  duration: 180,
  easing: EASE_OUT,
  reduceMotion: ReduceMotion.System,
} as const;
const LISTENER_LEVEL_ATTACK = {
  duration: 55,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;
const LISTENER_LEVEL_RELEASE = {
  duration: 150,
  easing: EASE_OUT,
  reduceMotion: ReduceMotion.System,
} as const;
const CAPTION_PHRASE_ENTERING = FadeIn.duration(120)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);
const CAPTION_PHRASE_EXITING = FadeOut.duration(80)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);
const COMPLETION_ENTERING = FadeInUp.duration(260)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export function OnboardingPracticeScreen({ category }: { category?: string }) {
  const router = useRouter();
  const { setProofSnapshot } = useOnboardingFlow();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const {
    playEnter: playDebriefEnterHaptic,
    playRewind: playDebriefRewindHaptic,
    playSettle: playDebriefSettleHaptic,
  } = useDebriefTransitionHaptics({
    enterDurationMs: DEBRIEF_ENTER_DURATION,
    reduceMotion,
    rewindDurationMs: DEBRIEF_REWIND_DURATION,
  });
  const { playError, playReady, playRecordStart, playRecordStop } =
    useSemanticHaptics();
  const theme = useTheme();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const liquidGlassAvailable = isLiquidGlassAvailable();
  const practiceCategory = isPracticeCategory(category) ? category : null;
  const scenario = practiceCategory
    ? scenarioDefinitions.find(
        (candidate) =>
          candidate.publicationStatus === "published" &&
          candidate.category === practiceCategory,
      )
    : undefined;
  const categoryColor = practiceCategory
    ? PracticeCategoryColors[colorScheme][practiceCategory]
    : theme.primary;
  const debriefAccent = practiceCategory
    ? PracticeCategoryColors.dark[practiceCategory]
    : PracticeCategoryColors.dark.boundary;
  const ephemeralId = `onboarding-${practiceCategory ?? "unknown"}`;
  const [stage, setStage] = useState<PracticeStage>("opening");
  const [managerLine, setManagerLine] = useState<string | null>(null);
  const [counterpartLine, setCounterpartLine] = useState<string | null>(null);
  const [nextState, setNextState] = useState<SimulationState | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [replyReady, setReplyReady] = useState(false);
  const [isSceneVisible, setIsSceneVisible] = useState(false);
  const [isDebriefInteractive, setIsDebriefInteractive] = useState(false);
  const [isRewinding, setIsRewinding] = useState(false);
  const [originalAttempt, setOriginalAttempt] =
    useState<OnboardingAttempt | null>(null);
  const [sceneDirection, setSceneDirection] = useState<
    "into-debrief" | "into-rehearsal"
  >("into-debrief");
  const [sceneOrigin, setSceneOrigin] = useState<readonly [number, number]>([
    0.5, 0.43,
  ]);
  const counterpartActivity = useSharedValue(0);
  const listenerActivity = useSharedValue(0);
  const phase = useSharedValue<RehearsalAvatarPhaseValue>(
    RehearsalAvatarPhase.idle,
  );
  const sceneProgress = useSharedValue(0);
  const avatarOriginRef = useRef<View | null>(null);
  const blurTargetRef = useRef<View | null>(null);
  const experienceRef = useRef<View | null>(null);
  const didStartOpeningSpeechRef = useRef(false);
  const lastHapticErrorRef = useRef<string | null>(null);
  const sceneRunningRef = useRef(false);
  const speechPurposeRef = useRef<SpeechPurpose | null>(null);
  const speechActivityTargetRef = useRef(0);
  const listenerActivityTargetRef = useRef(0);
  const { mutateAsync: generateActorTurn, isPending: isActorPending } =
    useActorTurnMutation({
      branchId: ephemeralId,
      scenarioId: scenario?.id ?? "missing",
      scenarioVersion: scenario?.version ?? 1,
    });
  const { mutateAsync: transcribeAudio } =
    useTranscriptionMutation(ephemeralId);

  const handleSpeechFinish = useCallback(() => {
    const purpose = speechPurposeRef.current;
    speechPurposeRef.current = null;
    speechActivityTargetRef.current = 0;
    counterpartActivity.set(withTiming(0, SPEECH_LEVEL_RELEASE));
    phase.set(RehearsalAvatarPhase.idle);

    if (purpose === "opening") {
      setStage("ready");
    } else if (purpose === "reply") {
      setReplyReady(true);
      playReady();
    }
  }, [counterpartActivity, phase, playReady]);

  const handleSpeechLevel = useCallback(
    (level: number) => {
      const targetActivity = reduceMotion ? 0.46 : 0.28 + level * 0.72;
      const transition =
        targetActivity >= speechActivityTargetRef.current
          ? SPEECH_LEVEL_ATTACK
          : SPEECH_LEVEL_RELEASE;

      speechActivityTargetRef.current = targetActivity;
      counterpartActivity.set(withTiming(targetActivity, transition));
    },
    [counterpartActivity, reduceMotion],
  );

  const handleSpeechStart = useCallback(() => {
    phase.set(RehearsalAvatarPhase.speaking);
    speechActivityTargetRef.current = 0.34;
    counterpartActivity.set(withTiming(0.34, SPEECH_LEVEL_ATTACK));
  }, [counterpartActivity, phase]);

  const speechPlayback = useRehearsalSpeechPlayback({
    counterpart: {
      name: scenario?.relationship.counterpartName ?? "Practice partner",
      role: scenario?.relationship.counterpartRole ?? "Conversation partner",
    },
    onFinish: handleSpeechFinish,
    onLevel: handleSpeechLevel,
    onStart: handleSpeechStart,
    scenarioId: scenario?.id ?? "missing",
    scenarioVersion: scenario?.version ?? 1,
  });

  useEffect(() => {
    if (
      !scenario ||
      didStartOpeningSpeechRef.current ||
      isSceneVisible ||
      speechPlayback.isBusy
    ) {
      return;
    }

    didStartOpeningSpeechRef.current = true;
    speechPurposeRef.current = "opening";
    setStage("opening");
    void speechPlayback.speak(scenario.openingLine).then((didStart) => {
      if (!didStart) setStage("ready");
    });
  }, [isSceneVisible, scenario, speechPlayback]);

  const transcribeManagerTurn = useCallback(
    (audioFile: File, signal: AbortSignal) => {
      if (!scenario) {
        return Promise.reject(new Error("This practice could not be loaded."));
      }

      return transcribeAudio({
        audioFile,
        prompt: [
          "Short workplace conversation practice.",
          `Names and terms: ${scenario.relationship.counterpartName};`,
          `${scenario.relationship.counterpartRole};`,
          `${scenario.presentation.fullTitle}.`,
          "Preserve names and natural punctuation.",
        ].join(" "),
        signal,
      });
    },
    [scenario, transcribeAudio],
  );

  const handleTranscript = useCallback(
    async (turn: CapturedVoiceTurn) => {
      if (!scenario) return;

      setManagerLine(turn.transcript);
      setRequestError(null);
      setStage("thinking");
      phase.set(RehearsalAvatarPhase.thinking);
      counterpartActivity.set(withTiming(0.18, STATE_TRANSITION));

      try {
        const response = await generateActorTurn({
          latestManagerTurn: turn.transcript,
          reactionProfile: "defensive",
          scenarioDefinition: null,
          scenarioId: scenario.id,
          scenarioVersion: scenario.version,
          state: createOpeningSimulationState(scenario.openingState),
          transcript: [{ speaker: "manager", text: turn.transcript }],
        });

        setCounterpartLine(response.actorTurn.spokenText);
        setNextState(response.nextState);
        setReplyReady(false);
        setStage("reply");
        speechPurposeRef.current = "reply";
        const didStart = await speechPlayback.speak(
          response.actorTurn.spokenText,
        );
        if (!didStart) {
          setReplyReady(true);
          playReady();
        }
      } catch (error) {
        speechActivityTargetRef.current = 0;
        counterpartActivity.set(withTiming(0, SPEECH_LEVEL_RELEASE));
        phase.set(RehearsalAvatarPhase.idle);
        setRequestError(
          error instanceof Error
            ? error.message
            : "The reply could not be generated. Please try again.",
        );
        setStage("ready");
      }
    },
    [
      counterpartActivity,
      generateActorTurn,
      phase,
      playReady,
      scenario,
      speechPlayback,
    ],
  );

  const handleUserVoiceLevel = useCallback(
    (level: number) => {
      const targetActivity = Math.max(0, Math.min(1, level));
      const transition =
        targetActivity >= listenerActivityTargetRef.current
          ? LISTENER_LEVEL_ATTACK
          : LISTENER_LEVEL_RELEASE;

      listenerActivityTargetRef.current = targetActivity;
      listenerActivity.set(withTiming(targetActivity, transition));
    },
    [listenerActivity],
  );

  const voiceCapture = useRehearsalVoiceCapture({
    onLevel: handleUserVoiceLevel,
    onTranscript: handleTranscript,
    transcribe: transcribeManagerTurn,
  });

  useEffect(() => {
    const nextError =
      requestError ?? voiceCapture.errorMessage ?? speechPlayback.errorMessage;

    if (!nextError) {
      lastHapticErrorRef.current = null;
      return;
    }
    if (lastHapticErrorRef.current === nextError) return;

    lastHapticErrorRef.current = nextError;
    playError();
  }, [
    playError,
    requestError,
    speechPlayback.errorMessage,
    voiceCapture.errorMessage,
  ]);

  const startListening = useCallback(async () => {
    if (speechPlayback.isBusy) return;

    setRequestError(null);
    speechPlayback.clearCaption();
    const started = await voiceCapture.startCapture();
    if (started) {
      playRecordStart();
      setStage("listening");
      phase.set(RehearsalAvatarPhase.listening);
    }
  }, [phase, playRecordStart, speechPlayback, voiceCapture]);

  const stopListening = useCallback(async () => {
    playRecordStop();
    listenerActivityTargetRef.current = 0;
    listenerActivity.set(withTiming(0, LISTENER_LEVEL_RELEASE));
    phase.set(RehearsalAvatarPhase.thinking);
    setStage("thinking");
    const turn = await voiceCapture.stopCapture();
    if (!turn) {
      phase.set(RehearsalAvatarPhase.idle);
      setStage("ready");
    }
  }, [listenerActivity, phase, playRecordStop, voiceCapture]);

  const debrief = useMemo(
    () =>
      scenario && nextState && managerLine
        ? createOnboardingDebrief(scenario, nextState, managerLine)
        : null,
    [managerLine, nextState, scenario],
  );
  const retryComparison = useMemo<DebriefRetryComparison | null>(
    () =>
      originalAttempt && managerLine && nextState
        ? {
            originalFoundations: createOnboardingFoundations(
              originalAttempt.state,
            ),
            originalManagerTurn: originalAttempt.managerLine,
            replacementFoundations: createOnboardingFoundations(nextState),
            replacementManagerTurn: managerLine,
            whatChanged: describeOnboardingRetryChange(
              originalAttempt.state,
              nextState,
            ),
          }
        : null,
    [managerLine, nextState, originalAttempt],
  );

  const rehearsalLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      sceneProgress.get(),
      [0, 0.28, 0.72, 1],
      [1, 0.98, 0.74, 0.66],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: reduceMotion
          ? 1
          : interpolate(
              sceneProgress.get(),
              [0, 0.16, 1],
              [1, 1.012, 1.07],
              Extrapolation.CLAMP,
            ),
      },
    ],
  }));
  const blurAnimatedProps = useAnimatedProps(() => ({
    intensity: interpolate(
      sceneProgress.get(),
      [0, 0.16, 0.62, 1],
      [0, 1, 30, 42],
      Extrapolation.CLAMP,
    ),
  }));
  const blurLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      sceneProgress.get(),
      [0, 0.12, 1],
      [0, 1, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const atmosphereLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      sceneProgress.get(),
      [0, 0.04, 1],
      [0.78, 1, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const debriefLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      sceneProgress.get(),
      [0, 0.4, 0.5, 0.58, 1],
      [0, 0, 0.18, 1, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: reduceMotion
          ? 0
          : interpolate(
              sceneProgress.get(),
              [0.4, 0.68, 1],
              [34, 6, 0],
              Extrapolation.CLAMP,
            ),
      },
      {
        scale: reduceMotion
          ? 1
          : interpolate(
              sceneProgress.get(),
              [0.4, 0.72, 1],
              [0.94, 0.992, 1],
              Extrapolation.CLAMP,
            ),
      },
    ],
  }));

  const animateSceneTo = useCallback(
    (value: number, duration: number) =>
      new Promise<void>((resolve) => {
        sceneProgress.set(
          withTiming(
            value,
            {
              duration: reduceMotion ? Math.min(duration, 120) : duration,
              easing: SCENE_EASING,
              reduceMotion: ReduceMotion.Never,
            },
            () => runOnJS(resolve)(),
          ),
        );
      }),
    [reduceMotion, sceneProgress],
  );

  const measureSceneOrigin = useCallback(() => {
    if (sceneRunningRef.current || isSceneVisible) return;

    requestAnimationFrame(() => {
      const avatar = avatarOriginRef.current;
      const experience = experienceRef.current;
      if (!avatar || !experience) return;

      experience.measureInWindow((rootX, rootY, rootWidth, rootHeight) => {
        avatar.measureInWindow((x, y, width, height) => {
          if (rootWidth <= 0 || rootHeight <= 0) return;

          setSceneOrigin([
            Math.max(0, Math.min(1, (x + width / 2 - rootX) / rootWidth)),
            Math.max(0, Math.min(1, (y + height / 2 - rootY) / rootHeight)),
          ]);
        });
      });
    });
  }, [isSceneVisible]);

  const revealDebrief = useCallback(async () => {
    if (!debrief || sceneRunningRef.current || isSceneVisible) return;

    sceneRunningRef.current = true;
    setIsDebriefInteractive(false);
    speechPlayback.stop();
    phase.set(RehearsalAvatarPhase.idle);
    counterpartActivity.set(withTiming(0, STATE_TRANSITION));
    listenerActivity.set(withTiming(0, STATE_TRANSITION));
    setSceneDirection("into-debrief");
    sceneProgress.set(0);
    setIsSceneVisible(true);
    await nextFrame();
    playDebriefEnterHaptic();
    await animateSceneTo(1, DEBRIEF_ENTER_DURATION);
    setIsDebriefInteractive(true);
    playDebriefSettleHaptic();
    sceneRunningRef.current = false;
  }, [
    animateSceneTo,
    counterpartActivity,
    debrief,
    isSceneVisible,
    listenerActivity,
    phase,
    playDebriefEnterHaptic,
    playDebriefSettleHaptic,
    sceneProgress,
    speechPlayback,
  ]);

  const rewindPractice = useCallback(async () => {
    if (
      !scenario ||
      !managerLine ||
      !nextState ||
      originalAttempt ||
      sceneRunningRef.current
    ) {
      return;
    }

    sceneRunningRef.current = true;
    setIsRewinding(true);
    setIsDebriefInteractive(false);
    setSceneDirection("into-rehearsal");
    setOriginalAttempt({ managerLine, state: nextState });
    speechPlayback.clearCaption();
    setManagerLine(null);
    setCounterpartLine(null);
    setNextState(null);
    setReplyReady(false);
    setRequestError(null);
    setStage("opening");
    didStartOpeningSpeechRef.current = false;
    await nextFrame();
    playDebriefRewindHaptic();
    await animateSceneTo(0, DEBRIEF_REWIND_DURATION);
    setIsSceneVisible(false);
    setIsRewinding(false);
    sceneRunningRef.current = false;
    playDebriefSettleHaptic();
  }, [
    animateSceneTo,
    managerLine,
    nextState,
    originalAttempt,
    playDebriefRewindHaptic,
    playDebriefSettleHaptic,
    scenario,
    speechPlayback,
  ]);

  const continueToOutcome = useCallback(() => {
    if (!practiceCategory || !nextState) return;

    posthog?.capture("onboarding_practice_completed", {
      category: practiceCategory,
      retried: originalAttempt !== null,
    });
    setProofSnapshot({
      category: practiceCategory,
      currentFoundations: createOnboardingFoundations(nextState),
      focus: chooseOnboardingCommitmentFocus(nextState, practiceCategory),
      originalFoundations: originalAttempt
        ? createOnboardingFoundations(originalAttempt.state)
        : null,
    });
    router.push("/(onboarding)/outcome");
  }, [
    nextState,
    originalAttempt,
    practiceCategory,
    router,
    setProofSnapshot,
  ]);
  const skipPractice = useCallback(() => {
    if (!practiceCategory) return;

    router.replace({
      pathname: "/(onboarding)/commit",
      params: { category: practiceCategory },
    });
  }, [practiceCategory, router]);
  const nativeHeaderRightItems = useCallback((): NativeStackHeaderItem[] => {
    if (isSceneVisible || !practiceCategory) return [];

    return [
      {
        type: "button",
        label: "Skip",
        accessibilityHint:
          "Skips this rehearsal and continues to your commitment",
        identifier: "skip-onboarding-practice",
        onPress: skipPractice,
        tintColor: theme.primary,
      },
    ];
  }, [isSceneVisible, practiceCategory, skipPractice, theme.primary]);

  if (!practiceCategory || !scenario) {
    return (
      <View style={[styles.fallback, { backgroundColor: theme.background }]}> 
        <ThemedText style={styles.fallbackTitle}>Practice unavailable</ThemedText>
        <PressableScale onPress={() => router.back()} style={styles.textAction}>
          <ThemedText style={{ color: theme.primary }}>
            Choose another type
          </ThemedText>
        </PressableScale>
      </View>
    );
  }

  const initials = scenario.relationship.counterpartName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  const counterpartFirstName =
    scenario.relationship.counterpartName.split(" ")[0] || "They";
  const errorMessage =
    requestError ?? voiceCapture.errorMessage ?? speechPlayback.errorMessage;
  const isListening = stage === "listening";
  const isProcessing =
    stage === "opening" ||
    stage === "thinking" ||
    isActorPending ||
    speechPlayback.isBusy ||
    voiceCapture.captureState === "requestingPermission" ||
    voiceCapture.captureState === "stopping" ||
    voiceCapture.captureState === "transcribing";
  const statusLabel = getStatusLabel(
    stage,
    counterpartFirstName,
    speechPlayback.isBusy,
    voiceCapture.captureState,
  );

  return (
    <>
      <Stack.Screen
        options={{
          gestureEnabled: !isSceneVisible,
          headerBackVisible: !isSceneVisible,
          headerStyle: {
            backgroundColor: liquidGlassAvailable
              ? "transparent"
              : theme.background,
          },
          headerTintColor:
            isSceneVisible && liquidGlassAvailable ? "#FFFFFF" : theme.text,
          headerTransparent: liquidGlassAvailable,
          headerRight: isSceneVisible
            ? () => null
            : () => (
                <Pressable
                  accessibilityHint="Skips this rehearsal and continues to your commitment"
                  accessibilityLabel="Skip"
                  accessibilityRole="button"
                  hitSlop={Spacing.two}
                  onPress={skipPractice}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.56 : 1,
                    padding: Spacing.one,
                  })}
                >
                  <ThemedText
                    style={[styles.skipLabel, { color: theme.primary }]}
                  >
                    Skip
                  </ThemedText>
                </Pressable>
              ),
          title: isSceneVisible ? "Debrief" : "Practice",
          unstable_headerRightItems: nativeHeaderRightItems,
        }}
      />
      <View
        onLayout={measureSceneOrigin}
        ref={experienceRef}
        style={[styles.experience, { backgroundColor: theme.background }]}
      >
        <BlurTargetView
          accessibilityElementsHidden={isSceneVisible}
          importantForAccessibility={
            isSceneVisible ? "no-hide-descendants" : "auto"
          }
          ref={blurTargetRef}
          style={styles.rehearsalTarget}
        >
          <Animated.View
            pointerEvents={isSceneVisible ? "none" : "auto"}
            style={[styles.rehearsalLayer, rehearsalLayerStyle]}
          >
            <View
              style={[
                styles.screen,
                {
                  backgroundColor: theme.background,
                  paddingBottom: Math.max(insets.bottom, Spacing.four),
                  paddingTop: Spacing.two,
                },
              ]}
            >
              <OnboardingProgress
                currentStep={2}
                style={styles.onboardingProgress}
              />

              <View style={styles.content}>
              <View style={styles.identity}>
                <View
                  collapsable={false}
                  onLayout={measureSceneOrigin}
                  ref={avatarOriginRef}
                >
                  <ReactiveInitialsAvatar
                    accessibilityLabel={`${scenario.relationship.counterpartName} avatar`}
                    accentColor={categoryColor}
                    activity={counterpartActivity}
                    initials={initials}
                    listenerActivity={listenerActivity}
                    onAccentColor={theme.onPrimary}
                    phase={phase}
                  />
                </View>

                <View style={styles.stateCopy}>
                  {statusLabel ? (
                    <ThemedText
                      accessibilityLiveRegion="polite"
                      style={styles.stateTitle}
                    >
                      {statusLabel}
                    </ThemedText>
                  ) : null}

                  {speechPlayback.caption ? (
                    <View style={styles.captionSlot}>
                      <Animated.View
                        key={speechPlayback.caption.phraseIndex}
                        entering={CAPTION_PHRASE_ENTERING}
                        exiting={CAPTION_PHRASE_EXITING}
                        style={styles.captionPhrase}
                      >
                        <LiveSpeechCaption
                          activeColor={theme.primary}
                          activeWordPosition={
                            speechPlayback.activeCaptionWordPosition
                          }
                          caption={speechPlayback.caption}
                          highlightProgress={
                            speechPlayback.captionHighlightProgress
                          }
                          inactiveColor={theme.textSecondary}
                          style={styles.captionText}
                        />
                      </Animated.View>
                    </View>
                  ) : stage === "reply" && counterpartLine ? (
                    <ThemedText
                      accessibilityLiveRegion="polite"
                      numberOfLines={3}
                      style={[styles.messageText, { color: theme.textSecondary }]}
                    >
                      {counterpartLine}
                    </ThemedText>
                  ) : errorMessage ? (
                    <ThemedText
                      accessibilityLiveRegion="polite"
                      style={[styles.messageText, { color: theme.textSecondary }]}
                    >
                      {errorMessage}
                    </ThemedText>
                  ) : null}
                </View>
              </View>

              <View style={styles.controlSlot}>
                {stage === "reply" && replyReady && debrief ? (
                  <Animated.View
                    entering={COMPLETION_ENTERING}
                    style={styles.completionGroup}
                  >
                    <View style={styles.completionStatus}>
                      <SymbolView
                        name="checkmark.circle.fill"
                        size={Sizing.icon.medium}
                        tintColor={categoryColor}
                      />
                      <ThemedText style={styles.completionTitle}>
                        {originalAttempt ? "Retry complete" : "Practice complete"}
                      </ThemedText>
                    </View>
                    <PressableScale
                      accessibilityHint="Opens feedback tied to the words you just used"
                      accessibilityRole="button"
                      onPress={revealDebrief}
                      style={[
                        styles.debriefButton,
                        { backgroundColor: theme.primary },
                      ]}
                    >
                      <ThemedText
                        style={styles.debriefButtonText}
                        themeColor="onPrimary"
                      >
                        {originalAttempt
                          ? "See what changed"
                          : "Review the conversation"}
                      </ThemedText>
                      <SymbolView
                        name="arrow.right"
                        size={Sizing.icon.medium}
                        tintColor={theme.onPrimary}
                      />
                    </PressableScale>
                  </Animated.View>
                ) : (
                  <View style={styles.voiceControl}>
                    <PressableScale
                      accessibilityHint={
                        isListening
                          ? "Stops recording and sends your response"
                          : "Starts recording your response"
                      }
                      accessibilityRole="button"
                      accessibilityState={{
                        busy: isProcessing,
                        disabled: isProcessing,
                        selected: isListening,
                      }}
                      disabled={isProcessing}
                      onPress={isListening ? stopListening : startListening}
                      style={[
                        styles.voiceButton,
                        {
                          backgroundColor: theme.primary,
                          opacity: isProcessing ? 0.62 : 1,
                        },
                      ]}
                    >
                      <SymbolView
                        name={
                          isListening
                            ? "stop.fill"
                            : speechPlayback.isBusy
                              ? "speaker.wave.2.fill"
                              : "mic.fill"
                        }
                        size={Sizing.icon.large}
                        tintColor={theme.onPrimary}
                      />
                    </PressableScale>
                    <ThemedText style={styles.voiceLabel}>
                      {getControlLabel(
                        stage,
                        voiceCapture.captureState,
                        counterpartFirstName,
                      )}
                    </ThemedText>
                  </View>
                )}
              </View>
              </View>
            </View>
          </Animated.View>
        </BlurTargetView>

        {isSceneVisible && debrief ? (
          <>
            <AnimatedBlurView
              accessible={false}
              animatedProps={blurAnimatedProps}
              blurMethod="dimezisBlurViewSdk31Plus"
              blurReductionFactor={1}
              blurTarget={blurTargetRef}
              intensity={0}
              pointerEvents="none"
              style={[styles.sceneLayer, blurLayerStyle]}
              tint="systemUltraThinMaterialDark"
            />
            <Animated.View
              accessible={false}
              pointerEvents="none"
              style={[styles.sceneLayer, atmosphereLayerStyle]}
            >
              <DebriefTransitionField
                accentColor={debriefAccent}
                direction={sceneDirection}
                origin={sceneOrigin}
                progress={sceneProgress}
              />
            </Animated.View>
            <Animated.View
              accessibilityElementsHidden={!isDebriefInteractive}
              accessibilityViewIsModal={isDebriefInteractive}
              importantForAccessibility={
                isDebriefInteractive ? "yes" : "no-hide-descendants"
              }
              pointerEvents={isDebriefInteractive ? "auto" : "none"}
              style={[styles.sceneLayer, debriefLayerStyle]}
            >
              <DebriefScreen
                accentColor={debriefAccent}
                counterpartLineByTurnId={{
                  "onboarding-manager-turn": scenario.openingLine,
                }}
                counterpartName={scenario.relationship.counterpartName}
                continueError={null}
                continueHint="Shows what this rehearsal made clear"
                continueLabel="Continue"
                debrief={debrief}
                embedded
                isContinuing={false}
                isRewinding={isRewinding}
                onContinue={continueToOutcome}
                onRewind={originalAttempt ? null : rewindPractice}
                retryComparison={retryComparison}
                rewindError={null}
              />
            </Animated.View>
          </>
        ) : null}
      </View>
    </>
  );
}

function createOnboardingDebrief(
  scenario: ScenarioDefinition,
  state: SimulationState,
  managerLine: string,
): Debrief {
  const preview = createDevDebriefPreview(scenario);
  const counterpartFirstName =
    scenario.relationship.counterpartName.split(" ")[0] || "They";
  const worked = state.managerAskedForPerspective
    ? "You made room for their perspective instead of arguing with the pushback."
    : state.issueWasMadeSpecific
      ? "You made the issue concrete enough for them to respond to it."
      : state.expectationIsClear
        ? "You kept the expectation visible when the conversation got uncomfortable."
        : "You stayed in the conversation when they pushed back.";
  const next = !state.issueWasMadeSpecific
    ? "Name the observable behavior and its impact."
    : !state.managerAskedForPerspective
      ? "Ask what is behind their reaction before restating the standard."
      : !state.expectationIsClear
        ? "State clearly what needs to change."
        : "Finish with one concrete next step.";
  return {
    ...preview,
    outcome: `${counterpartFirstName} pushed back, and you practiced staying with the conversation instead of avoiding it.`,
    foundations: createOnboardingFoundations(state),
    moments: [
      {
        ...preview.moments[0],
        consequence: `${worked} Next, ${next.charAt(0).toLowerCase()}${next.slice(1)}`,
        evidenceIds: [],
        id: "onboarding-rewind-moment",
        impact:
          state.issueWasMadeSpecific || state.managerAskedForPerspective
            ? "helped"
            : "mixed",
        observation: worked,
        quote: managerLine.replace(/\s+/g, " ").trim().slice(0, 160),
        rewindable: true,
        turnId: "onboarding-manager-turn",
      },
    ],
  };
}

function getStatusLabel(
  stage: PracticeStage,
  counterpartFirstName: string,
  speechIsBusy: boolean,
  captureState: ReturnType<typeof useRehearsalVoiceCapture>["captureState"],
) {
  if (speechIsBusy) return `${counterpartFirstName} is speaking`;
  if (captureState === "transcribing") return "Listening back…";
  if (stage === "listening") return "Listening";
  if (stage === "thinking") return `${counterpartFirstName} is thinking`;
  return null;
}

function getControlLabel(
  stage: PracticeStage,
  captureState: ReturnType<typeof useRehearsalVoiceCapture>["captureState"],
  counterpartFirstName: string,
) {
  if (captureState === "requestingPermission") return "Opening the microphone…";
  if (captureState === "permissionDenied")
    return "Microphone access is required";
  if (captureState === "transcribing") return "Listening back…";
  if (stage === "opening") return `${counterpartFirstName} is speaking`;
  if (stage === "listening") return "Tap when you’re finished";
  if (stage === "thinking") return "Preparing their response…";
  if (stage === "reply") return `${counterpartFirstName} is speaking`;
  return "Tap to reply";
}

function isPracticeCategory(
  value: string | undefined,
): value is PracticeCategory {
  return value === "feedback" || value === "boundary" || value === "pushback";
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

const styles = StyleSheet.create({
  experience: { flex: 1, overflow: "hidden" },
  rehearsalTarget: { flex: 1 },
  rehearsalLayer: { flex: 1 },
  sceneLayer: { ...StyleSheet.absoluteFill, overflow: "hidden" },
  screen: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: Spacing.four,
  },
  onboardingProgress: {
    marginBottom: Spacing.two,
    maxWidth: Sizing.content.compact,
  },
  skipLabel: { fontSize: FontSize.bodyLarge, fontWeight: "600" },
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
    maxWidth: MaxContentWidth,
    width: "100%",
  },
  identity: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    width: "100%",
  },
  stateCopy: {
    alignItems: "center",
    gap: Spacing.one,
    marginTop: Spacing.five,
    minHeight: 56,
    width: "100%",
  },
  stateTitle: {
    fontSize: FontSize.small,
    fontWeight: "600",
    textAlign: "center",
  },
  captionSlot: { minHeight: 52, position: "relative", width: "100%" },
  captionPhrase: { left: 0, position: "absolute", right: 0, top: 0 },
  captionText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "600",
    textAlign: "center",
  },
  messageText: { fontSize: FontSize.small, textAlign: "center" },
  controlSlot: {
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: Sizing.avatar.large + Spacing.three + FontSize.body,
    width: "100%",
  },
  voiceControl: { alignItems: "center", gap: Spacing.three },
  voiceButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  voiceLabel: { fontSize: FontSize.small, fontWeight: "600" },
  completionGroup: {
    alignItems: "center",
    gap: Spacing.three,
    width: "100%",
  },
  completionStatus: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    justifyContent: "center",
  },
  completionTitle: { fontSize: FontSize.bodyLarge, fontWeight: "700" },
  debriefButton: {
    alignItems: "center",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: Sizing.control.large,
    paddingHorizontal: Spacing.four,
    width: "100%",
  },
  debriefButtonText: { fontSize: FontSize.body, fontWeight: "700" },
  fallback: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.three,
    justifyContent: "center",
    padding: Spacing.four,
  },
  fallbackTitle: { fontSize: FontSize.headingLarge, fontWeight: "700" },
  textAction: { justifyContent: "center" },
});
