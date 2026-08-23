import { useMutation } from "@tanstack/react-query";
import type { NativeStackHeaderItem } from "@react-navigation/native-stack";
import { BlurTargetView, BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import type { File } from "expo-file-system";
import { Link, Stack, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableScale } from "pressto";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInUp,
  FadeOut,
  interpolate,
  interpolateColor,
  ReduceMotion,
  runOnJS,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ReactiveInitialsAvatar,
  RehearsalAvatarPhase,
  type RehearsalAvatarPhaseValue,
} from "@/components/reactive-initials-avatar";
import { useConversationTransition } from "@/components/conversation-transition-provider";
import { DebriefTransitionField } from "@/components/debrief-atmosphere";
import { ThemedText } from "@/components/themed-text";
import {
  FontSize,
  MaxContentWidth,
  PracticeCategoryColors,
  Sizing,
  Spacing,
} from "@/constants/theme";
import { createDevDebriefPreview } from "@/data/dev-debrief-preview";
import type { ScenarioBrief } from "@/data/scenarios";
import type { Debrief, DebriefMoment } from "@/domain/coaching";
import type { ScenarioDefinition } from "@/domain/scenario";
import type { PracticeSession } from "@/domain/session";
import type { SpeechCaptionSnapshot } from "@/domain/speech-caption";
import {
  useRehearsalActor,
  type RehearsalActorState,
} from "@/hooks/use-rehearsal-actor";
import {
  useRehearsalSpeechPlayback,
  type RehearsalSpeechPlaybackState,
} from "@/hooks/use-rehearsal-speech-playback";
import {
  useRehearsalVoiceCapture,
  type CapturedVoiceTurn,
  type VoiceCaptureState,
} from "@/hooks/use-rehearsal-voice-capture";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import { DebriefScreen } from "@/screens/debrief-screen";
import {
  createAndLoadRewind,
  loadOrCreateInitialDebrief,
  prepareSessionPlan,
} from "@/services/query/debrief-flow";
import type { CounterpartLineByTurnId } from "@/services/query/debrief-context";
import {
  useDebriefMutation,
  useTranscriptionMutation,
} from "@/services/query/rehearsal-mutations";

type RehearsalScreenProps = {
  mode: "original" | "rewind";
  scenario: ScenarioBrief;
  scenarioDefinition: ScenarioDefinition;
  session: PracticeSession;
};

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
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
const VOICE_CONTROL_ENTERING = FadeIn.duration(160)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);
const VOICE_CONTROL_EXITING = FadeOut.duration(140)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);
const COMPLETION_ENTERING = FadeInUp.duration(260)
  .easing(EASE_OUT)
  .reduceMotion(ReduceMotion.System);
const COMPLETION_REVEAL_DELAY = 360;
const SCENE_EASING = Easing.bezier(0.32, 0, 0.16, 1);
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

type DebriefSceneState =
  | {
      readonly kind: "loading";
      readonly preview: boolean;
    }
  | {
      readonly branchId: string;
      readonly counterpartLineByTurnId: CounterpartLineByTurnId;
      readonly debrief: Debrief;
      readonly kind: "ready";
      readonly preview: boolean;
    }
  | {
      readonly kind: "error";
      readonly message: string;
      readonly preview: boolean;
    };

export function RehearsalScreen({
  mode: initialMode,
  scenario,
  scenarioDefinition,
  session: initialSession,
}: RehearsalScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + (process.env.EXPO_OS === "ios" ? 44 : 56);
  const reduceMotion = useReducedMotion();
  const { isTransitioning: isRouteTransitioning, startConversationTransition } =
    useConversationTransition();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const theme = useTheme();
  const categoryColor =
    PracticeCategoryColors[colorScheme][scenarioDefinition.category];
  const [activeRun, setActiveRun] = useState({
    mode: initialMode,
    session: initialSession,
  });
  const [debriefScene, setDebriefScene] = useState<DebriefSceneState | null>(
    null,
  );
  const [sceneDirection, setSceneDirection] = useState<
    "into-debrief" | "into-rehearsal"
  >("into-debrief");
  const [sceneOrigin, setSceneOrigin] = useState<readonly [number, number]>([
    0.5, 0.43,
  ]);
  const [isDebriefInteractive, setIsDebriefInteractive] = useState(false);
  const [isRestoringRewind, setIsRestoringRewind] = useState(false);
  const [completionReadyBranchId, setCompletionReadyBranchId] = useState<
    string | null
  >(null);
  const sceneProgress = useSharedValue(0);
  const avatarOriginRef = useRef<View | null>(null);
  const blurTargetRef = useRef<View | null>(null);
  const experienceRef = useRef<View | null>(null);
  const sceneRunningRef = useRef(false);
  const pendingRewindBranchRef = useRef<string | null>(null);
  const mode = activeRun.mode;
  const session = activeRun.session;
  const isSceneVisible = debriefScene !== null;
  const isTransitioning = isRouteTransitioning || isSceneVisible;
  const counterpartActivity = useSharedValue(0);
  const userVoiceLevel = useSharedValue(0);
  const phase = useSharedValue<RehearsalAvatarPhaseValue>(
    RehearsalAvatarPhase.idle,
  );
  const controlScale = useSharedValue(1);
  const didStartOpeningSpeechRef = useRef(false);
  const speechActivityTargetRef = useRef(0);
  const listenerActivityTargetRef = useRef(0);
  const {
    actorReply,
    actorState,
    canEndPractice,
    canRetry,
    endPractice,
    errorMessage: actorErrorMessage,
    retryActor,
    submitManagerTurn,
  } = useRehearsalActor({
    scenario: scenarioDefinition,
    session,
  });
  const { mutateAsync: transcribeAudio } = useTranscriptionMutation(session.id);
  const { mutateAsync: generateDebrief } = useDebriefMutation(session.id);

  const handleSpeechStart = useCallback(() => {
    phase.set(RehearsalAvatarPhase.speaking);
    speechActivityTargetRef.current = 0.34;
    counterpartActivity.set(withTiming(0.34, SPEECH_LEVEL_ATTACK));
  }, [counterpartActivity, phase]);

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

  const handleSpeechFinish = useCallback(() => {
    phase.set(RehearsalAvatarPhase.idle);
    speechActivityTargetRef.current = 0;
    counterpartActivity.set(withTiming(0, SPEECH_LEVEL_RELEASE));
  }, [counterpartActivity, phase]);

  const speechPlayback = useRehearsalSpeechPlayback({
    counterpart: {
      name: scenarioDefinition.relationship.counterpartName,
      role: scenarioDefinition.relationship.counterpartRole,
    },
    onFinish: handleSpeechFinish,
    onLevel: handleSpeechLevel,
    onStart: handleSpeechStart,
    scenarioId: scenarioDefinition.id,
    scenarioVersion: scenarioDefinition.version,
  });
  const isOpeningSpeechBusy = speechPlayback.isBusy;
  const speakOpeningLine = speechPlayback.speak;

  useEffect(() => {
    didStartOpeningSpeechRef.current = false;
  }, [session.activeBranchId]);

  useEffect(() => {
    if (
      didStartOpeningSpeechRef.current ||
      isOpeningSpeechBusy ||
      isTransitioning
    ) {
      return;
    }

    const lineToReplay =
      mode === "rewind"
        ? actorState === "responded" && actorReply
          ? actorReply
          : actorState === "idle" && actorReply === null
            ? scenarioDefinition.openingLine
            : null
        : actorState === "idle" && actorReply === null
          ? scenarioDefinition.openingLine
          : null;

    if (!lineToReplay) {
      return;
    }

    didStartOpeningSpeechRef.current = true;
    void speakOpeningLine(lineToReplay);
  }, [
    actorReply,
    actorState,
    mode,
    scenarioDefinition.openingLine,
    isOpeningSpeechBusy,
    isTransitioning,
    speakOpeningLine,
  ]);

  const handleUserVoiceLevel = useCallback(
    (level: number) => {
      const targetActivity = Math.max(0, Math.min(1, level));
      const transition =
        targetActivity >= listenerActivityTargetRef.current
          ? LISTENER_LEVEL_ATTACK
          : LISTENER_LEVEL_RELEASE;

      listenerActivityTargetRef.current = targetActivity;
      userVoiceLevel.set(withTiming(targetActivity, transition));
    },
    [userVoiceLevel],
  );

  const handleTranscript = useCallback(
    async (turn: CapturedVoiceTurn) => {
      phase.set(RehearsalAvatarPhase.thinking);
      counterpartActivity.set(withTiming(0.2, STATE_TRANSITION));
      const response = await submitManagerTurn(turn.transcript);

      if (response) {
        await speechPlayback.speak(response.actorTurn.spokenText);
      }
    },
    [counterpartActivity, phase, speechPlayback, submitManagerTurn],
  );

  const transcribeManagerTurn = useCallback(
    (audioFile: File, signal: AbortSignal) =>
      transcribeAudio({
        audioFile,
        prompt: [
          "Private workplace conversation.",
          `Names and terms: ${scenarioDefinition.relationship.counterpartName};`,
          `${scenarioDefinition.relationship.counterpartRole};`,
          `${scenarioDefinition.presentation.fullTitle}.`,
          "Preserve names and natural punctuation.",
        ].join(" "),
        signal,
      }),
    [scenarioDefinition, transcribeAudio],
  );

  const voiceCapture = useRehearsalVoiceCapture({
    onLevel: handleUserVoiceLevel,
    onTranscript: handleTranscript,
    transcribe: transcribeManagerTurn,
  });

  const initials = scenario.counterpart.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
  const counterpartFirstName = scenario.counterpart.name.split(" ")[0];

  const controlStyle = useAnimatedStyle(() => {
    const voiceLift = reduceMotion ? 0 : userVoiceLevel.get() * 0.07;

    return {
      transform: [{ scale: controlScale.get() * (1 + voiceLift) }],
    };
  });

  const voiceHaloStyle = useAnimatedStyle(() => ({
    opacity: userVoiceLevel.get() * 0.34,
    transform: [{ scale: reduceMotion ? 1 : 1 + userVoiceLevel.get() * 0.42 }],
  }));
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
  const loadingLayerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      sceneProgress.get(),
      [0, 0.12, 0.38],
      [0, 0.5, 1],
      Extrapolation.CLAMP,
    ),
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
            () => {
              runOnJS(resolve)();
            },
          ),
        );
      }),
    [reduceMotion, sceneProgress],
  );
  const measureSceneOrigin = useCallback(() => {
    if (sceneRunningRef.current || debriefScene) {
      return;
    }

    requestAnimationFrame(() => {
      if (sceneRunningRef.current) {
        return;
      }

      const avatar = avatarOriginRef.current;
      const experience = experienceRef.current;

      if (!avatar || !experience) {
        return;
      }

      experience.measureInWindow((rootX, rootY, rootWidth, rootHeight) => {
        avatar.measureInWindow((x, y, width, height) => {
          if (rootWidth <= 0 || rootHeight <= 0) {
            return;
          }

          const nextOrigin = [
            Math.max(0, Math.min(1, (x + width / 2 - rootX) / rootWidth)),
            Math.max(0, Math.min(1, (y + height / 2 - rootY) / rootHeight)),
          ] as const;

          setSceneOrigin((current) =>
            Math.abs(current[0] - nextOrigin[0]) < 0.002 &&
            Math.abs(current[1] - nextOrigin[1]) < 0.002
              ? current
              : nextOrigin,
          );
        });
      });
    });
  }, [debriefScene]);

  const handlePressIn = () => {
    controlScale.set(
      withTiming(reduceMotion ? 1 : 0.97, {
        duration: 120,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion.System,
      }),
    );
  };

  const handlePressOut = () => {
    controlScale.set(
      withTiming(1, {
        duration: 140,
        easing: EASE_OUT,
        reduceMotion: ReduceMotion.System,
      }),
    );
  };

  const handleMicrophonePress = async () => {
    if (
      voiceCapture.captureState === "requestingPermission" ||
      voiceCapture.captureState === "stopping" ||
      voiceCapture.captureState === "transcribing" ||
      actorState === "hydrating" ||
      actorState === "responding" ||
      speechPlayback.isBusy ||
      actorState === "complete"
    ) {
      return;
    }

    if (process.env.EXPO_OS === "ios") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (voiceCapture.captureState === "listening") {
      phase.set(RehearsalAvatarPhase.thinking);
      counterpartActivity.set(withTiming(0.16, STATE_TRANSITION));
      await voiceCapture.stopCapture();
      return;
    }

    if (actorState === "error" && canRetry) {
      speechPlayback.clearCaption();
      phase.set(RehearsalAvatarPhase.thinking);
      counterpartActivity.set(withTiming(0.2, STATE_TRANSITION));
      const response = await retryActor();

      if (response) {
        await speechPlayback.speak(response.actorTurn.spokenText);
      }
      return;
    }

    counterpartActivity.set(withTiming(0, STATE_TRANSITION));
    phase.set(RehearsalAvatarPhase.idle);
    speechPlayback.clearCaption();
    const didStart = await voiceCapture.startCapture();

    if (didStart) {
      phase.set(RehearsalAvatarPhase.listening);
      counterpartActivity.set(withTiming(0.14, STATE_TRANSITION));
    }
  };

  const isListening = voiceCapture.captureState === "listening";
  const isBusy =
    voiceCapture.captureState === "requestingPermission" ||
    voiceCapture.captureState === "stopping" ||
    voiceCapture.captureState === "transcribing" ||
    actorState === "hydrating" ||
    actorState === "ending" ||
    actorState === "responding" ||
    speechPlayback.isBusy ||
    isTransitioning;
  const isConversationComplete = actorState === "complete";
  const isCompletionReady =
    isConversationComplete &&
    !speechPlayback.isBusy &&
    completionReadyBranchId === session.activeBranchId;

  useEffect(() => {
    const activeBranchId = session.activeBranchId;
    if (
      !activeBranchId ||
      !isConversationComplete ||
      speechPlayback.isBusy ||
      isSceneVisible
    ) {
      return;
    }

    const timeout = setTimeout(
      () => {
        setCompletionReadyBranchId(activeBranchId);
        if (process.env.EXPO_OS === "ios") {
          void Haptics.selectionAsync();
        }
      },
      reduceMotion ? 120 : COMPLETION_REVEAL_DELAY,
    );

    return () => clearTimeout(timeout);
  }, [
    isConversationComplete,
    isSceneVisible,
    reduceMotion,
    session.activeBranchId,
    speechPlayback.isBusy,
  ]);
  const rewindMutation = useMutation({
    mutationKey: ["rehearsal", "persistent-rewind", session.id],
    mutationFn: ({
      branchId,
      moment,
    }: {
      branchId: string;
      moment: DebriefMoment;
    }) =>
      createAndLoadRewind({
        branchId,
        moment,
        sessionId: session.id,
      }),
  });
  const planMutation = useMutation({
    mutationKey: ["rehearsal", "open-plan", session.id],
    mutationFn: () => prepareSessionPlan(session.id),
    onSuccess: () => {
      setIsDebriefInteractive(false);
      router.replace({
        pathname: "/session/[sessionId]/plan",
        params: { sessionId: session.id },
      });
    },
  });
  const revealDebrief = useCallback(
    async (preview: boolean, retrying = false) => {
      if (sceneRunningRef.current || (!retrying && debriefScene)) {
        return;
      }

      sceneRunningRef.current = true;
      setIsDebriefInteractive(false);
      speechPlayback.stop();
      phase.set(RehearsalAvatarPhase.idle);
      counterpartActivity.set(withTiming(0, STATE_TRANSITION));
      userVoiceLevel.set(withTiming(0, STATE_TRANSITION));
      setSceneDirection("into-debrief");
      setDebriefScene({ kind: "loading", preview });

      if (!retrying) {
        sceneProgress.set(0);
        if (process.env.EXPO_OS === "ios") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        await nextFrame();
      }

      const loadPromise = preview
        ? Promise.resolve(
            createEmbeddedPreviewResult(scenarioDefinition, session),
          )
        : loadOrCreateInitialDebrief({
            generateDebrief,
            sessionId: session.id,
          });
      const enterPromise = retrying
        ? Promise.resolve()
        : animateSceneTo(1, 900);

      try {
        const result = await loadPromise;
        setActiveRun((current) => ({
          ...current,
          session: result.session,
        }));
        setDebriefScene({
          branchId: result.branchId,
          counterpartLineByTurnId: result.counterpartLineByTurnId,
          debrief: result.debrief,
          kind: "ready",
          preview,
        });
        await nextFrame();
        await enterPromise;
        setIsDebriefInteractive(true);
        if (process.env.EXPO_OS === "ios") {
          void Haptics.selectionAsync();
        }
      } catch (error) {
        setDebriefScene({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "The debrief could not be generated. Please try again.",
          preview,
        });
        await enterPromise;
        setIsDebriefInteractive(true);
      } finally {
        sceneRunningRef.current = false;
      }
    },
    [
      animateSceneTo,
      counterpartActivity,
      debriefScene,
      generateDebrief,
      phase,
      scenarioDefinition,
      sceneProgress,
      session,
      speechPlayback,
      userVoiceLevel,
    ],
  );
  const closeDebriefScene = useCallback(async () => {
    if (sceneRunningRef.current) {
      return;
    }

    sceneRunningRef.current = true;
    setIsDebriefInteractive(false);
    setSceneDirection("into-rehearsal");
    await nextFrame();
    await animateSceneTo(0, 680);
    await nextFrame();
    await nextFrame();
    setDebriefScene(null);
    setIsRestoringRewind(false);
    if (process.env.EXPO_OS === "ios") {
      void Haptics.selectionAsync();
    }
    sceneRunningRef.current = false;
  }, [animateSceneTo]);
  const rewindFromDebrief = useCallback(
    async (moment: DebriefMoment) => {
      if (debriefScene?.kind !== "ready" || isRestoringRewind) {
        return;
      }

      rewindMutation.reset();
      if (debriefScene.preview) {
        await closeDebriefScene();
        return;
      }

      setIsRestoringRewind(true);
      planMutation.reset();
      try {
        const rewind = await rewindMutation.mutateAsync({
          branchId: debriefScene.branchId,
          moment,
        });
        pendingRewindBranchRef.current = rewind.session.activeBranchId;
        setActiveRun({ mode: "rewind", session: rewind.session });
      } catch {
        setIsRestoringRewind(false);
      }
    },
    [
      closeDebriefScene,
      debriefScene,
      isRestoringRewind,
      planMutation,
      rewindMutation,
    ],
  );
  const continueFromDebrief = useCallback(() => {
    if (
      debriefScene?.kind !== "ready" ||
      debriefScene.preview ||
      isRestoringRewind ||
      planMutation.isPending
    ) {
      return;
    }

    rewindMutation.reset();
    planMutation.mutate();
  }, [debriefScene, isRestoringRewind, planMutation, rewindMutation]);
  const openDevPlanPreview = useCallback(() => {
    if (debriefScene?.kind !== "ready" || !debriefScene.preview) {
      return;
    }

    router.push({
      pathname: "/session/[sessionId]/plan",
      params: { preview: "debrief", sessionId: session.id },
    });
  }, [debriefScene, router, session.id]);

  useEffect(() => {
    const pendingBranchId = pendingRewindBranchRef.current;
    if (
      !pendingBranchId ||
      session.activeBranchId !== pendingBranchId ||
      (actorState !== "idle" &&
        actorState !== "responded" &&
        actorState !== "error")
    ) {
      return;
    }

    pendingRewindBranchRef.current = null;
    void closeDebriefScene();
  }, [actorState, closeDebriefScene, session.activeBranchId]);

  const openDebrief = useCallback(() => {
    if (mode === "original") {
      void revealDebrief(false);
      return;
    }
    if (isRouteTransitioning) {
      return;
    }

    void startConversationTransition({
      accentColor: PracticeCategoryColors.dark[scenarioDefinition.category],
      direction: "into-debrief",
      navigate: () => {
        router.push({
          pathname: "/session/[sessionId]/debrief",
          params: { sessionId: session.id },
        });
      },
    });
  }, [
    isRouteTransitioning,
    mode,
    revealDebrief,
    router,
    scenarioDefinition.category,
    session.id,
    startConversationTransition,
  ]);
  const openDevDebrief = useCallback(() => {
    void revealDebrief(true);
  }, [revealDebrief]);
  const openTranscript = useCallback(() => {
    if (isBusy) {
      return;
    }

    router.push({
      pathname: "/session/[sessionId]/transcript",
      params: { sessionId: session.id },
    });
  }, [isBusy, router, session.id]);
  const handleEndPractice = useCallback(async () => {
    phase.set(RehearsalAvatarPhase.idle);
    counterpartActivity.set(withTiming(0, STATE_TRANSITION));
    userVoiceLevel.set(withTiming(0, STATE_TRANSITION));

    try {
      const didEnd = await endPractice();
      if (!didEnd) {
        Alert.alert(
          "Keep practicing",
          `Finish the current exchange before ending practice.`,
        );
      }
    } catch {
      Alert.alert(
        "Couldn’t end practice",
        "Your rehearsal is still saved. Please try again.",
      );
    }
  }, [counterpartActivity, endPractice, phase, userVoiceLevel]);
  const confirmEndPractice = useCallback(() => {
    if (!canEndPractice || isBusy || isConversationComplete) {
      return;
    }

    Alert.alert(
      "End practice?",
      "You’ll keep everything you said and can review the conversation next.",
      [
        { text: "Keep practicing", style: "cancel" },
        {
          text: "End practice",
          style: "destructive",
          onPress: () => void handleEndPractice(),
        },
      ],
    );
  }, [canEndPractice, handleEndPractice, isBusy, isConversationComplete]);
  const nativeHeaderRightItems = useCallback((): NativeStackHeaderItem[] => {
    if (isSceneVisible) {
      return [];
    }

    const items: NativeStackHeaderItem[] = [];
    if (__DEV__) {
      items.push({
        type: "button",
        label: "Debrief preview",
        accessibilityHint:
          "Opens the animated debrief without completing this rehearsal",
        disabled: isBusy,
        icon: { type: "sfSymbol", name: "sparkles" },
        identifier: "dev-debrief-preview",
        onPress: openDevDebrief,
        tintColor: theme.primary,
      });
    }

    items.push({
      type: "button",
      label: "Transcript",
      accessibilityHint: "Shows completed conversation turns",
      disabled: isBusy,
      icon: { type: "sfSymbol", name: "text.bubble" },
      identifier: "rehearsal-transcript",
      onPress: openTranscript,
      tintColor: theme.text,
    });

    if (canEndPractice && !isConversationComplete) {
      items.push({
        type: "menu",
        label: "Practice options",
        accessibilityHint: "Shows options for this rehearsal",
        icon: { type: "sfSymbol", name: "ellipsis" },
        identifier: "rehearsal-options",
        menu: {
          title: "Practice",
          items: [
            {
              type: "action",
              label: "End practice",
              description: "Finish now and review what happened so far",
              destructive: true,
              disabled: isBusy,
              icon: { type: "sfSymbol", name: "stop.circle" },
              onPress: confirmEndPractice,
            },
          ],
        },
        tintColor: theme.text,
      });
    }

    return items;
  }, [
    canEndPractice,
    confirmEndPractice,
    isBusy,
    isConversationComplete,
    isSceneVisible,
    openDevDebrief,
    openTranscript,
    theme.primary,
    theme.text,
  ]);
  const voiceCopy = getVoiceCopy({
    actorErrorMessage,
    actorState,
    captureState: voiceCapture.captureState,
    counterpartFirstName,
    errorMessage: voiceCapture.errorMessage,
    speechErrorMessage: speechPlayback.errorMessage,
    speechState: speechPlayback.playbackState,
    transcript: voiceCapture.capturedTurn?.transcript ?? "",
    capturedDurationSeconds: voiceCapture.capturedTurn?.durationSeconds ?? null,
  });
  const hasCenterCopy =
    voiceCopy.statusLabel !== null ||
    speechPlayback.caption !== null ||
    voiceCopy.message !== null;

  return (
    <>
      <Stack.Screen
        options={{
          contentStyle: {
            backgroundColor: theme.background,
          },
          headerBackVisible: !isSceneVisible,
          gestureEnabled: !isSceneVisible,
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerTintColor: isSceneVisible ? "#FFFFFF" : theme.text,
          headerTransparent: true,
          title: isSceneVisible ? "Debrief" : scenario.counterpart.name,
          headerRight: isSceneVisible
            ? () => null
            : () => (
                <View style={styles.headerActions}>
                  {__DEV__ ? (
                    <Pressable
                      accessibilityHint="Opens the animated debrief without completing this rehearsal"
                      accessibilityLabel="Preview animated debrief"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: isBusy }}
                      disabled={isBusy}
                      hitSlop={Spacing.two}
                      onPress={openDevDebrief}
                      style={({ pressed }) => ({
                        opacity: isBusy ? 0.32 : pressed ? 0.56 : 1,
                        padding: Spacing.one,
                      })}
                    >
                      <SymbolView
                        name={{
                          ios: "sparkles",
                          android: "auto_awesome",
                          web: "auto_awesome",
                        }}
                        size={Sizing.icon.medium}
                        tintColor={theme.primary}
                      />
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityHint="Shows completed conversation turns"
                    accessibilityLabel="Transcript"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: isBusy }}
                    disabled={isBusy}
                    hitSlop={Spacing.two}
                    onPress={openTranscript}
                    style={({ pressed }) => ({
                      opacity: isBusy ? 0.32 : pressed ? 0.56 : 1,
                      padding: Spacing.one,
                    })}
                  >
                    <SymbolView
                      name={{
                        ios: "text.bubble",
                        android: "chat_bubble_outline",
                        web: "chat_bubble_outline",
                      }}
                      size={Sizing.icon.medium}
                      tintColor={theme.text}
                    />
                  </Pressable>
                  {canEndPractice && !isConversationComplete ? (
                    <Pressable
                      accessibilityHint="Allows you to finish this rehearsal early"
                      accessibilityLabel="Practice options"
                      accessibilityRole="button"
                      accessibilityState={{ disabled: isBusy }}
                      disabled={isBusy}
                      hitSlop={Spacing.two}
                      onPress={confirmEndPractice}
                      style={({ pressed }) => ({
                        opacity: isBusy ? 0.32 : pressed ? 0.56 : 1,
                        padding: Spacing.one,
                      })}
                    >
                      <SymbolView
                        name={{
                          ios: "ellipsis",
                          android: "more_horiz",
                          web: "more_horiz",
                        }}
                        size={Sizing.icon.medium}
                        tintColor={theme.text}
                      />
                    </Pressable>
                  ) : null}
                </View>
              ),
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
                  paddingTop: headerHeight + Spacing.three,
                },
              ]}
            >
              <View style={styles.content}>
                <View style={styles.identity}>
                  <Link.AppleZoomTarget>
                    <View
                      collapsable={false}
                      onLayout={measureSceneOrigin}
                      ref={avatarOriginRef}
                    >
                      <ReactiveInitialsAvatar
                        accessibilityLabel={`${scenario.counterpart.name} avatar`}
                        accentColor={categoryColor}
                        activity={counterpartActivity}
                        initials={initials}
                        listenerActivity={userVoiceLevel}
                        onAccentColor={theme.onPrimary}
                        phase={phase}
                      />
                    </View>
                  </Link.AppleZoomTarget>

                  {hasCenterCopy ? (
                    <View style={styles.stateCopy}>
                      {voiceCopy.statusLabel ? (
                        <ThemedText
                          accessibilityLiveRegion="polite"
                          style={styles.stateTitle}
                        >
                          {voiceCopy.statusLabel}
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
                            />
                          </Animated.View>
                        </View>
                      ) : voiceCopy.message ? (
                        <ThemedText
                          accessibilityLiveRegion="polite"
                          numberOfLines={3}
                          selectable
                          style={styles.messageText}
                          themeColor="textSecondary"
                        >
                          {voiceCopy.message}
                        </ThemedText>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                <View style={styles.controlSlot}>
                  {isConversationComplete && !speechPlayback.isBusy ? (
                    isCompletionReady ? (
                      <Animated.View
                        entering={COMPLETION_ENTERING}
                        style={styles.completionGroup}
                      >
                        <View
                          accessibilityLabel="Conversation complete"
                          accessibilityLiveRegion="polite"
                          accessibilityRole="text"
                          accessible
                          style={styles.completionStatus}
                        >
                          <SymbolView
                            name={{
                              ios: "checkmark.circle.fill",
                              android: "check_circle",
                              web: "check_circle",
                            }}
                            size={Sizing.icon.medium}
                            tintColor={categoryColor}
                          />
                          <ThemedText
                            accessible={false}
                            style={styles.completionTitle}
                          >
                            Conversation complete
                          </ThemedText>
                        </View>

                        <PressableScale
                          accessibilityHint={
                            mode === "rewind"
                              ? "Compares this branch with the original response"
                              : "Opens feedback tied to this rehearsal transcript"
                          }
                          accessibilityRole="button"
                          accessibilityState={{
                            busy: isTransitioning,
                            disabled: isTransitioning,
                          }}
                          disabled={isTransitioning}
                          onPress={openDebrief}
                          style={[
                            styles.debriefButton,
                            {
                              backgroundColor: theme.primary,
                              opacity: isTransitioning ? 0.62 : 1,
                            },
                          ]}
                        >
                          <ThemedText
                            style={styles.debriefButtonText}
                            themeColor="onPrimary"
                          >
                            {isTransitioning
                              ? "Opening debrief…"
                              : mode === "rewind"
                                ? "See what changed"
                                : "Review the conversation"}
                          </ThemedText>
                          <SymbolView
                            name={{
                              ios: "arrow.right",
                              android: "arrow_forward",
                              web: "arrow_forward",
                            }}
                            size={Sizing.icon.medium}
                            tintColor={theme.onPrimary}
                          />
                        </PressableScale>
                      </Animated.View>
                    ) : null
                  ) : (
                    <Animated.View
                      entering={VOICE_CONTROL_ENTERING}
                      exiting={VOICE_CONTROL_EXITING}
                      style={styles.voiceControl}
                    >
                      <Animated.View
                        style={[
                          styles.voiceButtonShadow,
                          { shadowColor: theme.primary },
                          controlStyle,
                        ]}
                      >
                        <Animated.View
                          pointerEvents="none"
                          style={[
                            styles.voiceHalo,
                            { backgroundColor: theme.primary },
                            voiceHaloStyle,
                          ]}
                        />
                        <Pressable
                          accessibilityHint={
                            isListening
                              ? "Stops listening to your response"
                              : speechPlayback.isBusy
                                ? `Wait until ${counterpartFirstName} finishes speaking`
                                : actorState === "error" && canRetry
                                  ? `Tries ${counterpartFirstName}’s response again without recording another turn`
                                  : "Starts listening to your response"
                          }
                          accessibilityLabel={
                            isListening
                              ? "Finish speaking"
                              : speechPlayback.isBusy
                                ? `${counterpartFirstName} is speaking`
                                : actorState === "error" && canRetry
                                  ? `Try ${counterpartFirstName} again`
                                  : "Start speaking"
                          }
                          accessibilityRole="button"
                          accessibilityState={{
                            busy: isBusy,
                            disabled: isBusy || isConversationComplete,
                            selected: isListening,
                          }}
                          disabled={isBusy || isConversationComplete}
                          hitSlop={Spacing.two}
                          onPress={handleMicrophonePress}
                          onPressIn={handlePressIn}
                          onPressOut={handlePressOut}
                          style={[
                            styles.voiceButton,
                            {
                              backgroundColor: theme.primary,
                              opacity:
                                isBusy || isConversationComplete ? 0.62 : 1,
                            },
                          ]}
                        >
                          <SymbolView
                            name={
                              isListening
                                ? {
                                    ios: "stop.fill",
                                    android: "stop",
                                    web: "stop",
                                  }
                                : speechPlayback.isBusy
                                  ? {
                                      ios: "speaker.wave.2.fill",
                                      android: "volume_up",
                                      web: "volume_up",
                                    }
                                  : {
                                      ios: "mic.fill",
                                      android: "mic",
                                      web: "mic",
                                    }
                            }
                            size={Sizing.icon.large}
                            tintColor={theme.onPrimary}
                          />
                        </Pressable>
                      </Animated.View>
                      {voiceCopy.controlLabel ? (
                        <ThemedText style={styles.voiceLabel}>
                          {voiceCopy.controlLabel}
                        </ThemedText>
                      ) : null}
                    </Animated.View>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>
        </BlurTargetView>

        {debriefScene ? (
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
                accentColor={
                  PracticeCategoryColors.dark[scenarioDefinition.category]
                }
                direction={sceneDirection}
                origin={sceneOrigin}
                progress={sceneProgress}
              />
            </Animated.View>

            {debriefScene.kind === "ready" ? (
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
                  accentColor={
                    PracticeCategoryColors.dark[scenarioDefinition.category]
                  }
                  counterpartLineByTurnId={debriefScene.counterpartLineByTurnId}
                  counterpartName={
                    scenarioDefinition.relationship.counterpartName
                  }
                  continueError={
                    planMutation.error instanceof Error
                      ? planMutation.error.message
                      : null
                  }
                  debrief={debriefScene.debrief}
                  embedded
                  isContinuing={planMutation.isPending}
                  isRewinding={isRestoringRewind}
                  onContinue={
                    debriefScene.preview
                      ? openDevPlanPreview
                      : continueFromDebrief
                  }
                  onRewind={rewindFromDebrief}
                  rewindError={
                    rewindMutation.error instanceof Error
                      ? rewindMutation.error.message
                      : null
                  }
                />
              </Animated.View>
            ) : (
              <Animated.View
                accessibilityElementsHidden={!isDebriefInteractive}
                accessibilityViewIsModal={isDebriefInteractive}
                importantForAccessibility={
                  isDebriefInteractive ? "yes" : "no-hide-descendants"
                }
                pointerEvents={isDebriefInteractive ? "auto" : "none"}
                style={[styles.sceneLayer, loadingLayerStyle]}
              >
                <DebriefSceneStatus
                  errorMessage={
                    debriefScene.kind === "error" ? debriefScene.message : null
                  }
                  onClose={closeDebriefScene}
                  onRetry={() => revealDebrief(debriefScene.preview, true)}
                />
              </Animated.View>
            )}
          </>
        ) : null}
      </View>
    </>
  );
}

function createEmbeddedPreviewResult(
  scenario: ScenarioDefinition,
  session: PracticeSession,
) {
  const debrief = createDevDebriefPreview(scenario);

  return {
    branchId: session.activeBranchId ?? "dev-preview",
    counterpartLineByTurnId: {
      "dev-manager-turn": scenario.openingLine,
    },
    debrief,
    scenario,
    session,
  } as const;
}

function DebriefSceneStatus({
  errorMessage,
  onClose,
  onRetry,
}: {
  errorMessage: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <View style={styles.debriefStatus}>
      {errorMessage ? null : <ActivityIndicator color="#FFFFFF" />}
      <ThemedText style={styles.debriefStatusTitle}>
        {errorMessage
          ? "Debrief unavailable"
          : "Finding the moments that mattered…"}
      </ThemedText>
      <ThemedText style={styles.debriefStatusBody}>
        {errorMessage ??
          "Your feedback will be tied to the words you actually used."}
      </ThemedText>
      {errorMessage ? (
        <View style={styles.debriefStatusActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [
              styles.debriefStatusButton,
              pressed && styles.debriefStatusButtonPressed,
            ]}
          >
            <ThemedText style={styles.debriefStatusButtonText}>
              Try again
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.debriefStatusClose}
          >
            <ThemedText style={styles.debriefStatusCloseText}>
              Return to rehearsal
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

type VoiceCopy = {
  readonly statusLabel: string | null;
  readonly message: string | null;
  readonly controlLabel: string | null;
};

function LiveSpeechCaption({
  activeColor,
  activeWordPosition,
  caption,
  highlightProgress,
  inactiveColor,
}: {
  activeColor: string;
  activeWordPosition: SharedValue<number>;
  caption: SpeechCaptionSnapshot;
  highlightProgress: SharedValue<number>;
  inactiveColor: string;
}) {
  const phrase = caption.words.join(" ");

  return (
    <ThemedText
      accessibilityLabel={phrase}
      numberOfLines={2}
      style={[styles.captionText, { color: inactiveColor }]}
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
  activeColor: string;
  activeWordPosition: SharedValue<number>;
  highlightProgress: SharedValue<number>;
  inactiveColor: string;
  prefix: string;
  word: string;
  wordPosition: number;
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

function getVoiceCopy({
  actorErrorMessage,
  actorState,
  captureState,
  capturedDurationSeconds,
  counterpartFirstName,
  errorMessage,
  speechErrorMessage,
  speechState,
  transcript,
}: {
  actorErrorMessage: string | null;
  actorState: RehearsalActorState;
  captureState: VoiceCaptureState;
  capturedDurationSeconds: number | null;
  counterpartFirstName: string;
  errorMessage: string | null;
  speechErrorMessage: string | null;
  speechState: RehearsalSpeechPlaybackState;
  transcript: string;
}): VoiceCopy {
  if (actorState === "hydrating") {
    return {
      statusLabel: "Entering rehearsal…",
      message: null,
      controlLabel: null,
    };
  }

  if (actorState === "ending") {
    return {
      statusLabel: "Ending practice…",
      message: null,
      controlLabel: null,
    };
  }

  if (actorState === "responding") {
    return {
      statusLabel: `${counterpartFirstName} is thinking…`,
      message: null,
      controlLabel: null,
    };
  }

  if (actorState === "error") {
    return {
      statusLabel: "Response interrupted",
      message:
        actorErrorMessage ??
        `${counterpartFirstName} couldn’t respond right now.`,
      controlLabel: `Try ${counterpartFirstName} again`,
    };
  }

  if (speechState === "generating") {
    return {
      statusLabel: `${counterpartFirstName} is thinking…`,
      message: null,
      controlLabel: null,
    };
  }

  if (speechState === "loading") {
    return {
      statusLabel: `${counterpartFirstName} is thinking…`,
      message: null,
      controlLabel: null,
    };
  }

  if (speechState === "playing") {
    return {
      statusLabel: `${counterpartFirstName} is speaking`,
      message: null,
      controlLabel: null,
    };
  }

  if (speechState === "error") {
    return {
      statusLabel: "Voice unavailable",
      message:
        speechErrorMessage ??
        `${counterpartFirstName}’s reply could not be played aloud.`,
      controlLabel: null,
    };
  }

  if (captureState !== "idle" && captureState !== "captured") {
    switch (captureState) {
      case "requestingPermission":
        return {
          statusLabel: "Preparing microphone…",
          message: null,
          controlLabel: null,
        };
      case "listening":
        return {
          statusLabel: "Listening…",
          message: null,
          controlLabel: null,
        };
      case "stopping":
        return {
          statusLabel: "Finishing your turn…",
          message: null,
          controlLabel: null,
        };
      case "transcribing":
        return {
          statusLabel: "Processing your response…",
          message: null,
          controlLabel: null,
        };
      case "permissionDenied":
        return {
          statusLabel: "Microphone access needed",
          message:
            "Allow microphone access to practice this conversation aloud.",
          controlLabel: "Try microphone again",
        };
      case "error":
        return {
          statusLabel: "Microphone unavailable",
          message: errorMessage ?? "Please try starting the microphone again.",
          controlLabel: "Try microphone again",
        };
      case "transcriptionError":
        return {
          statusLabel: "Transcription unavailable",
          message:
            errorMessage ??
            "Your audio was captured, but on-device transcription failed.",
          controlLabel: "Try again",
        };
    }
  }

  switch (captureState) {
    case "captured":
      if (capturedDurationSeconds === null || capturedDurationSeconds < 0.05) {
        return {
          statusLabel: "No audio captured",
          message: "Try recording your turn again.",
          controlLabel: "Record again",
        };
      }

      if (!transcript) {
        return {
          statusLabel: "No speech recognized",
          message: "Try speaking a little closer to the microphone.",
          controlLabel: "Record again",
        };
      }

      return {
        statusLabel: null,
        message: null,
        controlLabel: null,
      };
    default:
      return {
        statusLabel: null,
        message: null,
        controlLabel: null,
      };
  }
}

function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

const styles = StyleSheet.create({
  experience: {
    backgroundColor: "#181116",
    flex: 1,
    overflow: "hidden",
  },
  rehearsalTarget: {
    flex: 1,
  },
  rehearsalLayer: {
    flex: 1,
  },
  sceneLayer: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  headerActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.one,
  },
  screen: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignItems: "center",
    justifyContent: "space-between",
  },
  identity: {
    flex: 1,
    alignItems: "center",
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
    lineHeight: 20,
    textAlign: "center",
  },
  captionText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "600",
    lineHeight: 26,
    textAlign: "center",
  },
  captionSlot: {
    minHeight: 52,
    position: "relative",
    width: "100%",
  },
  captionPhrase: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  messageText: {
    fontSize: FontSize.small,
    lineHeight: 20,
    textAlign: "center",
  },
  voiceControl: {
    alignItems: "center",
    gap: Spacing.three,
  },
  controlSlot: {
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: Sizing.avatar.large + Spacing.three + FontSize.body,
    width: "100%",
  },
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
  completionTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "700",
  },
  voiceButtonShadow: {
    borderRadius: Sizing.radius.pill,
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
  },
  voiceHalo: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: Sizing.radius.pill,
  },
  voiceButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 72,
    height: 72,
    borderRadius: Sizing.radius.pill,
  },
  voiceLabel: {
    fontSize: FontSize.small,
    fontWeight: "600",
    lineHeight: 20,
  },
  debriefButton: {
    width: "100%",
    minHeight: Sizing.control.large,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: Sizing.radius.pill,
    borderCurve: "continuous",
    paddingHorizontal: Spacing.four,
  },
  debriefButtonText: {
    fontSize: FontSize.body,
    lineHeight: 24,
    fontWeight: "700",
  },
  debriefStatus: {
    alignItems: "center",
    flex: 1,
    gap: Spacing.two,
    justifyContent: "center",
    padding: Spacing.four,
  },
  debriefStatusTitle: {
    color: "rgba(255, 255, 255, 0.96)",
    fontSize: FontSize.titleSmall,
    fontWeight: "700",
    textAlign: "center",
  },
  debriefStatusBody: {
    color: "rgba(255, 255, 255, 0.68)",
    fontSize: FontSize.body,
    maxWidth: 340,
    textAlign: "center",
  },
  debriefStatusActions: {
    alignItems: "center",
    gap: Spacing.two,
    paddingTop: Spacing.two,
    width: "100%",
  },
  debriefStatusButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderCurve: "continuous",
    borderRadius: Sizing.radius.pill,
    justifyContent: "center",
    minHeight: Sizing.control.regular,
    maxWidth: 340,
    width: "100%",
  },
  debriefStatusButtonPressed: {
    opacity: 0.78,
  },
  debriefStatusButtonText: {
    color: "#211018",
    fontSize: FontSize.body,
    fontWeight: "700",
  },
  debriefStatusClose: {
    minHeight: Sizing.control.compact,
    justifyContent: "center",
  },
  debriefStatusCloseText: {
    color: "rgba(255, 255, 255, 0.78)",
    fontSize: FontSize.small,
    fontWeight: "600",
  },
});
