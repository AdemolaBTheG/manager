import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export const MANAGER_PRO_ENTITLEMENT = 'manager_pro';

export const REVENUECAT_PRODUCT_IDS = {
  yearly: 'yearly',
  monthly: 'monthly',
} as const;

type RevenueCatContextValue = {
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  error: string | null;
  hasManagerPro: boolean;
  isLoading: boolean;
  clearError: () => void;
  identify: (appUserId: string) => Promise<CustomerInfo>;
  logOut: () => Promise<CustomerInfo>;
  presentCustomerCenter: () => Promise<void>;
  presentPaywall: () => Promise<PAYWALL_RESULT>;
  purchaseProduct: (productId: string) => Promise<CustomerInfo | null>;
  refresh: () => Promise<CustomerInfo>;
  restore: () => Promise<CustomerInfo>;
};

const RevenueCatContext = createContext<RevenueCatContextValue | null>(null);

export function RevenueCatProvider({ children }: PropsWithChildren) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateCustomerInfo = useCallback((info: CustomerInfo) => {
    setCustomerInfo(info);
    setError(null);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let isListening = false;
    const listener: CustomerInfoUpdateListener = (info) => {
      if (isMounted) {
        updateCustomerInfo(info);
      }
    };

    async function initialize() {
      try {
        const apiKey = getRevenueCatApiKey();
        const configured = await Purchases.isConfigured();

        if (!configured) {
          await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
          Purchases.configure({ apiKey });
        }

        Purchases.addCustomerInfoUpdateListener(listener);
        isListening = true;

        const customerInfoTask = Purchases.getCustomerInfo()
          .then((info) => {
            if (isMounted) {
              setCustomerInfo(info);
            }
          })
          .catch((caughtError) => {
            if (isMounted) {
              setError(toRevenueCatErrorMessage(caughtError));
            }
          })
          .finally(() => {
            if (isMounted) {
              setIsLoading(false);
            }
          });
        const offeringsTask = Purchases.getOfferings()
          .then((offerings) => {
            if (isMounted) {
              setCurrentOffering(offerings.current);
            }
          })
          .catch((caughtError) => {
            if (isMounted) {
              setError(toRevenueCatErrorMessage(caughtError));
            }
          });

        await Promise.allSettled([customerInfoTask, offeringsTask]);
      } catch (caughtError) {
        if (isMounted) {
          setError(toRevenueCatErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      isMounted = false;
      if (isListening) {
        Purchases.removeCustomerInfoUpdateListener(listener);
      }
    };
  }, [updateCustomerInfo]);

  const runCustomerInfoOperation = useCallback(
    async (operation: () => Promise<CustomerInfo>) => {
      setError(null);
      try {
        const info = await operation();
        updateCustomerInfo(info);
        return info;
      } catch (caughtError) {
        const message = toRevenueCatErrorMessage(caughtError);
        setError(message);
        throw new Error(message, { cause: caughtError });
      }
    },
    [updateCustomerInfo],
  );

  const refresh = useCallback(
    () => runCustomerInfoOperation(() => Purchases.getCustomerInfo()),
    [runCustomerInfoOperation],
  );

  const restore = useCallback(
    () => runCustomerInfoOperation(() => Purchases.restorePurchases()),
    [runCustomerInfoOperation],
  );

  const identify = useCallback(
    async (appUserId: string) => {
      const normalizedId = appUserId.trim();
      if (!normalizedId) {
        throw new Error('A RevenueCat app user ID is required.');
      }

      setError(null);
      try {
        const { customerInfo: info } = await Purchases.logIn(normalizedId);
        updateCustomerInfo(info);
        return info;
      } catch (caughtError) {
        const message = toRevenueCatErrorMessage(caughtError);
        setError(message);
        throw new Error(message, { cause: caughtError });
      }
    },
    [updateCustomerInfo],
  );

  const logOut = useCallback(
    () => runCustomerInfoOperation(() => Purchases.logOut()),
    [runCustomerInfoOperation],
  );

  const purchaseProduct = useCallback(
    async (productId: string) => {
      const selectedPackage = currentOffering?.availablePackages.find(
        (candidate) => candidate.product.identifier === productId,
      );

      if (!selectedPackage) {
        const message = `Product “${productId}” is missing from the current RevenueCat offering.`;
        setError(message);
        throw new Error(message);
      }

      setError(null);
      try {
        const { customerInfo: info } =
          await Purchases.purchasePackage(selectedPackage);
        updateCustomerInfo(info);
        return info;
      } catch (caughtError) {
        if (isPurchaseCancellation(caughtError)) {
          return null;
        }

        const message = toRevenueCatErrorMessage(caughtError);
        setError(message);
        throw new Error(message, { cause: caughtError });
      }
    },
    [currentOffering, updateCustomerInfo],
  );

  const presentPaywall = useCallback(async () => {
    setError(null);
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: MANAGER_PRO_ENTITLEMENT,
        offering: currentOffering ?? undefined,
        displayCloseButton: true,
      });

      if (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      ) {
        await refresh();
      }

      if (result === PAYWALL_RESULT.ERROR) {
        throw new Error('RevenueCat could not present or complete the paywall.');
      }

      return result;
    } catch (caughtError) {
      const message = toRevenueCatErrorMessage(caughtError);
      setError(message);
      throw new Error(message, { cause: caughtError });
    }
  }, [currentOffering, refresh]);

  const presentCustomerCenter = useCallback(async () => {
    setError(null);
    try {
      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onRestoreCompleted: ({ customerInfo: info }) =>
            updateCustomerInfo(info),
          onRestoreFailed: ({ error: restoreError }) =>
            setError(toRevenueCatErrorMessage(restoreError)),
          onPromotionalOfferSucceeded: ({ customerInfo: info }) =>
            updateCustomerInfo(info),
        },
      });
      await refresh();
    } catch (caughtError) {
      const message = toRevenueCatErrorMessage(caughtError);
      setError(message);
      throw new Error(message, { cause: caughtError });
    }
  }, [refresh, updateCustomerInfo]);

  const value = useMemo<RevenueCatContextValue>(
    () => ({
      customerInfo,
      currentOffering,
      error,
      hasManagerPro: hasEntitlement(customerInfo, MANAGER_PRO_ENTITLEMENT),
      isLoading,
      clearError: () => setError(null),
      identify,
      logOut,
      presentCustomerCenter,
      presentPaywall,
      purchaseProduct,
      refresh,
      restore,
    }),
    [
      customerInfo,
      currentOffering,
      error,
      identify,
      isLoading,
      logOut,
      presentCustomerCenter,
      presentPaywall,
      purchaseProduct,
      refresh,
      restore,
    ],
  );

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const value = use(RevenueCatContext);

  if (!value) {
    throw new Error('useRevenueCat must be used inside RevenueCatProvider.');
  }

  return value;
}

export function hasEntitlement(
  customerInfo: CustomerInfo | null,
  entitlementId: string,
) {
  return customerInfo?.entitlements.active[entitlementId]?.isActive === true;
}

export function findRevenueCatPackage(
  offering: PurchasesOffering | null,
  productId: string,
): PurchasesPackage | null {
  return (
    offering?.availablePackages.find(
      (candidate) => candidate.product.identifier === productId,
    ) ?? null
  );
}

function getRevenueCatApiKey() {
  const platformKey =
    process.env.EXPO_OS === 'ios'
      ? process.env.EXPO_PUBLIC_RC_APPLE_API_KEY
      : process.env.EXPO_OS === 'android'
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
        : process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY;
  const apiKey = (
    platformKey ?? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY
  )?.trim();

  if (!apiKey) {
    throw new Error('RevenueCat API key is not configured.');
  }

  return apiKey;
}

function isPurchaseCancellation(error: unknown) {
  return (
    isPurchasesError(error) &&
    error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
  );
}

function isPurchasesError(error: unknown): error is {
  code: PURCHASES_ERROR_CODE;
  message: string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

function toRevenueCatErrorMessage(error: unknown) {
  if (isPurchasesError(error) || error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while contacting RevenueCat.';
}
