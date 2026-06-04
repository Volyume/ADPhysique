# Deep Feature Audit — Implementation Log

Running log of every change implemented after approval. Append-only.

---

## Item 1 — Welcome screen (tier selection) — IMPLEMENTED 2026-06-04
File: `src/screens/WelcomeScreen.js` (copy + one style; no logic change).
- Free-card backup note rewritten: "Your free account keeps every session
  backed up and synced across devices. No card, no ads." (was "Your data
  stays on your device. Sign up anytime to sync and protect it.")
- Added muted line under the cards: "Both tiers are a free account. No card.
  About a minute to set up." (new `tierNote` style: fontSize.xs, textMuted,
  centred).
- Disqualifier second paragraph softened: "Volyume is built for a few weeks
  of consistent data: that is when the weekly read earns its place. If you
  only want a quick tap-to-log or a standalone calorie counter, it is more
  than you need." (removed the "there are faster ones out there" line).
Verification: `screen-mount` suite green (455 tests); eslint 0 errors. No new
behaviour, so no new unit tests (copy-only on a presentational screen).
Commit: see git log.

## Item 2 — Login / sign-up screen — IMPLEMENTED 2026-06-04
File: `src/screens/LoginScreen.js`.
- promptSignup now matches any `*_signup` intent (regex `/_signup$/`), so a
  free_signup arrival opens Create Account, not Sign In. Comment updated.
- Backup reassurance prompt gate changed from `promptSignup && !isSignIn` to
  `!isSignIn` (shows for every create-account view). Copy: "A free account
  keeps your training and progress backed up and synced. Change or lose your
  phone and everything restores instantly."
- betaNote colour textDisabled -> textMuted.
- modeSwitch: added minHeight 44 + justifyContent centre, paddingVertical
  xs -> sm. Forgot-password TouchableOpacity: added hitSlop 10.
Verification: LoginScreen/auth/screen-mount suites + identityGate.proOnboarding
green (514 tests across the runs); eslint 0 errors. No new behaviour-class
logic beyond the intent match; existing auth tests cover the form.
Commit: see git log.

## Item 3 — Article 9 health-data consent screen — IMPLEMENTED 2026-06-04
Files: `src/screens/Article9ConsentScreen.js`, `src/navigation/RootNavigator.js`.
- Art 7(3) withdrawal notice added before consent: "You can withdraw this
  consent at any time in You -> Privacy." (new withdrawNote style). FLAGGED for
  legal sign-off on wording + mechanics.
- Policy link now shows the in-app PrivacyPolicyScreen (navigation.navigate),
  registered in Article9ConsentStack; removed the external Linking.openURL and
  the now-unused Linking/LINKS imports.
- Added CONSENT_VERSION ('2026-05-23') constant; included as consentVersion in
  the article9_consent_recorded telemetry. Server-side: adding _consent_version
  to record_health_consent + a consent_log column is flagged, not built.
- Continue button now sets accessibilityState={{ disabled }}.
Verification: screen-mount + healthConsentRouting.guard suites green (459
tests); eslint 0 errors.
Commit: see git log.

## Item 4 — Pro onboarding wizard — IMPLEMENTED 2026-06-04 (full split + polish)
File: `src/screens/ProOnboardingScreen.js`.
Founder chose "Full split + polish" when asked.
- Split the overloaded training-profile step into two. TOTAL_STEPS 4 -> 5.
  - Step 3 is now logistics only: experience, session length, days/week,
    equipment. Title "Your training setup."; sub "How your training week
    looks. About a minute." advanceFrom3 validates those three required
    fields then -> step 4.
  - New step 4 is the goal step: focus/phase, optional competing category,
    weak points, protein. Title "What you're training for." advanceFrom4
    validates trainingGoal + trainingPhase then -> step 5. The removed
    "aggressive cuts" interstitial comment moved here with the phase pick.
  - Old recovery & reminders step is now step 5 (key, comment, button ->
    advanceFrom5). Old async advanceFrom4 (plan generation) renamed
    advanceFrom5; no logic change to the generation path.
- Unified the sex and body-weight-unit pickers onto the shared
  SegmentedControl (was a hand-rolled segmentRow). Removed the now-orphaned
  segmentRow/segment/segmentText styles; kept segmentActive/segmentTextActive
  (still used by the compact height-units toggle).
- Morning-weight and weekly-check-in toggles got accessibilityRole="switch"
  + accessibilityState={{ checked }} + label, matching the steps/cardio
  toggles that already had them.
- Progress bar is now a single continuous track with an Endowed Progress
  Effect baseline (opens ~12% filled, fills to 100% on the last step) instead
  of empty segments.
- Copy: dropped the under-stated "Takes about 30 seconds" line in the split.
- Step-1 account redundancy was flagged in the audit, not changed (routing
  decision, left for the founder).
Verification: screen-mount + identityGate.proOnboarding suites green (463
tests); eslint 0 errors (5 pre-existing warnings unrelated to this change).
No runtime-critical contract changed (plan generation, notification
scheduling, profile save all unchanged); the split only re-partitions which
step collects which already-existing field.
Commit: see git log.

## Item 5 — Pro setup complete screen — IMPLEMENTED 2026-06-04
File: `src/screens/ProSetupCompleteScreen.js`.
- Progress bar: replaced the four discrete "all done" segments with the
  wizard's continuous track drawn full (progressTrack + progressFill at 100%).
  This fixes the visual-continuity regression Item 4 introduced (wizard went
  continuous/5-step while this screen still showed 4 segments). Stale "now all
  four done" comment updated. Removed the orphaned progressRow/progressSegment/
  progressDone styles.
- A11y: the collapsible split card now sets accessibilityRole="button" +
  accessibilityState={{ expanded }} (only when hasPlan) + a label; the "new to
  macros?" pointer now sets accessibilityRole="link" + a label.
- Kept (with evidence): the kcal ring + macro bars + goal chips + split +
  "why this plan" rationale (the activation/aha content), the founder note, the
  single "Start training" CTA, the reduceMotion-aware animation, and the
  no-plan / no-targets fallbacks. No copy changed (already on-voice).
Verification: screen-mount suite green (455 tests); eslint 0 errors (3
pre-existing warnings). No runtime-critical contract touched (completeFirstRun,
plan/targets reads unchanged).
Commit: see git log.

## Item 6 — First-run screen (Free path) — IMPLEMENTED 2026-06-04
File: `src/screens/FirstRunScreen.js`.
Approved incl. the optional headline alignment.
- Removed the dead unit-picker styles (unitRow/unitBtn/unitBtnActive/
  unitBtnText/unitBtnTextActive) and the now-unused TouchableOpacity import,
  both remnants of the removed unit choice.
- Keyboard Return now submits: returnKeyType "next" -> "go" plus
  onSubmitEditing={finish} on the single name field.
- Headline aligned to type.h2 so Welcome/wizard/complete/first-run share one
  headline treatment.
- Kept the single-field design + deferred plan choice (the converting
  pattern), kg-only, auto-focus, disabled-until-valid CTA, busy guard, single
  completeFirstRun exit, the one Plans hint. No copy changed.
Verification: screen-mount green (455 tests); eslint 0 errors (1 pre-existing
React-unused warning). No logic or contract change. Note: screen is off the
live path while PRO_BETA_ACTIVE forces Pro.
Commit: see git log.

## Item 7 — Train tab (HomeScreen) — IMPLEMENTED 2026-06-04
File: `src/screens/HomeScreen.js`.
Approved all three changes (banner priority coach > deload > phase).
- Removed 26 verified-unused style keys (~150 lines of dead CSS) left from
  cards the founder removed (weekCard cluster, the local header block now
  superseded by ScreenHeader, quickRow/quickLink, sectionLabel, trainingBrain*,
  weightInput/weightCardHint, proTeaserSub, weekStats style). Each was
  grep-confirmed at 0 `styles.X` references before removal; the weekStats
  *state* (used by the coach brief + glance card) was left intact.
- A11y: added accessibilityRole/Label to the Edit + Log weight buttons, the
  coach-update banner and its dismiss, the deload banner and its dismiss, the
  Pro-teaser card, the intent-prompt options, and the change-workout picker
  rows (with selected state).
- Banner governor: added showCoachBanner/showDeloadBanner/showPhaseBanner so at
  most one of the three attention banners renders at a time (coach review >
  deload > phase). Lower-priority banners still surface on a later load once the
  one above is dismissed, so nothing is lost, just sequenced. Dismissal
  persistence is unchanged.
- Left untouched (runtime-critical / earned): the multi-trigger loadData
  orchestration (+3s/+10s safety timers), crash recovery, optimistic weight
  logging, skeletons, the start/intent flows. No copy changed.
Verification: screen-mount green (455 tests); eslint 0 errors (warnings all
pre-existing). No HomeScreen-specific test beyond screen-mount; the banner
gating is pure derivation. No start/sync/contract behaviour changed.
Commit: see git log.

## Item 8 — Plans tab (PlansScreen) — IMPLEMENTED 2026-06-04
File: `src/screens/PlansScreen.js`.
- Removed 23 verified-unused style keys (the cardio-card cluster left from the
  move to Progress, screenHeader/pageTitle now handled by ScreenHeader,
  goalsPointer*, the Pro-lock variant actionCardLocked/lockBadge*, the
  training-days picker dayChip*/trainingDays*, and sectionDeemphasised). Each
  grep-confirmed at 0 references.
- A11y: added accessibilityRole="button" + labels to the active-plan Start-Next
  and View-Plan, the My-plans and archived footer links (View / Set active /
  Restore), the template Start, and the six block-advisor buttons; added
  accessibilityState={{ expanded }} to the archived-section header.
- De-duplicated the audience comment above the actionCards selection.
Verification: PlansScreen eslint clean (0 problems); screen-mount green (455).
No behaviour, data, or navigation change.
Commit: see git log.
