import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { PressableScale } from "pressto";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import {
  Colors,
  FontSize,
  PracticeCategoryColors,
  Sizing,
  Spacing,
} from "@/constants/theme";
import type { ScenarioBrief } from "@/data/scenarios";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

type ScenarioBriefingScreenProps = {
  onPractice: () => void;
  scenario: ScenarioBrief;
};

export function ScenarioBriefingScreen({
  onPractice,
  scenario,
}: ScenarioBriefingScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const categoryColor = PracticeCategoryColors[colorScheme][scenario.category];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              Sizing.control.large +
              Math.max(insets.bottom, Spacing.three) +
              Spacing.four,
          },
        ]}
      >
        <View style={styles.content}>
          <Link.AppleZoomTarget>
            <View collapsable={false} style={styles.counterpart}>
              <View
                style={[styles.avatar, { backgroundColor: categoryColor }]}>
                <ThemedText style={styles.avatarText} themeColor="onPrimary">
                  {scenario.counterpart.name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </ThemedText>
              </View>
              <View style={styles.counterpartCopy}>
                <ThemedText selectable style={styles.counterpartName}>
                  {scenario.counterpart.name}
                </ThemedText>
                <ThemedText
                  selectable
                  style={[styles.relationship, { color: categoryColor }]}>
                  {scenario.counterpart.relationship}
                </ThemedText>
              </View>
            </View>
          </Link.AppleZoomTarget>

          <ThemedText selectable style={styles.title}>
            {scenario.fullTitle}
          </ThemedText>

          <View style={styles.brief}>
            <BriefSection label="THE SITUATION" text={scenario.context} />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.goalsSection}>
              <ThemedText
                selectable
                style={styles.sectionLabel}
                themeColor="textSecondary"
              >
                GOALS
              </ThemedText>
              <View style={styles.goalsList}>
                {scenario.goals.map((goal) => (
                  <View key={goal} style={styles.goalRow}>
                    <View style={styles.goalIconSlot}>
                      <SymbolView
                        name={{
                          ios: "circle.fill",
                          android: "circle",
                          web: "circle",
                        }}
                        size={Spacing.two}
                        tintColor={theme.primary}
                      />
                    </View>
                    <ThemedText selectable style={styles.goalText}>
                      {goal}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={[
          styles.floatingAction,
          { bottom: Math.max(insets.bottom, Spacing.three) },
        ]}
      >
        <View style={styles.actionContent}>
          <PressableScale
            accessibilityHint="Continue to a short readiness check"
            accessibilityRole="button"
            onPress={onPractice}
            style={styles.primaryButton}
          >
            <ThemedText style={styles.primaryButtonText} themeColor="onPrimary">
              Practice this conversation
            </ThemedText>
            <ThemedText style={styles.buttonArrow} themeColor="onPrimary">
              →
            </ThemedText>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

function BriefSection({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.briefSection}>
      <ThemedText
        selectable
        style={styles.sectionLabel}
        themeColor="textSecondary"
      >
        {label}
      </ThemedText>
      <ThemedText selectable style={styles.sectionBody}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  content: {
    width: "100%",
    gap: Spacing.four,
  },

  title: {
    alignSelf: "center",
    textAlign: "center",
    fontSize: FontSize.headingLarge,
    fontWeight: "600",
  },
  counterpart: {
    alignItems: "center",
    gap: Spacing.two,
  },
  avatar: {
    width: Sizing.avatar.large,
    height: Sizing.avatar.large,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Sizing.radius.pill,
  },
  avatarText: {
    fontSize: 19,
    fontWeight: "700",
  },
  counterpartCopy: {
    alignItems: "center",
  },
  counterpartName: {
    fontSize: 18,
    fontWeight: "700",
  },
  relationship: {
    fontSize: 12,
    fontWeight: "700",
  },
  brief: {
    gap: Spacing.four,
    paddingTop: Spacing.two,
  },
  briefSection: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: FontSize.label,
    fontWeight: "700",
  },
  sectionBody: {
    fontSize: 17,
    fontWeight: "500",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  goalsSection: {
    gap: Spacing.three,
  },
  goalsList: {
    gap: Spacing.three,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  goalIconSlot: {
    width: Sizing.icon.small,
    height: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  goalText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  floatingAction: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: Spacing.three,
  },
  actionContent: {
    width: "100%",
  },
  primaryButton: {
    paddingVertical: Spacing.three + 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Sizing.radius.pill,
    borderCurve: "continuous",
    backgroundColor: Colors.light.primary,
    boxShadow: "0 12px 32px rgba(0, 0, 0, 0.22)",
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
  },
  buttonArrow: {
    fontSize: 24,
  },
});
