import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { ThemedText } from '@/components/themed-text';
import { FontSize, MaxContentWidth, Sizing, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  MANAGER_PRO_ENTITLEMENT,
  REVENUECAT_PRODUCT_IDS,
  hasEntitlement,
  useRevenueCat,
} from '@/providers/revenuecat-provider';

const PRODUCT_ORDER = [
  REVENUECAT_PRODUCT_IDS.yearly,
  REVENUECAT_PRODUCT_IDS.monthly,
  REVENUECAT_PRODUCT_IDS.lifetime,
];

const PRODUCT_LABELS: Record<string, string> = {
  [REVENUECAT_PRODUCT_IDS.yearly]: 'Yearly',
  [REVENUECAT_PRODUCT_IDS.monthly]: 'Monthly',
  [REVENUECAT_PRODUCT_IDS.lifetime]: 'Lifetime',
};

export function SubscriptionScreen() {
  const theme = useTheme();
  const {
    customerInfo,
    currentOffering,
    error,
    hasManagerPro,
    isLoading,
    presentCustomerCenter,
    presentPaywall,
    purchaseProduct,
    refresh,
    restore,
  } = useRevenueCat();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const packages = useMemo(
    () =>
      PRODUCT_ORDER.map((productId) =>
        currentOffering?.availablePackages.find(
          (candidate) => candidate.product.identifier === productId,
        ),
      ).filter((candidate) => candidate !== undefined),
    [currentOffering],
  );

  async function runAction(actionName: string, action: () => Promise<void>) {
    setBusyAction(actionName);
    setNotice(null);
    try {
      await action();
    } catch {
      // The provider exposes a user-safe error message below.
    } finally {
      setBusyAction(null);
    }
  }

  const activeEntitlement =
    customerInfo?.entitlements.active[MANAGER_PRO_ENTITLEMENT];

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <View style={styles.intro}>
          <ThemedText selectable style={styles.eyebrow} themeColor="primary">
            MANAGER PRO
          </ThemedText>
          <ThemedText selectable style={styles.title}>
            Practice without limits
          </ThemedText>
          <ThemedText selectable style={styles.subtitle} themeColor="textSecondary">
            Choose a plan, restore an earlier purchase, or manage an active
            subscription.
          </ThemedText>
        </View>

        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}>
          <View style={styles.statusCopy}>
            <ThemedText selectable style={styles.statusTitle}>
              {hasManagerPro ? 'Manager Pro is active' : 'Free access'}
            </ThemedText>
            <ThemedText selectable type="small" themeColor="textSecondary">
              {hasManagerPro
                ? activeEntitlement?.expirationDate
                  ? `Renews or expires ${formatDate(activeEntitlement.expirationDate)}`
                  : 'Lifetime access'
                : 'Upgrade to unlock all Pro features.'}
            </ThemedText>
          </View>
          {isLoading ? <ActivityIndicator color={theme.primary} /> : null}
        </View>

        {!hasManagerPro ? (
          <Pressable
            accessibilityRole="button"
            disabled={busyAction !== null || isLoading}
            onPress={() =>
              void runAction('paywall', async () => {
                const result = await presentPaywall();
                if (
                  result === PAYWALL_RESULT.PURCHASED ||
                  result === PAYWALL_RESULT.RESTORED
                ) {
                  setNotice('Manager Pro is ready.');
                }
              })
            }
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed
                  ? theme.primaryPressed
                  : theme.primary,
                opacity: busyAction !== null || isLoading ? 0.55 : 1,
              },
            ]}>
            {busyAction === 'paywall' ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <ThemedText style={styles.primaryButtonText} themeColor="onPrimary">
                View plans
              </ThemedText>
            )}
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            disabled={busyAction !== null}
            onPress={() =>
              void runAction('customer-center', async () => {
                await presentCustomerCenter();
              })
            }
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed
                  ? theme.primaryPressed
                  : theme.primary,
                opacity: busyAction !== null ? 0.55 : 1,
              },
            ]}>
            {busyAction === 'customer-center' ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <ThemedText style={styles.primaryButtonText} themeColor="onPrimary">
                Manage subscription
              </ThemedText>
            )}
          </Pressable>
        )}

        {!hasManagerPro && packages.length > 0 ? (
          <View style={styles.plansSection}>
            <ThemedText selectable style={styles.sectionTitle}>
              Available plans
            </ThemedText>
            <View style={styles.planList}>
              {packages.map((item) => (
                <Pressable
                  accessibilityRole="button"
                  disabled={busyAction !== null}
                  key={item.identifier}
                  onPress={() =>
                    void runAction(item.product.identifier, async () => {
                      const info = await purchaseProduct(item.product.identifier);
                      if (
                        info &&
                        hasEntitlement(info, MANAGER_PRO_ENTITLEMENT)
                      ) {
                        setNotice('Purchase complete. Manager Pro is active.');
                      }
                    })
                  }
                  style={({ pressed }) => [
                    styles.planRow,
                    {
                      backgroundColor: pressed
                        ? theme.backgroundSelected
                        : theme.backgroundElement,
                      borderColor: theme.border,
                      opacity: busyAction !== null ? 0.55 : 1,
                    },
                  ]}>
                  <View style={styles.planCopy}>
                    <ThemedText selectable style={styles.planTitle}>
                      {PRODUCT_LABELS[item.product.identifier] ??
                        item.product.title}
                    </ThemedText>
                    <ThemedText selectable type="small" themeColor="textSecondary">
                      {getProductCadence(item.product.identifier)}
                    </ThemedText>
                  </View>
                  {busyAction === item.product.identifier ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <ThemedText selectable style={styles.price} themeColor="primary">
                      {item.product.priceString}
                    </ThemedText>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={[styles.message, { borderColor: theme.border }]}>
            <ThemedText selectable type="small">{error}</ThemedText>
          </View>
        ) : null}

        {notice ? (
          <View style={[styles.message, { borderColor: theme.border }]}>
            <ThemedText selectable type="small">{notice}</ThemedText>
          </View>
        ) : null}

        <View style={styles.secondaryActions}>
          <Pressable
            accessibilityRole="button"
            disabled={busyAction !== null}
            onPress={() =>
              void runAction('restore', async () => {
                const info = await restore();
                setNotice(
                  hasEntitlement(info, MANAGER_PRO_ENTITLEMENT)
                    ? 'Purchase restored. Manager Pro is active.'
                    : 'No Manager Pro purchase was found for this store account.',
                );
              })
            }
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: theme.border,
                backgroundColor: pressed
                  ? theme.backgroundSelected
                  : 'transparent',
              },
            ]}>
            <ThemedText style={styles.secondaryButtonText}>
              {busyAction === 'restore' ? 'Restoring…' : 'Restore purchases'}
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={busyAction !== null}
            onPress={() =>
              void runAction('refresh', async () => {
                await refresh();
                setNotice('Subscription status refreshed.');
              })
            }
            style={({ pressed }) => [
              styles.textButton,
              { opacity: pressed ? 0.55 : 1 },
            ]}>
            <ThemedText type="smallBold" themeColor="primary">
              Refresh status
            </ThemedText>
          </Pressable>
        </View>

        {customerInfo ? (
          <ThemedText selectable style={styles.customerId} themeColor="textSecondary">
            Customer: {customerInfo.originalAppUserId}
          </ThemedText>
        ) : null}
      </View>
    </ScrollView>
  );
}

function getProductCadence(productId: string) {
  if (productId === REVENUECAT_PRODUCT_IDS.lifetime) return 'One-time purchase';
  if (productId === REVENUECAT_PRODUCT_IDS.yearly) return 'Billed once a year';
  return 'Billed monthly';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
  },
  content: { width: '100%', maxWidth: MaxContentWidth, gap: Spacing.four },
  intro: { gap: Spacing.two },
  eyebrow: {
    fontSize: FontSize.label,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: FontSize.display,
    lineHeight: 40,
    fontWeight: '600',
    letterSpacing: -1,
  },
  subtitle: { maxWidth: 520, fontSize: FontSize.small, lineHeight: 21 },
  statusCard: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Sizing.radius.medium,
    borderCurve: 'continuous',
  },
  statusCopy: { flex: 1, gap: Spacing.one },
  statusTitle: {
    fontSize: FontSize.bodyLarge,
    lineHeight: 23,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: Sizing.control.large,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Sizing.radius.pill,
  },
  primaryButtonText: { fontSize: FontSize.body, fontWeight: '700' },
  plansSection: { gap: Spacing.three },
  sectionTitle: {
    fontSize: FontSize.headingLarge,
    lineHeight: 27,
    fontWeight: '700',
  },
  planList: { gap: Spacing.two },
  planRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Sizing.radius.medium,
    borderCurve: 'continuous',
  },
  planCopy: { flex: 1, gap: Spacing.half },
  planTitle: {
    fontSize: FontSize.bodyLarge,
    lineHeight: 23,
    fontWeight: '700',
  },
  price: { fontSize: FontSize.bodyLarge, lineHeight: 23, fontWeight: '700' },
  message: {
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Sizing.radius.small,
    borderCurve: 'continuous',
  },
  secondaryActions: { alignItems: 'center', gap: Spacing.three },
  secondaryButton: {
    width: '100%',
    minHeight: Sizing.control.regular,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Sizing.radius.pill,
  },
  secondaryButtonText: { fontSize: FontSize.small, fontWeight: '700' },
  textButton: {
    minHeight: Sizing.control.compact,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  customerId: {
    textAlign: 'center',
    fontSize: FontSize.labelSmall,
    lineHeight: 16,
  },
});
