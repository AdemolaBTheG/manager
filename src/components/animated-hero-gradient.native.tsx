import {
  Canvas,
  Fill,
  Shader,
  Skia,
  useClock,
  vec,
} from "@shopify/react-native-skia";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

export type AnimatedHeroGradientProps = {
  pressed: boolean;
};

const HERO_SHADER = compileHeroShader();

function compileHeroShader() {
  const shader = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float t;
uniform float press;
uniform float3 baseA;
uniform float3 baseB;
uniform float3 bloomA;
uniform float3 bloomB;

half4 main(float2 xy) {
  float2 uv = xy / max(resolution, float2(1.0));
  float diagonal = clamp(uv.x * 0.56 + uv.y * 0.44, 0.0, 1.0);

  // Broad directional waves keep the gradient moving without creating
  // circular blooms or a focal illustration in any corner.
  float waveA = 0.5 + 0.5 * sin(
    uv.x * 2.6 + uv.y * 3.2 + t * 0.18
  );
  float waveB = 0.5 + 0.5 * sin(
    uv.x * -3.4 + uv.y * 2.1 - t * 0.14 + 1.6
  );
  float sweep = 0.5 + 0.5 * sin(
    (uv.x + uv.y * 0.72) * 4.4 + t * 0.11 + 3.0
  );

  float3 color = mix(baseA, baseB, diagonal);
  color = mix(color, bloomA, waveA * 0.18);
  color = mix(color, bloomB, waveB * 0.14);
  color += (sweep - 0.5) * 0.018;
  color *= 1.0 - press * 0.075;

  return half4(clamp(color, 0.0, 1.0), 1.0);
}
`);

  if (!shader) {
    throw new Error("Unable to compile the home hero gradient shader.");
  }

  return shader;
}

const LIGHT_PALETTE = {
  baseA: [0.21, 0.075, 0.15] as const,
  baseB: [0.43, 0.20, 0.32] as const,
  bloomA: [0.76, 0.38, 0.55] as const,
  bloomB: [0.73, 0.48, 0.33] as const,
};

const DARK_PALETTE = {
  baseA: [0.67, 0.43, 0.56] as const,
  baseB: [0.82, 0.59, 0.70] as const,
  bloomA: [0.96, 0.76, 0.82] as const,
  bloomB: [0.91, 0.67, 0.55] as const,
};

export function AnimatedHeroGradient({ pressed }: AnimatedHeroGradientProps) {
  const scheme = useColorScheme();
  const clock = useClock();
  const reduceMotion = useReducedMotion();
  const canvasSize = useSharedValue({ height: 1, width: 1 });
  const press = useSharedValue(pressed ? 1 : 0);
  const palette = scheme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;

  useEffect(() => {
    press.set(
      withTiming(pressed ? 1 : 0, {
        duration: reduceMotion ? 0 : pressed ? 110 : 180,
      }),
    );
  }, [press, pressed, reduceMotion]);

  const uniforms = useDerivedValue(() => {
    const size = canvasSize.get();

    return {
      resolution: vec(Math.max(size.width, 1), Math.max(size.height, 1)),
      t: reduceMotion ? 2.4 : clock.get() / 1000,
      press: press.get(),
      baseA: palette.baseA,
      baseB: palette.baseB,
      bloomA: palette.bloomA,
      bloomB: palette.bloomB,
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
        opaque
        style={StyleSheet.absoluteFill}
      >
        <Fill>
          <Shader source={HERO_SHADER} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}
