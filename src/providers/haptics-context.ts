import { createContext, use } from "react";

export type HapticSupportLevel =
  | "none"
  | "limited"
  | "standard"
  | "advanced";

export type HapticsSettings = {
  readonly enabled: boolean;
  readonly setEnabled: (enabled: boolean) => void;
  readonly support: HapticSupportLevel;
};

export const DEFAULT_HAPTICS_SETTINGS: HapticsSettings = {
  enabled: false,
  setEnabled: () => undefined,
  support: "none",
};

export const HapticsSettingsContext = createContext<HapticsSettings>(
  DEFAULT_HAPTICS_SETTINGS,
);

export function useHapticsSettings() {
  return use(HapticsSettingsContext);
}
