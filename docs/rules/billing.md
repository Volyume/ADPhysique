# VOLYUME — BILLING RULES

Read this when working on anything touching purchases, subscriptions, or paywalls.
Billing is live. Real users are being charged. Treat every change as surgery.

---

## BEFORE TOUCHING ANY BILLING FILE

State all of the following. Wait for explicit "proceed" before writing code.
1. Which file you are changing and why
2. What exact change you are making
3. Whether it affects the purchase flow, entitlement check, or trial logic
4. That you will test in sandbox before production

---

## PRODUCT IDENTIFIERS — NEVER CHANGE

These are live in Google Play Console.
pro_monthly
pro_annual

(Corrected 2026-06-11. Earlier versions of this file named them
volyume_pro_monthly / volyume_pro_annual — wrong. The live ids are the ones
in src/lib/payments/catalogue.js, confirmed by the founder.)

If you see these hardcoded anywhere unexpected, extract them to constants.
Never change their values.

---

## BILLING LIBRARY

Billing uses react-native-iap (not RevenueCat, not expo-iap).
Always use the existing billing service layer. Never call react-native-iap directly
from a component or screen.

---

## TRIAL STRUCTURE — DO NOT CHANGE

Days 1-14:   Server-side cardless entitlement. No payment method required.
Day 14:      Paywall appears. User starts Google Play 7-day trial.
Days 14-21:  Google Play trial. Payment method required.
Day 21:      First charge.

Never change the 14-day server-side duration, the 7-day Play trial offer,
the day-14 paywall trigger, or the pricing.

---

## PRICING — NEVER CHANGE

Monthly: £4.99
Annual:  £29.99

---

## PAYWALL COPY

Android: "Try Pro free for 14 days. No card needed.
          Then £29.99/year or £4.99/month. Cancel anytime in Google Play."

iOS:     "Try Pro free for 14 days.
          You won't be charged until [date]. Cancel anytime in Settings."

Never show "no card needed" on iOS. Apple requires a payment method.

---

## RESTORE PURCHASES

A working Restore Purchases option must always exist on the paywall and in Settings.
Never remove it.

---

## TESTING

All billing changes must be sandbox tested before production.
Never test billing on a production account.
Never submit a billing change to production without sandbox confirmation first.
