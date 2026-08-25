import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { PressableOpacity } from "pressto";
import { useMemo, useState } from "react";
import {
  Alert,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import {
  FontSize,
  PracticeCardColors,
  Sizing,
  Spacing,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import { useHapticsSettings } from "@/providers/haptics-context";
import {
  MANAGER_PRO_ENTITLEMENT,
  useRevenueCat,
} from "@/providers/revenuecat-provider";

type SymbolName = SymbolViewProps["name"];

type SettingsRow = {
  readonly disabled?: boolean;
  readonly icon: SymbolName;
  readonly id: string;
  readonly label: string;
  readonly onValueChange?: (value: boolean) => void;
  readonly onPress?: () => void;
  readonly value?: boolean;
};

type SettingsSection = {
  readonly data: readonly SettingsRow[];
  readonly title: string;
};

type SettingsStyles = ReturnType<typeof createStyles>;

function RowIcon({
  name,
  styles,
  tintColor,
}: {
  readonly name: SymbolName;
  readonly styles: SettingsStyles;
  readonly tintColor: string;
}) {
  return (
    <View accessible={false} style={styles.rowIcon}>
      <SymbolView
        accessible={false}
        fallback={<View style={styles.symbolFallback} />}
        name={name}
        size={19}
        tintColor={tintColor}
        weight="semibold"
      />
    </View>
  );
}

function SettingsRowView({
  icon,
  disabled,
  isFirst,
  isLast,
  label,
  onValueChange,
  onPress,
  styles,
  iconColor,
  textSecondaryColor,
  value,
}: SettingsRow & {
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly styles: SettingsStyles;
  readonly iconColor: string;
  readonly textSecondaryColor: string;
}) {
  const content = (
    <>
      <RowIcon name={icon} styles={styles} tintColor={iconColor} />
      <View accessible={false} style={styles.rowCopy}>
        <Text accessible={false} numberOfLines={1} style={styles.rowLabel}>
          {label}
        </Text>
      </View>
      {onValueChange ? (
        <Switch
          accessibilityLabel={label}
          accessibilityRole="switch"
          disabled={disabled}
          ios_backgroundColor={textSecondaryColor}
          onValueChange={onValueChange}
          thumbColor="#FFFFFF"
          trackColor={{ false: textSecondaryColor, true: iconColor }}
          value={value}
        />
      ) : onPress ? (
        <SymbolView
          accessible={false}
          fallback={<View style={styles.chevronFallback} />}
          name={{
            android: "chevron_right",
            ios: "chevron.forward",
            web: "chevron_right",
          }}
          size={14}
          tintColor={textSecondaryColor}
          weight="semibold"
        />
      ) : null}
    </>
  );

  return (
    <View
      style={[
        styles.rowShell,
        isFirst && styles.rowShellFirst,
        isLast && styles.rowShellLast,
      ]}
    >
      {onPress ? (
        <PressableOpacity
          accessibilityHint="Opens the corresponding settings"
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onPress}
          style={[styles.row, disabled && styles.rowDisabled]}
        >
          {content}
        </PressableOpacity>
      ) : (
        <View style={styles.row}>{content}</View>
      )}
      {!isLast ? <View accessible={false} style={styles.separator} /> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const {
    enabled: hapticsEnabled,
    setEnabled: setHapticsEnabled,
    support: hapticsSupport,
  } = useHapticsSettings();
  const { isLoading, presentCustomerCenter, restore } = useRevenueCat();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const styles = useMemo(
    () => createStyles(theme, PracticeCardColors[colorScheme].surface),
    [colorScheme, theme],
  );
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const privacyUrl = process.env.EXPO_PUBLIC_PRIVACY_URL?.trim();
  const termsUrl = process.env.EXPO_PUBLIC_TERMS_URL?.trim();

  async function openAppSettings() {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        "Settings unavailable",
        "Open your device settings to manage microphone access.",
      );
    }
  }

  async function openCustomerCenter() {
    if (pendingAction) return;

    setPendingAction("customer-center");
    try {
      await presentCustomerCenter();
    } catch {
      Alert.alert(
        "Customer Center unavailable",
        "Manager couldn’t open subscription management. Try again in a moment.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function restorePurchases() {
    if (pendingAction) return;

    setPendingAction("restore");
    try {
      const customerInfo = await restore();
      const restored = Boolean(
        customerInfo.entitlements.active[MANAGER_PRO_ENTITLEMENT],
      );
      Alert.alert(
        restored ? "Purchase restored" : "No purchase found",
        restored
          ? "Manager Pro is active on this device."
          : "No Manager Pro purchase was found for this store account.",
      );
    } catch {
      Alert.alert(
        "Restore unavailable",
        "Manager couldn’t restore purchases. Try again in a moment.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function openLegalUrl(
    url: string | undefined,
    label: string,
    environmentKey: string,
  ) {
    if (!url) {
      Alert.alert(
        `${label} unavailable`,
        `Add ${environmentKey} to the app environment before release.`,
      );
      return;
    }

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Link unavailable", `Manager couldn’t open the ${label}.`);
    }
  }

  const sections: SettingsSection[] = [
    {
      title: "Subscription",
      data: [
        {
          disabled: isLoading || pendingAction !== null,
          id: "customer-center",
          label:
            pendingAction === "customer-center"
              ? "Opening Customer Center…"
              : "Customer Center",
          icon: {
            android: "account_circle",
            ios: "person.crop.circle",
            web: "account_circle",
          },
          onPress: () => void openCustomerCenter(),
        },
        {
          disabled: isLoading || pendingAction !== null,
          id: "restore-purchases",
          label:
            pendingAction === "restore"
              ? "Restoring purchases…"
              : "Restore purchases",
          icon: {
            android: "restore",
            ios: "arrow.clockwise",
            web: "restore",
          },
          onPress: () => void restorePurchases(),
        },
      ],
    },
    {
      title: "Practice",
      data: [
        ...(process.env.EXPO_OS === "web"
          ? []
          : [
              {
                disabled: hapticsSupport === "none",
                id: "haptics",
                label:
                  hapticsSupport === "none" ? "Haptics unavailable" : "Haptics",
                icon: {
                  android: "vibration",
                  ios: "waveform",
                  web: "vibration",
                } satisfies SymbolName,
                onValueChange: setHapticsEnabled,
                value: hapticsEnabled,
              },
            ]),
        {
          id: "microphone",
          label: "Microphone access",
          icon: {
            android: "mic",
            ios: "mic.fill",
            web: "mic",
          },
          onPress: () => void openAppSettings(),
        },
      ],
    },
    {
      title: "Privacy",
      data: [
        {
          id: "privacy-policy",
          label: "Privacy Policy",
          icon: {
            android: "policy",
            ios: "hand.raised.fill",
            web: "policy",
          },
          onPress: () =>
            void openLegalUrl(
              privacyUrl,
              "Privacy Policy",
              "EXPO_PUBLIC_PRIVACY_URL",
            ),
        },
        {
          id: "local-data",
          label: "Sessions stored on this device",
          icon: {
            android: "lock",
            ios: "lock.fill",
            web: "lock",
          },
        },
        {
          id: "audio-retention",
          label: "Audio isn’t retained",
          icon: {
            android: "graphic_eq",
            ios: "waveform",
            web: "graphic_eq",
          },
        },
      ],
    },
    {
      title: "About",
      data: [
        {
          id: "terms",
          label: "Terms of Service",
          icon: {
            android: "description",
            ios: "doc.text.fill",
            web: "description",
          },
          onPress: () =>
            void openLegalUrl(
              termsUrl,
              "Terms of Service",
              "EXPO_PUBLIC_TERMS_URL",
            ),
        },
        {
          id: "version",
          label: `Manager ${version}`,
          icon: {
            android: "info",
            ios: "info.circle.fill",
            web: "info",
          },
        },
      ],
    },
  ];

  return (
    <SectionList
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyExtractor={(item) => item.id}
      renderItem={({ index, item, section }) => (
        <SettingsRowView
          {...item}
          isFirst={index === 0}
          isLast={index === section.data.length - 1}
          styles={styles}
          iconColor={theme.primary}
          textSecondaryColor={theme.primary}
        />
      )}
      renderSectionHeader={({ section }) => (
        <Text selectable style={styles.sectionTitle}>
          {section.title}
        </Text>
      )}
      sections={sections}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      style={styles.screen}
    />
  );
}

function createStyles(
  theme: ReturnType<typeof useTheme>,
  surfaceColor: string,
) {
  return StyleSheet.create({
    chevronFallback: {
      height: 14,
      width: 14,
    },
    content: {
      paddingBottom: 48,
      paddingHorizontal: Spacing.three,
    },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: Spacing.three,
      paddingVertical: 12,
    },
    rowCopy: {
      flex: 1,
      minWidth: 0,
    },
    rowDisabled: {
      opacity: 0.55,
    },
    rowIcon: {
      alignItems: "center",
      backgroundColor: theme.background,
      borderCurve: "continuous",
      borderRadius: 11,
      justifyContent: "center",
      padding: Spacing.two,
    },
    rowLabel: {
      color: theme.text,
      fontSize: FontSize.bodyLarge,
      fontWeight: "700",
    },
    rowShell: {
      backgroundColor: surfaceColor,
      borderColor: theme.border,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderRightWidth: StyleSheet.hairlineWidth,
      overflow: "hidden",
    },
    rowShellFirst: {
      borderCurve: "continuous",
      borderTopLeftRadius: Sizing.radius.input,
      borderTopRightRadius: Sizing.radius.input,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    rowShellLast: {
      borderBottomLeftRadius: Sizing.radius.input,
      borderBottomRightRadius: Sizing.radius.input,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderCurve: "continuous",
    },
    screen: {
      backgroundColor: theme.background,
    },
    sectionTitle: {
      color: theme.textSecondary,
      fontSize: FontSize.caption,
      fontWeight: "700",
      marginBottom: 12,
      marginLeft: 12,
      marginTop: Spacing.four,
      textTransform: "uppercase",
    },
    separator: {
      backgroundColor: theme.border,
      height: StyleSheet.hairlineWidth,
      marginLeft: 66,
    },
    symbolFallback: {
      height: 19,
      width: 19,
    },
  });
}
