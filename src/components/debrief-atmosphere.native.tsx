import {
  Canvas,
  Fill,
  Shader,
  Skia,
  useClock,
  vec,
} from "@shopify/react-native-skia";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
  Easing,
  ReduceMotion,
  type SharedValue,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type {
  DebriefAtmosphereProps,
  DebriefTransitionFieldProps,
} from "@/components/debrief-atmosphere.types";

const FIELD_SHADER = compileFieldShader();
const AMBIENT_REVEAL = Easing.bezier(0.16, 1, 0.3, 1);

export function DebriefAtmosphere({
  accentColor,
}: DebriefAtmosphereProps) {
  const reveal = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    reveal.set(
      withTiming(1, {
        duration: reduceMotion ? 0 : 900,
        easing: AMBIENT_REVEAL,
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [reduceMotion, reveal]);

  return (
    <DebriefFieldCanvas
      accentColor={accentColor}
      direction={0}
      origin={[0.5, 0.46]}
      progress={reveal}
      progressMode="scene"
    />
  );
}

export function DebriefTransitionField({
  accentColor,
  direction,
  origin = [0.5, 0.46],
  progress,
  progressMode = "scene",
}: DebriefTransitionFieldProps) {
  return (
    <DebriefFieldCanvas
      accentColor={accentColor}
      direction={direction === "into-debrief" ? 1 : -1}
      origin={origin}
      progress={progress}
      progressMode={progressMode}
    />
  );
}

function DebriefFieldCanvas({
  accentColor,
  direction,
  origin,
  progress,
  progressMode,
}: {
  accentColor: string;
  direction: -1 | 0 | 1;
  origin: readonly [x: number, y: number];
  progress: SharedValue<number>;
  progressMode: "scene" | "cover";
}) {
  const clock = useClock();
  const reduceMotion = useReducedMotion();
  const canvasSize = useSharedValue({ height: 1, width: 1 });
  const palette = useMemo(() => makePalette(accentColor), [accentColor]);
  const uniforms = useDerivedValue(() => {
    const size = canvasSize.get();

    return {
      resolution: vec(Math.max(1, size.width), Math.max(1, size.height)),
      t: reduceMotion ? 2.75 : clock.get() / 1000,
      progress: progress.get(),
      direction,
      motion: reduceMotion ? 0 : 1,
      origin: vec(origin[0], origin[1]),
      progressMode: progressMode === "cover" ? 1 : 0,
      accent: palette.accent,
      deep: palette.deep,
      light: palette.light,
      warm: palette.warm,
    };
  });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <Canvas
        colorSpace="srgb"
        onSize={canvasSize}
        style={StyleSheet.absoluteFill}
      >
        <Fill>
          <Shader source={FIELD_SHADER} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}

function compileFieldShader() {
  const shader = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float t;
uniform float progress;
uniform float direction;
uniform float motion;
uniform float2 origin;
uniform float progressMode;
uniform float3 accent;
uniform float3 deep;
uniform float3 light;
uniform float3 warm;

float hash(float2 p) {
  return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + float2(1.0, 0.0)), u.x),
    mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x),
    u.y
  );
}

float wrappedDistance(float a, float b) {
  float delta = abs(a - b);
  return min(delta, 1.0 - delta);
}

half4 main(float2 xy) {
  float2 safeResolution = max(resolution, float2(1.0));
  float2 uv = xy / safeResolution;
  float rawProgress = clamp(progress, 0.0, 1.0);
  float coverProgress = 1.0 - abs(rawProgress * 2.0 - 1.0);
  float p = mix(rawProgress, coverProgress, progressMode);
  float isTransition = step(0.5, abs(direction));
  float pulse = sin(p * 3.14159265) * isTransition * motion;
  float reveal = p;
  float time = t * motion;

  float aspect = safeResolution.x / safeResolution.y;
  float2 aspectScale = float2(aspect, 1.0);
  float2 focalPoint = clamp(origin, float2(0.0), float2(1.0));
  float focalDistance = distance(uv * aspectScale, focalPoint * aspectScale);
  float cornerRadius = max(
    max(
      distance(float2(0.0, 0.0), focalPoint * aspectScale),
      distance(float2(aspect, 0.0), focalPoint * aspectScale)
    ),
    max(
      distance(float2(0.0, 1.0), focalPoint * aspectScale),
      distance(float2(aspect, 1.0), focalPoint * aspectScale)
    )
  );
  float irisProgress = p * p * (3.0 - 2.0 * p);
  float irisRadius = mix(0.0, cornerRadius + 0.055, irisProgress);
  float irisFeather = mix(0.026, 0.055, pulse);
  float irisMask = 1.0 - smoothstep(
    irisRadius - irisFeather,
    irisRadius + irisFeather,
    focalDistance
  );
  float reducedMotionMask = p;
  float irisReveal = smoothstep(0.0, 0.075, p);
  float transitionMask = mix(
    reducedMotionMask,
    irisMask * irisReveal,
    motion
  );
  float fieldMask = mix(p, transitionMask, isTransition);
  float irisFront = exp(-abs(focalDistance - irisRadius) * 72.0) * pulse;

  float broadNoise = noise(uv * 2.4 + float2(time * 0.035, -time * 0.024));
  float detailNoise = noise(uv * 5.1 + float2(-time * 0.026, time * 0.031) + 7.3);
  float verticalDrift = sin(uv.y * 5.4 + time * 0.17) * 0.012 * motion;
  float horizontalSmear = pulse * (0.045 + broadNoise * 0.055);
  float2 fieldUv = float2(
    uv.x + verticalDrift + (broadNoise - 0.5) * horizontalSmear,
    uv.y + (detailNoise - 0.5) * pulse * 0.018 * direction
  );

  float diagonal = clamp(fieldUv.x * 0.28 + fieldUv.y * 0.72, 0.0, 1.0);
  float3 color = mix(deep, accent * 0.62, diagonal);
  color = mix(color, deep * 0.72, smoothstep(0.0, 0.78, fieldUv.y) * 0.28);
  color = mix(deep, color, 0.46 + reveal * 0.54);

  float2 bloomCenterA = float2(
    0.26 + sin(time * 0.11) * 0.12,
    0.28 + cos(time * 0.09) * 0.10
  );
  float2 bloomCenterB = float2(
    0.76 + cos(time * 0.08) * 0.13,
    0.68 + sin(time * 0.12) * 0.11
  );
  float bloomA = exp(-distance(fieldUv, bloomCenterA) * 3.8);
  float bloomB = exp(-distance(fieldUv, bloomCenterB) * 4.2);
  color = mix(color, light, bloomA * reveal * (0.10 + broadNoise * 0.05));
  color = mix(color, warm, bloomB * reveal * (0.07 + detailNoise * 0.04));

  float transitionVeil = pulse * (0.34 + broadNoise * 0.18);
  color = mix(color, mix(accent, light, 0.24), transitionVeil);
  color = mix(color, light, irisFront * (0.28 + broadNoise * 0.16));

  float edgeDistance = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
  float edgeFlow = 0.5 + 0.5 * sin(
    (uv.x * 0.82 + uv.y * 1.18) * 6.2831853 - time * 0.42
  );
  float edgeHalo = exp(-edgeDistance * 22.0) *
    (0.10 + edgeFlow * 0.055 + pulse * 0.08);
  float edgeCore = exp(-edgeDistance * 118.0) *
    (0.24 + edgeFlow * 0.10 + pulse * 0.13);

  float sweepPhase = fract(time * 0.055 + p * 0.82);
  float topSweep = exp(-uv.y * 135.0) * exp(
    -pow(wrappedDistance(uv.x * 0.25, sweepPhase), 2.0) * 230.0
  );
  float rightSweep = exp(-(1.0 - uv.x) * 135.0) * exp(
    -pow(wrappedDistance(0.25 + uv.y * 0.25, sweepPhase), 2.0) * 230.0
  );
  float bottomSweep = exp(-(1.0 - uv.y) * 135.0) * exp(
    -pow(wrappedDistance(0.50 + (1.0 - uv.x) * 0.25, sweepPhase), 2.0) * 230.0
  );
  float leftSweep = exp(-uv.x * 135.0) * exp(
    -pow(wrappedDistance(0.75 + (1.0 - uv.y) * 0.25, sweepPhase), 2.0) * 230.0
  );
  float perimeterSweep = (topSweep + rightSweep + bottomSweep + leftSweep) *
    (0.18 + pulse * 0.64) * motion;
  color = mix(color, accent, edgeHalo);
  color = mix(color, light, edgeCore);
  color = mix(color, light, clamp(perimeterSweep, 0.0, 0.78));

  float vignette = smoothstep(0.78, 0.18, distance(uv, float2(0.5, 0.46)));
  color *= mix(0.70, 1.02, vignette);
  color += (hash(xy + floor(time * 9.0)) - 0.5) * 0.012;

  float transitionAlpha = mix(mix(0.74, 0.92, p), 1.0, progressMode);
  float targetAlpha = mix(1.0, transitionAlpha, isTransition);
  float alpha = clamp(fieldMask * targetAlpha, 0.0, 1.0);
  float3 premultipliedColor = clamp(color, 0.0, 1.0) * alpha;
  return half4(premultipliedColor, alpha);
}
`);

  if (!shader) {
    throw new Error("Unable to compile the debrief atmosphere shader.");
  }

  return shader;
}

function makePalette(hex: string) {
  const accent = parseHex(hex);

  return {
    accent,
    deep: mix(accent, [0.035, 0.022, 0.05], 0.72),
    light: mix(accent, [1, 0.94, 0.97], 0.64),
    warm: mix(accent, [0.96, 0.56, 0.38], 0.44),
  } as const;
}

function parseHex(hex: string): readonly [number, number, number] {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  if (normalized.length !== 6 || Number.isNaN(value)) {
    return [0.745, 0.584, 0.639];
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
