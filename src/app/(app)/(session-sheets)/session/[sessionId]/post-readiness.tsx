import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";

import type { ReadinessValue } from "@/domain/session";
import {
  PostReadinessScreen,
  PostReadinessStatusScreen,
} from "@/screens/post-readiness-screen";
import {
  planQueryKey,
  type PlanQueryData,
} from "@/services/query/plan-query";
import { sessionRepository } from "@/services/storage";

export default function PostReadinessRoute() {
  const { preview, sessionId } = useLocalSearchParams<{
    preview?: string;
    sessionId: string;
  }>();
  const isDevPreview = __DEV__ && preview === "debrief";
  const queryClient = useQueryClient();
  const router = useRouter();
  const statusQuery = useQuery({
    enabled: Boolean(sessionId) && !isDevPreview,
    queryKey: [
      "rehearsal",
      "post-readiness",
      sessionId,
      isDevPreview ? "preview" : "persisted",
    ],
    queryFn: () => loadPostReadiness(sessionId),
    retry: false,
  });
  const readinessMutation = useMutation({
    mutationKey: ["rehearsal", "post-readiness", sessionId],
    mutationFn: (rating: ReadinessValue) =>
      sessionRepository.completeSession({
        afterReadiness: rating,
        sessionId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["rehearsal", "plan", sessionId],
      });
      router.dismiss();
    },
  });

  if (isDevPreview) {
    return (
      <>
        <Stack.Screen options={{ title: "Readiness" }} />
        <PostReadinessScreen
          onSubmit={async (rating) => {
            queryClient.setQueryData<PlanQueryData>(
              planQueryKey(sessionId, "preview"),
              (current) =>
                current
                  ? {
                      ...current,
                      afterRating: rating,
                    }
                  : current,
            );
            router.dismiss();
          }}
        />
      </>
    );
  }

  if (statusQuery.isPending) {
    return (
      <>
        <Stack.Screen
          options={{
            gestureEnabled: !readinessMutation.isPending,
            title: "Readiness",
          }}
        />
        <PostReadinessStatusScreen
          body="Loading your final readiness check."
          title="One last check…"
        />
      </>
    );
  }

  if (statusQuery.isError || !statusQuery.data) {
    return (
      <>
        <Stack.Screen
          options={{
            gestureEnabled: !readinessMutation.isPending,
            title: "Readiness",
          }}
        />
        <PostReadinessStatusScreen
          body="Return to your plan and try again."
          title="This readiness check isn’t available"
        />
      </>
    );
  }

  if (statusQuery.data.status === "complete") {
    return (
      <Redirect
        href={{
          pathname: "/session/[sessionId]/plan",
          params: { sessionId },
        }}
      />
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          gestureEnabled: !readinessMutation.isPending,
          title: "Readiness",
        }}
      />
      <PostReadinessScreen
        onSubmit={async (rating) => {
          await readinessMutation.mutateAsync(rating);
        }}
      />
    </>
  );
}

async function loadPostReadiness(sessionId: string) {
  const session = await sessionRepository.getSession(sessionId);
  if (!session) {
    throw new Error("This rehearsal session could not be found.");
  }
  if (session.status === "complete") {
    return { status: "complete" as const };
  }
  if (session.status !== "plan-ready") {
    throw new Error("This session is not ready for a final readiness check.");
  }

  return { status: "ready" as const };
}
