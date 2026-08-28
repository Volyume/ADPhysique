# S2 T1 — generation-half trace (columns A/B/C/G/H), banked 2026-08-28

Opus trace agent report, banked verbatim in substance (matrix + findings +
closures + unverified). Evidence basis: tree at CC33 open. The lead
synthesis in FINDINGS.md judges these; this file is the evidence record.

## Findings index (27)

S1 (not honoured):
- T1-01 resolveEffectiveTargets (capability/resolve.js:364-374) has ZERO
  production consumers; enforceWeeklyFloorsAndCaps takes equipment only
  (planEngine.js:365); generateInitialPlannedVolume capability-blind
  (database.js:5350-5400). The §15 honest under-delivery line: grep 0.
  Constrained blocks are seeded volume targets their pool cannot deliver.
- T1-02 Raw library into engine on 2 of 6 paths: VolumeHeatmapScreen.js:156
  -> computeDivisionDiff(:188) and RoutineDetailScreen.js:202 -> :225/:228
  (divisionDiff.js:88-94,190-197). divisionCoverageLine blames EQUIPMENT
  for gaps capability may cause (divisionDiff.js:180-186).
- T1-03 BASELINE rules: NO existing-plan handling anywhere. effective.js:33
  filters role==='episode'; sessionEffective.js:86-88 requires episode+
  applied; HowYouTrainScreen.js:317 gates diff on isEpisode. Permanent
  restriction + installed plan => excluded exercise still served, zero
  marker, until a rebuild happens for other reasons.
- T1-07 Receipt/commit contradiction: planAutoGen.js:439-482 ->
  programmeEpoch.js:281 KEEP/CAPABILITY_HOLD outranks equipmentLost ->
  continuity.js:230-258 RETAINED -> planAutoGen.js:643-651 pushes same
  exercise to blockedSlots instead of writing it. PlanUpdateScreen renders
  BOTH: ":456-465 kept as it is" AND ":540-542 no match". User told kept;
  slot saved empty.
- T1-11 Repeat / no-change Adjust reactivate existing routine_exercises rows
  verbatim (PlansScreen.js:516,645-648,667-673) — no capability read; a
  mid-block episode survives the boundary unfiltered.
- T1-27 Custom exercises (NULL demands by design) under any episode ->
  unknown-conflict -> T1-07 chain: dropped from rebuild, receipt says kept.

S2 (inconsistently honoured):
- T1-04 Clinician rules refuse inline override at picker/install
  (ExercisePickerModal.js:391-413, ExerciseConflictSheet.js:158-180) but the
  §14 diff decline overrides them silently (no source check:
  HowYouTrainScreen.js:337-378, effective.js:80-88, database.js:11710-11712).
- T1-05 Flare "Start this again" (HowYouTrainScreen.js:505-545) never calls
  proposeEffectiveDiff.
- T1-06 Synced-in rules (sync/tables/capabilityConstraints.js:85-116 ->
  database.js:11682-11705) never propose; device B serves conflicted
  exercise with only the mid-workout marker.
- T1-09 Opposite failure postures: planAutoGen.js:455-470 fail-safe
  (UNKNOWN IS NOT NONE, logged) vs blockAdvisor.js:515-520 fail-open,
  silent, same field.
- T1-10 Block-boundary review never asks the senior question
  (blockAdvisor.js:523 id-level intent only); reviewed verdict WINS over
  slot verdict (continuity.js:205-206); can output "Nothing about this has
  stopped working, so it stays" for a movement the user cannot do.
- T1-21 CAP-17 pre-flight missing on: FreeStarterScreen (silent
  setCapability(null) at :91), BuildWorkoutScreen.js:203-212 travel mode,
  PlanUpdateScreen dry-run preview (:165-221; only commit guarded :237).
- T1-22 Free starter falls back to the UNFILTERED recommendation on read
  failure and skips the conflict dialog (:91,115-134,207).

S3 (stored but invisible):
- T1-12 blockedSlots/capability counts/near-misses consumed ONLY by
  PlanUpdateScreen (+planDiff.js). Discarded at ProOnboarding (:1518-1546),
  ProGoalSetup (:470-482), Home (:2294-2301), PlansScreen (:623-641,
  :1212-1216, and next-block review :553-575). Five of six generation
  entries show nothing.
- T1-14 Home's "Training leaves {subject} out" line suppressed in the
  ordinary state (homeCoachBrief.js:92-96 wraps default headline;
  HomeScreen.js:1739 drops that headline; :1694 preconditions).
- T1-15 §22 AWAITING prompt absent from Today (screens grep: only
  HowYouTrain + WeeklyCheckIn).
- T1-17 Today's session card counts BASE rows (HomeScreen.js:2152-2154,
  database.js:4639-4643 raw COUNT) while the logger serves fewer.
- T1-18 applyEffectiveViewToSession has exactly ONE call site
  (ActiveWorkoutScreen.js:692); plan/routine/manual/build screens render
  the base document.
- T1-23 Travel mode silently drops filtered slots (BuildWorkoutScreen.js:
  224-226,242).
- T1-25 Reintroduction ramp inert in the normal case (reintroduction.js:81
  early-return vs template-equal planned volume, since nothing ever wrote a
  reduced target — T1-01); §23's visible half (copy + rebuild) never fires.

S4 (visible but unexplained):
- T1-13 Total capability block surfaces as engine failure
  ('plan_blocked_by_exclusions' -> ProOnboardingScreen.js:1527-1541 "plan
  did not generate... retry" loop).
- T1-16 buildWhyThis (planEngine.js:2693-2790) has NO capability key; the
  removed "safe to perform" line was never replaced (recorded at
  :2759-2763). The plan never explains the restriction that shaped it.
- T1-24 Side-carving never named outside the logger (isSideCarvedAvailable
  sole caller ActiveWorkoutScreen.js:772); one-arm users seeded
  bilateral-capable movements with no note; §16 explanations absent at A/C.

S5 (incoherent):
- T1-08 Baseline capability exclusions reported as PREFERENCE:
  planRationale.js:87-88 "You asked not to be suggested this." for a rule
  meaning "I cannot do this".
- T1-19 Preference-lane footnote on capability rows in ExerciseConflictSheet
  (:196-200 "until you allow it again"); row caption ":71 Outside how you
  train" names no rule.
- T1-20 The two lanes never cross-reference (§12 requirement): zero
  mentions either direction (AvoidedMovementsScreen / HowYouTrainScreen).
- T1-26 Clinician flag: distinct at C/install, invisible at A/G/H,
  WEAKEST at B (T1-04) — the strongest restriction reads ordinary and is
  most overridable.

## Closed (verified, no finding)
- Six generation paths enumerated; 4 filtered, 2 raw (=T1-02).
- UNKNOWN axis fail-closed consistently at generation/picker/install.
- Family-plan/free-starter compatibility computed LIVE (drift closed);
  the read-failure hole is T1-22.
- Equipment x capability compose on every recompute path enumerated.
- AWAITING fail-safe holds at the loader (database.js:11491-11501,
  model.js:162-170) — inherited by all six consumer classes, cited.
- Learning shield fires (blockLedgerRunner.js:326-335,420 -> :122,:839,
  :937; restamp :652-694 at :794,:869).
- Picker hosts all inherit the filter (userId resolved internally, :152).

## Unverified (exact blocking questions)
1. Does any component read @volyume_plan_whythis_* and merge blocked-slot
   counts into the Pro onboarding reveal?
2. Mid-block episode end (week 3 of 6): is planned_sets for the released
   muscle strictly below block peak (would make T1-25 non-inert there)?
3. Does planEngine's divisionCoverage distinguish "absent from supplied
   library" from "absent for equipment"?
