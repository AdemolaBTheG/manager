import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackHeaderItem } from "@react-navigation/native-stack";
import {
  Link,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback } from "react";
import { Alert, Pressable, View } from "react-native";

import { PracticeCategoryColors, Sizing, Spacing } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";
import { ReadinessFallbackScreen } from "@/screens/readiness-screen";
import { SessionDetailScreen } from "@/screens/session-detail-screen";
import {
  loadCompleteSessionDetailPreview,
  loadSessionDetail,
  sessionQueryKeys,
  type SessionAction,
  type SessionDetailData,
} from "@/services/query/session-detail";
import { sessionRepository } from "@/services/storage";

export default function SessionDetailRoute() {
  const { preview, sessionId } = useLocalSearchParams<{
    preview?: string;
    sessionId: string;
  }>();
  const isCompletePreview = __DEV__ && preview === "complete";
  const router = useRouter();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const detailQuery = useQuery({
    enabled: Boolean(sessionId),
    queryKey: isCompletePreview
      ? sessionQueryKeys.completePreview(sessionId)
      : sessionQueryKeys.detail(sessionId),
    queryFn: () =>
      isCompletePreview
        ? loadCompleteSessionDetailPreview(sessionId)
        : loadSessionDetail(sessionId),
    retry: false,
  });
  const refetchDetail = detailQuery.refetch;
  const deleteMutation = useMutation({
    mutationKey: ["sessions", "delete", sessionId],
    mutationFn: () => sessionRepository.deleteSession(sessionId),
    onSuccess: async () => {
      queryClient.removeQueries({
        queryKey: sessionQueryKeys.detail(sessionId),
      });
      await queryClient.invalidateQueries({ queryKey: sessionQueryKeys.all });
      router.dismissTo("/");
    },
    onError: () => {
      Alert.alert(
        "Couldn’t delete session",
        "Your rehearsal is still saved. Please try again.",
      );
    },
  });

  useFocusEffect(
    useCallback(() => {
      void refetchDetail();
    }, [refetchDetail]),
  );

  const openTranscript = useCallback(() => {
    if (!sessionId || isCompletePreview || deleteMutation.isPending) {
      return;
    }
    router.push({
      pathname: "/session/[sessionId]/transcript",
      params: { sessionId },
    });
  }, [deleteMutation.isPending, isCompletePreview, router, sessionId]);
  const openCompletedPreview = useCallback(() => {
    if (!__DEV__ || isCompletePreview || !sessionId) {
      return;
    }

    router.push({
      pathname: "/session/[sessionId]",
      params: { preview: "complete", sessionId },
    });
  }, [isCompletePreview, router, sessionId]);
  const confirmDelete = useCallback(() => {
    if (
      isCompletePreview ||
      !detailQuery.data ||
      deleteMutation.isPending
    ) {
      return;
    }

    Alert.alert(
      "Delete this session?",
      `This permanently removes the rehearsal with ${detailQuery.data.scenario.relationship.counterpartName}, including its transcript and feedback.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete session",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ],
    );
  }, [deleteMutation, detailQuery.data, isCompletePreview]);
  const nativeHeaderRightItems = useCallback((): NativeStackHeaderItem[] => {
    if (!detailQuery.data || isCompletePreview) {
      return [];
    }

    return [
      {
        type: "button",
        label: "Transcript",
        accessibilityHint: "Shows the saved conversation transcript",
        disabled: deleteMutation.isPending,
        icon: { type: "sfSymbol", name: "text.bubble" },
        identifier: "session-transcript",
        onPress: openTranscript,
        tintColor: theme.text,
      },
      {
        type: "menu",
        label: "Session options",
        accessibilityHint: "Shows options for this saved session",
        disabled: deleteMutation.isPending,
        icon: { type: "sfSymbol", name: "ellipsis" },
        identifier: "session-options",
        menu: {
          title: "Session",
          items: [
            ...(__DEV__
              ? [
                  {
                    type: "action" as const,
                    label: "Preview completed session",
                    description: "Inspect every populated session section",
                    icon: {
                      type: "sfSymbol" as const,
                      name: "sparkles" as const,
                    },
                    onPress: openCompletedPreview,
                  },
                ]
              : []),
            {
              type: "action",
              label: "Delete session",
              description: "Remove the transcript, feedback, and attempts",
              destructive: true,
              icon: { type: "sfSymbol", name: "trash" as const },
              onPress: confirmDelete,
            },
          ],
        },
        tintColor: theme.text,
      },
    ];
  }, [
    confirmDelete,
    deleteMutation.isPending,
    detailQuery.data,
    isCompletePreview,
    openCompletedPreview,
    openTranscript,
    theme.text,
  ]);

  if (detailQuery.isPending) {
    return (
      <>
        <Stack.Screen options={{ title: "Session" }} />
        <ReadinessFallbackScreen
          body="Loading the saved rehearsal, feedback, and readiness."
          title="Opening session…"
        />
      </>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <>
        <Stack.Screen options={{ title: "Session" }} />
        <ReadinessFallbackScreen
          body={
            detailQuery.error instanceof Error
              ? detailQuery.error.message
              : "Return home and choose another session."
          }
          title="Session unavailable"
        />
      </>
    );
  }

  const data = detailQuery.data;
  const primaryAction = data.action;
  const categoryColor =
    PracticeCategoryColors[colorScheme][data.scenario.category];
  const canOpenPlan =
    data.session.status === "plan-ready" || data.session.status === "complete";
  const canReviewDebrief =
    data.debrief !== null && data.action?.destination !== "debrief";
  const rehearsalHref =
    primaryAction?.destination === "rehearsal"
      ? {
          pathname: "/session/[sessionId]/rehearsal" as const,
          params: { sessionId: data.session.id },
        }
      : null;
  const detailScreen = (
    <SessionDetailScreen
      appleZoomPrimaryAction={rehearsalHref !== null}
      categoryColor={categoryColor}
      data={data}
      onOpenPlan={
        canOpenPlan ? () => openPlan(router, data, isCompletePreview) : null
      }
      onPrimaryAction={
        primaryAction && rehearsalHref === null
          ? () => openSessionAction(router, primaryAction, data)
          : null
      }
      onReviewDebrief={
        canReviewDebrief
          ? () => openReviewDebrief(router, data, isCompletePreview)
          : null
      }
    />
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Session",
          headerRight: isCompletePreview
            ? undefined
            : () => (
                <View style={{ flexDirection: "row", gap: Spacing.two }}>
                  {__DEV__ ? (
                    <HeaderButton
                      disabled={deleteMutation.isPending}
                      label="Preview completed session"
                      name={{
                        ios: "sparkles",
                        android: "auto_awesome",
                        web: "auto_awesome",
                      }}
                      onPress={openCompletedPreview}
                    />
                  ) : null}
                  <HeaderButton
                    disabled={deleteMutation.isPending}
                    label="Transcript"
                    name={{
                      ios: "text.bubble",
                      android: "chat_bubble_outline",
                      web: "chat_bubble_outline",
                    }}
                    onPress={openTranscript}
                  />
                  <HeaderButton
                    disabled={deleteMutation.isPending}
                    label="Session options"
                    name={{
                      ios: "ellipsis",
                      android: "more_horiz",
                      web: "more_horiz",
                    }}
                    onPress={confirmDelete}
                  />
                </View>
              ),
          unstable_headerRightItems: nativeHeaderRightItems,
        }}
      />
      {rehearsalHref ? (
        <Link href={rehearsalHref} asChild>
          {detailScreen}
        </Link>
      ) : (
        detailScreen
      )}
    </>
  );
}

function HeaderButton({
  disabled,
  label,
  name,
  onPress,
}: {
  readonly disabled: boolean;
  readonly label: string;
  readonly name: Parameters<typeof SymbolView>[0]["name"];
  readonly onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={Spacing.two}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: disabled ? 0.32 : pressed ? 0.56 : 1,
        padding: Spacing.one,
      })}
    >
      <SymbolView
        name={name}
        size={Sizing.icon.medium}
        tintColor={theme.text}
      />
    </Pressable>
  );
}

function openSessionAction(
  router: ReturnType<typeof useRouter>,
  action: SessionAction,
  data: SessionDetailData,
) {
  const { session } = data;

  switch (action.destination) {
    case "readiness":
      router.push({
        pathname: "/session/[sessionId]/readiness",
        params: { sessionId: session.id },
      });
      return;
    case "rehearsal":
      router.push({
        pathname: "/session/[sessionId]/rehearsal",
        params: { sessionId: session.id },
      });
      return;
    case "debrief":
      router.push({
        pathname: "/session/[sessionId]/debrief",
        params: { sessionId: session.id },
      });
      return;
    case "plan":
      openPlan(router, data);
      return;
    case "scenario":
      router.push({
        pathname: "/scenarios/[scenarioId]",
        params: { scenarioId: session.scenarioId },
      });
      return;
    case "situation":
      router.push("/situations/new");
  }
}

function openPlan(
  router: ReturnType<typeof useRouter>,
  data: SessionDetailData,
  isCompletePreview = false,
) {
  router.push({
    pathname: "/session/[sessionId]/plan",
    params: {
      sessionId: data.session.id,
      ...(isCompletePreview ? { preview: "debrief" } : {}),
    },
  });
}

function openReviewDebrief(
  router: ReturnType<typeof useRouter>,
  data: SessionDetailData,
  isCompletePreview = false,
) {
  router.push({
    pathname: "/session/[sessionId]/debrief",
    params: isCompletePreview
      ? { preview: "skia", sessionId: data.session.id }
      : { review: "1", sessionId: data.session.id },
  });
}
