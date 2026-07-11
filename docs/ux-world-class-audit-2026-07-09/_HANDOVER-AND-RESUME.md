# UX world-class audit — handover and resume note

===============================================================================
## ★ FRESH SESSION START HERE (2026-07-10, chat cleared, resuming with Fable) ★
===============================================================================

**You are Fable, coordinating a live-production build campaign on VOLYUME.**
Read this block, then `CAMPAIGN-2026-07-10-APPROVED-SLATE.md` (the action
spec), then `CLAUDE.md` (the constitution). Everything below is current.

**BRANCH:** `claude/codebase-audit-docs-pv6mjd`. It is currently EVEN with
`origin/main` PLUS three docs-only commits (audit intake, verification,
scorecard) on top of Codex's AUD-01..07 fixes. Base is clean and green:
657 suites / 8,223 tests pass, lint clean (2026-07-10). Never touch main
directly except a founder-ordered ship (PR/squash or fast-forward on
explicit instruction).

**WHAT JUST HAPPENED:** An external Codex adversarial audit ran and fixed
AUD-01..07 (billing fail-closed, recipe composite key, sync cursor on
rollup, partner atomic purge, plan rollback, workout-set protection);
AUD-06 was verified a false alarm and correctly skipped. Those 6 fix
commits are merged into this branch's base. We independently verified all
findings first (`codex-audit-verification-2026-07-10.md`). Separately, a
full /10 scorecard of every user-facing area was produced
(`SCORECARD-2026-07-10.md`).

**THE JOB NOW:** Build the founder-approved improvement slate in
`CAMPAIGN-2026-07-10-APPROVED-SLATE.md`. Founder approved EVERYTHING on
the scorecard target list EXCEPT #18 exercise media and #22 rest-day
notification (both HELD). That includes newly-UNHELD items: iOS Live
Activity wiring, drag reorder, giant sets, and Rive/brand-font (asset/
taste-gated). Sequence + per-item spec are in that campaign doc.

**CAMPAIGN POSITION (2026-07-10, update at every pair boundary):**
- ✅ PAIR 1 LANDED + PUSHED. (a) `584b4d0` theming stage 4: the four
  chart/Skia consumers (VolyumeChart, MacroRings, ProgressPhotoCompare,
  BeforeAfterShareSheet) on the buildLiveStyles pattern; audit found NO
  Skia Paint freeze bugs; drawShareCard untouched by design; five caller
  screens still pass static colours into VolyumeChart (they go live with
  their screen batches). (b) `0ac5de9` item 1 Coach-half polish: all 5
  Coach screens + CoachDailyBrief live-themed; the safety-contract guard
  battery pins the ED blocks logic-identical. Haptics: BlockReflection
  play-story link only. NOTE FOR FOUNDER: WeeklyCheckIn got NO haptics
  (whole screen judged weight/food-adjacent) and CoachOutputScreen got
  NONE because the pre-existing coachOutputApplyMorph.guard pins that the
  screen never imports haptics (a hold path must never buzz) — the guard
  won over the campaign brief's allowance. Lint + full suite green at
  both landings (657 suites / 8,225 tests).
- ✅ PAIR 2 LANDED + PUSHED. (a) `d81f8a9` theming stage-4 tail batch A:
  21 shared components live-themed (BottomSheet, EmptyState,
  SegmentedControl, SearchBar, SectionLabel, Stepper, Dropdown,
  InfoTooltip, HintCaption, CollapsibleSection, OptionCard, AppAlert,
  WhatsNewSheet, CoachOutputCards, WeightTrendCard, Sparkline,
  SvgBarSparkline, ReadinessCards, BlockProgressCard, BlockShapeCard,
  FatigueTrendCard); PressableCard needed nothing. Module-scope
  token-baking consts became build functions; no frozen twins kept
  (none were exported/pinned). (b) `959f622` item 5 haptics pass:
  selection()/commit() across diary, food sheets, FoodSearch,
  MyMeals/MyRecipes, FoodInsights, NutritionTargets, Settings hub,
  ExercisePickerModal, paywall period-selector+policy links. Verified
  exclusions held: no haptics on Mark eaten/usuals/one-tap logs/
  copy-to-today, macro-cycle/refeed stops, ease nudge, consent
  checkboxes, purchase/restore/cancel CTAs; tab bar already fired via
  RootNavigator. NOTE: DiaryScreen's MacroRings call site is pinned
  byte-identical by a guard — if the macro ring tap should buzz, the
  haptic belongs inside MacroRings itself (later batch decision).
  Lint + full suite green at both landings (657/8,225).
- ✅ PAIR 3 LANDED + PUSHED. (a) `504d657` item 8: WorkoutHistory,
  LogCardio, CardioHistory live-themed; the plan's INTENSITY_LABEL/
  CARDIO_SOURCE_LABEL entries were label-strings only (stale plan
  entries); the real colour-baker was markStyle(), now buildMarkStyle(c)
  with the never-red verdict mapping byte-identical; NA-cux-11 trend
  wording untouched. (b) `0c85864` item 6 TARGETED pass: 1.3 caps on
  tab-bar labels, Chip (overridable default prop, covers 26 consumer
  files), SegmentedControl, Stepper values, SourceChip badge, MacroRings
  fixed kcal ring; RollingNumber optional pass-through cap (uncapped
  default). Fixed-height text rows audited: codebase already uses
  minHeight throughout, no layout fixes needed.
- ⚠ OPEN FOUNDER ROUND — item 6 GLOBAL ceiling: Text.defaultProps/
  TextInput.defaultProps is EMPIRICALLY DEAD under RN 0.81 + React 19
  automatic JSX runtime (the runtime has no defaultProps merge; proven
  with a babel-pipeline probe against this repo). Options surfaced to
  founder: (A) per-component caps only (12 files now carry them),
  (B) module-export wrap of RN.Text at boot (propagates app-wide via
  live property lookup; undocumented technique, needs a guard test),
  (C) scripted codemod adding the cap to every raw Text/TextInput
  across ~85 screens. Question asked 2026-07-10; do not build B or C
  without the answer.
- 📋 DEVICE CHECKLIST (item 6, physical Android at MAX system font):
  1 tab bar labels one line, no truncation; 2 Diary kcal ring numbers
  stay inside the 132px circle; 3 day-type chip no wrap; 4 ActiveWorkout
  set-entry steppers legible; 5 Stepper values centred, one line;
  6 SegmentedControl segments equal height, one line; 7 chips wrap as
  rows, never overflow the pill; 8 food source badge one line; 9 ED
  check: no animated numerals on any weight surface (unchanged).
- ✅ PAIR 4 LANDED + PUSHED. (a) `37abe1b` item 13 photo-gallery polish:
  most of the spec already existed (pinch/double-tap/swipe were live);
  built the genuine gaps — clamped zoom-pan (pure-arithmetic worklet,
  no theme reads), paging + double-tap haptics (genuine moves only,
  never at a boundary), TalkBack adjustable paging (increment/decrement
  drive the same changePage as the swipe). No new dependency (lead
  decision under D25). New test pins paging available under an active
  suppression while the weight line stays withheld. (b) `f1bace6` item
  14: adopted react-native-keyboard-controller 1.22.0 + zeego 3.0.6
  (+3 pinned peers), lockfile in the same commit, register entry in the
  stage log below. Keyboard: real cross-platform avoidance on
  WorkoutSummary (which previously had NONE on its main scroll),
  AddCustomFood, RecipeBuilder and the custom-exercise form; sheet
  inputs keep BottomSheetTextInput. zeego first surface: long-press
  menu on logged-set rows, Edit/Delete only; delete routes through the
  existing confirm flow via a menu-only ref — lead-reviewed: the ref is
  set ONLY by the menu path, so a normal row tap can never trigger it,
  and the pinned zero-arg handleDeleteEditedSet is untouched. Lint +
  full suite green at both landings (657 suites / 8,234 tests).

- ✅ PAIR 5 (part) LANDED + PUSHED 2026-07-10 (resumed session). (a)
  `579dedd` D30 dynamic-type codemod sweep: new re-runnable script
  `scripts/codemods/add-max-font-multiplier.js` (AST-guided via
  @babel/parser, no new dep, idempotent, --check dry-run); 2,076 caps
  across 169 files, inserted BEFORE existing props so callers override;
  32 already-capped sites (incl. RestTimer 1.15) untouched; RollingNumber
  excluded by order; 19 guard suites pin-EXTENDED only (each literal now
  also pins the cap; CoachOutput progressScanAssessment window 1200->1400
  minimal, dated comment). Suite green 657/8,234, lint clean. The item-15
  lane files were EXCLUDED from the sweep — re-run the committed script on
  them in a spare slot: RootNavigator, ProgressPhotosScreen,
  ProgressPhotoViewer, ExerciseDetailScreen.
  (b) `3415e9f` item 15 ANDROID-POLISH HALF: expo-splash-screen ~31.0.13
  (first-party Expo, MIT — dependency register) with the splash held
  until themeReady then hidden (kills the black pre-theme cut; the fade
  option is iOS-only in this version — honest note); android
  monochromeImage derived programmatically (the raw foreground's glow
  blob would smear under launcher tinting; mask thresholded, glow cut at
  y=660, re-centred, inside the safe zone). FRESH EAS BUILD REQUIRED
  (new native module + config plugin).
- ⚠ OPEN FOUNDER ROUND — item 15 transitions half (recon complete, NO
  build yet): Reanimated sharedTransitionTag DOES NOT EXIST in the
  installed 4.1.7 (grep-verified against node_modules, not training
  data) — the named technique is dead on this stack. Photo grid->viewer:
  hand-rolled measure+clone hero morph is the strong case (same
  component tree, image content, contained blast radius). Exercise
  card->detail is the fork: (A) true cloned-card morph (max fidelity;
  hard back-gesture handling on the JS stack) vs (B) origin-aware zoom —
  extend heroZoomTransition (RootNavigator.js:266-290) to grow the
  incoming screen from the tapped card's measured rect (not a true
  shared element; benefits every heroZoom route; graceful fallback when
  origin params absent). PressableCard needs a small ref/measure
  addition either way. DO NOT build until the founder rules.
- 📋 EDGE-TO-EDGE FINDINGS (item 15 recon; fixes = follow-up slot):
  E2E is ON in SDK 54 builds (no app.json opt-out; targetSdk 35 via
  build-properties). (1) App.js:989 StatusBar backgroundColor is a no-op
  under E2E (the CP-10 stage-2 live status-bar colour does nothing on
  Android); (2) same class at YearOfLiftsScreen.js:604; (3) 9 raw RN
  Modal surfaces need inset audits (AppAlert, EatenTimePicker,
  HomeChangeWorkoutSheet, HomeBlockShapeSheet, InfoTooltip,
  WorkoutSummary, PlanLibrary, ActiveWorkout — its swap modal at :3722
  is already correct — RoutineDetail); overlaps item 17's Modal->gorhom
  migration; (4) edges={['top']}-only screens are fine under tabs, check
  stack-pushed uses; (5) light-theme 3-button nav shows a grey contrast
  scrim (tunable via androidNavigationBar.enforceContrast once screens
  verified).

- ✅ PAIR 5 COMPLETE + PUSHED (2026-07-10 late). (a) `c589b00` item 15
  transitions per D31 (founder delegated the technique call; lead ruled
  "both, split by content" — D31 in the register): PressableCard opt-in
  measure API (byte-compatible), makeHeroZoomCardStyle grows the screen
  from the tapped card's rect via route param __heroOrigin (centre zoom
  byte-identical when absent, defensive fallback kept), wired on
  LiftProgress rows + peek menu + ExerciseDetail substitutes; cross-tab
  keeps centre zoom by design. Photo grid->viewer true hero morph
  (thumbnail expands into the viewer, shrinks back on close;
  pure-arithmetic worklets; no new dep); Reduce Motion flattens both;
  calm/ED weight suppression untouched and newly pinned fail-closed
  WITH the morph present. D30 codemod swept the 4 lane files (103
  caps). (b) `2a42fe4` item 16 scanner: VERIFIED ALREADY MLKIT
  (enableCodeScanner + useCodeScanner IS the native MLKit pipeline);
  real gap was the torch selection haptic; 6 new pinned tests;
  Code-128 kept (marketed capability — agent rightly refused the
  brief's narrower symbology set). (c) `b41731a` ANDROID BUILD FIX:
  the APK build had failed since zeego landed — @react-native-menu/menu
  1.2.2 overrides setHitSlopRect (removed in RN 0.80) and dies in
  compileReleaseKotlin; bumped to 2.0.0 (the compat release; JS type
  surface diffed byte-identical) with an overrides entry over zeego's
  exact 1.2.2 peer pin. (d) `8984968` partnerIntentionPurge guard
  updated to the applied-migration reality. Full suite green at the
  boundary: 658 suites / 8,254 tests, lint clean.

- ✅ CI ANDROID BUILD CONFIRMED GREEN (run 2603 on c589b00, 2026-07-10
  15:55Z) — the b41731a menu 2.0.0 fix is validated; that artefact (or
  any later green run) is the device-walk build.
- ✅ 4-AGENT WINDOW LANDINGS (founder raised the cap for one hour,
  2026-07-10 late; all lead-reviewed, committed separately, pushed):
  `c1f0973` smalls 7/9/10/11 (metric-tracking headline; raw/cooked
  basis chip — neutral tokens by ED design; PR gold markers on the row
  sparkline via new pure derivePRIndices; TierComparisonStrip on
  Subscription, display-only, payments-import source-pinned).
  `0668d18` watch-app scoping memo (open round 25 — five founder
  questions ready; side-finding: SD-11 idempotency defect in
  applyRemoteSetEvent must be fixed before any wrist traffic).
  `85c5fe1` item 4 dietary discoverability (primary-surface chip +
  once-ever hint, single source of truth, accordion row kept).
  `653fe32` migrate_117 DRAFT (security advisor ERROR: the all-users
  engine_telemetry_daily aggregate view was app-readable under default
  grants; REVOKE anon/authenticated — PENDING the founder phrase).
  `746bb65` item 21 GIANT SETS: data model was already group-shaped
  (superset_group_id), session jump already N-aware; builder cap
  lifted, calm nudge classifies each consecutive link, heads-up says
  "Giant set" for 3+, chip lists partners and drops the raw group id;
  ENGINE UNTOUCHED (auto-generation pairs-only pinned vs real
  generatePlan; real-engine attribution invariant added); the old
  supersetCap guard was semantically reversed WITH lead sign-off (its
  own until-condition was fulfilled). Lead copy rulings flagged for
  founder veto: "Giant set" title split, chip id removal.
  `9cdf3a4` edge-to-edge StatusBar honesty fix (dead backgroundColor
  props removed at App.js + YearOfLifts; cp10 chrome pin updated).
  `d8982aa` theming stage-4 batch B: 22 components (partner, auth,
  consent, billing-adjacent, misc) on buildLiveStyles; ProGate tier
  logic untouched; ScreenBoundary flagged (class error boundary cannot
  take the theme hook — architecture question, not forced).

- ✅ ITEM 20 DRAG REORDER LANDED `534e0e0` (D32; fresh session
  2026-07-10 after chat clear). The prior session died with NO
  uncommitted drag work (tree clean at 27c4c34), so a fresh Sonnet
  agent was relaunched with the D32 brief per this file's recovery
  path, then lead-reviewed hands-on. NEW pure `src/lib/reorder.js`
  (block-move arithmetic: groupIntoBlocks / moveItemOrBlock /
  swapAdjacentBlocks; 28 tests incl. a 300-trial fuzz invariant —
  multiset preserved, no block ever split) + NEW
  `src/components/DragReorderList.js` (long-press pick-up via
  Gesture.Pan().activateAfterLongPress on the in-tree gesture-handler
  + Reanimated, NO new dependency; pure-arithmetic worklets with
  runOnJS dispatch per the ProgressPhotoViewer precedent; dragged
  block floats absolute over a placeholder; LinearTransition reflow
  dropped under Reduce Motion; pickup/drop haptics only; drag handle
  hidden from screen readers — chevrons stay the accessible path
  everywhere). Surfaces: PlanDetail days (drag inside the existing
  reorder mode; updateRoutinePosition, optimistic-revert+toast);
  ManualBuilder (chevrons rebuilt on the shared helper, behaviour
  unchanged; drag additive; persists on Save as ever); RoutineDetail
  (chevron path made BLOCK-AWARE — the old plain swap could SPLIT a
  superset pair, closed per D32's authority text; reorder mode swaps
  FlashList for ScrollView+DragReorderList, browse mode untouched);
  ActiveWorkout ("Reorder exercises" overflow entry when >1 exercise
  opens a purpose-built sheet — the whole workout as a block-aware
  drag list with per-row accessible chevrons; persists via
  setWorkoutExercises → _persistActiveWorkout; currentExerciseIndex
  re-pointed by object identity; handleMoveExercise, its pinned
  strings and the single-exercise view UNTOUCHED). Guard tests
  updated exactly per D32 (kept no-dependency / no-reorder-library
  pins, dropped only the runOnJS/PanResponder-era bans, dated
  comments); NEW RoutineDetail reorder guard (first for that
  surface); global Jest mock for gesture-handler added (mirrors the
  reanimated one). LEAD FIXES at review: Add-exercise footer restored
  in RoutineDetail reorder mode (it rendered there before the
  browse/reorder split); sheet group chip follows the landed item-21
  naming (Superset for a pair, Giant set for 3+) with matching
  explainer copy; comment typo. Lint clean; FULL suite 666/667 suites
  (1 pre-existing skip), 8,347 passed / 9 skipped / 0 failed.
- ⚠ OPEN FOUNDER ROUND (item 20, new): DragReorderList has NO edge
  auto-scroll — dragging to the top/bottom of a screen-overflowing
  list will not scroll the parent; the user drops and re-drags to
  cross off-screen (disclosed in the component's header comment, not
  silently dropped; every current list is short enough that this
  rarely bites). Founder to rule: build edge auto-scroll as a
  follow-up, or accept the limit. Also flagged for awareness:
  RoutineDetail's CHEVRON behaviour changed as part of the block-gap
  fix (the old path could split a superset pair; D32's authority text
  names closing that gap; no pinned test protected the old
  behaviour).

- ✅ PAIR 7 LANDED (2026-07-10, both Sonnet verify-first agents,
  lead-reviewed). (a) ITEM 19 iOS LIVE ACTIVITY = ALREADY FULLY WIRED,
  `60190a7` docs-only fix. Verification table in the agent report:
  every link WIRED with file:line — JS module graceful no-op, all five
  E6B store lifecycle call sites (useAppStore.js ~1329-1541), podspec,
  plugins/withVolyumeWidget.js creates the extension target at
  prebuild, app.json plugin + NSSupportsLiveActivities + App Group,
  REAL lock-screen + Dynamic Island UI (VolyumeRestTimerLiveActivity
  .swift incl. the VOLYUME-1K ClosedRange clamp), CP-2 home widgets
  registered. The campaign line was STALE and even named the wrong
  module (modules/rest-timer-live is the ANDROID chronometer;
  modules/live-activity is the iOS one). Only defect found: three
  docstrings + widget README still described the pre-plugin manual-
  Xcode world — corrected, comments/README only. 15/15 wiring guards;
  lint clean; FULL suite green at the boundary (666/667 suites, 8,347
  passed / 0 failed). Item 19's remaining steps are FOUNDER-SIDE ONLY:
  App Groups provisioning on BOTH App IDs (app.volyume +
  app.volyume.widget, then EAS credentials re-sync) + fresh EAS build.
  iPhone device checklist is in the item-19 agent report (9 steps:
  lock-screen card, Dynamic Island, adjust propagation, natural
  expiry, force-kill stale sweep, Skip dismissal, Live-Activities-off
  no-op, no weight/food data on any lock surface).
  (b) ITEM 12 ANDROID REST-TIMER ACTIONS = STOPPED ON A GENUINE FORK,
  no code changed (correct procedure). Verified chain: category +
  actions + listener + store handler + sticky-notification path ALL
  WIRED (categories.js:61-171, activeWorkout.js:259-273,
  listeners.js:76-82, restTimerActions.js) — BUT the notification a
  user actually sees during a TYPICAL rest (default 90s < the 170s
  shortService window, restForeground.js:28) is the NATIVE FGS
  chronometer, which carries ZERO action buttons
  (WorkoutForegroundService.kt buildRestNotification, no .addAction
  anywhere), and RestTimer.js suppresses the JS sticky while the FGS
  is live. This was a RECORDED 2026-07-02 trade-off
  (restForeground.js:14-17). Every fix is a product trade-off →
  FOUNDER ROUND (options recorded below). 4 suites / 37 tests pass at
  baseline.

- ✅ PAIR 9 LANDED (2026-07-10 late; both lead-reviewed, full suite
  green at the boundary: 666/667 suites, 8,356 passed / 0 failed,
  lint clean). (a) `6171531` **D34 native bridge**: the FGS
  chronometer rest notification now carries "+15s" / "Skip rest" via
  getService PendingIntents (taps never foreground the app); new
  Service→module→JS event bridge (Events/sendEvent + @Volatile
  companion emitter in RestTimerLiveModule) routes taps into the SAME
  handleRestTimerAction seam (store guards + clampRestDelta floor +
  stale-tap no-op, one REST_TIMER_ACTION vocabulary, two transports);
  service extends its own chronometer natively on +15 (JS re-anchor
  is background-blocked), re-capped against the shortService
  deadline; Skip tears down like the in-app stop; graceful no-op
  wherever native is absent; restForeground.js trade-off comment
  updated to the new reality. Kotlin NOT compilable in this env —
  compile-risk notes in the agent report (Events DSL, sendEvent Map
  overload, addAction icon 0); watch the first EAS/CI Android build.
  8-step device checklist in the agent report. ⚠ FRESH EAS BUILD
  required (new native code + module event). (b) `b7c36bd` **theming
  stage-4 batch C**: 29 components converted (food 19/19, photo/scan
  9/9, ProgressSections' 5 exports; barColor → buildBarColor(c),
  never-red mapping unchanged); 6 guard pins updated mechanically;
  frozen static stylesheets byte-identical; ProgressPhotoViewer
  worklets untouched. COVERAGE: components now 100/108 live (was
  71/108); food + photo/scan families fully live.

- ✅ PAIR 10 + D36d FIX LANDED (2026-07-10 late; lead-reviewed, full
  suite green at the boundary: 672/673 suites, 8,382 passed / 0
  failed, lint clean). (a) `60ebbd9` **D36a item 17 modal slot**: four
  hand-rolled Modals migrated to shared BottomSheet (Home
  change-workout + block-shape — dead insetsBottom/reduceMotion prop
  plumbing removed; PlanLibrary quiz + RoutineDetail edit-exercise —
  both had genuine missing-bottom-inset bugs, edit sheet keeps
  keyboard behaviour via the sheet's keyboardAvoiding +
  BottomSheetTextInput swap); ExerciseDetail goal sheet ALSO migrated
  (lead-sanctioned agent choice under D33 — same input-bearing class
  as the edit sheet); ActiveWorkout supersetHeadsUp/unilateralSuggest
  stay raw by design but their shared content style now carries the
  safe-area inset (Math.max contract, new guard pins it). AY-3/AY-4
  a11y guard updated by the LEAD to the superseding structure (the
  shared sheet provides the labelled backdrop + modal isolation those
  pins enforced; guard now locks the migrations can't silently
  revert). New guards: supSheetInset, editSheetBottomSheet,
  quizBottomSheet, + render tests for both Home sheets.
  (b) `601fd08` **D36d photo-modal insets**: all seven SafeAreaView
  instances in ProgressScanCompare/ScanTrend/PhotoCompare now request
  the bottom edge (ProgressPhotoViewer precedent); photo-compare
  scroll content bottom padding inset-aware; source guard pins it;
  suppression pins untouched. Device checklists for both are in the
  agents' reports (9-step modal walk; 4-step photo-modal walk incl. a
  calm/ED suppression check).
- ✅ CI ANDROID BUILD GREEN on run 2611 (`3daa3ae`) — the D34 Kotlin
  bridge COMPILED and the signed APK/AAB built; all three
  compile-risk notes cleared. Later pushes trigger fresh runs; check
  the latest before calling a build walkable.
- ⚠ STALENESS TRIAGE IN FLIGHT (founder concern, 2026-07-10 late):
  the founder flagged that the Ultimate-Audit (2026-06-13) items
  11–16 are a month old and may be superseded by newer work (known
  signals: haptic-feedback adopted; raw/cooked basis chip landed
  c1f0973; micronutrient/vitamins components + OFF snapshot shipped;
  the timeline diary was BUILT AND REVERTED — reintroducing it would
  contradict recent direction). STANDING RULE from the founder
  exchange: NO item from any pre-campaign audit is built from its old
  blueprint; each first gets a verify-first triage against today's
  tree + the decision register, and anything superseded/reverted is
  CLOSED in the register, not resurrected. A read-only Sonnet triage
  of all six items is running; its verdicts land in the register.

- ✅ STALENESS TRIAGE LANDED → **D37**: ALL SIX Ultimate-Audit items
  (11–16) were ALREADY BUILT this campaign (D16/D20/D21/D22 rounds;
  commits in the register entry). Item 15 timeline diary was built
  and REVERTED on the founder's device verdict — never re-propose.
  CLAUDE.md's stale 2026-07-01 status banner corrected to point at
  the current campaign. The cluster is CLOSED; only operational
  remainders exist (founder runs refresh-off-snapshot.yml).

## ⏸ RESUME POINT — current state and queue (2026-07-11; a fresh
## session resumes from HERE per CLAUDE.md's D40 block):

**★ SESSION-END SNAPSHOT (2026-07-11, usage exhausted — read this first):**
Everything is COMMITTED AND PUSHED through `788b1e5` except one thing:
a Sonnet agent was MID-FLIGHT on D43 S1 slice 2 (extracting the 2-3
most self-contained sheets from ActiveWorkoutScreen.js into
src/components/workout/, presentational-only, template = `git show
31b14a7`). If the tree holds uncommitted changes to
ActiveWorkoutScreen.js / src/components/workout/ / logger guard tests:
lead-review them against the slice-1 template and the blueprint S1
rules (byte-identical moves, state stays in the screen, guards
re-pinned invariants-unchanged), run lint + full suite, commit with
handover+board lines in the same push. If half-done or broken: revert
the working tree and relaunch slice 2 from the board entry. NEXT IN
ORDER after slice 2: remaining S1 slices (ExerciseNav, StatusStrip
precursor, LoggedSetsList), then S2-S5 per
D43-LOGGER-REDESIGN-BLUEPRINT.md; then the D43 pristine pass LAST.
FOUNDER-GATED (surface, do not wait): Sentry connector (crash triage),
EAS Gradle-stage logs, migrate_117 "run against production", watch
round 5 questions. Founder DEVICE WALKS owed: Manrope typeface
(`9148a6f`), CP-10 complete + instant theme apply (`3d3eae8`), D45/D46
engine leg-day fix, batch G billing/consent/ED screens. Standing law
this session added: D47 (work the board top to bottom, never curate),
D48 (rule gates, never wait, except billing prices), D51 (lowest-tier
agents; lead coordinates, judges, rules only), plus the per-landing
handover+board discipline (founder correction — never batch it).

**PUSHED THROUGH `dc40a70`. Tree clean at this landing. Full suite at
the boundary: 675/676 suites (1 pre-existing skip), 8,412 passed / 0
failed, lint clean.**

0. LANDED THIS SESSION (2026-07-11, all pushed; detail in
   `_HANDOVER-ARCHIVE.md`): CP-10 batch E COMPLETE — part 1 `c2a9b81`
   (FoodSearch/FoodInsights/RecipeBuilder, recovered from the dead
   session's tree), review fix `7c24933`, part 2 `dc40a70`
   (Diary/MealPlan/NutritionTargets; confidence table live via
   buildConfidenceColors, lead ruling). D40 `f89ffd4`: the operating
   model is PERMANENT law in CLAUDE.md Section 4. D41 `6b388d4`: token
   hygiene — handover split (history in `_HANDOVER-ARCHIVE.md`), lean
   taskboard, slim CLAUDE.md banner, agent report caps.
   **D45 `da59274`: per-session hard caps in the deterministic engine —
   MAX_EXERCISES_PER_SESSION = 8 / MAX_WORKING_SETS_PER_SESSION = 25,
   founder override of the D30-engine no-change ruling ("there has to be
   a maximum per session... no bodybuilder jams 9 exercises into one
   day"). Enforced through the existing trimToTimeBudget lowest-priority
   trim + a final hard backstop; fixed the latent bug where a sole-muscle
   full-body day defeated the time budget too. Behavioural invariant test
   `planEngineSessionCap.test.js`; broad sweep shows 0 sessions over
   either cap, cap binds at 8, determinism held, ED-surface untouched.
   Full ruling in DECISIONS-2026-07-09.md D45.** CP-10 test-coverage
   tails `32ea00d`: same-instance theme-flip tests for the Coach screens
   (stage 3) and chart/Skia components (stage 4) — the two batches that
   had landed without one (added when both Pair-1 verify agents found the
   production migration already done and closed the test gap).
   **✅ D46 — FULL SECONDARY-MUSCLE MODEL BUILT (2026-07-11 fresh
   session, hands-on): commit `19907a2`, adversarially reviewed before
   push. Both halves per the spec: 65 seed-mirrored `secondary` tags in
   POOL (indirectSets reporting live for the first time) + generalised
   synergist trim (glutes<-quads 0.3, glutes<-hamstrings 0.4;
   de-emphasised structural muscles owe maintenance EFFECTIVELY with one
   honest 3-set entry; overlay>=1.2 glute divisions exempt; weak points
   never trimmed; biceps/triceps behaviour byte-identical). Mens
   physique leg day: stacked second glute exercise gone (8ex->7ex).
   Implementation rulings in DECISIONS D46 LANDED block. Original queue
   note (superseded):** founder: "do it all fully, we do not put off
   jobs", 2026-07-11. Founder diagnosed a leg+abs day over-stuffing
   (engine gives every leg muscle its own exercise, not crediting that
   squats/RDLs already hammer glutes/adductors). Verified: the engine has
   NO working secondary-muscle model (`entry.secondary` read at
   planEngine.js:2091 but NO POOL entry populates it; only biceps<-back /
   triceps<-chest weekly trims function). Build = (A) populate `secondary`
   tags across POOL + poolGenerator, (B) generalise the weekly synergist
   trim to the full relationship set. Deterministic-engine build, Fable
   spine hands-on, needs full test rework + adversarial review + a clean
   window — do NOT start under usage pressure. **FULL MAPPED-OUT SPEC:
   `docs/ux-world-class-audit-2026-07-09/SECONDARY-MUSCLE-MODEL-BUILD-SPEC.md`**
   (problem, exact reproduction, design halves, phases 0-6, invariants,
   device checklist, code anchors). Decision: D46. Safety net already in:
   D45 (`da59274`) session caps contain the acute symptom.

   **2026-07-11 later session landings (all pushed; stage log kept
   CURRENT at every landing from here on - founder correction):** D47
   (queue worked top to bottom, never curated), D48 (gates ruled not
   waited on), D49 (D43 blueprint ruled approved; S1 slice-1 agent
   stopped by the founder mid-run with a clean tree, then RELAUNCHED on
   the founder's explicit "Go s1"; slice 1 LANDED - LoggedSetRow +
   EmptyExerciseView extracted to src/components/workout/, guards
   re-pinned, full suite 8,485 green at the boundary), D50
   (Manrope ruled and LANDED `9148a6f`, Inter files removed `982f0d2`),
   D51 (lowest-tier agents, lead coordinates only), D52 (kala namak
   kept with a sourcing note `bb91f9b`). SD-11 idempotency fix
   `7e0dabe`. CP-10 COMPLETE: batch G both lanes `3adf551` + `4947509`
   (35 screens under billing/consent/ED bounds), stage 5 restart-prompt
   retirement `3d3eae8` - 83/83 screens live-themed, settings apply
   straight away. D43 blueprint + brand-font shortlist docs authored
   and pushed. EAS failure narrowed (local prebuild clean, break is in
   the EAS Gradle stage - founder logs still needed). Full suite green
   at the D52 boundary: 686 suites / 8,485 tests, lint clean; the only
   working-tree deltas at this writing are the running S1 agent's.
1. NEXT SLOTS per docs/TASKBOARD.md: CP-10 batch F (screens 37/85
   live, 48 static remain — lead defines the next batch from the
   coverage tracker); then further batches to 0 static, which unlocks
   the stage-5 restart-prompt retirement. Decision rounds still open:
   watch-app scoping (5 questions), brand-font shortlist.
2. PROCESS NOTE (standing): every remaining item gets a verify-first
   read agent before any build brief; pre-campaign audit items get
   D37 triage. Both now permanent via D40.
3. Standing discipline at every landing: full suite over the settled
   tree, per-feature commits, this handover + TASKBOARD.md updated,
   stale entries rolled to the archive (D41), push.

**D33 STANDING DELEGATION (founder, 2026-07-10, recorded in the
decisions register):** product-fork decisions "like these" are now
LEAD-RULED on best-product-for-users criteria, never on effort.
Inviolables (ED-safety, billing, gating, GDPR, schema, NEW
DEPENDENCIES) stay founder-gated. The item-12 fork and item-20
auto-scroll question were both resolved under it: **D34** = build the
native Service→JS bridge so the chronometer notification gets silent
Skip/+15; **D35** = build drag edge auto-scroll; **D36** = item 17
scope (one slot: 4 named modals→BottomSheet + 2 genuine inset gaps;
FeedbackSheet/PeekMenu migration and TalkBack sheet isolation each get
their own later slot; ProgressPhotos content modals get a read pass
first; centred dialogs stay Modals by design).

**AWAITING FOUNDER (asked in chat 2026-07-10, unanswered at handover):**
- migrate_117 apply (telemetry-view REVOKE, drafted + committed at
  653fe32) — needs the exact phrase "run against production"; apply
  via the Supabase connector (project sujrylzzxcqxxfygptns, Volyume,
  eu-west-1), then re-verify grants and update the file header +
  supabase/README, per the Claude-run model.
- Watch-app decision round — 5 questions at the end of
  watch-app-scoping-memo.md in this folder.
- Optional veto on the giant-set copy rulings (Pair-6 entry above).

**OTHER LIVE STATE AT HANDOVER:**
- Supabase Claude-run model ACTIVE (see the Supabase/migrations block
  above): EU-Dublin applied+verified through migrate_116; connector
  approved "always allow" in the founder's claude.ai settings.
- CI Android build GREEN as of run 2603 (c589b00); every later push
  triggers a fresh run — check the latest run on this branch before
  telling the founder a build is walkable.
- Founder's 4-agent window (Sonnet-or-lower, granted ~16:20 for one
  hour) is EXPIRED for a fresh session: revert to TWO agents at a
  time, tier rules per the operating model below.
- SD-11 (await-spanning idempotency check in applyRemoteSetEvent,
  useAppStore.js ~1215-1282) recorded as must-fix-before-wrist-traffic
  (watch memo side-finding); not fixed, founder-visible.

**SUPABASE / MIGRATIONS (2026-07-10, DONE — Claude-run model live):**
Founder connected a Supabase connector and switched cloud migrations to
CLAUDE-RUN (phrase gate kept: exact "run against production" per batch,
given this session). Read-only audit found the true gap was 101-116,
not 110-116 (the deployed telemetry allow-list predated 101; 102's DDL
was in but its function re-issue lineage was uncertain; 105-116 wholly
absent). All 16 applied in order via apply_migration and RE-VERIFIED:
17/17 object checks green, eaten_at backfill complete. Codex wrote NO
SQL; its app-store-notifications fix is deployed (v3, auto-deploy).
Security advisors: 1 pre-existing ERROR security_definer_view on
engine_telemetry_daily (queue a look, predates this batch); 5
rls-no-policy INFOs are deliberate deny-by-default tables. Recorded in
supabase/README (operating-model note), CLAUDE.md status block, and
the 16 file headers. 049/059 remain HELD. Item 16 scanner landed
`2a42fe4` (already-MLKit verified; torch haptic + 6 pinned tests).
NEW OPEN THREAD: founder reports the APK (EAS) build is FAILING again
after the recent native changes (item 14 keyboard-controller/zeego,
item 15 expo-splash-screen + monochrome icon) — logs requested, not
yet investigated.

**OPEN FOUNDER ITEMS (new this session, ask when convenient):**
- Repeat-set on the set-row context menu: no per-row repeat action
  exists today (an old repeat button was deliberately removed), so the
  menu shipped Edit/Delete only. Build a real repeat-set, or keep as
  is?
- zeego is ~16 months since its last publish (works on SDK 54 + New
  Arch; awareness flag, not blocking).
- MacroRings could carry its own tap selection() haptic internally (its
  DiaryScreen call site is guard-pinned byte-identical) — fold into a
  later batch if wanted.

**FOUNDER-SIDE ACTIONS (updated this session):**
- ⚠ FRESH EAS BUILD now REQUIRED before device-walking this branch:
  item 14 added native modules (keyboard-controller, zeego + peers).
- Device checklists to walk on that build: item 6 (max system font,
  Pair-3 entry above); item 13 (zoom clamp, spring-back, haptic ticks,
  zoom-wins-over-swipe, boundary no-op, TalkBack paging, reduce-motion
  instant snaps, calm/ED suppression intact); item 14 (keyboard on the
  four adopted surfaces incl. drag-dismiss, set-row long-press menu on
  BOTH platforms, delete confirm intact).
- Device checklist, item 20 drag reorder (physical Android):
  1 Plan detail → Reorder → long-press a day's grip, drag past
  another, release — day follows the finger, others glide aside,
  order persists after leaving and returning; chevrons unchanged.
  2 Manual builder, day with a superset pair → drag a lone exercise
  past the pair — it lands before/after the pair, never between;
  dragging a paired exercise moves the whole pair. 3 Same day,
  chevrons only — identical block behaviour; Save persists.
  4 Routine detail with a superset → Reorder → drag past the pair —
  no split; reopening shows the persisted order. 5 Active workout,
  3+ exercises → overflow → Reorder exercises → drag one, close —
  main view stays on the SAME exercise, nav strip shows the new
  order. 6 Overflow Move exercise up/down still work as before.
  7 Reduce Motion on → repeat 5 — drag still follows the finger, other
  rows snap instantly. 8 TalkBack → reorder modes — drag handle never
  announced, Move up/down announced and activatable. 9 Single-exercise
  session — Reorder exercises absent from the overflow.
- Still outstanding from before: supabase migrations 110-116 to
  EU-Dublin; refresh-off-snapshot workflow (OFF micronutrients); iOS
  App Groups + Live Activity provisioning; Play OAuth SHA-1.
- THEMING COVERAGE TRACKER (for the stage-5 honesty gate): after batch
  A, live = 20/85 screens (+3 in flight via item 8), ~52/111
  theme-consuming components. Remaining static components ~59 (food/*,
  photo/scan family, partner, auth, misc); remaining static screens
  ~62. Stage-5 prompt retirement stays blocked until a toggle's full
  dependency set is live.

### OPERATING MODEL (founder standing orders, INVIOLABLE)
- **Fable coordinates; agents do the work.** You (main loop) do
  architecture, safety-adjacent code, design judgement, and ALL hands-on
  review. Agents do the leverage work (well-specified builds, reads, audits).
- **NO main-loop file reading beyond judgement-critical review (founder,
  reinforced 2026-07-10).** Recon, verification sweeps, "what exists
  already" surveys, pattern look-ups, spec extraction — ALL of it goes to
  a Haiku/Sonnet read agent, even when it feels quicker to grep yourself.
  The main loop opens files ONLY for the judgement the founder relies on
  directly: the diff under lead review at a landing, safety-adjacent
  hunks, and the handover/decision docs needed to coordinate. If you are
  about to Read/Grep to LEARN something rather than to JUDGE something,
  dispatch an agent instead.
- **Lowest capable agent tier, ALWAYS.** Every subagent/workflow call MUST
  carry an explicit model: 'sonnet' for builds/tests/well-specified work,
  'haiku' for mechanical (greps, simple writes, triage), 'opus' ONLY where
  Fable-level judgement is unavoidable (engine-grade, hostile review).
  NEVER 'fable' in a subagent. A hook (.claude/hooks/agent-tier-guard.py)
  blocks a missing model. Effort informs sequencing, never the choice.
- **TWO agents at a time, run to completion before the next pair.** (Token
  protection in the 5-hour window.)
- **Every agent brief:** state the authority (which decision/doc), the HARD
  bounds (ED-safety/engine/billing/gating), do-NOT-touch files (name the
  concurrent agent's lane + any file the lead is editing), the test + lint +
  device-checklist expectation, and "STOP and report rather than interpret"
  on any ambiguity or pinned-test conflict. Agents do NOT commit or push —
  the lead reviews the diff, then commits. Agents must NOT run `git stash`
  (shared tree). Agents must NOT touch main.
- **PRODUCT-OVER-EFFORT (founder rule):** decisions are made on what makes
  the end product best, never on what is easier to build.
- **NO SILENT CORNER-CUTTING / NO PARKING:** every fork between "do the full
  thing" and "do less" is a founder decision, surfaced as a structured
  multiple-choice round BEFORE proceeding, never pre-decided, never with the
  lighter option framed as the recommendation.
- **Per-pair discipline:** after EVERY completed pair, update this handover +
  the decisions register and PUSH, so a guardrail stop or chat loss never
  loses progress. In practice, commit+push+stage-log after every single
  landing.
- **Commits:** small, per-feature, imperative + why-body, British English,
  NO attribution of any kind (no Co-Authored-By, no tool/session links).
  Reset-author rebase before every push if the harness injects attribution.
- **Founder questions:** structured multi-choice rounds (AskUserQuestion),
  never walls of text; if the tool fails, ask in plain numbered text.

### KEY REFERENCE DOCS (read before acting)
- `CAMPAIGN-2026-07-10-APPROVED-SLATE.md` — the action spec + sequencing.
- `SCORECARD-2026-07-10.md` — every area rated /10, targeting rationale.
- `DECISIONS-2026-07-09.md` — the full founder decision register (D8..D28;
  includes the REJECTED/HELD/never-re-propose set).
- `codex-audit-verification-2026-07-10.md` — the AUD-01..07 verdicts.
- `CP-10-restart-free-theming-plan.md` — theming stages 4-5 plan.
- `CLAUDE.md` (repo root) — the constitution; Section 2 inviolables.
- Exercise plans A-G: `docs/exercise-planning-2026-07-09/`.

### FOUNDER-SIDE ACTIONS OUTSTANDING (not agent work)
- Apply supabase migrations 110-116 to EU-Dublin (manual) + any migration
  Codex wrote for its AUD fixes.
- Run `refresh-off-snapshot.yml` workflow (lands OFF micronutrient data).
- iOS Live Activity: App Groups provisioning + fresh EAS build.
- Play OAuth SHA-1 confirm.
- Fresh EAS build carries a large device-walk backlog (timeline diary was
  REVERTED to meal cards — verify that; weigh-in edit, dietary needs,
  vitamins, haptics, next-exercise, bottom sheets, Help/FAQ, live theming).
- Plan-F Tier-1/Tier-2 validation studies (external; not code).
- OPEN founder rounds: watch-app scoping, kala namak tip, brand-font pick.

### STILL HELD — do NOT build or re-propose
Exercise media (#18); rest-day notification (#22); plate calculator;
paywall social proof; RPE/RIR reinstatement (settled-removed). The
adversarial whole-diff review is SUPERSEDED (Codex did it).


===============================================================================
## ARCHIVE POINTER + STANDING TOKEN-HYGIENE RULE (D41, founder 2026-07-11)
The day-by-day historical campaign log now lives in
`_HANDOVER-ARCHIVE.md` (same folder — full history, never deleted).
STANDING RULE: at every landing, stage-log entries older than the
current resume point roll into the archive; this live file stays under
~600 lines so a fresh session (and every agent brief citing it) reads
it in one cheap pass. Landed-item detail on docs/TASKBOARD.md moves to
the archive at the same time; the board holds only in-flight / queued /
held. Agent briefs cap final reports: structured, evidence-first, no
narrative padding (detail-bearing audit evidence exempt).
===============================================================================
