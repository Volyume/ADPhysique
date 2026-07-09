# World-class design campaign — status and resume

**Purpose.** Live state of the 2026-07-09 world-class design/usability
campaign so ANY fresh session can resume without the prior chat. Read this
file, then the SOURCE files it points to, in full, before continuing.
Updated at every phase boundary. Branch: `claude/codebase-audit-docs-pv6mjd`.

## Founder mandate (in-session, 2026-07-09)

- Goal: every area of the app world-class, "best Silicon Valley design
  team" level. Design, interface, usability, flow, ease of use,
  self-explanatory, consistent on all phone sizes, no AI tells even in
  design. Each component as good as the best competitor for that component.
- No user base yet: wholesale changes ARE allowed where they significantly
  improve the product. Do not defer big work to "version two".
- Main loop runs Fable 5 hands-on; dispatched agents run Sonnet, max 3-4
  agents at a time, each batch run to completion before the next (protects
  the founder's 5-hour usage window).
- **Standing delegation:** founder delegates all design/usability/end-user
  judgement calls to the session; every such decision is RECORDED in
  `DECISIONS-2026-07-09.md` (same folder), never made silently. NOT
  delegated: legal/safety/money — GDPR/Article 9 consent substance,
  ED-safety locked text beyond verbatim restoration, billing/trial
  mechanics, new dependencies, cloud migrations. Those go to the founder.
- Keep this file and all records current at each phase so a cleared chat
  can resume cleanly.

## Source documents (read in full before resuming work)

- `00-MASTER-INDEX.md` (same folder) — 137 consolidated findings across 8
  lanes, SAFE/JUDGEMENT/GATED classification, quick-win and decision lists,
  coverage gaps.
- Lane files `01`-`08` (same folder) — the detailed findings with file:line.
- `DECISIONS-2026-07-09.md` (same folder) — D1 card radius 16px; D2
  shadow.glow sanctioned; D3 letterSpacing overline/wordmark; D4 naming
  hybrid (Precision Coaching = branded surfaces, "your coach" = running
  prose, locked surfaces restored verbatim); plus the standing delegation.
- `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` — locked voice surfaces 1-8.
- `CLAUDE.md` — constitution; section 2 inviolables unchanged by this
  campaign.

## Campaign plan (batches)

- **Batch 1 (PARTIALLY LANDED, salvage pass committed `1b47687`; original
  agent scope below is NOT fully done — see gap list):** three Sonnet
  agents + hands-on work.
  - Agent A: lane-01 SAFE copy fixes + D4 naming sweep (excludes
    ED-safety/consent/billing files, src/lib safety modules, notifications).
  - Agent B: lane-03 layout fixes (FoodSearchScreen inset + ModalHeader +
    radius literal — B owns that whole file; ActiveWorkoutScreen navTab
    hitSlop; WorkoutHistory dayNum font cap; ManualBuilder reorderBtn;
    8 Dimensions.get → useWindowDimensions migrations).
  - Agent C: lane-02 visual fixes (PartnerScreen/MealPlanScreen skeletons;
    RecipeBuilder ModalHeader; shadow.glow applied at 3 sites; off-scale
    radius/padding literals; full letterSpacing sweep to tokens + new
    ESLint ban; header trio documented in styling.md/DESIGN_SYSTEM.md).
  - Hands-on (Fable): theme spine (DONE, committed `214b057`); locked-surface
    restorations DONE (`de9a165`): GoalLockConsent Surface 4, whyThisTemplates
    A14, weeklyCoach A15, differentialPaywall A21 + snapshot test, voice-doc
    D4 addendum.

  **What actually landed vs the scope above.** The three agents' work
  stalled mid-run; only a SUBSET of the scope above had reached the working
  tree as uncommitted changes across 16 files, and even that subset had a
  defect (YearOfLiftsScreen's `Dimensions.get -> useWindowDimensions`
  migration was half-finished: `useWindowDimensions` imported but unused,
  `SCREEN_W` undefined at three sites). A follow-up Sonnet session (this
  entry) did NOT re-run the agents or attempt their full original scope —
  per instructions it finished and verified only what was already in the
  tree: completed the YearOfLifts migration (SCREEN_W now read inside the
  component via useWindowDimensions; StoryCard takes a `width` prop applied
  inline since a hook value cannot live in StyleSheet.create at module
  scope), fixed five pre-existing test files whose expectations pinned
  copy/structure the sweep deliberately changed (each has an inline
  old -> new note: planPreview's em-dash removal, LiftProgress's
  e1RM -> "est. max" jargon fix, FoodSearchScreen's ModalHeader +
  sticky-plate-bar-inset adoption), then committed as `1b47687`. Lint clean;
  full suite green bar three pre-existing, unrelated failures left
  untouched: `weeklyCoach.ffmFloor.test.js` (ED-safety module, out of
  scope), `ActiveWorkoutScreen.usability.guard.test.js`'s cueCount assertion
  (pre-existing on HEAD before this campaign touched the file), and
  `progressScanVision.test.js` (environment-only).

  **Confirmed STILL OUTSTANDING (checked directly, 2026-07-09) — not in
  `1b47687`, not anywhere else on this branch:**
  - Agent C's PartnerScreen/MealPlanScreen skeleton loaders: no `Skeleton`
    reference in either screen.
  - Agent C's RecipeBuilderScreen ModalHeader adoption: no `ModalHeader`
    import in that screen.
  - Agent C's `shadow.glow` application at the three Pro-moment sites
    (WelcomeScreen/ProOnboardingScreen/ProUpgradeScreen): zero screens
    reference `shadow.glow`, even though the token itself exists in
    `theme.js` (theme-spine work, D2). D2 is authorised but not applied.
  - Agent C's full letterSpacing sweep + new ESLint ban: the `overline`/
    `wordmark` tokens exist in `theme.js`, and a few sites already route
    through `letterSpacing.caption` (PartnerScreen, PartnerPrivacyReceipt),
    but raw non-zero `letterSpacing` literals remain in at least
    CardioHistoryScreen, ImportScreen, MesocycleBuilderScreen (×2),
    PlanPreviewScreen, SettingsAboutScreen (×2, includes an unconverted
    wordmark candidate), and PRCelebration (unconverted wordmark
    candidate). No ESLint rule bans raw `letterSpacing` yet.
  - Agent C's header-trio documentation in styling.md/DESIGN_SYSTEM.md:
    neither doc mentions `letterSpacing`, "header trio" or `ModalHeader`.
  - Agent B's "8 Dimensions.get → useWindowDimensions migrations": only 4
    were found done anywhere on the branch (BodyMetrics, ExerciseDetail,
    FoodInsights, YearOfLifts). The other 4 sites Agent B was assigned are
    unidentified and unconverted.

  A fresh session resuming Batch 1 should treat the above as the real
  remaining backlog, NOT re-open the four items already confirmed
  complete (theme spine, locked-surface restorations, the 16-file salvage
  in `1b47687`, or FoodSearchScreen's inset+ModalHeader+radius-literal
  trio, which layout tests now pin).
- **Batch 2 (QUEUED):** Card adoption (155 hand-rolled blocks, heaviest:
  NutritionTargets 12, ActiveWorkout 12, WorkoutSummary 10,
  ExerciseDetail 10); Button adoption on true CTAs among ~840 raw
  touchables; EmptyState adoption (6 screens); uppercase section-label role
  consolidation (B-5, 25 sites — pairs with D3 overline token).
- **Batch 3 (QUEUED):** new audit lanes for the six coverage gaps
  (master index section 5): light-theme parity (app is dark-first — the
  LIGHT palette is the unaudited one), motion/animation quality, aesthetic
  design-language craft, accessibility (contrast/screen-reader), first-run
  emotional quality, competitive benchmarks for Home/Progress/Settings.
- **Batch 4+ (QUEUED):** elevation builds from batch-3 lanes; flow fixes
  from lane 04; meal-builder fixes from lane 05; partners fixes from lane
  06; workout-logger improvement list from lane 07 (hitSlop done in batch
  1; short-screen compact mode pending device-walk); founder-gated
  conversion-funnel decision set (lane 08 + master index section 4
  GATED 12) — needs a structured founder question round first.

## Founder decisions still OPEN (ask, do not start)

Master index section 4 GATED list, minus what D1-D4 resolved. Highlights:
conversion-funnel set (PaywallScreen dead code, trial-length contradiction,
silent trial start...), Partners consent-receipt options, RIR/RPE per-set
entry (coaching boundary), iOS Live Activity (gated item 14), drag-reorder
dependency, NT1/PDT1 additive migrations + sync registry, MN-1 STATUS-line
confirmation, ProOnboarding Step 2 split (onboarding-gated), en-dash
range carve-out.

## Completed so far (commit history is the ground truth)

- 8 audit lanes + master index committed (`7c03c2c`, `39db870`).
- Theme spine + drift repairs (`Card` radius 16px default;
  `letterSpacing.overline/wordmark`; `shadow.glow` + Materials Policy
  exception; workout logger chip back to "N notes" per U-A-1 contract;
  ProGate guard stale 'Your week' ban removed). Committed after `39db870`.
- Known environment-only test failure: `progressScanVision.test.js` needs
  `react-native-fast-tflite`, which is not installed in this container.
  NOT a code defect; do not chase.

## How to resume

1. Read this file, `00-MASTER-INDEX.md`, `DECISIONS-2026-07-09.md`.
2. `git log --oneline -15` on this branch to see what landed.
3. Continue the first unfinished batch item above; keep the batch
   discipline (max 3-4 Sonnet agents, complete before next batch).
4. Update this file + commit at every phase boundary.

## Batch 1 CLOSED (2026-07-09, verified by lead)

All Batch-1 residue finished; full `npm run lint` exit 0. Commits:
- `1b47687` — salvage of the 3 stalled agents' 16 in-flight files + YearOfLifts
  useWindowDimensions completion + 5 stale-copy test fixes.
- `ea6460b` — stale `ffm_floor_hold` copy assertion fixed (FFM->"lean mass"
  per COACHING_VOICE_SYNTHESIS_LOCKED.md; ED-safety FLOOR UNCHANGED, numeric
  floor test still green — verified not a regression).
- `965e36d` — lane-03: the 4 remaining Dimensions.get -> useWindowDimensions
  migrations (ProgressSections, PRCelebration, ProgressPhotoCompare,
  ProgressPhotoViewer).
- `c0186de` — lane-02: full letterSpacing token sweep (~90 sites) + ESLint ban,
  Partner/MealPlan skeletons, RecipeBuilder ModalHeader, shadow.glow x3 Pro
  sites, header-trio docs. ED lockout/cleared banner label styles touched
  (letterSpacing token only, value-identical, no text/logic) - lead-verified safe.

Known pre-existing failures (NOT caused by this campaign, confirmed via
git-stash on HEAD): `ActiveWorkoutScreen.usability.guard.test.js` cueCount
assertion; `progressScanVision.test.js` (missing native react-native-fast-tflite
in container). cueCount to be fixed alongside Batch 2 per "fix, do not defer".

## Next: Batch 2 (Card / Button / EmptyState / section-label adoption) + cueCount fix.

## Batch 2 wave A DONE (2026-07-09): Card + EmptyState adoption + cueCount
- `c35bbdd` — EmptyState adoption on 5 screens (WorkoutHistory, MesocycleBuilder,
  FoodSearch, YearOfLifts, ProgressPhotos); EmptyState gained optional a11y-label
  props (backward-compatible).
- `fb623e5` — Card adoption on the 4 heaviest screens (NutritionTargets 13,
  ActiveWorkout 2, WorkoutSummary 9, ExerciseDetail 9); banners/chips/animated/
  tinted-callouts correctly left as non-cards. cueCount guard fixed (stale
  "N cues"->"N notes" per 214b057, not a UI regression). Full lint exit 0.
- Remaining Batch 2 (wave B): Button adoption on TRUE CTAs + section-label
  (B-5, ~25 sites) consolidation — split by screen domain to avoid collision.

## Batch 2 wave B DONE (2026-07-09): Button + section-label adoption
- `0328f77` home/progress/settings/pro (6 CTAs, 8 labels); `0ae718c` food/nutrition
  (22 CTAs, 4 labels); `5d98870` workout/training (26 CTAs, 3 labels).
- Shared-component fix by lead: `type.overline` getter now uses
  `letterSpacing.overline` (0.5) per D3 (was hardcoded 0); stale theme guard
  test updated with citation. Full suite 574 suites / 7329 tests green.
- Agents' good safety judgement (deliberate non-conversions, NOT deferrals):
  ED lockout/cleared banners, GoalLockConsent, ProUpgrade/Paywall billing CTAs,
  WellbeingCheck, NutritionTargets "ease this cut" EA-caution button, and
  quiet-text/pill/chip CTAs (Button variants would visually regress them).

## Follow-ups surfaced (for a later wave, recorded not dropped)
- ActiveWorkoutScreen: ~15 remaining hand-rolled action buttons (set-complete/
  warmup/cluster/extra-set + modal button sets) deserve a DEDICATED Button-
  adoption pass - densest guard-test coverage in the app; not to be rushed.
- Optional: a SectionLabel warning/success tone variant would let the ED
  lockout/cleared banners adopt the shared label without a new colour path.

## Next: Batch 3 (the six coverage-gap audit lanes, master index section 5).

## Safe-build wave DONE (2026-07-09): lanes 04-07 SAFE + judgement findings
- `877244f` partners (invite quiet-row L06-F7, held-invite toast L06-F8, deleted dead PartnerRow L06-F5).
- `fa3c92f` flow/home (tappable Analytics session cards L04-1, dead PhysiqueOptIn removed L04-7, destructive-action isolation L04-9, label clarity L04-14/L01-B36).
- `82f420b` workout (session->workout copy L01-B37/38/39, sentence-case sweep, off-scale tokens L02-B3/B4, exercise-picker recents row L07-F7 via read-only getRecentlyUsedExerciseIds).
- `569441f` food (engine-diagnosis honesty line L05-A1/A2, food-swap chooser L05-MP1, local-read copy fix L05-MM2, barcode "type it in" L05-SB1, serving-vs-eaten + portion preview L05-ACF, recipe calorie rows L05-MR1 via read-only listRecipesWithTotals, tappable target hints, PerDay stepper value L05-PDT2, windowed comparison L05-FI4, "Custom"->"More" tab L05-FS1).
- Both DB additions are SELECT-only, no schema/migration. Full suite 573/574 (env skip), lint clean.

## GATED - awaiting a founder decision round (do NOT start):
- Money: conversion-funnel set (PaywallScreen dead code, trial-length contradiction, silent trial start) - lane 08.
- Legal/consent: Partners L06-F2 (empty-state privacy summary vs full receipt) + L06-F3 (restore "everything shared is deleted" footer + notice-version bump, 3-way); L04-13 SettingsPrivacy destructive row.
- Product/coaching: L07-F1 RIR/RPE per-set entry; L05-D1 MealSection write-affordances (tangled w/ 3 guard tests); L05-D2/NT2 nutrition density redesign (touches adherence-neutral render); L04-11 CoachOutput tooltips.
- Scope/deps: L07-F5 iOS Live Activity; L07-F9 drag-reorder dependency; L04-6 ProOnboarding Step-2 split; L05-NT1/PDT1 per-day-target schema + sync-registry; L05-MN1 MN-1 STATUS confirmation.

## FOLLOW-ON builds (non-gated, session-queueable, larger than polish):
- Dedicated ActiveWorkoutScreen pass (~15 buttons + L07-F2 PR re-detect on edit/delete + L07-F4 rest-timer "add exercise" action + L07-F10 finish-confirm).
- Feature builds: L07-F6 exercise fuzzy search, L07-F8 custom-exercise type/secondary-muscle, L07-F11 workout-history text search, L05-FI5/SB2/SL1/ACF1/MM1.
- Batch 2 partner Card/Button wave (L02-B1 7 cards, L02-B2 19 touchables); L03-C5 KeyboardAvoidingView 13-screen sweep; L04-10 WhatsNew version-key (needs marketing version bump).
- Batch 3 original plan: 6 new coverage-gap audit lanes (light-theme parity, motion, aesthetic craft, a11y contrast/SR, first-run emotion, competitive Home/Progress/Settings).

## "Keep going on all" - Batch 1 DONE + PUSHED (2026-07-09)
Founder directive "keep going on all" (build everything non-inviolable) + D5
decisions. Three Sonnet agents, domain-partitioned, each self-verified
lint+tests and committed its own scope. Lead did boundary full-lint (EXIT 0),
notification-lock safety grep (EMPTY = locked mechanisms untouched), pushed.
- `93cb4e8` Partners Card/Button (L02-B1 5 cards, L02-B2 2 CTAs). Consent
  surface PartnerPrivacyReceipt deliberately untouched.
- `e935be4` Exercise fuzzy search (L07-F6, new src/lib/exerciseFuzzySearch.js),
  custom-exercise type + secondary muscles (L07-F8; columns already existed
  database.js:161/172 + migrate_091), workout-history text search (L07-F11).
- `69e1937` ActiveWorkoutScreen dedicated pass: 14 buttons->Button (guard-pinned
  literals preserved; fixed a real clusterAddBtn tertiary bg-leak regression),
  PR re-detect on edit/delete (L07-F2, detectPR untouched), finish/discard
  confirm w/ hasInProgressSetEntry (L07-F10), REST_TIMER_ACTION.ADD_EXERCISE
  (L07-F4, additive). Guard tests restTimerActions/p9Talkback updated w/ notes.

### DATA-INTEGRITY BUG surfaced (genuine, for a fix wave - NOT dropped)
`insertOrUpdateExerciseFromCloud` (database.js:6502) cloud-restore INSERT omits
exercise_type, equipment_category, force, laterality, difficulty, machine_ok,
home_ok, cue, equipment_profiles -> custom-exercise metadata LOST on
sign-out/in. Local columns + migrate_091 already carry these. Additive fix
(extend the INSERT column list + values); no schema change. Queued for batch 2.

## "Keep going on all" - Batch 2 IN FLIGHT (2026-07-09)
Per D5. Domain-partitioned Sonnet agents: ProOnboarding Step-2 split (gates
provably preserved), per-day-target persistence code + founder-run migration,
Partners consent footer + notice-version bump + full receipt (L06-F2/F3),
iOS Live Activity via existing modules/live-activity (L07-F5), cloud-restore
missing-columns fix (database.js:6502).

## "Keep going on all" - Batch 2 DONE + PUSHED (2026-07-09), pushed 69e1937..8bfd692
Four Sonnet agents, domain-partitioned, no collisions. Boundary: full lint
EXIT 0; ED-safety engine files (nutritionEngine/edPatternDetector/wellbeing/
coachApply/weeklyCoach/proGate) NOT in diff; migrate_110 additive+idempotent+
RLS+founder-run; gate regressions green (sexGate/heightGate/PartnerScreen/
sync.registry/perDayTargets = 99/99). Committer re-stamped (reset-author) + push.
- `3e82b18` Partners consent (L06-F2/F3): notice version 2->3 (append-only audit
  stamp per consent.js, NOT a re-prompt gate - verified no bypass), restored
  "Everything shared is deleted" footer, full receipt now shown pre-pairing.
- `fe9ba44` ProOnboarding Step-2 split (L04-6): body-composition group moved to
  its own Step 3 (TOTAL_STEPS 5->6). PURE re-grouping - required-field + sex-gate
  validation untouched; MAX_STEP bumped 5->6 to keep resume-draft coverage.
- `8bfd692` Per-day-target SYNC (L05-PDT1): real gap was sync not persistence
  (AsyncStorage round-trip already existed). LWW clock + new sync table
  perDayTargetOffsets + registry/transport + migrate_110 (founder-run, benign
  no-op until applied). Offsets stay display-only, no engine/floor path.
- L07-F5 iOS Live Activity: ALREADY BUILT (commit 0c4d8b2, 2026-07-02) - agent
  verified, no change needed. Founder-only outstanding: provision App ID
  app.volyume.widget + Live Activities capability in EAS before first iOS build.

### SURFACED TO FOUNDER (not parked - needs a decision):
- L05-NT1 (persist goal/proteinApproach on the cloud nutrition_targets row,
  NutritionTargetsScreen) was NOT built - out of the per-day-target agent's file
  scope. Separate small task if wanted.
- Cloud-restore column fix (database.js:6502 insertOrUpdateExerciseFromCloud
  drops custom-exercise metadata) still queued - deliberately NOT bundled with
  per-day-target agent to avoid database.js collision. Next micro-batch.
