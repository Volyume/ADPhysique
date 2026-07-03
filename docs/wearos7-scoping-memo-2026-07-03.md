# Wear OS 7 companion: scoping memo (A6, memo only)

Date: 2026-07-03. Research memo per the founder directive (A6); no code or
project changes. Full sourced version with per-claim confidence flags was
produced by the scoped research agent; this file records the substance and
the decision points. Sources: Android Developers Blog (What's New in Wear
OS 7), Wear Widgets training page, Health Services docs, Play Console
form-factor track docs, EAS Android build docs, react-native-wear-connectivity
repo, in-repo Hevy teardown (docs/hevy-teardown-2026-06-29/10) and the
sibling watchOS memo (docs/e14-watchos-scoping-memo-2026-07-03.md).

## Findings in brief

1. WEAR OS 7 (announced Google I/O 2026-05-19, Android 17 base) is Canary-
   only today; its two headline features - the standardised Wear Workout
   Tracker and Wear Widgets (Jetpack Glance / RemoteCompose, 2x1 and 2x2
   card formats) - are both described by Google as shipping "later in the
   year". Building now means building against a moving, pre-stable target.
2. THE STANDARDISED WORKOUT TRACKER is a UI shell over Health Services /
   ExerciseClient and assumes BODY_SENSORS-class permissions - exactly the
   health-sensor surface this app deliberately removed. Out of scope for
   any MVP under the current constraint.
3. THE RN/EXPO REALITY: a Wear companion is a genuinely separate native
   Kotlin/Compose app (own Gradle module, own manifest, minSdk 30+, and a
   SEPARATE Play Console Wear OS release track). No Expo/EAS mechanism and
   no community config plugin exists for Android Wear modules (unlike iOS,
   where @bacons/apple-targets exists for watchOS). Every RN "Wear" library
   found is a phone-side Data Layer bridge only; the watch UI is always
   native. Hevy's companion follows exactly this shape (native
   WearListenerService + MessageClient, per the teardown).
4. MINIMUM LOVABLE SCOPE maps cleanly onto existing tested seams with NO
   health sensors: rest-timer mirror (restTimerActions.js already maps
   plus/minus/skip onto guarded store actions), set-tick
   (applyRemoteSetEvent, the idempotent headless commit path - SD-11, the
   await-spanning idempotency defect, must be fixed FIRST for any wrist
   platform), haptic on rest end (wall-clock local notification, the
   restEnd.js pattern).
5. EFFORT: widgets-only L (the new-native-target cost dominates);
   rest-timer mirror L-XL; full set-logging companion XL. All require an
   unprecedented in-house config plugin and a second Play release track.
6. UK REALITY: watchOS holds roughly half the UK wearable market; Wear OS
   reach is essentially Samsung Galaxy Watch + Pixel Watch owners. The same
   effort spent on watchOS reaches materially more UK users.

## Recommendation

DON'T BUILD NOW. Revisit behind four prerequisites: (1) Wear OS 7's tracker
and widgets ship stable and the API surface is re-verified; (2) the E6B iOS
widget target completes through a real EAS build (the closest signal for
"first extra native target" pain on this app); (3) a physical Wear OS watch
is available for device-walks; (4) a build-or-buy decision on the phone-side
bridge (in-house Data Layer module matching modules/rest-timer-live - no new
dependency - versus react-native-wear-connectivity, MIT, single maintainer).

## Decision requested (founder)

1. Timing: accept "don't build now" / revisit after the prerequisites /
   proceed anyway (state why).
2. Scope ceiling if ever pursued: widgets-only / rest-timer mirror / full
   set-logging companion.
3. Phone-side bridge, when the time comes: in-house module / community
   library (name and licence recorded above).
4. Standardised Workout Tracker: confirm permanently out of scope (respects
   the no-health-sensors line) or revisit as a decision of the same weight
   as the watchOS HealthKit gate (E14).
5. Confirm whether a Wear OS device is owned or budgeted.
