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
exercise_type. CORRECTION (batch 3 source-verify): the other eight columns
originally listed here (equipment_category, force, laterality, difficulty,
machine_ok, home_ok, cue, equipment_profiles) are canonical-library-only
metadata - never populated on user-created custom exercises and absent from
the cloud custom_exercises schema, so they cannot round-trip regardless. Only
exercise_type is genuinely restorable. Fixed in batch 3 (38d94ab). Additive,
no schema change. NOTE: only migrate_091 carries exercise_type cloud-side.

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

## "Keep going on all" - Batch 3 DONE (2026-07-09)
Four Sonnet agents. Boundary: full lint EXIT 0 (transient JSX WIP from the KAV
sweep resolved before its commit - independently reconfirmed); engine/ED-safety
files (nutritionEngine/edPatternDetector/wellbeing/coachApply/weeklyCoach/
planEngine/proGate) NOT in diff; migrate_111 additive+idempotent+founder-run;
BodyMetrics KAV change is a pure structural wrapper (no calm/ED/lapse/floor
line changed); ED-safety guards green (nutritionEngine/ffmFloor/edPatternDetector/
weeklyCoach.ffmFloor + new tests = 239/239). Sequenced: cloud-restore committed
database.js first, then NT1 re-dispatched onto the freed file.
- `38d94ab` Cloud-restore exercise_type (see corrected note above): source-verify
  found only exercise_type restorable; +test. ASYMMETRY LOGGED: exercise_type
  won't fully round-trip until sync.js syncExercises PUSH also sends it (queue).
- `7f6974b` CoachOutput tooltips (L04-11): 6 InfoTooltips reusing existing
  coachGlossary (founder-signed strings, no new copy), engine untouched,
  TalkBack-reachable. DELIBERATELY skipped RED-S/autoregulation footer.
- `d5e6ed0` KeyboardAvoidingView sweep (L03-C5): 9 screens + SettingsPage chrome
  in existing PlansScreen pattern; skipped DiaryScreen/MyMealsScreen (BottomSheet
  already keyboardAvoiding); excluded PartnerScreen.
- `7abac35` NT1 goal/proteinApproach cloud persist (L05-NT1): database.js ALTER
  + save/insertFromCloud + migrate_111 + sync push row; no screen change needed;
  ED reload path re-verified (never recomputes, no floor bypass); +T7/T8 tests.

### SURFACED TO FOUNDER (decisions, not parked):
- CoachOutput RED-S/autoregulation footer tooltip: needs founder-reviewed NEW
  glossary entries for "RED-S" (ED-safety-adjacent) + "autoregulation". Agent
  correctly refused to draft ED-adjacent copy unilaterally. Founder call.
- sync.js syncExercises PUSH does not send exercise_type -> the batch-3 restore
  fix is forward-compatible but the end-to-end custom-exercise-type round trip
  stays broken until push is patched too. Small sync-layer fix - queue next.
- Coverage-gap audit lanes (6 new: light-theme parity, motion, aesthetic craft,
  a11y contrast/SR, first-run emotion, competitive benchmarks) NOT yet run -
  these are Opus-tier AUDITS that EXPAND campaign scope; recommend a founder
  go/no-go before spending on them vs finishing the remaining build backlog
  (food follow-ons L05-FI5/SB2/SL1/ACF1/MM1, L04-10 WhatsNew version-key).

## "Keep going on all" - Batch 4 DONE (2026-07-09)
Non-gated build backlog now EXHAUSTED. Boundary: lint EXIT 0, engine/ED files
not in diff, exercise round-trip tests green.
- `814a99a` sync.js syncExercises PUSH now sends exercise_type (default
  weight_reps, mirrors restore) -> the custom-exercise-type sign-out/in round
  trip is now closed END TO END (restore side was 38d94ab). +push test; stale
  "open gap" comment in database.js cleaned.
- Food follow-ons L05-FI5/SB2/SL1/ACF1/MM1: NOT built. CORRECTION - these were
  mislabeled "SAFE follow-ons" in this doc's earlier backlog lines; the master
  index classifies all five as JUDGEMENT, each a real design/scope fork (or
  engine work for FI5). Agent correctly refused unreviewed defaults. All five
  now in the founder-decision surface below.

## CAMPAIGN STATE: non-gated backlog done. AWAITING FOUNDER DECISIONS.
Batches 1-4 shipped every SAFE + delegated-judgement build that had an
unambiguous answer. What remains all needs a founder call (recorded here so a
fresh session resumes cleanly). Nothing below is parked - it is surfaced.

A) FIVE JUDGEMENT food items (each a fork; recommend option in parens):
   - L05-FI5 fibre aim: keep flat 30g NHS stopgap (rec) vs derive per-user aim
     (needs deterministic-engine work = NOT delegated, founder-only).
   - L05-SB2 manual barcode-number entry: build inline affordance on
     ScanBarcodeScreen -> typed EAN -> existing lookup (rec) vs separate entry.
   - L05-SL1 "Skip name" reset: add a Settings toggle to clear the flag
     globally (rec); needs label + per-food-vs-global semantics confirmed.
   - L05-ACF1 named/household serving units: form redesign (unit picker +
     portion-calorie preview; column already exists, no migration). Scope fork.
   - L05-MM1 saved-meal inspect: lightweight read-only inspect sheet (rec)
     vs full edit flow. Do-less-vs-full fork.
B) Coverage-gap audit lanes (6 Opus audits: light-theme parity, motion,
   aesthetic craft, a11y contrast/SR, first-run emotion, competitive
   benchmarks). SCOPE EXPANSION + Opus spend -> founder go/no-go.
C) CoachOutput RED-S + autoregulation glossary entries (ED-adjacent copy):
   need founder-reviewed wording before the footer tooltip can ship.
D) GATED redesigns still awaiting the founder round:
   - L05-D2/NT2 nutrition-density redesign (touches adherence-neutral render -
     ED-adjacent).
   - L07-F9 drag-reorder dependency (new dep - name/licence/yes required).
   - L04-13 SettingsPrivacy destructive-row isolation.
   - L05-D1 MealSection write-affordances (tangled with 3 guard tests).
   - L04-10 WhatsNew version-key (needs a marketing version bump - founder).
E) Founder-run migrations queued (manual, EU-Dublin): migrate_110 (per-day
   offsets), migrate_111 (nutrition goal/protein). Both additive, benign
   no-op until applied.

## ================= HANDOVER (2026-07-09, paused by founder) =================
Read this whole section, then DECISIONS-2026-07-09.md D6, then the SOURCE lane
files, before resuming. Branch: claude/codebase-audit-docs-pv6mjd. HEAD at
handover: 3cf8971 (all work pushed, tree clean, nothing unpushed).

### WHERE WE ARE
Batches 1-4 shipped the entire non-gated + delegated-judgement build backlog.
The founder then answered the decision surface (recorded as D6) authorising the
next program, and immediately interrupted with two instructions:
  1. "Pause" (this handover).
  2. "Do not use opus if sonnet will do the job also" -> the six coverage
     audits and comparable well-specified work run on SONNET, not Opus, with a
     hands-on Fable synthesis/review step. (One light-theme audit agent was
     launched on Opus and STOPPED; nothing it did reached the tree.)

### OPERATING MODEL (unchanged, reconfirmed this session)
- Main loop = Fable, coordination + boundary lint/push + safety-critical
  judgement ONLY. All build/audit labour goes to agents.
- Agents: explicit model EVERY time (hook-enforced). Default SONNET for the
  approved program below; Opus only where genuinely needed; Fable never in a
  subagent. Batch ~4 agents at a time, domain-partitioned so no two touch the
  same file, each self-verifies `npm run lint && npm test` and commits its own
  scope; lead does the boundary (full lint, ED/consent safety greps, migration
  idempotency check, gate regression tests, reset-author rebase, push, doc).
- Known env-only test failure: progressScanVision.test.js (missing
  react-native-fast-tflite in container). NOT a defect. Everything else green.
- Commit rule: NO attribution. British English. No em dash in user copy.
- Committer identity: `git config user.email noreply@anthropic.com` +
  user.name Claude already set; at each boundary run
  `git rebase --exec "git commit --amend --no-edit --reset-author" origin/<branch>`
  then push (commits are unsigned in this env - that is fine).

### THE APPROVED PROGRAM (D6) - NOT YET STARTED, do in batches:
BATCH 5 - six coverage-gap audits (SONNET, READ-ONLY, one findings doc each in
  docs/design-usability-audit-2026-07-09/, format = the lane files, IDs per
  lane, SAFE/JUDGEMENT/GATED per finding, cite file:line, don't re-report
  existing findings). Lanes: (1) light-theme parity -> coverage-01-light-theme.md
  [prompt already drafted below]; (2) motion/animation quality; (3) aesthetic
  design-language craft; (4) accessibility contrast + screen-reader/TalkBack;
  (5) first-run emotional quality; (6) competitive benchmarks Home/Progress/
  Settings. Then a HANDS-ON (Fable) synthesis pass to merge into the master
  index + rank a new build backlog.
BATCH 6 - four food JUDGEMENT builds (SONNET, domain-partitioned):
  L05-SB2 manual barcode-number entry (inline affordance on ScanBarcodeScreen
    -> typed EAN -> existing lookup path);
  L05-ACF1 named/household serving units + portion-calorie preview on
    AddCustomFoodScreen (serving_label column already exists, NO migration);
  L05-SL1 Settings toggle to clear the global "Skip name" flag
    (ScanLabelScreen flag; confirm per-food-vs-global reset semantics);
  L05-MM1 saved-meal read-only INSPECT sheet before logging (MyMealsScreen;
    inspect-only was the chosen shape, NOT a full edit flow).
  ED-safety: food is Pro; keep gates; no floors/engine/MacroRings/red-green
  touched; calm voice. FI5 is NOT in scope (keep flat 30g stopgap).
BATCH 7 - four gated builds:
  L04-13 SettingsPrivacy destructive-row isolation (SONNET, low risk);
  L05-D1 MealSection write-affordances (SONNET; tangled with 3 guard tests -
    update tests only to match intent, keep them meaningful, inline-cite);
  L07-F9 drag-reorder REUSING the existing no-new-dep reorder pattern (Wave D/T7
    shipped one - find it, copy it). If truly impossible without a dep, STOP and
    name it + licence for a fresh founder yes. Do NOT add a dep.
  L05-D2/NT2 nutrition-density redesign - ED-SAFETY-ADJACENT. Delegate labour to
    Sonnet under tight constraints (adherence-neutral render preserved, no
    red/green good-bad framing, MacroRings remaining-hero intact), but the
    LEAD REVIEWS THE DIFF HANDS-ON before push: grep red/green + adherence
    framing + MacroRings; confirm adherence-neutral tests stay green. This is
    the one item where the lead must not rubber-stamp the agent.

### STILL OPEN (not in D6, needs a founder answer before building):
- CoachOutput RED-S + autoregulation glossary entries (ED-adjacent copy) - the
  batch-3 agent correctly refused to draft these; the footer tooltip waits on
  founder-reviewed wording.
- exercise_type end-to-end is DONE (restore 38d94ab + push 814a99a); no action.

### FOUNDER-RUN MIGRATIONS QUEUED (manual, EU-Dublin; app never runs them):
- migrate_110 (per-day-target offsets), migrate_111 (nutrition goal/protein).
  Both additive/idempotent/RLS, benign no-op until applied.

### SHIPPED THIS SESSION (all pushed on the branch):
Batch 1: 93cb4e8, e935be4, 69e1937.  Batch 2: 3e82b18, fe9ba44, 8bfd692
(+ L07-F5 already built at 0c4d8b2).  Batch 3: 38d94ab, 7f6974b, d5e6ed0,
7abac35.  Batch 4: 814a99a.  Plus status/decision doc commits.
=========================================================================

## D6 program - shipped in short windows (2026-07-09, budget-metered):
- L04-9 (was mis-ID'd L04-13) SettingsPrivacy consent-row isolation: a876b1d.
- L05-SL1 skip-name reset toggle on SettingsDataScreen (Pro, global flag): 62f08a8.
- L05-MM1 saved-meal read-only inspect sheet (SavedMealDetailSheet): f6f1c13.
Each single/paired, verified (lint EXIT 0, ED-neutral render, consent logic
byte-identical), reset-author + pushed. REMAINING D6: food L05-SB2 (manual
barcode entry) + L05-ACF1 (serving units); gated L05-D1 (MealSection, test-
tangled) + L07-F9 (drag-reorder, REUSE no-dep pattern) + L05-D2/NT2 (nutrition
density, ED-adjacent - lead reviews diff hands-on); six coverage audits (Sonnet).

## D6 COVERAGE AUDITS DONE (2026-07-09) — 6 Sonnet lanes + synthesis
All four D6 builds shipped + pushed (be2db4d..d286217): ACF1 ef0ee76, SB2
e8cf690, L07-F9 4d04883, L05-D1 0f52744. Then 6 read-only coverage audits
(coverage-01..06) + coverage-00-SYNTHESIS.md. ~44 findings; see synthesis for
the ranked cross-lane backlog (SAFE / JUDGEMENT / ED-adjacent / GATED / dropped).
Headline SAFE items: MO-1 (photo-compare runtime crash), AY-1 (TextField
placeholder contrast, app-wide), LT-1/AC-3 (primary-as-fill light bug, 88 sites),
FR-2 (auth-error leak). Convergent: Home banner overload (AC-6/CP-1). ED-adjacent
(lead reviews hands-on): LT-2 MacroRings ring ink, MO-4 calm-gate plan reveal,
FR-4 pill tone, AY-7 lockout SR copy, LT-3 light elevation policy. GATED: LT-1
billing sites, AY-2 success/error-on-tint, CP-7 biometric (new dep), CP-2 iOS
widget, CP-10 theme-restart. Dropped: FR-5 (trial, per D5).
NEXT: SAFE-fix wave (section A) is buildable now; ED-adjacent + GATED + the
bigger JUDGEMENT/product-IA items (Home banner cap) need a founder nod. Still
also pending from earlier: L05-D2/NT2 nutrition-density (its own ED-adjacent
pass) + CoachOutput RED-S/autoregulation glossary (founder wording).

## ================= D7 BUILD PHASE (2026-07-09) — status =================
After the 6 coverage audits + synthesis, founder answered D7 (see DECISIONS
D7). This build phase SHIPPED + PUSHED (all reset-author, lint EXIT 0, ED/gate
guards green, each ED-adjacent diff lead-reviewed hands-on):

SAFE fixes:
- MO-1 photo-compare runOnJS crash fix (b4ea4c9); AY-1 TextField placeholder
  textDisabled→textMuted (6cc353e); FR-2 auth-error calm mapping (6b050fc);
  AY-3/4/5 a11y attrs (1299a43). LT-6 gridline opacity + AC-4 flame-outline (5a15a1b).
LT-1 primary-as-fill (narrowed per founder): blanket 82 (28eefa7) → revert 24
  decorative marks to primary (fd15c2b) → 4 billing/consent CTA fills (a800b16).
  NET: buttons/chips/CTAs=primaryFill, dots/bars/bullets=primary. MacroRings left for LT-2.
ED-adjacent bundle (all lead-reviewed): LT-2 ring stroke primaryFill (9433415,
  adherence-neutral intact); FR-4 "Required"→"Part of your coaching" (7fc104c,
  gate intact); AY-7 lockout SR announcement of EXISTING copy verbatim (c03fbc2);
  MO-4 plan-reveal gated on calm||edFlag, FAIL-CLOSED on read error (a1ca844).
NT2 progressive disclosure (NutritionTargetsScreen "Why" collapsed by default +
  tighter stack, 0382492) — LEAD REVERTED the agent's out-of-scope MacroRings
  restyle (acd25b1); MacroRings stays the locked component the audit says it is.
Gated: Home banner priority-rank top-2 + "more" (85cbf36, safety banners still
  suppress in loaders, untouched); AY-2 onSuccessBg/onErrorBg ink tokens (cc9f24a).

REMAINING D7 WORK (approved, not yet built):
- CP-7 biometric app-lock — APPROVED WITH new dep expo-local-authentication
  (MIT, managed-workflow). Sizeable. Not started.
- CP-2 iOS home/lock-screen widget — approved, net-new WidgetKit surface. Not started.
- SAFE sweeps to ENUMERATE + control like LT-1: AC-2 raw alpha literals (~15
  files → tint tokens); MO-2/MO-3 Reduce-Motion gating on AppAlert.js:82 + 16
  raw Modal sites.
- L05-D2 REAL fix NOT built: new-account progressive disclosure for the dense
  MacroRings (show less before first food log). Touches the LOCKED ED-adjacent
  ring → do carefully / surface, do NOT freelance.
- Small: AC-7 add a chipInk-style token (ScreenHeader chip currently borrows
  colors.camera); AC-1 chevron-forward standardisation, AC-5 4th micro-label
  role (both JUDGEMENT/design-delegated); MesocycleBuilder deload banner
  (remaining AY-2 site).
- RED-S + autoregulation glossary entries (CoachOutput footer tooltip) — needs
  founder-reviewed wording; lead to DRAFT for confirm.
Founder-run migrations still queued: migrate_110, migrate_111.
