import { Stack } from "expo-router/stack";

export default function PaywallsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="manager-pro" />
    </Stack>
  );
}
