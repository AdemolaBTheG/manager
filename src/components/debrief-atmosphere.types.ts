import type { SharedValue } from "react-native-reanimated";

export type DebriefAtmosphereProps = {
  readonly accentColor: string;
};

export type DebriefTransitionFieldProps = {
  readonly accentColor: string;
  readonly direction: "into-debrief" | "into-rehearsal";
  readonly origin?: readonly [x: number, y: number];
  readonly progressMode?: "scene" | "cover";
  readonly progress: SharedValue<number>;
};
