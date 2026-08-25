import {
  BlurMask,
  Canvas,
  Circle,
  Fill,
  Shader,
  Skia,
  useClock,
  vec,
} from "@shopify/react-native-skia";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useMemo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { FontSize } from "@/constants/theme";

export const RehearsalAvatarPhase = {
  idle: 0,
  listening: 1,
  thinking: 2,
  speaking: 3,
} as const;

export type RehearsalAvatarPhaseValue =
  (typeof RehearsalAvatarPhase)[keyof typeof RehearsalAvatarPhase];

export type ReactiveInitialsAvatarProps = {
  accessibilityLabel?: string;
  accentColor: string;
  activity: SharedValue<number>;
  initials: string;
  listenerActivity: SharedValue<number>;
  onAccentColor: string;
  phase: SharedValue<RehearsalAvatarPhaseValue>;
  size?: number;
};

const LISTEN_MORPH_ENTER = {
  duration: 420,
  easing: Easing.bezier(0.2, 0.86, 0.3, 1),
} as const;
const LISTEN_MORPH_EXIT = {
  duration: 360,
  easing: Easing.bezier(0.32, 0, 0.22, 1),
} as const;

const ORB_SHADER = compileOrbShader();

function compileOrbShader() {
  const shader = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float t;
uniform float activity;
uniform float listenerActivity;
uniform float phase;
uniform float listenProgress;
uniform float listenSpan;
uniform float motion;
uniform float3 baseColor;
uniform float3 lightColor;
uniform float3 shadowColor;

float verticalCapsuleCenterDistance(
  vec2 p,
  float xOffset,
  float halfSegment
) {
  vec2 capsulePoint = p - vec2(xOffset, 0.0);
  capsulePoint.y -= clamp(capsulePoint.y, -halfSegment, halfSegment);
  return length(capsulePoint);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(a, b, u.x) +
    (c - a) * u.y * (1.0 - u.x) +
    (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.55;
  mat2 rotation = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = rotation * p * 2.03 + vec2(11.7, 5.3);
    amplitude *= 0.5;
  }
  return value;
}

vec4 main(vec2 xy) {
  vec2 uv = (xy - resolution * 0.5) / min(resolution.x, resolution.y);
  float isListening = step(0.5, phase) * (1.0 - step(1.5, phase));
  float isThinking = step(1.5, phase) * (1.0 - step(2.5, phase));
  float voiceEnvelope = smoothstep(0.20, 0.82, activity);
  float listenerEnvelope =
    smoothstep(0.02, 0.58, listenerActivity) * motion;
  float speakerPush = voiceEnvelope * motion;
  float listenerPull = listenerEnvelope * motion;
  float listenMorph = listenProgress * listenProgress *
    (3.0 - 2.0 * listenProgress);
  float capsuleSplit = smoothstep(0.28, 1.0, listenMorph);

  // Keep material motion on one continuous timeline. Audio may change the
  // light, but it must never change the phase of the underlying texture.
  float driftPhase = t * 0.045 * motion;
  vec2 drift = vec2(driftPhase, -driftPhase * 0.72);
  float conversationalZoom = 1.0 + listenerPull * 0.28 - speakerPush * 0.20;
  vec2 materialUv = uv * conversationalZoom;
  float slowField = fbm(materialUv * 3.0 + drift);
  float detailField = fbm(
    materialUv * 5.2 + vec2(-drift.y, drift.x) * 1.2 + vec2(4.7, 8.1)
  );
  float thoughtField = sin(
    atan(materialUv.y, materialUv.x) * 2.0 -
      t * 0.85 * motion +
      length(materialUv) * 11.0
  );

  float breathing = sin(t * 0.62) * 0.0012 * motion;
  float edgeNoise = (slowField - 0.5) * 0.0035 * motion;
  edgeNoise += thoughtField * isThinking * 0.004;
  float conversationalRadius = speakerPush * 0.038 - listenerPull * 0.048;
  float radius = 0.405 + breathing + conversationalRadius + edgeNoise;

  // All four capsules begin as the same circle. Their centers spread, their
  // radii contract, and their vertical segments grow as listening takes over.
  // That keeps one valid signed-distance shape through the entire morph.
  float targetCapsuleRadius = listenSpan *
    (0.090 + listenerEnvelope * 0.004);
  float targetCapsuleSpacing =
    (listenSpan - targetCapsuleRadius * 2.0) / 3.0;
  float capsuleSpacing = targetCapsuleSpacing * capsuleSplit;
  float capsuleRadius = mix(
    radius,
    targetCapsuleRadius,
    listenMorph
  );
  float outerLeftResponse = smoothstep(0.05, 0.88, listenerEnvelope);
  float innerLeftResponse = smoothstep(0.00, 0.66, listenerEnvelope);
  float innerRightResponse = smoothstep(0.08, 0.76, listenerEnvelope);
  float outerRightResponse = smoothstep(0.14, 0.96, listenerEnvelope);
  float outerLeftHalfSegment = mix(
    0.0,
    0.030 + outerLeftResponse * 0.055,
    listenMorph
  );
  float innerLeftHalfSegment = mix(
    0.0,
    0.065 + innerLeftResponse * 0.100,
    listenMorph
  );
  float innerRightHalfSegment = mix(
    0.0,
    0.050 + innerRightResponse * 0.085,
    listenMorph
  );
  float outerRightHalfSegment = mix(
    0.0,
    0.025 + outerRightResponse * 0.060,
    listenMorph
  );
  float capsule0CenterDistance = verticalCapsuleCenterDistance(
    uv,
    -capsuleSpacing * 1.5,
    outerLeftHalfSegment
  );
  float capsule1CenterDistance = verticalCapsuleCenterDistance(
    uv,
    -capsuleSpacing * 0.5,
    innerLeftHalfSegment
  );
  float capsule2CenterDistance = verticalCapsuleCenterDistance(
    uv,
    capsuleSpacing * 0.5,
    innerRightHalfSegment
  );
  float capsule3CenterDistance = verticalCapsuleCenterDistance(
    uv,
    capsuleSpacing * 1.5,
    outerRightHalfSegment
  );
  float nearestCapsuleCenter = min(
    min(capsule0CenterDistance, capsule1CenterDistance),
    min(capsule2CenterDistance, capsule3CenterDistance)
  );
  float shapeDistance = nearestCapsuleCenter - capsuleRadius;
  float alpha = 1.0 - smoothstep(-0.005, 0.004, shapeDistance);

  vec2 spherePoint = uv / max(radius, 0.001);
  float sphereDepth = sqrt(max(0.0, 1.0 - dot(spherePoint, spherePoint)));
  float capsuleDepth = sqrt(max(
    0.0,
    1.0 - pow(nearestCapsuleCenter / max(capsuleRadius, 0.001), 2.0)
  ));
  float shapeDepth = mix(sphereDepth, capsuleDepth, listenMorph);
  float directionalLight = clamp(
    shapeDepth * 0.64 - spherePoint.y * 0.25 - spherePoint.x * 0.12,
    0.0,
    1.0
  );

  vec2 fixedLightPoint = spherePoint - vec2(-0.24, -0.27);
  float fixedLight = exp(-7.5 * dot(fixedLightPoint, fixedLightPoint));
  float materialVeil = smoothstep(
    0.36,
    0.78,
    slowField * 0.68 + detailField * 0.32
  );
  float topWash = smoothstep(0.62, -0.58, spherePoint.y);

  // Speaking uses one anchored bloom behind the initials. Volume expands and
  // brightens it without changing its position or the texture coordinates.
  vec2 voiceBloomPoint = spherePoint - vec2(0.02, 0.07);
  float voiceBloomFalloff = mix(9.5, 4.6, voiceEnvelope);
  float voiceBloomShape = exp(
    -voiceBloomFalloff * dot(voiceBloomPoint, voiceBloomPoint)
  );
  float voiceBloom = voiceBloomShape * voiceEnvelope * 0.30;
  float listeningGlow = isListening * exp(
    -8.5 * dot(voiceBloomPoint, voiceBloomPoint)
  ) * (0.055 + listenerEnvelope * 0.055);
  float thinkingGlow = isThinking * (0.5 + thoughtField * 0.5) * 0.045;

  vec3 color = mix(shadowColor, baseColor, 0.48 + directionalLight * 0.4);
  color = mix(color, lightColor, topWash * 0.24);
  color = mix(
    color,
    lightColor,
    clamp(fixedLight * 0.52 + materialVeil * 0.09, 0.0, 0.62)
  );
  color = mix(
    color,
    lightColor,
    clamp(voiceBloom + listeningGlow + thinkingGlow, 0.0, 0.34)
  );

  float sphereSpecular = pow(max(0.0, sphereDepth - distance(
    spherePoint,
    vec2(-0.28, -0.34)
  ) * 0.28), 9.0);
  float capsuleSpecular = pow(max(0.0, capsuleDepth), 9.0) * 0.72;
  float specular = mix(sphereSpecular, capsuleSpecular, listenMorph);
  color = mix(color, lightColor, specular * 0.58);

  float insideDistance = max(-shapeDistance, 0.0);
  float rim = 1.0 - smoothstep(0.004, 0.055, insideDistance);
  color = mix(color, lightColor, rim * (0.08 + voiceEnvelope * 0.045));

  float listeningHalo = listenMorph *
    exp(-max(shapeDistance, 0.0) * 44.0) *
    (0.045 + listenerEnvelope * 0.065);
  float outputAlpha = max(alpha, listeningHalo);
  color = mix(color, lightColor, listeningHalo * 0.42);

  return vec4(color * outputAlpha, outputAlpha);
}
`);

  if (!shader) {
    throw new Error("Unable to compile the rehearsal avatar shader.");
  }

  return shader;
}

export function ReactiveInitialsAvatar({
  accessibilityLabel,
  accentColor,
  activity,
  initials,
  listenerActivity,
  onAccentColor,
  phase,
  size = 240,
}: ReactiveInitialsAvatarProps) {
  const { width: windowWidth } = useWindowDimensions();
  const clock = useClock();
  const reduceMotion = useReducedMotion();
  const center = size / 2;
  const listeningWidth = Math.min(
    size * 0.76,
    Math.max(size * 0.64, windowWidth * 0.42),
  );
  const listenSpan = listeningWidth / size;
  const palette = useMemo(() => makeOrbPalette(accentColor), [accentColor]);
  const listenProgress = useSharedValue(0);

  useAnimatedReaction(
    () =>
      phase.get() === RehearsalAvatarPhase.listening
        ? 1
        : 0,
    (nextProgress, previousProgress) => {
      if (nextProgress === previousProgress) {
        return;
      }

      if (reduceMotion) {
        listenProgress.set(nextProgress);
        return;
      }

      listenProgress.set(
        withTiming(
          nextProgress,
          nextProgress === 1 ? LISTEN_MORPH_ENTER : LISTEN_MORPH_EXIT,
        ),
      );
    },
    [reduceMotion],
  );

  const responsiveScaleStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return { transform: [{ scale: 1 }] };
    }

    const speakerEnvelope = clampUnit((activity.get() - 0.18) / 0.68);
    const listenerEnvelope = clampUnit(
      (listenerActivity.get() - 0.015) / 0.52,
    );

    return {
      transform: [
        {
          scale: 1 + speakerEnvelope * 0.14 - listenerEnvelope * 0.13,
        },
      ],
    };
  });
  const initialsMorphStyle = useAnimatedStyle(() => {
    const progress = listenProgress.get();

    return {
      opacity: interpolate(
        progress,
        [0, 0.24],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: interpolate(
            progress,
            [0, 0.32],
            [1, 0.72],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const uniforms = useDerivedValue(() => ({
    resolution: vec(size, size),
    t: reduceMotion ? 0 : clock.get() / 1000,
    activity: activity.get(),
    listenerActivity: listenerActivity.get(),
    phase: phase.get(),
    listenProgress: listenProgress.get(),
    listenSpan,
    motion: reduceMotion ? 0 : 1,
    baseColor: palette.base,
    lightColor: palette.light,
    shadowColor: palette.shadow,
  }));

  const shadowRadius = useDerivedValue(() => {
    if (reduceMotion) {
      return size * (0.36 - listenProgress.get() * 0.19);
    }

    const speakerEnvelope = clampUnit((activity.get() - 0.2) / 0.62);
    const listenerEnvelope = clampUnit(
      (listenerActivity.get() - 0.02) / 0.56,
    );

    const restingRadius = size * (
      0.36 + speakerEnvelope * 0.03 - listenerEnvelope * 0.036
    );
    const progress = listenProgress.get();

    return restingRadius + (size * 0.17 - restingRadius) * progress;
  });
  const shadowOpacity = useDerivedValue(() => {
    if (reduceMotion) {
      return 0.14 * (1 - listenProgress.get() * 0.92);
    }

    const speakerEnvelope = clampUnit((activity.get() - 0.2) / 0.62);
    const listenerEnvelope = clampUnit(
      (listenerActivity.get() - 0.02) / 0.56,
    );

    const baseOpacity =
      0.14 + speakerEnvelope * 0.05 + listenerEnvelope * 0.03;

    return baseOpacity * (1 - listenProgress.get() * 0.92);
  });

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      importantForAccessibility={
        accessibilityLabel ? "yes" : "no-hide-descendants"
      }
      style={[styles.stage, { height: size, width: size }]}
    >
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[styles.visual, responsiveScaleStyle]}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle
            color={accentColor}
            cx={center}
            cy={center + size * 0.035}
            opacity={shadowOpacity}
            r={shadowRadius}
          >
            <BlurMask blur={30} style="normal" />
          </Circle>
          <Fill>
            <Shader source={ORB_SHADER} uniforms={uniforms} />
          </Fill>
        </Canvas>
        <Animated.View style={[styles.initialsLayer, initialsMorphStyle]}>
          <ThemedText
            aria-hidden
            style={[
              styles.initials,
              {
                color: onAccentColor,
                textShadowColor: "rgba(0, 0, 0, 0.26)",
              },
            ]}
          >
            {initials}
          </ThemedText>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function makeOrbPalette(hex: string) {
  const base = parseHex(hex);

  return {
    base,
    light: mix(base, [1, 1, 1], 0.64),
    shadow: mix(base, [0.025, 0.018, 0.024], 0.72),
  } as const;
}

function parseHex(hex: string): readonly [number, number, number] {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  if (normalized.length !== 6 || Number.isNaN(value)) {
    return [0.46, 0.24, 0.36];
  }

  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ];
}

function mix(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
  amount: number,
): readonly [number, number, number] {
  return [
    left[0] + (right[0] - left[0]) * amount,
    left[1] + (right[1] - left[1]) * amount,
    left[2] + (right[2] - left[2]) * amount,
  ];
}

function clampUnit(value: number) {
  "worklet";
  return Math.max(0, Math.min(1, value));
}

const styles = StyleSheet.create({
  stage: {
    alignItems: "center",
    justifyContent: "center",
  },
  visual: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontSize: FontSize.displaySmall,
    fontWeight: "700",
    lineHeight: 38,
    textShadowOffset: { height: 1, width: 0 },
    textShadowRadius: 7,
  },
});
