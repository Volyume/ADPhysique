---
paths:
  - src/billing/**
  - src/services/billing*
  - src/hooks/usePurchases*
  - src/hooks/useEntitlements*
  - src/screens/Paywall*
  - src/screens/paywall*
  - *revenuecat*
  - *RevenueCat*
  - *playBilling*
  - *play-billing*
---

# VOLYUME — BILLING RULES

Billing is live in production. Real users are being charged.
Every change to billing code must be treated as high-risk surgery.
One mistake here causes real financial harm to real people.

---

## BEFORE TOUCHING ANY BILLING FILE

State all of the following before writing a single line:
1. Which file you are modifying and why
2. What exact change you are making
3. Whether this change affects the purchase flow, entitlement check,
   product configuration, or trial logic
4. Which environment you will test it in (sandbox only)

Wait for explicit "proceed" before writing any code.
No exceptions. No "small" billing changes.

---

## PRODUCT IDENTIFIERS — NEVER CHANGE THESE

These identifiers are live in Google Play Console and App Store Connect.
Changing them breaks purchases for all users.

Google Play product IDs:
  volyume_pro_monthly
  volyume_pro_annual

Apple App Store product IDs:
  volyume_pro_monthly
  volyume_pro_annual

RevenueCat entitlement:
  pro

RevenueCat offering:
  volyume_pro

Never change these strings anywhere in the codebase.
If you see them hardcoded somewhere they should not be, extract them
to constants. Do not change their values.

---

## ENTITLEMENT CHECKS — ALWAYS BY ENTITLEMENT, NEVER BY PRODUCT ID

Correct — check by entitlement:
  const { customerInfo } = await Purchases.getCustomerInfo()
  const isPro = customerInfo.entitlements.active['pro'] !== undefined

Wrong — never check by product ID:
  const isPro = customerInfo.activeSubscriptions.includes('volyume_pro_monthly')

The entitlement check works for all products, all platforms, and all
promotional grants. The product ID check breaks the moment you add a
new product or grant a promotional subscription.

---

## TRIAL LOGIC — DO NOT CHANGE WITHOUT EXPLICIT INSTRUCTION

The trial structure is:
- Days 1-14: server-side cardless entitlement (no payment method required)
- Day 14: paywall appears, user starts Google Play / App Store trial
- Days 14-21: Google Play / App Store 7-day trial (payment method required)
- Day 21: first charge

The 14-day server-side entitlement and the 7-day Play/App Store trial
work together to give 21 days total free access.

Never change:
- The 14-day server-side entitlement duration
- The 7-day trial offer attached to subscription products
- The day-14 paywall trigger logic
- The pricing shown to users

---

## RESTORE PURCHASES — ALWAYS PRESENT

Every build must have a working Restore Purchases button.
It must be present on the paywall screen AND in Settings.

Restore implementation:
  try {
    const { customerInfo } = await Purchases.restorePurchases()
    const isPro = customerInfo.entitlements.active['pro'] !== undefined
    if (isPro) {
      // Grant access
    } else {
      // Show "no purchases found" message
    }
  } catch (error) {
    // Show error message, do not crash
  }

---

## CUSTOMER INFO LISTENER — ALWAYS SUBSCRIBED

Subscribe to customer info updates on app start.
This handles subscription status changes without requiring an app restart.

  Purchases.addCustomerInfoUpdateListener((customerInfo) => {
    const isPro = customerInfo.entitlements.active['pro'] !== undefined
    // Update app state accordingly
  })

Remove the listener when the component unmounts or app backgrounds.

---

## PAYWALL COPY — PLATFORM DIFFERENCES

Android paywall (cardless trial available):
  "Try Pro free for 14 days. No card needed."
  "Then £19.99/year or £2.99/month. Cancel anytime in Google Play."

iOS paywall (Apple requires payment method for trial):
  "Try Pro free for 14 days."
  "You won't be charged until [date]. Cancel anytime in Settings."

The copy must reflect the actual platform behaviour.
Never show "no card needed" on iOS — Apple requires a payment method.

---

## PRICING — DISPLAY VALUES

Monthly: £2.99
Annual: £19.99 (save 44% vs monthly)

Always show the annual saving. Annual is the default selected option.
The saving calculation: £2.99 x 12 = £35.88 per year vs £19.99 = 44% saving.

---

## TESTING

All billing changes must be tested in sandbox before any production release.

Google Play sandbox: use a test account configured in Play Console.
Apple sandbox: use a sandbox Apple ID from App Store Connect.

Sandbox subscription renewal speeds (Apple):
  1 month -> renews every 5 minutes (up to 6 times)
  1 year  -> renews every 1 hour (up to 6 times)

Never test billing changes on a production account.
Never submit a billing change to production without sandbox verification.

---

## WHAT NEVER CHANGES WITHOUT EXPLICIT INSTRUCTION

- Product IDs and entitlement IDs
- Trial duration (14-day cardless + 7-day platform trial)
- Pricing (£2.99/month, £19.99/year)
- The free-gating logic for Pro features
- The server-side entitlement grant mechanism
- The paywall trigger timing (day 14)
