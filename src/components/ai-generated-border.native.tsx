import {
  BlurMask,
  Canvas,
  RoundedRect,
  Shader,
  Skia,
  useClock,
  vec,
} from "@shopify/react-native-skia";
import { StyleSheet, View } from "react-native";
import {
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";

import { Sizing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const AI_BORDER_SHADER = compileAiBorderShader();
const BORDER_WIDTH = 1.5;
const GLOW_OVERSCAN = 10;
const BORDER_INSET = GLOW_OVERSCAN + BORDER_WIDTH / 2;

const LIGHT_PALETTE = {
  accent: [0.45, 0.25, 0.37] as const,
  cool: [0.31, 0.58, 0.73] as const,
  warm: [0.83, 0.51, 0.62] as const,
};

const DARK_PALETTE = {
  accent: [0.72, 0.49, 0.61] as const,
  cool: [0.47, 0.72, 0.84] as const,
  warm: [0.91, 0.67, 0.75] as const,
};

export function AiGeneratedBorder() {
  const scheme = useColorScheme();
  const clock = useClock();
  const reduceMotion = useReducedMotion();
  const canvasSize = useSharedValue({ height: 1, width: 1 });
  const palette = scheme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;

  const borderWidth = useDerivedValue(() =>
    Math.max(canvasSize.get().width - BORDER_INSET * 2, 0),
  );
  const borderHeight = useDerivedValue(() =>
    Math.max(canvasSize.get().height - BORDER_INSET * 2, 0),
  );
  const uniforms = useDerivedValue(() => {
    const size = canvasSize.get();

    return {
      resolution: vec(Math.max(size.width, 1), Math.max(size.height, 1)),
      t: reduceMotion ? 2.8 : clock.get() / 1000,
      accent: palette.accent,
      cool: palette.cool,
      warm: palette.warm,
    };
  });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.canvasFrame}
    >
      <Canvas colorSpace="srgb" onSize={canvasSize} style={StyleSheet.absoluteFill}>
        <RoundedRect
          height={borderHeight}
          opacity={0.5}
          r={Sizing.radius.input - BORDER_WIDTH / 2}
          strokeWidth={4}
          style="stroke"
          width={borderWidth}
          x={BORDER_INSET}
          y={BORDER_INSET}
        >
          <Shader source={AI_BORDER_SHADER} uniforms={uniforms} />
          <BlurMask blur={5} respectCTM={false} style="normal" />
        </RoundedRect>
        <RoundedRect
          height={borderHeight}
          r={Sizing.radius.input - BORDER_WIDTH / 2}
          strokeWidth={BORDER_WIDTH}
          style="stroke"
          width={borderWidth}
          x={BORDER_INSET}
          y={BORDER_INSET}
        >
          <Shader source={AI_BORDER_SHADER} uniforms={uniforms} />
        </RoundedRect>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasFrame: {
    bottom: -GLOW_OVERSCAN,
    left: -GLOW_OVERSCAN,
    position: "absolute",
    right: -GLOW_OVERSCAN,
    top: -GLOW_OVERSCAN,
  },
});

function compileAiBorderShader() {
  const shader = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float t;
uniform float3 accent;
uniform float3 cool;
uniform float3 warm;

half4 main(float2 xy) {
  float2 uv = xy / max(resolution, float2(1.0));
  float2 p = uv - 0.5;
  p.x *= resolution.x / max(resolution.y, 1.0);

  float angle = atan(p.y, p.x);
  float phase = t * 0.85;
  float primaryWave = 0.5 + 0.5 * cos(angle - phase);
  float secondaryWave = 0.5 + 0.5 * cos(angle + phase * 0.73 + 1.4);
  float highlight = pow(0.5 + 0.5 * cos(angle - phase), 20.0);
  float trail = pow(
    0.5 + 0.5 * cos(angle - phase + 0.72),
    5.0
  );

  float3 color = mix(cool, warm, primaryWave);
  color = mix(color, accent, secondaryWave * 0.30);
  color += highlight * 0.24 + trail * 0.05;

  float alpha = 0.66 + highlight * 0.28 + trail * 0.06;
  return half4(color * alpha, alpha);
}
`);

  if (!shader) {
    throw new Error("Unable to compile the AI-generated border shader.");
  }

  return shader;
}
