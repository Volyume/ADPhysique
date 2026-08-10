# Campaign 4 — lead rulings on the audit evidence (D95-1)

Ruled 2026-08-10 under D33 on the eight AUDIT-*.md evidence files.
Deletions execute ONLY what those files prove F/G, with every named
precondition (invariant moves, comment fixes, guard re-anchors) landing
in the same wave. All H/I items are ruled below: fixed, kept, or
escalated. British English.

## Cardio closure (AUDIT-CARDIO)

Execute all F/G removals. H rulings:
- **H1 sync retirement: push handler removed, pull RETAINED** - the
  order's stated preferred posture. Pulled rows land in a table with no
  product reader (not "live product state"), and retention preserves
  the delete/export chain and cross-device history.
- **H2 export gap: PRE-EXISTING** (cardio_log was never in
  BACKUP_TABLES). Recorded as founder item FR-C4-1: adding it re-opens
  a restore write path; deletion-only coverage is today's posture
  either way. Not worsened by this campaign.
- **H3 deleteCardioLog: FUNCTION KEPT** (erasure affordance /
  account-deletion compatibility); its UI dies with CardioHistory.
  Per-row erasure remains available to account deletion and any future
  data-retirement design.
- **H4 founder-published listings** (Play Store / App Store / marketing
  fact base): FOUNDER-SIDE ACTIONS, recorded on the taskboard - code
  campaign does not edit published-listing source docs.
- **H5 CONFIRMED: fully non-destructive.** cardio_log local+cloud,
  weekly_checkins.cardio_adherence, coach_outputs.cardio_prescription,
  userProfile.cardio* values all retained; schema untouched; wipe/
  delete coverage unchanged.
- **H6 replacement copy for weeklyCoach.js:1226** (lead-ruled, copy
  only): the steps note stops promising cardio as "the next lever" and
  ends on the honest levers that exist (steps consistency and the
  calorie side).
- **I posing/conditioning message**: owned by the dead-copy wave
  (zero-caller deletion), not the cardio boundary.
- **I founderRulings guard**: re-anchored to an ABSENCE pin in the same
  commit as the route removals, never deleted alone.
- The boundary guard follows the audit's spec: behavioural fixture pin
  plus named-file absence pins with the allowlist (docs, migrations,
  seed equipment, steps/health, retained schema/wipe, precedent
  comments).

## Peak week (AUDIT-PEAKWEEK-SYNC)

- **peak_week_plans is CLASS A LIVE** (B4 contest countdown). ORDER
  PREMISE CORRECTED; nothing removed. Migration 049's false rationale
  and stale cleanup list: header corrected to name the B4 consumers and
  the hold reason; 049 REMAINS HELD. Taskboard stale framing corrected.
  Recorded as FR-PW-1 for any future retirement design.
- Dead prep columns, planned_muscle_volume_sync residue: KEEP
  (destructive to drop) - listed as retained legacy storage.
- `insertOrUpdatePeakWeekPlanFromCloud` missing `deleted_at`: latent
  resurrect-on-pull defect, additive one-line fix - EXECUTE.
  (Corrected at Review B, F4: the landed line carries the cloud value
  through, but the legacy push never sends deleted_at and no local
  writer sets it, so the defect is not CLOSED - it stays fully latent
  with no producer either side. Real delete semantics are FR-PW-1
  territory; do not re-describe this as a fixed defect.)
- Notification-prefs dual-family drift (blob cloud-wins vs per-category
  rows): REAL but architectural - recorded as future sync
  consolidation work + founder visibility (FR-C4-2). No refactor now,
  per the order.
- adaptation_events restoring into a zero-reader _sync table: same
  class as P0-1's planned_muscle_volume finding - recorded FR-C4-3
  (restore-path fix needs its own careful campaign slot; NOT executed
  here since restore correctness changes are integrity-campaign
  territory).
- schema.sql + setup_complete.sql: SUPERSEDED - DO NOT RUN headers
  (smallest fix); false counts corrected in the headers; files stay.

## Dead functions / copy / modules (AUDIT-DEAD-FUNCTIONS, -MODULES-FLAGS)

Execute all F deletions WITH the mandatory invariant moves FIRST (law C
jargon extension onto live coachResponse tests; CALC-8
getCurrentBlockWeekIndex pin; every gate the audit names). KEEP:
getCurrentMesoWeek (D, DST oracle + single-resolver guard),
getMesoSchedule (C, live dependency), checkJargonScienceOn (I,
documented seam), ProgressScanHistoryCard (I, FR-3 cluster).
- **getProgressionSuggestion: KEPT, escalated as FR-C4-4** - its
  CALC-5 pin protects a law the LIVE computeSetTargets provably fails;
  deleting would unpin a live defect. The right fix (make live code
  honour the law) is an engine change needing its own ruling.
- **links.js fork RULED: DELETE** (Phase 6) - every URL is native or
  hard-coded live; the PRIVACY_CONSENT_LOCKED stale lines are fixed in
  the same commit (the doc's :309 clause stays true). FR-3 untouched.
- diaryTimeline deletion carries the D37 tombstone guard and the ED
  invariant re-anchor; progressScanCopy deletion moves the
  weight-privacy law to the four live sites first and the commit
  states FR-3 remains unresolved.
- plateMath.js (flagged by the docs lane, D57-rejected feature, false
  entry-point comment): re-prove zero live callers in-wave, then
  delete with a plate-calculator tombstone pin (never re-propose is
  standing law).

## Routes / deferred / duplicates (AUDIT-ROUTES, -DEFERRED-TELEMETRY, -DUPLICATES)

Execute: the 9 dead registrations (incl. cardio's), PlanLibrary
fromFirstRun dead branch, the 6 live inert cross-stack dead taps
(fixed via navigateCrossTab, incl. resolving BlockReflection's
sourceless state - DECISIONS:2344 requires the surface, so the
MesocycleBuilder dead tap is FIXED not deleted), applyNotifications
removal per the audit's exact spec, mealSlots comment, the five
LOCAL-ONLY corrections, setBarWeight setter removal (value/column
stay), SettingsWorkout header fix, telemetry T-1a deferred flag,
epleyE1rm removal with the equivalence test, muscleDisplayName
consolidation (one export, three call sites).
KEEP: tabLongPress (D - Pressability cancels onPress through the
config; removing it changes tap behaviour), MealNames (E, founder
order), ProfileStack.BodyMetrics registration (I - defence-in-depth
guard implies intent; recorded, not deleted).
Telemetry rulings: T-2 chart_metric_changed - REMOVE THE EMITTER
(cataloguing it would start new transmission, forbidden); T-3 partner
block events - STATUS QUO KEPT + FR-C4-5 (adding them to the client
catalogue = new transmission = founder's call; tests pin the emit,
transport drops it, harmless today); D-15 categoryForDataType missing
cases - FR-C4-6 (ED/privacy-adjacent addition needs a ruling).
UTC day-key debt (D-20) and progressPhotoTimeline shadow name (D-19):
recorded as debt; D-19 rename executed (rename only).

## Docs truth (AUDIT-DOCS-COHERENCE)

Execute all F text corrections: CLAUDE.md factual drift (counts,
module list, migration status line), supabase/README rebuild of the
tracker + 059 correction + authority-chain fix, NOTIFICATIONS_LOCKED
four fixes, PRIVACY_CONSENT_LOCKED two fixes, EMAIL_AUTH banner
correction, B2B_COACH banner + false-column claim, DATABASE_SCHEMA
Move #5, BACKLOG stale cites, RootNavigator false migration comment,
TierComparisonStrip comment, differentialPaywall comments, SUPERSEDED
banners on the 11 unbannered root docs, migrate_049 header, product-map
Campaign 3-4 addendum. ProGate cardio blurb + SettingsFaq line die in
the cardio wave. CAUTION ITEM: root billing.md/styling.md "misnamed
hook scripts" - verify .claude hook references BEFORE touching;
if hooks execute them, RENAMING BREAKS THE GUARD - investigate
in-wave, act only on proof.

## Founder items opened by this campaign (carried to the handover)

FR-C4-1 cardio export coverage · FR-C4-2 notification-pref dual-family
drift · FR-C4-3 adaptation_events restore path · FR-C4-4 CALC-5 law vs
live computeSetTargets · FR-C4-5 partner telemetry catalogue ·
FR-C4-6 notification category derivation gaps · FR-C4-7 progress-photo
capture-weight gating · FR-C4-8 check-in reminders vs the locked
unsubscribe principle · FR-C4-9 root misnamed hook scripts
(billing.md/styling.md/watermelon.md - rename/delete needs founder
knowledge of local hook wiring) · FR-C4-10 public/app-map is a dated
June audit report still published on the public site (stale billing
"pending" claims, internal bug lists) - refresh or unpublish is the
founder's call · FR-C4-11 activitySteps.js + the engine's steps lever
are retained-dormant, revive or retire is a product call · FR-PW-1
peak-week retirement design · plus H4 listing
updates. FR-1..FR-5 carried unchanged.

## Wave rulings (D95-2, during implementation)

- **plateMath.js**: the dead-functions lane's re-proof found ONE live
  export (DEFAULT_BAR_KG, the warm-up ramp's bar floor). Ruled:
  constant relocated to warmupRamp.js (its live consumer's home), the
  D14/D57-rejected calculator module and its test deleted, the
  boundary tombstone now passes honestly.
- **FR-C4-7 (new founder item, ED/privacy-adjacent)**: the
  progress-photos gallery renders each photo's self-logged capture
  weight (ProgressPhotosScreen.js:1263 area) without the per-item
  suppressed/hideExact gate the three scan-stats sites carry.
  Whether screen-level suppression already covers every reachable
  path needs its own evidence pass; a unilateral gate change on a
  body-image surface is not the lead's call. Flagged by the wave,
  recorded, untouched.

## Routes/duplicates wave rulings (D95-2 continued)

- **ProUpgrade policy-link back stack**: navigateCrossTab pops the
  destination tab to root, so on the one-of-five path where the
  paywall was opened from the Coach tab, back from SubscriptionPolicy
  now lands on You rather than the paywall. ACCEPTED: uniform across
  all five entries, four of which previously dead-tapped entirely, and
  the conditional alternative is the exact hand-rolled form the
  navigation guard bans.
- **muscleDisplayName nullish divergence**: the three private copies
  disagreed only on nullish input ('Muscle' / '' / throw), which is
  unreachable at all three call sites. RULED: the shared helper takes
  the most defensive body ('Muscle'), divergence recorded in the test.
- **PlanLibrary fromFirstRun scope**: the audit named two lines; the
  wave removed the whole dead branch family (param, five uses, route
  prop) after re-proving no caller passes the param. RATIFIED - an
  always-false variable is precisely the residue this campaign clears.

## Docs-truth wave rulings (D95-2 continued)

- **CLAUDE.md Pro-gating enumeration**: "cardio" removed from the
  Section 2 Pro list (lead-executed at landing). The gating RULE is
  unchanged; the word named a feature that no longer exists, and the
  campaign's third law forbids a removed feature leaving a promise.
- **BUDGET_POSTURE_LOCKED.md RevenueCat row**: dated correction note
  added under the ledger (lead-executed): RevenueCat was never
  adopted, billing is direct react-native-iap + Google Play Billing.
  The posture principle stands; only the false cost claim is
  corrected.
- **public/app-map residency**: "UK-hosted" was never true - fixed to
  EU (Dublin) at all three sites (lead-executed; GDPR-truth on a
  public page). The page's broader staleness is FR-C4-10 below.
- **Root billing.md / styling.md / watermelon.md**: proven unreferenced
  by any in-repo hook (.claude/settings.json registers only
  edit-gate.sh and agent-tier-guard.py). NOT renamed or deleted:
  whether they are wired into the founder's local (out-of-repo)
  Claude settings is unknowable from here - FR-C4-9.
- **NOTIFICATIONS_LOCKED.md:31-32 vs live behaviour**: the locked
  ledger says the check-in reminders are user-disableable; the live
  CoachingRemindersScreen exposes day/hour pickers with no toggles
  (always scheduled for Pro). Possible live breach of the doc's own
  unsubscribe principle - FR-C4-8, adjacent to FR-5. Locked rows left
  untouched; live state recorded in the doc's new dated block only.
- **Folder banners beyond the 11 root docs** (web-platform, DEFECT-MAP,
  campaign folder entry files): consciously scoped out of this
  campaign; carried on the audit evidence for any future docs pass.
- **129/130 applied-date conflict** (README 2026-08-08 vs headers
  2026-08-06): unresolvable from the repo; both dates recorded
  side-by-side in the README rather than one invented.

## Adversarial Review B rulings (D95-3)

- **F1 (BREAKS-BOUNDARY, actioned): check-in save cleared retained
  cardio answers.** `WeeklyCheckInScreen.js:745` wrote an explicit
  `cardioAdherence: null`; the preserving-write contract
  (database.js: explicit null CLEARS, only undefined preserves) meant
  a same-day re-entry re-save destroyed the stored answer locally and
  on push - violating H5. FIX: the key is omitted entirely (undefined
  preserves on UPDATE; the INSERT branch writes NULL for absent keys,
  so new rows are identical). The lead's landing review ratified the
  `stepsAvg: null` idiom without checking its clearing semantics -
  the idiom itself was the defect. Pre-existing siblings
  (stepsAdherence/stepsAvg) keep their long-standing behaviour: both
  stopped being collected long before this campaign, so there is no
  retained answer left to clear.
- **F2 (PROMISE-LEAK, actioned)**: STALE-ON-CARDIO banners on
  PLAY_STORE_LISTING, APP_STORE_CONNECT_LISTING, marketing/parts/1
  and /3; the three false cardio lines DELETED from
  marketing/FACT-BASE.md (it feeds an autonomous publish lane - a
  banner alone leaves a machine-readable false fact); H4 + all FR-C4
  items now on TASKBOARD §3; README front door repointed at the live
  authorities.
- **F3 (guard integrity, actioned)**: the boundary suite's
  steps-survival leg pinned dormant code (activitySteps.js has zero
  production callers; the steps lever runs with stepsEnabled:false and
  currentStepsTarget:0 at the only call site, so the H6 replacement
  copy is production-unreachable). Pins re-anchored to genuinely live
  activity code (daily_steps schema + registry entry) with the
  dormancy stated honestly. NEW FOUNDER ITEM FR-C4-11: activitySteps
  module + the engine's steps lever are retained-dormant; whether to
  revive or retire them is a product call.
- **F4 (record truth, actioned)**: the peak-week deleted_at landing
  was over-claimed as closing the resurrect defect; register and log
  corrected (see the peak-week section note). Latent, no producer,
  FR-PW-1 territory.
- **F5 (actioned)**: `cardioNoteRow`/`cardioNoteText` styles in
  CoachOutputScreen renamed - they style the D15 adherence-why and
  cycle notes, nothing cardio.
- **F6 (ruled, actioned)**: NutritionEducationScreen's maintenance
  line keeps its true physiological claim but gains "elsewhere"
  ("whether or not you track them elsewhere") so it cannot read as a
  pointer to an in-app cardio tracker.
## Adversarial Review A rulings (D95-3 continued)

- **F1-F3 = Review B's cross-lane rows**: same three sites, actioned
  once (see the cross-lane entry below).
- **F5 (H3 limitation, recorded)**: `deleteCardioLog` is local-only
  now that push is gone - a soft-deleted row returns on the next pull
  (cloud deleted_at stays NULL) and sign-out/sign-in restores it.
  Account DELETION is unaffected (server-side RPC wipes the cloud
  table), so no GDPR erasure hole exists. RULED: no new delete-only
  push machinery for a retired table with zero callers; H3's record
  now states the function is account-deletion-compatible retention,
  not a working per-row erasure. Real per-row erasure semantics join
  the FR-C4-1 export/erasure design cluster.
- **F6 (H1 limitation, recorded + surfaced)**: a cardio row created
  offline and never successfully pushed before the app updates can no
  longer reach the cloud, and sign-out wipes it. Requires the entire
  window from creation to upgrade with no successful sync - rare, and
  the data is invisible in-product either way. RULED: no one-shot
  drain built in a cleanup campaign; the accepted loss is recorded
  here and surfaced in the founder handover. If the founder wants the
  drain, it is a small follow-up (push cardio_log once, then pull_only).
- **F7 = Review B F4** (peak-week one-sided fix): already corrected in
  the record; A's push-side patch not taken (no local writer sets the
  flag, so pushing it moves nothing today) - FR-PW-1.
- **F8 (actioned)**: the `stepsTarget: target` absence pin the lead's
  own cardio commit (21252dbe) over-trimmed from the profileMerge
  guard is RESTORED - a steps law, never in the cardio scope.
- **F9 (actioned)**: migrate_059's own header now records APPLIED
  (production sweep 2026-07-27), ending the header-vs-README
  contradiction the docs wave half-closed.
- **F10 (actioned)**: the public data-outputs page's "Steps:
  Auto-averaged, or typed" check-in row removed - the check-in stopped
  collecting a steps average long ago.
- **F11 (actioned)**: the coachReport benign-strings pin carried a
  fabricated string; replaced with the engine's real recovery-deload
  note so the classification tests real vocabulary.
- **F12 (actioned)**: ProOnboardingScreen's orphaned
  `notifHeaderToggle` style and its five-line comment removed (its
  only consumer was the deleted cardio switch row).

## Adversarial Review C rulings (D95-3 continued)

Review C fixed eleven truthful-documentation findings itself (text-only,
lead-reviewed and landed): the watermelon.md and root settings.json
SUPERSEDED banners, the plate-maths claim deleted from FACT-BASE and
part 1, the deploy-migrations workflow header rewritten to
MANUAL-DISPATCH-ONLY with eight migration headers corrected, dated
STATUS blocks on the three cardio migrations, the weeklyCoach steps
dormancy comments (FR-C4-11 cited), the database.js cardio-loop comment,
banners on RELEASE_READINESS_PLAY, the SUBMISSION_CHECKLIST plate step
struck, and the campaign3 test title. Lead rulings on its reported
items:
- **R1 (web/ cardio consumer): RECORDED, kept.** The web review page
  parses adjustments.cardio/cardioFlag off stored coach_outputs; the
  engine no longer emits them, so new outputs render nothing, and for
  HISTORICAL weeks rendering the stored prescription is truthful. web/
  was never in D95 scope; its fate belongs to a web campaign.
- **R2 (stale applied-status migration headers): EXECUTED by the lead**
  - all 39 remaining headers in the applied ranges corrected to YES
  with the 2026-07-27 sweep citation, formats preserved, warnings
  (never-run-from-an-agent) and historical narratives kept. 049 (HELD),
  072 (superseded, never applied) and 132-135 (awaiting the phrase)
  untouched - their NO is true.
- **R3 (FACT-BASE health line): EXECUTED** - "read-only" missed the
  live write-workouts toggle; corrected to name reads (weight, steps)
  and the opt-in workout write, still no lifting reads.
- **R4: EXECUTED** - root settings.json added to FR-C4-9's misnamed-
  file cluster (fourth member; same out-of-repo hook unknown).
- **R5 (steps have no user surface): RECORDED under FR-C4-11** - the
  marketing fact base's "steps remain" line is downstream of that
  ruling; whatever the founder decides there must flow to the
  marketing lane.

- **Cross-lane dead taps (actioned)**: AUDIT-ROUTES §6 rows 7-9 and 11
  were live MED inert taps the D95-2 ruling under-scoped (it took only
  the six HIGH rows). Rows 7-9: WorkoutSummaryScreen's ProgressPhotos/
  RecapStory taps now use navigateCrossTab (dead from the HomeStack
  entry, uniform after the fix). Row 11: NotificationSettings
  registered in ProOnboardingStack, following the in-file
  NutritionEducation precedent ("registered here too so the onboarding
  hand-off screen can link straight in without leaving the flow").
