# RevenueCat setup for Manager

The app code is wired to RevenueCat SDK `10.7.2`, the `manager_pro`
entitlement, and these product identifiers:

| Product | Store product ID | RevenueCat package |
| --- | --- | --- |
| Lifetime | `lifetime` | Lifetime (`$rc_lifetime`) |
| Yearly | `yearly` | Annual (`$rc_annual`) |
| Monthly | `monthly` | Monthly (`$rc_monthly`) |

## 1. Install and build

The packages were installed with the Expo-aware command:

```bash
npx expo install react-native-purchases react-native-purchases-ui
```

Expo Go can preview the integration using RevenueCat Preview API Mode, but it
cannot complete real store purchases. Use a development build for real purchase
testing:

```bash
npx eas-cli@latest build --platform ios --profile ios-simulator
npx eas-cli@latest build --platform android --profile development
npx expo start --dev-client
```

The native app identifiers are both `com.flingex.manager`. They must match the
apps configured in App Store Connect, Google Play Console, and RevenueCat.

## 2. Configure the RevenueCat dashboard

The dashboard is external state and must be configured once:

1. Open the RevenueCat project and add the iOS and/or Android app using
   `com.flingex.manager`.
2. For initial development, enable RevenueCat Test Store and use the provided
   `test_lUWKKzTyWNQjyecJqkZfHfenPha` public SDK key.
3. Create `lifetime` as a non-consumable one-time purchase.
4. Create `yearly` and `monthly` as auto-renewing subscriptions. Put both in
   the same subscription group on Apple.
5. Import those three products into RevenueCat.
6. Create the entitlement `manager_pro` and attach all three products to it.
7. Create an offering (for example, `default`) and add:
   - `lifetime` to the Lifetime package
   - `yearly` to the Annual package
   - `monthly` to the Monthly package
8. Mark the offering as **Current**.
9. Build and publish a RevenueCat Paywall for the current offering. Include a
   restore action and a close button unless the app intentionally uses a hard
   paywall.
10. Enable and customize Customer Center. It is shown to customers with an
    active `manager_pro` entitlement from the Manager Pro screen.

Before production, replace the Test Store key with the public SDK key for each
store. Add these to local `.env` and to the corresponding EAS build environment:

```dotenv
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_public_sdk_key
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_your_public_sdk_key
EXPO_PUBLIC_REVENUECAT_WEB_API_KEY=rcb_your_public_sdk_key
```

RevenueCat SDK keys are designed to ship in the client. Secret RevenueCat API
keys must never use `EXPO_PUBLIC_` or be bundled in the app.

## 3. App integration

`RevenueCatProvider` is mounted once at the app root. It configures the SDK,
loads offerings and `CustomerInfo`, listens for customer updates, and exposes
purchase operations through `useRevenueCat()`.

```tsx
const {
  customerInfo,
  hasManagerPro,
  presentPaywall,
  presentCustomerCenter,
  purchaseProduct,
  refresh,
  restore,
} = useRevenueCat();
```

Gate a Pro feature using the entitlement, never a product identifier:

```tsx
const { hasManagerPro, presentPaywall } = useRevenueCat();

async function openProFeature() {
  if (!hasManagerPro) {
    await presentPaywall();
    return;
  }

  // Open the Pro feature.
}
```

The hosted paywall is conditionally presented with the entitlement:

```tsx
await RevenueCatUI.presentPaywallIfNeeded({
  requiredEntitlementIdentifier: 'manager_pro',
});
```

The in-app Manager Pro screen also lists the current offering's localized store
prices and supports a direct package purchase, manual status refresh, and a
user-initiated restore. Restore is intentionally never triggered automatically,
because it can show an operating-system account prompt.

## 4. Customer identity

The current app has no account system, so RevenueCat initially creates an
anonymous app user ID. If authentication is added, identify the user immediately
after login and log out before switching to another account:

```tsx
const { identify, logOut } = useRevenueCat();

await identify(user.id); // Stable, non-guessable internal ID; never an email.
await logOut();
```

Do not call `logOut()` for anonymous-only sessions. If a backend later grants
entitlements or consumes RevenueCat webhooks, verify `manager_pro` on that
trusted backend as well; client-side checks are for UI access, not server
authorization.

## 5. Test checklist

- The current offering returns all three products with localized prices.
- Buying each product activates `manager_pro` in `CustomerInfo`.
- Cancelling a purchase leaves the user in the free state without an error.
- Restore is initiated only after tapping **Restore purchases**.
- A customer who already has `manager_pro` does not see the paywall again.
- Customer Center opens for an active customer and reflects plan changes.
- Expiration, cancellation, billing retry, and refund events update access after
  `getCustomerInfo()` refreshes or the SDK listener fires.
- Store sandbox/Test Store transactions are tested on a development build before
  release.
