# VOLYUME TASKBOARD — the single current task source

_Created 2026-07-10 by the docs staleness sweep. This is THE list the project
works from. Update it at every landing (add, move to done, re-verify).
Landed-item detail rolls to
`docs/ux-world-class-audit-2026-07-09/_HANDOVER-ARCHIVE.md` at each landing
(D41 token hygiene): this board holds only in-flight / queued / held._

## How this board works (D37 + D38 + D47 - restated)

- **D47 (order rule, founder 2026-07-11).** The board is worked TOP TO
  BOTTOM, every item, in order - the lead never selects, defers or
  re-prioritises items by preference. Blocked items are surfaced and the
  next in order starts immediately.

## (D37 + D38 detail)

- **D37 (staleness rule).** Nothing from a pre-campaign audit is built from its
  old blueprint. Every pre-campaign item is triaged against today's tree + the
  decision register first; superseded/reverted items are closed, not
  resurrected. All dated audit folders and loose audit/status docs now carry a
  SUPERSEDED/CLOSED banner pointing here. Work flows only from
  `docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md` and this board.
- **D38 (elevation rule).** A job being on a list, in an audit, or in an old
  queue is NEVER sufficient reason to build it. Before dispatch, the brief must
  state, verified against the tree: CURRENT STATE (what the app does today on
  that surface), END STATE (what the item delivers), ELEVATES BECAUSE (why the
  delta improves the app as it now is). Any item that cannot honestly carry all
  three drops to NEEDS JUSTIFICATION at the bottom of this board, not the queue.

Authority for every line below is cited inline (decision Dnn + source doc).
The full register is `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`.

---

## R2. THIRD DEVICE WALK (founder, build 2684, 2026-07-11 evening) — ABOVE ALL ELSE

_The founder's verdict: the logger was ordered PERFECT and got a token tidy;
the summary gaps got point patches (three in two weeks) instead of a
structural fix; the coach setup surface was untouched. This wave executes
the full mandate. Fixes land per-feature on this branch; every push
auto-builds an APK (build-android.yml, claude/**)._

- **R2-1 DONE IN TREE (lead, hands-on):** intent sheet re-appeared over the
  just-started workout. Root cause: no single-flight guard on the two start
  surfaces; a second queued open resolved after navigation and the shared
  BottomSheet floats above the navigator. Fix: synchronous `startFlowRef`
  guard on handleStartNextWorkout + handleRepeatLastSession. Guard test
  with the wave's landing.
- **R2-2 (agent A):** logger header design pass - X, elapsed timer and
  Finish unified into one visual family (lead ruling in brief). D66 was an
  under-scoped token tidy; this is the redesign.
- **R2-3 (agent A):** set-card region - edit pencil + the control clipped
  half off the right screen edge beside the rest bar ("pencil and arrow on
  top of each other"); root-cause the overflow, one icon-button family.
- **R2-4 (agent A):** exercise title + "..." button vertical misalignment;
  "Est. max" cramped/wrapping under the Reps label.
- **R2-5 (agent B):** summary footer -> tab-bar dead band (~70dp). Prime
  suspect: ActiveSessionMiniBar (rendered above the tab bar by
  VolyumeTabBar) lingering/reserving space right after finish. STRUCTURAL
  fix of the footer/tab-bar/mini-bar system, render-level test.
- **R2-6 (agent B, root cause CONFIRMED):** scroll-end gap - the footer is
  in normal flow below the scroll (never overlays), yet contentContainer
  pads bottom by footerHeight + lg (phantom overlay clearance,
  WorkoutSummaryScreen.js:979). Remove double reservation.
- **R2-7 (agent B):** Coach screen Weekly check-in card is a text wall
  next to one-line siblings; tighten to one line, detail moves into the
  check-in screen.

**SCOPE ESCALATION (founder order, same evening): the reported defects are
symptoms; the mandate is the logging flow rebuilt FULLY to
docs/remediation-2026-07-11/FOOD-DESIGN-STANDARD.md, accepted against its
own 15-point checklist, nothing less.** Lead-measured compliance baseline
(the acceptance instrument - the landed diff must clear every line):
- ActiveWorkoutScreen.js: 6 raw Modals (target: only ruled exceptions);
  radius census 22 md / 7 sm / 3 lg (target: cards lg, controls md, pills
  full, zero misfiled sm); 4 tabular-numeral sites on an all-numbers
  screen (target: every numeral); 12 raw fontWeight pairs (target: 0);
  21 alerts (target: destructive-only, reversible -> undo toast); 71
  TouchableOpacity (target: CTAs on Button, rest in standard families).
- WorkoutSummaryScreen.js: 1 raw Modal (template prompt -> BottomSheet);
  radius 16 md / 3 sm / 1 lg; 11 raw fontWeight pairs; census targets as
  above. Structural R2-5/6 fixes remain the priority in this lane.
Both build agents carry these rulings (D33) with per-class dispositions
required in their reports. Lead acceptance = scorecard re-run on the diff
+ element-by-element logger-vs-nutrition comparison; founder acceptance =
device walk of the fresh build. NOTHING on this wave is closed by anyone
but the founder.

- **R2-8 FIXED IN TREE (lead, hands-on, native): fatal production crash in
  the unilateral flow.** Founder Sentry screenshot (fatal, 2026-07-11
  20:19 UTC): ForegroundServiceDidNotStartInTimeException on
  WorkoutForegroundService. Root cause: ACTION_START_REST arrives via
  startForegroundService() (hard obligation to call startForeground), but
  the expired-rest / zero-window paths returned via stopSelf() without
  ever going foreground - and the unilateral flow's halved, chained
  per-side rests routinely lapse between the JS expiry check and intent
  delivery, so repeated use eventually hit a cold-instance expired
  delivery and Android executed the app. Fix in
  modules/rest-timer-live/.../WorkoutForegroundService.kt: on a cold
  instance the obligation is discharged FIRST (goForeground with the rest
  notification), then the expiry decision runs; expired path tears down a
  properly-foregrounded service (legal, instant). Commands without an
  obligation (stop/skip/+15 via startService) deliberately unchanged.
  Compile gate: the CI Android build on push. NOT related to the OTHER
  Sentry item (build-2608 JS TypeError, still blocked on the connector).
  DEVICE CHECK: run a unilateral exercise with several per-side sets,
  letting some rests run out and skipping others, several sessions in a
  row - no crash.

**WAVE LANDINGS (2026-07-11 late evening, all lead-reviewed, full suite
697/8586 green at the boundary, pushed - each push cuts a build):**
- R2-1 double intent prompt: 3903ccd. R2-8 native crash: d3445e3.
- R2-2/3/4 logger chrome rebuild: f675c6b (header one family; rest-bar
  overflow root-caused - readout flex/minWidth, controls flexShrink:0;
  pencil contained; title/options aligned; est-max own caption line;
  radius.sm eliminated; numerals tabular; loggerHeaderCohesion guard).
- R2-5/6/7 summary + coach: a08e1c5 (dead band root cause was the screen
  double-claiming the bottom inset - edges ['top'] now, render-level
  workoutSummaryFooterBand guard; mini-bar hypothesis REFUTED with
  evidence; scroll-end phantom clearance removed with the footerHeight
  plumbing; check-in row one calm line; template prompt onto BottomSheet;
  last blocking alert -> toast; comma-expression style bugs fixed).
- R2-9 intent sheet redesign: 721249b (founder report: chips unreachable
  after insta-start; intent now selects, one Start commits intent+chips,
  Skip/opt-out keep instant zero-input start; D2 pins hold).

**STOP-ITEM RULINGS (D33, lead, recorded):**
- Alerts on the logger (13 validation/error -> toast; 2 undo conversions
  touching PR-reeval/sync paths lead-built): NEXT SLOT, needs
  ToastProvider ancestry verify first.
- Raw logger Modals: D36a stands (education + swap modals stay raw); the
  set-type picker + option menus -> BottomSheet in the next slot; their
  in-modal CTAs convert with them.
- Logged "This workout" rows stay radius.md (D60 dense data-receipt
  ruling stands; recorded exception on the scorecard).
- Theme gap: no sm/semibold type role exists; 13 sites across
  logger+summary held rather than de-emphasised. NEXT SLOT: add a
  `labelStrong` role to theme.js once, then map all listed sites.
- Summary TouchableOpacity census: all 8 stay pressables (toggles/
  icon-buttons/quiet pills, not CTAs). Prose numerals stay prose.

**APP-WIDE UNIFORMITY (the founder's "one package" order; the held
pristine pass is UN-HELD by it). FRAMING CORRECTION (founder): unify
SHARED PRIMITIVES; never transplant food idioms - each screen keeps its
own information design.**
- LANDED 9c84adb (Progress: Analytics/Consistency/ProgressSections -
  meters to pill family, tabular numerals, captionStrong; 3 census
  guards) + 3c6a3a8 (coach lane: the census found ONE residue -
  CoachOutput countdown card radius - fixed + pinned; lane otherwise
  already unified by R9/D69/D70). Full suite 686/8547 green at both.
- R2-10 intent sheet LANDED 8f9a96c (founder decision "Reorder":
  readiness rows redesigned as one aligned block ABOVE the answers,
  one-tap start unchanged; R2-9 select-then-Start superseded/removed).
- IN FLIGHT (one Opus agent): the census-deferred batch -
  WorkoutHistory toggleBtn md; VolumeHeatmap input md + full tabular
  pass; LiftProgress badges full + captionStrong; YearOfLifts full
  tabular pass (ED/calm logic byte-identical); lead-ruled one-liners
  (CoachOutput adjustmentIconWrap md, TodayStrip loggedPill full).
- QUEUED NEXT (lead hands-on, design-system change): add the missing
  type roles (sm/semibold "labelStrong" class and kin) to theme.js
  ONCE, then map the ~50 listed theme-gap font pairs across
  logger/summary/coach/progress lanes. Recorded, not parked.
- Remaining app screens (settings/onboarding/food-adjacent already
  compliant by origin) get a closing census after the above.

**R2-8b/R2-11 - PRODUCTION P0 PAIR (build 2692 walk, founder repro):**
- R2-8b LANDED 306be1a: the surviving set-log crash was a queued-start
  drop - stop-then-start churn let Android accept a START_REST
  (obligation created) while the prior stop's bare stopSelf() killed
  the service with it still queued. Service now tracks lastStartId and
  self-stops with the startId form (except the mandatory onTimeout);
  JS re-anchors ride the live instance instead of stop-then-start.
- R2-11 LANDED a84215c: "database is locked" (plan build; NOW BLOCKS
  APP ENTRY on the founder's device) - mechanism (lead-verified
  investigation, full report in session log): expo-sqlite parallel IO
  pool + only transaction blocks queued app-side + NO busy_timeout, so
  raw writes colliding with an open BEGIN failed instantly. PRAGMA
  busy_timeout 5000 added beside the WAL pragma. NOT a second
  connection (native ref-counting shares one; dbCrypto audited clean).
  FOUNDER CORRECTION recorded: the sign-out photo-wipe failure was a
  SEPARATE earlier incident on a DIFFERENT account, NOT this lock.
- **R2-12 OPEN - sign-out "photo and scan data could not be removed"
  (own bug, distinct from R2-11 per founder).** The alert fires for ANY
  throw in wipeAllUserData's fatal steps (FATAL tables, legacy
  photo-meta delete, photo-dir wipe, snapshot purge - database.js:4622-
  4662); both file wipes are already idempotent, so the thrower is
  unidentified. NEEDS the error identity: the Sentry event for
  clearAuthStateForSignOut.wipe.failed / database.wipeAllUserData.*
  from that earlier attempt (founder screenshot or the Sentry
  connector). Do not re-merge with R2-11 without that evidence.
- QUEUED (structural, next slot, lead review required - database.js):
  route ALL writes through the write queue, not just transactions
  (raw sites: recordEngineTelemetry 7586, createWorkoutSet 2879,
  legacy sync appliers); fix runInTransaction reentrancy (foreign-tx
  inline-join, audit finding sync-db-findings #1); dbCrypto swallowed
  closeAsync refcount hygiene.
- FOUNDER DECISION OPEN - sign-out escape (the wipe_failed trap forced
  the founder to clear storage; force:true does not escape either,
  useAccountActions.js:113-119): (A) bounded retry with backoff, still
  fails closed; (B) wipe-verify-then-force - after N failures count
  remaining rows for the user and allow sign-out only if genuinely
  zero remain (best correctness, no privacy change); (C) force-with-
  disclosure after N failures, weakest privacy, must re-arm the
  next-sign-in wipe net. Lead recommends A+B together.

RECOVERY: any dead session -> `git status`, review uncommitted diff against
this entry, relaunch the affected agent with the same brief + the scope
escalation above.

## R. REMEDIATION CAMPAIGN (founder order 2026-07-11, second device walk) — superseded by R2 above for live defects

_The first must-fix wave FAILED the founder's device walk: items were built on
the wrong surfaces, "verified" claims were false (heading strip never matched
generated plan names; Progress spacing untouched), the unilateral flow got
WORSE (two taps per side, touching buttons), the logger shipped with the CTA
under the Android nav bar, a dead half-sliding overlay on set completion, and
a style mish-mash. Founder verdict: logger is the premium surface and has
fallen behind Food; Food is the standard; everything in the logger must reach
it. Discipline for this campaign: cheap agents where equal-quality, but the
LEAD verifies every quality-bearing diff hands-on against what actually
renders (trace to the rendering line, tap-by-tap walk, before/after strings).
No item marked done on an agent's self-report. Ever._

- **R1 Routine display names.** DONE `2340f7c` - strip verified against the
  founder's exact stored shape, 8 pinned tests, routed through every
  plan-name surface (Home, Train cards + sheets, PlanDetail, Library,
  Meso builder, Partner). Original entry: CURRENT: Today card (`HomeScreen.js:1759`)
  and Train render raw `routine.name`; generated names bake in
  "4x/week, 9 Jul" (`planAutoGen.js:54-63` dedup suffix); the old strip
  (`planDisplay.js planHeadingName`) only matches a TRAILING frequency so it
  does nothing for generated names. END: headings show the clean name
  ("Men's Physique - Cut - V-Taper") on every surface; generator stops
  baking dates into new names. RECOVERY: trace is in this entry; re-fix from
  it. STATUS: in progress (lead, hands-on).
- **R2 Logger CTA under Android nav bar.** DONE (lead, hands-on). ROOT
  CAUSE: not the bar's code (its insets.bottom padding existed since
  2026-07-03) - App.js mounted SafeAreaProvider with a MISNAMED prop
  (initialWindowMetrics= instead of initialMetrics=), silently ignored, so
  insets could read 0; ActiveWorkout is the one surface relying on raw
  insets.bottom (its tab bar hides). FIX: correct prop + Android floor of
  48 when the inset misreports 0 (safeBottom) + guard test re-pinned
  STRONGER (pins both the floor and the provider prop). DEVICE CHECK:
  founder confirms Log set clears the nav buttons on next build.
- **R3 Dead set-completion overlay.** DONE (lead, hands-on; ruling D63).
  Traced every set-completion visual: the ONLY greying element was
  PRCelebration's full-screen takeover (0.85 overlay + confetti + centre
  card) on real PRs. The takeover is RETIRED - every in-session
  celebration is now the calm top toast (gold icon for records, PR haptic
  kept, 2.2s auto-dismiss, tap to dismiss, never obscures inputs); the
  big MilestoneBurst stays on the summary screen. Suppression rules
  strictly stronger. firstLift + TalkBack + motion pins pass unchanged.
  DEVICE CHECK: founder confirms no grey hang on set completion.
- **R4 Unilateral logging redesign.** DONE (lead design + hands-on build;
  ruling D64 from plan-C study + competitive research - no competitor has
  solved per-side logging). NEW FLOW, 2 taps total: "Log set" captures
  side one immediately (the tap IS the confirmation) and starts the
  rest-class between-sides pause; the SAME permanent primary relabels to
  "Log other side" and commits the pair as one row (D54: one number, same
  reps both sides). Confirm sheet + middle tap DELETED; between-sides
  state is a properly-spaced inline banner (cluster-banner class) with a
  clear cancel. Walkthrough teaches the two taps. Guards re-anchored to
  D64 (21 unilateral pins green); storage/engine invariants untouched.
  DEVICE CHECK: founder walks a dumbbell curl - expect exactly two taps,
  no sheet, nothing touching.
- **R5 Logger cohesion to the Food standard.** DONE `75ad788` (lead,
  hands-on; ruling D66). Header unified: X = ModalHeader's close (24,
  textPrimary); timer = data ink (textPrimary, same num role); Finish =
  plain secondary Button (bespoke chrome override deleted). One
  small-surface radius (md) across beatLineCue / RestTimer skip /
  logged-set rows / in-place editor; raw type pairs onto bodySm and
  overline roles; scroll edge md -> lg matching header + Food. DEVICE
  CHECK: header reads as one family (plain X, plain timer, quiet Finish
  chip all same ink); logged sets and rest timer share the same corner
  rounding; nothing amber in the header.
- **R10 Clipped-AI copy sweep** (founder order mid-campaign). DONE
  (ruling D67). 5 strings fixed ("Yours free, always" -> "What stays
  free"; "No ads, ever" -> "No ads"; "Your data is always yours."
  deleted; "on Pro, forever." trimmed; "No marketing, ever." ->
  "never marketing") + a NEW LINT banning the ", always/ever/forever"
  tail in strings/JSX text, wired in both rule blocks. DEVICE CHECK:
  Welcome screen free card + trust row read plainly.
- **R6 Workout summary bar dead space** between close and share when
  finishing. DONE (lead, hands-on). ROOT CAUSE: PressableCard (the shared
  press-physics primitive under Button/Card/Chip/Stepper) applied the
  caller's style to an INNER Reanimated.View while the outer Pressable,
  the element the parent actually lays out, carried no style, so every
  layout-in-parent style passed through Button (flex: 1, alignSelf,
  width) was silently discarded in flex rows. Close rendered at text
  width and the rest of the footer bar sat empty; the SAME class left
  ActiveWorkout's Log set / Next exercise split bar under-width.
  Regressed 2026-07-09 when those bars adopted <Button> (5d98870) off
  raw TouchableOpacity (which held flex: 1 directly) - the founder's
  "it was better a month ago". FIX at the primitive: PressableCard is
  now ONE animated pressable (Reanimated.createAnimatedComponent(
  Pressable)) carrying the caller's style, so declared layout takes
  effect and the press hit area matches visible bounds. Pinned in
  pressableCard.rowLayout.guard.test.js; the stateMorph animated-
  ancestor pin re-anchored (1 -> 0, intent unchanged). Absolute-
  position sweep confirmed no consumer relied on the old inert layer.
  DEVICE CHECK: (1) finish a workout - Close fills the footer with
  compact Share beside it, no dead band; (2) logger bar - Log set spans
  the bar full-width; after target completes, Log set + Next exercise
  split the bar half-and-half.
- **R7 Progress: section below Training Load half-empty.** DONE - root
  cause is the SAME class as R6/D65: SparkCard is a pressable Card whose
  `sparkCard: { flex: 1 }` was silently discarded by the old PressableCard
  two-view structure, so the two cards shrink-wrapped and the RIGHT HALF
  of the row rendered empty. The earlier "verified correct in source"
  claim read the JSX (two-up flex, genuinely correct) but missed that the
  flex never reached the element the row lays out - source-reading vs
  render-tracing, the exact failure mode of the first campaign. Fixed by
  the D65 primitive collapse (4552c03); pinned as the third dependent in
  pressableCard.rowLayout.guard.test.js. DEVICE CHECK: Sessions + New
  bests fill the row edge to edge under Training Load. FOUNDER OPTION at
  the device walk: if, with the row rendering properly, you still want
  more density there, say so - candidates are two more free-safe 30-day
  stat cells (total reps, time trained); the current two-card layout is
  the audited A5 design, so nothing is built until you choose.
- **R8 Coach page.** DONE (lead design + hands-on build; ruling D68).
  Real merge, one voice per fact: "Getting to know you" DELETED (Pro
  without a decision shows no status card at all - the check-in row's
  full readiness copy is the single status); with a decision the status
  card becomes the TAPPABLE weekly-update hero (opens the decision
  directly) and the duplicate "Coaching decision" row disappears,
  surviving only as an archive path when a past decision exists without
  a current one; free tier's card + "Upgrade to Pro" row pair collapsed
  to one tappable pitch card. Readiness-logic drift verified impossible
  at source (coachLedger imports the gate constants from
  trialActivation). DEVICE CHECK: (1) Coach tab as Pro pre-first-review:
  profile card then This week rows, no beige status box, check-in row
  states the exact status once; (2) after a decision: amber-toned
  "Weekly coach update: {date}" card opens it on tap; no duplicate row
  below; (3) as free: one tappable Pro pitch card, no duplicate upgrade
  row.

- **R9 Whole-app card/box cohesion** (Today / Workout / Nutrition /
  Progress / Coach to the Food standard). BUILD LANDED (rulings
  D69/D70; commits 5390f6c..b14d76a; close review running):
  - Wave A (lead, hands-on): Home intent prompt -> shared BottomSheet +
    Chip + haptics; RoutineDetail remove/swap -> commit-with-undo (full
    field restore / inverse write); Plans folder prompt -> BottomSheet,
    archive -> undo toast; WorkoutHistory repeat menu -> PeekMenu;
    swap picker -> ModalHeader chrome; WeightTrendCard -> card class
    (dot untouched per COMP-027); recap lock alert -> info toast;
    EmptyExerciseView header twin + rest-timer radius (review catches).
  - Wave B (Sonnet builds, lead-reviewed + corrected): ~25 hand-rolled
    CTAs onto shared Button across Home/Train/Progress; TodayStrip +
    six Progress cards onto radius.lg; banners stay md (sanctioned
    second class); tabular numerals on the three missing readouts;
    haptics vocabulary on banners, options openers, NavRow (central),
    NavTile, InsightRow; Button gains hitSlop forwarding; recapCard
    border onto banner grammar. Lead corrections: Repeat chip tertiary
    (brief error), cardio History pill stays chip-idiom, one missed
    cross-file pin re-anchored.
  DEVICE CHECK (R9): (1) Home: banners/strip/cards read as two clean
  classes, every small CTA is a house button, intent prompt is a real
  sheet with drag handle and chip pickers; (2) Train: archive shows an
  undo toast (no confirm), removing/swapping an exercise in Edit
  workout is instant with undo, folder prompt is a sheet, repeat opens
  an options sheet; (3) Progress: cards share one corner radius, share
  CTAs are uniform buttons, locked Recaps shows a toast not a popup;
  (4) taps tick consistently across all five tabs.
  CLOSE REVIEW (Sonnet, adversarial, full arc 5390f6c..b14d76a): NO
  BLOCKERS; every commit delivered as claimed; Section 2 confirmed
  untouched by diff-stat over every safety module. Two SHOULD-FIX edge
  cases found and FIXED (f80e00f): undo-order collision after a reorder
  inside the 8s window (deterministic renumber added) and the folder
  sheet stranding on a swipe mid-save (unconditional onClose). One nit
  fixed (TodayStrip row haptic consistency); one observation to the
  founder walk (plan-card footer actions are now equal-weight tertiary
  pills - the old low/high emphasis pair is gone; glance and rule).
  CAMPAIGN STATUS: R1-R10 ALL LANDED AND REVIEWED. Founder device walk
  is the final gate - the one-walk checklist is
  docs/remediation-2026-07-11/DEVICE-CHECKLIST.md (22 steps). Next
  lane after the walk: marketing (C1 first, section M below).
  Original audits (both verified):
  RECOVERY: both briefs are reproducible from this entry + the standard
  doc; if either agent dies, relaunch with the same brief (read-only,
  no tree damage possible). Lead then rules per divergence class and
  builds (hands-on for judgement classes, specced dispatch for
  mechanical sweeps), lead-verified against the rendering line.
  AUDIT RESULTS (lead-verified):
  - D65 blast radius: DONE. ~70 restored-intent sites (flex splits,
    alignSelf links, percentage widths) all render as declared - no fix
    work. The agent's 59 cautions were downgraded on lead analysis:
    margins/minWidth/fixed sizes lived on the inner box and were always
    honoured; only parent-negotiated properties (flex, alignSelf,
    percentage width) were ever dead. Real device notes: (a) invisible
    full-width tap zones on fullWidth={false} buttons are gone (visible
    layout unchanged, tap area now honest); (b) confirm the three
    restored bars (logger split bar, summary footer, spark row).
  - R9 card map: DONE, spot-verified. Coach = fully compliant
    reference; Train shells compliant (~9 hand-rolled inner CTAs +
    folder-prompt Modal + swap-picker bespoke header); Progress = 6
    cards on radius.md + 4 red/green colourings; Home = worst (~19
    divergent boxes: TodayStrip + 7 banners on md, 7 hand-rolled CTAs,
    intent prompt raw Modal + hand-rolled chips, glance numeral not
    tabular). Ranked classes and the colour-grammar ruling are in the
    build plan below.
  BUILD PLAN (starts when the interaction audit lands): two sanctioned
  box classes app-wide (Card = radius.lg/surface/borderSubtle; Banner =
  radius.md/tinted fill/accent border, Home's existing banner grammar);
  TodayStrip + the six Progress secondary cards -> Card class;
  hand-rolled CTA -> Button sweep (specced dispatch, lead variant
  table); 3 raw Modals -> house chrome (judgement, hands-on); tabular
  numerals + Chip adoption. COLOUR RULING (to record as D69 at landing):
  weight/food-adjacent surfaces adopt Food's adherence-neutral rule
  strictly (WeightTrendCard's green/amber trend dot goes neutral -
  strengthens ED posture); training-mechanics caution signals (volume
  over MRV, insight severity, unresolved exercise) keep semantic
  warning/error colour as one consistent status grammar - they are
  recovery warnings, not body judgements.

RECON (done): `docs/remediation-2026-07-11/FOOD-DESIGN-STANDARD.md`
(the cohesion measuring stick), `DEFECT-MAP.md` (file:line evidence
R2-R8), `COMPETITIVE-LOGGER-BAR.md`.

## M. MARKETING LANE (founder-accepted sequence, 2026-07-11) — AFTER R5-R9

_Founder message 2026-07-11 recorded the working order verbatim. Runs
only after the R-campaign closes. Corrections locked in that message:_

- _C1 is REAL on current main (my earlier 4/10 "unverified premise"
  verdict was a false negative - the founder verified the strings
  directly): `src/lib/differentialPaywall.js:49-52` LOCKED_COPY bodies
  end "Try Pro free for 7 days." while `src/components/
  DifferentialBadge.js:62` renders "Try Pro free for 14 days" on the
  CTA directly beneath. The two files each carry a comment claiming the
  OTHER'S rationale is inverted. Founder-ruled fix shape: remove the
  duration from the body copy; the CTA is the single source of truth.
  Copy + tests only; no billing logic._
- _M3's "trial begins after first workout" assumption is DISCARDED: the
  cardless 14-day trial starts at onboarding after Article 9 consent
  (RootNavigator start_cascade; ProSetupCompleteScreen says so). No
  moving the trial, no onboarding redesign; any asset claiming
  otherwise is rejected. "Log your first workout free" stays an
  acquisition CTA only._

Order: **C1** trial-copy contradiction (DONE bfa269e - bodies drop the
trial sentence, converging on the NO_TRIAL shape; the badge CTA is the
single source of truth; MOVE_4 doc carries a dated amendment; no
billing logic touched) -> **C2** ProUpgrade telemetry (DONE fd30f11 -
impression + entry source, period choice, CTA taps, dismisses and
sheet-cancel through one trackCta helper on paywall_shown /
paywall_tapped_cta; restore_purchases_attempted enriched on both store
variants; entry sources threaded at every navigate('ProUpgrade');
allow-list reuse so NO new event names and NO server migration; guard
suite `src/__tests__/proUpgradeTelemetry.guard.test.js`) -> **C7**
account-requirement copy sweep (DONE f2f2547 - SubscriptionPolicy
"no account needed" claim corrected; earlier R10 trimmed the clipped
tail) -> **C8** attribution phase 1 (DONE - `src/lib/attribution.js`:
?src=/?utm_source= -> sanitised [a-z0-9_-] slug max 32 chars,
first-write-wins in AsyncStorage, warmed at startup; App.js captures
passively as the first action on every incoming link;
`first_touch_source` attached to the first_workout_logged payload in
ActiveWorkoutScreen (the one attach point, pinned); NO ad SDK /
fingerprinting / Install Referrer dep — guard suite
`src/lib/__tests__/attribution.test.js`) -> **C3** duplicate
paywall READ-ONLY audit (AUDIT DONE, decision OPEN - PaywallScreen is
a verified orphan: registered once, ZERO navigation call sites, still
defaults annual against the 2026-07-02 monthly ruling, still says
"7 days"; but holds two capabilities ProUpgrade lacks - Play-review
social proof + inline restore. Founder brief with options A-D:
`docs/marketing-2026-07-11/C3-duplicate-paywall-decision-brief.md`.
NO code touched; DifferentialBadge untouched) -> **C5** day-14 factual
recap (MEMO DONE, decision OPEN - three forks: surface (enrich
CascadeGate / RecapStory trial variant / counts-aware day-14 push /
close C5), fact scope (training-only vs +neutral activity counts),
thin-recap threshold. ED guardrails baked in as conditions, not
options: no outcome language ever, weight/food-adjacent lines
suppressed fail-closed under calm/ED, no thin recap.
`docs/marketing-2026-07-11/C5-day14-recap-decision-memo.md`. NO code
touched). RULINGS (D33, founder reaffirmed delegation 2026-07-11):
**D71** C3 = option B, port social-proof excerpt + inline restore onto
ProUpgrade then delete the orphaned PaywallScreen; **D72** C5 = option
A, training-facts block on the CascadeGate trial-end variant,
training-mechanics only, floor 3+ completed workouts. Both recorded
with rationale in the decisions register. BUILDS IN FLIGHT (two Opus
agents, disjoint lanes): C3-B owns ProUpgradeScreen / PaywallScreen
deletion / RootNavigator / tier-screens-mount + paywall test
re-anchors; C5-A owns CascadeGateScreen + cascadeGateRecap guard test.
RECOVERY PATH if a session dies mid-build: `git status` the working
tree; lead-review any uncommitted diff against D71/D72 and the briefs
embedded in this entry's two docs; relaunch the affected agent with
the same brief rather than hand-finishing. Lead-held uncommitted
edits: DifferentialBadge.js + ProGate.js stale-comment fixes and this
board/register update (commit with the C3 landing). PARKED for usage
evidence: C4, C6, C9 (behind C8), C10; win-back wording stays
founder-gated.

## 0. FOUNDER MUST-FIX LIST (device-testing session, 2026-07-11) — SUPERSEDED BY R-CAMPAIGN

_The founder's numbered hands-on list, given at session start. Its "done"
claims FAILED the founder's device walk; every surviving defect is now an
R-item above. Kept for traceability only._

1. **Revert the new font.** DONE — Manrope backed out (`52e65dd`, `a6083f7`,
   `b2be386`), font is Inter again; D53 recorded (`36fc5d2`).
2. **Fix the unilateral workout flow** (no divergent per-side reps; one set,
   same reps both sides, guided side 1 -> transition -> side 2). DONE
   (`f94d156`, D54).
3. **Simplify routine headings on Today and Train** (name only; drop the
   days-per-week + date cram). NOT DONE — was deferred to "need a screenshot".
   Real live cause found: training frequency ("N x/Week") is baked into the
   plan NAME, so it read as name+frequency crammed. DONE (`e7a84f8`):
   display-only planHeadingName() strips the "N x/Week" suffix at the Today
   and Train heading sites; raw plan.name untouched everywhere else.
4. **Fix the empty third card on Progress** (Sessions + New Bests in a 3-slot
   layout, blank third). NEEDS VERIFY — a read found AnalyticsScreen's spark row
   already two-up flex (flex:1, no third slot); confirm there is no OTHER
   progress surface with the gap. VERIFIED (`e7a84f8` report): AnalyticsScreen
   spark row is already two-up flex with no third slot, no other progress
   surface has the gap - already correct in source, shows fixed on a fresh
   build.
5. **Clean up the Coach screen.** PARTIAL. DONE (`f822a91`): removed the
   "private coaching based on your logs" footer, consolidated the check-in
   info onto the check-in row, fixed the "come back Sunday" vs dated-button
   mismatch (weekday-anchor bug). OUTSTANDING: the card/heading showing only
   "Your" (should be "Your week"). VERIFIED already correct in source: the
   NavRow renders "Your week" in full with no numberOfLines/width clip;
   "This week" heading fits its content - resolves on a fresh build. The
   footer/consolidation/date-fix half remains landed at `f822a91`.
6. **Pre/Post-workout meals.** Founder ruling: fully implement (off by default,
   populated + macro-redistributed when on) OR remove — not half-built.
   PHASE 1 DONE (`b53a817`): off by default, hidden when off. PHASE 2 DONE
   (`04f033d`): when enabled and empty, the Diary offers a curated-meal
   suggestion scored against the day's REMAINING macros (reuses the existing
   mealSuggest ranking), so the day stays within tolerance, not piled on top;
   evidence-based pre/post pool already present; no engine touch. FULLY DONE.
7. **Add a completion action to Dietary Needs** (Done/Save/Close). DONE
   (`2d17fff`, "Done" button).
8. **Fix the Dietary Needs reopen bug** (open/close/reopen dead). DONE
   (`2d17fff`, shared BottomSheet re-present race fix).
9. **Fix Body Metrics weight history** (only current shown, no history). DONE
   (`94cd1fe`): history now merges the morning_weights table too, not just
   body_metric_log.

**ALL NINE COMPLETE.** #1,2,3,6,7,8,9 landed; #4 and #5 verified correct in
source (confirm on a fresh build - gated on the EAS build fix). List done;
queue paused here for the founder review per D55.

---

## 1. IN FLIGHT

_Reconciled 2026-07-11 (D46 boundary): D42 AppAlert, logged-set row, D44
auto-advance cues, summary footer, picker first-open, CP-10 batch F and the
leg-day engine work (D45 + D46) all LANDED - detail rolled to
`_HANDOVER-ARCHIVE.md` TASKBOARD HISTORY per D41._

### D43 logger redesign blueprint - APPROVED + IN BUILD (D49/D57) (2026-07-11)
- Research complete (Opus teardown: full ActiveWorkoutScreen read, all
  pinned tests mapped, Hevy corpus synthesised - report in session
  log). Blueprint authored by the lead:
  `docs/ux-world-class-audit-2026-07-09/D43-LOGGER-REDESIGN-BLUEPRINT.md`
  - the 3/10 is presentation/IA/cohesion, not capability; strong core
  preserved behind a new shell; 5 staged slots (S1 decomposition -> S2
  Now card + status strip -> S3 stable CTA + overflow diet -> S4
  in-place edit + plate readout -> S5 cohesion polish). RPE stays out
  per D14/D19 held list. S4 = in-place edit ONLY (plate readout DROPPED,
  D57).
  - S1 slice 1 LANDED (`31b14a7`): LoggedSetRow + EmptyExerciseView
    extracted, guards re-pinned, suite green.
  - S2 LANDED (`ca9bb87`): "N notes" accordion -> StatusStrip
    (content-labelled chips); Now card onto house Card (radius lg/16);
    orientation+target folded to one Line 1; note-pencil corner
    affordance; chrome above inputs 8 -> 2 lines. Beat line KEPT as a
    compact row (ruling D58 - carries the cue/range/deload variants that
    input placeholders can't; SetEntry contract untouched; founder
    device-walk taste veto at S5). eslint clean; 15 suites / 126 tests
    green.
  - S3 LANDED (`567c073`): stable dual CTA (Log set stays put; Next
    exercise / Finish workout appears BESIDE it at target, no
    same-pixel swap; promoted "Log another set" retired). Overflow
    trimmed 11 -> 7: Move up/down deleted (Reorder sheet is the one
    path; dead handlers removed), note row -> S2 card pencil, Exercise
    info -> tap the exercise title. Guided warm-up ramp KEPT its row
    (ruling D59 - the set-type picker can't reproduce the computed
    ramp; warm-up-as-a-type is still in the picker). 3 guard suites
    re-anchored, no pin removed. Lead-verified green: 15 suites / 124
    + full src/screens 132 / 1013.
  - S4 LANDED (`335ad64`): edit a logged set IN PLACE - tapping a row
    (or Edit from its menu) expands it into an inline SetEntry editor
    with Save/Cancel, the edit modal removed; one editing slot so a
    second row collapses the first. Save/Delete reuse the existing
    handlers unchanged, so the PR-re-eval-on-edit/delete contract holds
    (prReEval.guard passes unmodified); SetEntry untouched; plate stays
    dropped (D57). Lead-verified green: 15 / 125 + full src/screens
    132 / 1014.
  - S5 BUILT (`bf72c51` token polish + `4e02f9b` house numeral role on
    the logged numerals): the surface was already largely tokenised by
    S1-S4 (no hard-coded colours, haptics on the shared vocabulary), so
    S5 was small. Three flagged design calls ruled in D60: logged-row
    radius KEEP dense (data receipt, not cards), beat-line line-height
    KEEP tight, type.num() APPLIED to the logged numerals. Lead-verified
    green throughout.
  - S5 REVIEW DONE (`49d56db` + `b7b6761`): the mandated Opus fresh-eyes
    adversarial review of the full S1-S5 arc returned NO blocker/high and
    cleared it as safe for the device walk. Four minor findings triaged
    (D61): L2 stale comment + N1 per-keystroke re-render FIXED; L1 (invalid
    past-target tap flipped the CTA mode early) FIXED per founder GO (arm
    moved into handleCompleteSet's success path); M1 (inline-editor keyboard
    occlusion on small Android) -> device-walk verify item below. Full
    suite green: 689 suites / 8513 tests.
  - **D43 LOGGER REDESIGN IS CODE-COMPLETE.** Only two things remain, both
    the FOUNDER's: (1) the 10/10 device walk (blueprint Section 9), and
    (2) migrations when ready.
    DEVICE-WALK ITEMS (blueprint Section 9 + review):
    - Section 9 steps 1-10 (the 10/10 walk).
    - M1 verify: edit the LAST logged set in a long session on a small
      Android phone -> confirm the inline Save button is not hidden behind
      the keyboard.
    - Taste-veto decisions open to the founder: D58 (beat line kept as a
      compact row, not dissolved into input placeholders), D59 (guided
      warm-up ramp kept its overflow row), D60 calls 1-2 (logged rows kept
      dense; beat-line line-height kept tight).

### LANDED - CP-10 theming batch G, BOTH LANES (2026-07-11)
- Lane 2 (20 plain screens) `3adf551`; lane 1 (15 high-risk screens;
  SettingsDietary already live) `4947509`. Billing/consent/ED bounds
  held byte-identical, verified at lead review; guard suites
  re-anchored contracts-unchanged; batch flip-tests added; full suite
  685 suites / 8,480 tests green at the lane 1 boundary. Screen
  coverage now ~83/84 live (remaining static count to be re-verified
  at the next recon; stage-5 restart-prompt retirement unlocks at
  zero).
  Stage 5 landed `3d3eae8` (restart prompt retired - CP-10 COMPLETE).
  Manrope adopted `9148a6f` (D50 landed; Inter files removed).

### HELD (D57) - D43 full-app pristine pass (founder, second amendment)
- CLOSING PHASE by founder order: every area polished to the
  pristine/world-class bar, cohesive (one-amalgamated-application
  mandate), using the SCORECARD-2026-07-10 rubric as the baseline
  instrument. Runs AFTER the defect fixes, the engine verdict, the
  remaining theming batches and the logger redesign, so it polishes
  finished surfaces. Lead-driven; founder holds taste vetoes.
- On hold per founder 2026-07-11 (rework risk vs work already done).

### PRODUCTION CRASH TRIAGE - Sentry TypeError (2026-07-11, gated on connector)
- Sentry alert (email screenshot): TypeError "undefined is not a
  function", production, 02:14:15 UTC 2026-07-11, event
  a82ce651514f4a9085a0e3540b6e17bf, during the founder's live session
  on build 2608. Minified Hermes stack; lead symbolication from the
  run-2608 APK bundle narrowed the offset to RN's
  RefreshControl/ScrollView bytecode region BUT Hermes dedupes
  identical function bodies, so the offset is not uniquely
  attributable. NEXT STEP (blocked): founder enables the Sentry
  connector for this chat (connected at org level, enabledInChat
  false) -> pull the event's remaining 13 frames + breadcrumbs ->
  attribute and fix. CI note: android build workflow archives no
  sourcemap - queue a workflow tweak to save the Hermes map artefact
  so future crashes symbolicate exactly.

### OPEN - EAS (APK) build failing after native changes (founder report) PAUSED by founder 2026-07-11, revisit later.
- Founder reports the EAS build FAILING after item 14/15 native changes
  (keyboard-controller/zeego, expo-splash-screen, monochrome icon). CI
  Android build is GREEN (run 2611), so the break is EAS-specific.
  NARROWED (2026-07-11): `npx expo prebuild --platform android` runs
  CLEAN on this branch locally, so it is NOT a config-plugin/prebuild
  failure (the haptic-feedback class) - the break is downstream in the
  EAS Gradle/native compile stage or EAS environment. STILL BLOCKED on
  founder: share the EAS build logs (or grant EAS access); then
  diagnose + fix.

### LANDED - SD-11 applyRemoteSetEvent idempotency `7e0dabe` (2026-07-11)
- The await-spanning race fixed hands-on: eventId reserved
  synchronously before the DB await, released on failure so retries
  stay possible. Two new tests pin the mid-await race and the
  failure-release path. Store suites + lint green.

## 2. QUEUED (build slots - two agents at a time, lowest capable tier)

### CP-10 screen theming - remaining batches (F onward)
- **Source:** `CP-10-restart-free-theming-plan.md`; D16, D24, D29; handover THEMING COVERAGE TRACKER.
- **CURRENT STATE:** components 105/110 live; screens 37/85 live at batch E close (48 static remain); the stage-5 honesty gate (retiring the restart prompt) stays blocked until a toggle's full dependency set is live.
- **END STATE:** every screen live-themed, stage-5 cleared so restart-free theming ships fully with no stale surfaces.
- **ELEVATES BECAUSE:** the theme toggle becomes genuinely live and complete - no static islands, no restart, honest stage-5 retirement.
- **Bounds:** batch pattern as D/E; ProGate/tier logic untouched; frozen static stylesheets stay byte-identical unless converted.

### QUEUED - DECISION ROUNDS (await founder input or assets; do NOT build until resolved)
_These are open decision forks, not dispatchable builds. Their elevation is
conditional on the decision; recorded here so they are visible, not lost._

- **Watch-app scoping round.** Source: D27 (watch app SCOPING approved); `docs/ux-world-class-audit-2026-07-09/watch-app-scoping-memo.md` (5 founder questions at the end, unanswered); handover AWAITING FOUNDER. CURRENT STATE: no watch app exists; HealthKit is removed; the scoping memo is written with 5 questions open, plus a side-finding (SD-11 idempotency defect in `applyRemoteSetEvent`) flagged must-fix-before-wrist-traffic. DECISION NEEDED: founder answers the 5 questions before any build brief. ELEVATION: deferred - cannot be claimed until the scope is set. PAUSED by founder 2026-07-11.
- **Brand font - REVERTED to Inter on founder verdict (Manrope backed out); D50 closed.**

---

## 3. FOUNDER-SIDE OPS (not agent work - only the founder can do these)

- **iOS Live Activity provisioning.** App Groups provisioning on BOTH App IDs (`app.volyume` + `app.volyume.widget`, then EAS credentials re-sync) + fresh EAS build. The Live Activity is ALREADY fully wired in code (item 19, `60190a7` docs-only fix). Source: D27; handover item 19.
- **Fresh EAS build (device-walk gate).** Required before device-walking this branch: native modules/code landed this campaign (keyboard-controller + zeego + peers, expo-splash-screen, themed monochrome icon, D34 Kotlin rest-timer bridge, react-native-haptic-feedback). CI Android build is GREEN (run 2611, `3daa3ae`) but a signed EAS build must still be produced. Source: handover FOUNDER-SIDE ACTIONS.
- **Play OAuth SHA-1 confirm.** Source: CLAUDE.md status banner; handover.
- **Run `refresh-off-snapshot.yml`.** Lands OFF branded micronutrient data into the bundled snapshot (the operational remainder of item 16). Source: D26/D37; handover.
- **migrate_117 apply.** Telemetry-view REVOKE (drafted + committed `653fe32`); needs the exact phrase "run against production", then re-verify grants and update the file header + `supabase/README`. Source: handover AWAITING FOUNDER; CLAUDE.md supabase rules.
- **Device-walk backlog.** The fresh EAS build carries a large walk backlog: item 6 (max system font), item 13 (photo gallery), item 14 (keyboard/zeego + set-row menu), item 20 (drag reorder), weigh-in edit/delete, dietary needs, vitamins/micros, haptics, next-exercise reorder, bottom sheets, Help/FAQ, live theming, and VERIFY the timeline diary reverted to meal cards. Full step-by-step checklists are in the handover (and its archive) per item. Source: handover FOUNDER-SIDE ACTIONS + per-item checklists.

---

## 4. HELD / NEVER RE-PROPOSE (visible in one place - do NOT build or re-surface)

- **Exercise media programme (#18)** - HELD, founder not funding it now (D14 assessment; D29 STILL HELD). Do not re-propose.
- **Rest-day notification (#22)** - HELD (D17 FQ-1 option 3; D29 STILL HELD). Recorded gated copy/trigger for if it ever unblocks; do not build.
- **Plate calculator** - REJECTED, moot for UK users (D14 assessment). Do not re-propose.
- **Paywall social proof (review excerpts)** - NO, stays dark (D14 assessment). Do not re-propose.
- **RPE/RIR reinstatement** - settled-removed; the effort picker stays out (D14; D19 addendum re-affirmed). Do not re-surface.
- **Flat timeline food diary** - built and REVERTED on the founder's device verdict; meal cards are canonical. NEVER re-propose (D37 item 15).
- **Supabase migrations 049 / 059** - HELD (CLAUDE.md status; `supabase/README`). Do not apply.
- **AI-assisted food input (photo meal-scan / voice)** - HELD by founder order, not rejected and not approved; do not build or re-propose unprompted (D27 addendum). (The coaching engine's no-AI rule is separate and absolute.)

---

## 5. NEEDS JUSTIFICATION - do not dispatch (D38: missing a verifiable field)

### Kala namak micro-call - RESOLVED (D52, 2026-07-11)
- Ruled KEEP with a sourcing note on the tip copy; detail in the
  decisions register. No open items remain in this section.

---

## Appendix - folded-in / reference-only sources (not build queues)

- Landed-item history: `docs/ux-world-class-audit-2026-07-09/_HANDOVER-ARCHIVE.md`
  (TASKBOARD HISTORY section) + the handover stage log.
- `docs/exercise-planning-2026-07-09/` (plans A-G): all SHIPPED; retained as
  design reference only. Do not rebuild. Residual engine changes go through the
  register + D37/D38 triage.
- `docs/design-usability-audit-2026-07-09/`: D7 programme complete; only
  `coverage-00-SYNTHESIS.md` survives as a cited reference. Residual IDs are
  tracked in the live campaign, not re-mined from that folder.
