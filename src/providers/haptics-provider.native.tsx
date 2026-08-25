import * as SecureStore from "expo-secure-store";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import { HapticSupport, Settings } from "react-native-pulsar";

import {
  HapticsSettingsContext,
  type HapticSupportLevel,
} from "@/providers/haptics-context";

const HAPTICS_PREFERENCE_KEY = "manager.haptics.enabled.v1";
const USED_PRESETS = [
  "SystemImpactLight",
  "SystemImpactSoft",
  "SystemImpactRigid",
  "SystemNotificationError",
  "SystemNotificationSuccess",
  "SystemSelection",
];

export function HapticsProvider({ children }: { readonly children: ReactNode }) {
  // Stay silent until the persisted preference has hydrated. This prevents a
  // saved opt-out from leaking a startup haptic while SecureStore resolves.
  const [enabled, setEnabledState] = useState(false);
  const [support] = useState(readHapticSupport);
  const preferenceChangedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    Settings.enableSound(false);
    Settings.enableCache(true);
    Settings.preloadPresets(USED_PRESETS);

    Settings.enableHaptics(false);

    void SecureStore.getItemAsync(HAPTICS_PREFERENCE_KEY)
      .then((storedValue) => {
        if (cancelled || preferenceChangedRef.current) return;

        const nextEnabled = support !== "none" && storedValue !== "false";
        setEnabledState(nextEnabled);
        Settings.enableHaptics(nextEnabled);
      })
      .catch(() => {
        if (cancelled || preferenceChangedRef.current) return;

        // A storage failure should not permanently disable tactile feedback.
        const nextEnabled = support !== "none";
        setEnabledState(nextEnabled);
        Settings.enableHaptics(nextEnabled);
      });

    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state !== "active") {
          Settings.stopHaptics();
        }
      },
    );

    return () => {
      cancelled = true;
      appStateSubscription.remove();
      Settings.stopHaptics();
    };
  }, [support]);

  const setEnabled = useCallback(
    (requestedEnabled: boolean) => {
      const nextEnabled = support !== "none" && requestedEnabled;
      preferenceChangedRef.current = true;
      setEnabledState(nextEnabled);

      if (!nextEnabled) {
        Settings.stopHaptics();
      }
      Settings.enableHaptics(nextEnabled);
      void SecureStore.setItemAsync(
        HAPTICS_PREFERENCE_KEY,
        String(nextEnabled),
      ).catch(() => undefined);
    },
    [support],
  );

  const value = useMemo(
    () => ({ enabled, setEnabled, support }),
    [enabled, setEnabled, support],
  );

  return (
    <HapticsSettingsContext.Provider value={value}>
      {children}
    </HapticsSettingsContext.Provider>
  );
}

function readHapticSupport(): HapticSupportLevel {
  // Pulsar's Android PatternComposer requires VibrationEffect (API 26+).
  // Report older devices honestly instead of exposing a switch that cannot
  // produce tactile output.
  if (Platform.OS === "android" && Number(Platform.Version) < 26) {
    return "none";
  }

  try {
    switch (Settings.getHapticsSupportLevel()) {
      case HapticSupport.ADVANCED_SUPPORT:
        return "advanced";
      case HapticSupport.STANDARD_SUPPORT:
        return "standard";
      case HapticSupport.LIMITED_SUPPORT:
        return "limited";
      default:
        return "none";
    }
  } catch {
    return "none";
  }
}
