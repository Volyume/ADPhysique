> **SUPERSEDED (2026-06-08).** This is the original founder-brief reconciliation
> as first written. All 9 items have since been actioned (1, 3-9 fixed; 2
> confirmed correct as-is). For current status see
> **`volyume-audit-final-state-2026-06-08.md`**. Kept for history only.

# Audit Addendum — Founder Brief Reconciliation (2026-06-08)

This addendum supplements the main audit completed on 2026-06-08 against
checkout `bd26b04`. It reconciles the later founder brief against the current
codebase. Where this addendum updates an earlier finding, prefer the newer
status below.

## 1. Stale pricing, beta copy, and old naming still remain in release-adjacent files — High

The app runtime has mostly moved to flat pricing, but stale references remain in
public and metadata files.

Confirmed examples:

- `public/app-map/index.html:139` still shows £0.99 / £1.99 / £3.99
- `public/app-map/data-outputs.html:309` still shows old price windows
- `public/app-map/index.html:341` still references free during beta
- `docs/APP_STORE_CONNECT_LISTING.md:36,58,196,198,364` still contains
  "Volyume — Hypertrophy Logbook", "free during beta", and stale subscription
  details
- `docs/PLAY_STORE_LISTING.md:11` still lists "Volyume: Hypertrophy Logbook"

Impact: Store metadata, support pages, and release collateral can drift away
from the real commercial model and cause submission or trust problems.

Recommended fix: Update or archive all release-adjacent docs and public app-map
assets so only the final pricing, naming, and subscription model remain.

## 2. Trial/paywall copy is partly aligned but not yet exact — High

The code does reflect the 14-day cardless trial plus the extra 7-day Google Play
trial in several places.

Confirmed in:

- `src/screens/WelcomeScreen.js:94`
- `src/screens/ProUpgradeScreen.js:355`
- `src/screens/SubscriptionPolicyScreen.js:95-102`

However, some CTA/paywall-related strings still foreground "7 days free" in a way
the founder brief explicitly rejects.

Confirmed in:

- `src/lib/differentialPaywall.js:51`
- `src/components/DifferentialBadge.js:37`

Impact: Users can still encounter messaging that frames the Play trial as the
primary offer instead of the 14-day cardless period.

Recommended fix: Standardise all trial and upgrade copy so the primary message is
the 14-day cardless trial, with the Play 7-day free period described as the
follow-on subscription offer only.

## 3. Weekly check-in prefill appears fixed in code

The earlier finding that the weekly check-in never prefills from prior answers is
no longer accurate on this checkout.

Confirmed in:

- `src/screens/WeeklyCheckInScreen.js:13`
- `src/screens/WeeklyCheckInScreen.js:426-467`

Updated status: Fixed in code, pending runtime verification.

## 4. Settings export button is present

The earlier finding that the export button was missing from Settings is no longer
accurate on this checkout.

Confirmed in:

- `src/screens/SettingsDataScreen.js:187`

Updated status: Fixed in code.

## 5. Timezone bug class is reduced, but not fully cleared — Medium

The weekly check-in screen now uses local-week logic rather than UTC anchoring.

Confirmed in:

- `src/screens/WeeklyCheckInScreen.js:41`

But UTC-based week logic still exists in adjacent systems:

- `src/lib/notifications/scheduler.js:168-192`
- `src/lib/weeklyCoach.js:453-464`

Impact: The original timezone finding should be narrowed rather than removed. The
main weekly check-in path looks improved, but notifications and some coach timing
logic still need a full UK-local sweep.

Recommended fix: Audit all "current week" and reminder-suppression logic to
ensure the same local-week helper is used everywhere.

## 6. Steps gating still appears open — Medium

The founder brief says the steps section should show regardless, but the screen
still gates it behind `hasStepsTarget`.

Confirmed in:

- `src/screens/WeeklyCheckInScreen.js:320`
- `src/screens/WeeklyCheckInScreen.js:543`
- `src/screens/WeeklyCheckInScreen.js:778`

Status: Still open.

Recommended fix: Remove the `hasStepsTarget` conditional from the weekly
check-in display path and fall back to explanatory copy when no explicit target
exists.

## 7. Compliance wording is improved in consent, but still inconsistent across surfaces — High

The consent screen has been improved and now explicitly names the automated
safety check and says account-deletion data is removed straight away.

Confirmed in:

- `src/screens/Article9ConsentScreen.js:153-156`
- `src/screens/Article9ConsentScreen.js:169`

But other live-facing surfaces still promise deletion within 30 days:

- `public/privacy/index.html:233`
- `src/hooks/useAccountActions.js:319,330`

Impact: Deletion wording remains inconsistent across the app/privacy estate.

Recommended fix: Choose one true deletion rule and make consent copy, privacy
copy, and account-deletion flows all match exactly.

## 8. Under-16 wording exists, but enforced signup blocking is not yet confirmed — Medium

The privacy page now contains under-16 policy wording.

Confirmed in:

- `public/privacy/index.html:256-258`

However, this pass did not confirm an actual enforced under-16 signup gate in the
runtime flow.

Updated status: Policy wording present; enforcement not yet confirmed.

Recommended fix: Verify the signup/onboarding path contains an actual age gate,
or revise public wording so it does not promise a block that is not technically
enforced.

## 9. App naming is still inconsistent with the founder brief — Medium

The founder brief says:

- Store listing name: Volyume - Precision Physique Coach
- Launcher name: Volyume

The launcher side is aligned:

- `app.json:3` uses "Volyume"

But old "Hypertrophy Logbook" naming still remains in metadata/public files:

- `docs/PLAY_STORE_LISTING.md:11`
- `docs/APP_STORE_CONNECT_LISTING.md:36,364`
- `public/app-map/index.html:337`

Impact: Release naming is still inconsistent across store-supporting materials.

Recommended fix: Remove all remaining "Hypertrophy Logbook" references from store
metadata and public release collateral before submission.

## Addendum Summary

This founder-brief reconciliation changes the main audit in two important ways.

Two earlier "open" bugs now appear fixed in code:

- weekly check-in prefill
- Settings export button

The main remaining issues from this reconciliation are:

- stale old pricing references
- "free during beta" copy
- "Hypertrophy Logbook" naming
- mixed deletion wording
- uneven paywall phrasing
- unresolved steps gating
- partial timezone cleanup
