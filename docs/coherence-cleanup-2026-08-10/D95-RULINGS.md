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
FR-C4-6 notification category derivation gaps · FR-PW-1 peak-week
retirement design · plus H4 listing updates. FR-1..FR-5 carried
unchanged.

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
