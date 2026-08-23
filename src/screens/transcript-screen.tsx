import { ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { FontSize, MaxContentWidth, Spacing } from "@/constants/theme";
import type { TurnSpeaker } from "@/domain/session";
import { useTheme } from "@/hooks/use-theme";

export type TranscriptEntry = {
  readonly id: string;
  readonly speaker: TurnSpeaker;
  readonly text: string;
};

type TranscriptScreenProps = {
  counterpartName: string;
  entries: readonly TranscriptEntry[];
};

export function TranscriptScreen({
  counterpartName,
  entries,
}: TranscriptScreenProps) {
  const theme = useTheme();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.content}>
        {entries.map((entry, index) => (
          <View
            key={entry.id}
            style={[
              styles.turn,
              index > 0 && {
                borderTopColor: theme.border,
                borderTopWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <View
              style={[
                styles.turnContent,
                entry.speaker === "manager"
                  ? styles.managerTurn
                  : styles.counterpartTurn,
              ]}
            >
              <ThemedText
                selectable
                style={[
                  styles.speaker,
                  entry.speaker === "manager" && styles.managerText,
                ]}
                themeColor={
                  entry.speaker === "manager" ? "primary" : "textSecondary"
                }
              >
                {entry.speaker === "manager"
                  ? "YOU"
                  : counterpartName.toUpperCase()}
              </ThemedText>
              <ThemedText
                selectable
                style={[
                  styles.turnText,
                  entry.speaker === "manager" && styles.managerText,
                ]}
              >
                {entry.text}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: "100%",
    maxWidth: MaxContentWidth,
  },
  turn: {
    paddingVertical: Spacing.three,
  },
  turnContent: {
    width: "84%",
    gap: Spacing.one,
  },
  managerTurn: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  counterpartTurn: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  managerText: {
    textAlign: "right",
  },
  speaker: {
    fontSize: FontSize.label,
    fontWeight: "700",
  },
  turnText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: "500",
  },
});
