# PASS-4 IMPLEMENTATION BLUEPRINTS — WORKOUT & RECAP CLUSTER

Scope: the five founder-APPROVED items from `pass3-v2-founder-decisions.md` covering the
workout-screen (WS), builder (BD) and recap (RP) domains. Source decisions:
`pass3-v2-founder-decisions.md:64-66` (mid-session swap), `:46-48` (recap share/monthly/relative),
`:170` (keyboard-completes-the-set). Blueprint format per `_AUDIT-SPEC.md:252-271`.

> **STANDING VOICE CONSTRAINT (applies to every item below):** all new user-facing strings must
> pass the honesty test, lead numbers-before-narrative, mirror-not-infer, carry NO em/en dashes,
> use British English, and avoid the banned phrases (`COACHING_VOICE_SYNTHESIS_LOCKED.md:557-577`
> failure-mode catalogue; recap "relative framing" → factual, never hype/"crush",
> `pass3-v2-founder-decisions.md:92-93`). Deterministic only, no LLM. No file in
> `src/coaching/safety` is touched by any item here.

> **MAJOR PROVENANCE FINDING — three of the five items are LARGELY ALREADY BUILT.** Items 3, 4 and 5
> (recap share-wiring, monthly cadence, relative framing) were already implemented under the prior
> locked work item **COMP-005**, read-confirmed across `YearOfLiftsScreen.js`, `AnalyticsScreen.js`,
> `BlockReflectionScreen.js`, `ShareCardScreen.js`, `database.js` and `notifications/scheduler.js`.
> Per the CLAUDE.md honesty rule (never present guessed/redundant work as new), each of those three
> blueprints below documents the EXISTING implementation by file:line and scopes only the genuine
> residual delta (or records "no build needed"). This finding matches the Pass-3 RP row's own
> correction: "annual-only + no export were my brief under-describing us"
> [P3:pass3-comparison-matrix.md:447].

---

## ULTIMATE-WR-1 — KEYBOARD-COMPLETES-THE-SET

**ID:** ULTIMATE-WR-1
**CLUSTER:** Workout-screen (WS)
**TITLE:** Reps "Done" key logs the set directly (one fewer tap)
**PRIORITY TIER:** Tier-2 (UX friction, no safety/billing surface)
**IMPACT:** Medium — removes one tap per set across the single most-repeated action in the app.
**EFFORT:** Low — one prop added to one component, wired to an existing handler.
**PRIORITY SCORE:** Medium impact / Low effort → high-leverage quick win.

### CURRENT STATE [P1]
- The reps `TextInput` in `SetEntry` has `returnKeyType="done"` and
  `onSubmitEditing={() => Keyboard.dismiss()}` — pressing the keyboard's Done key only dismisses
  the keyboard [P1:src/components/SetEntry.js:124-126].
- `SetEntry` is a controlled presentational component: its only outward prop is `onChange`; it has
  no callback to ask the parent to log the set [P1:src/components/SetEntry.js:9,:31-33].
- The actual "log this set" work lives in the parent screen's `handleCompleteSet(overrides = {})`
  [P1:src/screens/ActiveWorkoutScreen.js:738], reached today only by tapping the Complete-set
  button [P1:src/screens/ActiveWorkoutScreen.js:1865-1872].
- `SetEntry` is rendered once in the active-workout card with `value`/`onChange`/`units`/`isWarmup`
  props [P1:src/screens/ActiveWorkoutScreen.js:1755-1763].
- The weight field already chains forward: its `onSubmitEditing` focuses the reps field
  [P1:src/components/SetEntry.js:78], so reps is the last field in the entry sequence and is the
  correct place to complete.

### THE GAP [P3]
WS lags the fast loggers (Strong) on keyboard-completion: "reps field 'Done' dismisses then a
separate Log tap (`SetEntry.js:126`) vs Strong's keyboard-complete"
[P3:pass3-comparison-matrix.md:26]. The benchmark itself (exact taps-per-set / keyboard behaviour
for Strong/Hevy) is a NOT-FOUND micro-UX cell — only Gemini-simulated plus one reddit quote
[P3:pass3-comparison-matrix.md:33, :263]; the GAP being fixed is our own extra tap, which is
read-confirmed, not the unsourced competitor number.

### THE EVIDENCE [P2]
- Founder ACCEPTED for build: "Keyboard-completes-the-set (WS) — reps 'done' logs the set directly
  (one fewer tap; `SetEntry.js:126`)" [P2:pass3-v2-founder-decisions.md:170, status ACCEPTED].
- Best reference: Strong's keyboard-complete behaviour (WS best-in-class fast loggers)
  [P2:pass3-comparison-matrix.md:12, status PARTIAL — competitor micro-UX, aggregator/simulated].

### NEWBIE EXPERIENCE AFTER CHANGE
A beginner typing reps on the number pad presses Done and the set is logged immediately, the same
way it works when they tap the on-screen button. They never have to learn that Done and Complete
are two different actions. If they leave reps blank, the existing validation still blocks and
explains ("Enter reps", `ActiveWorkoutScreen.js:752`).

### ATHLETE EXPERIENCE AFTER CHANGE
A lifter mid-set with one hand free types the rep count and hits Done to log without reaching for
the Complete-set button. The ± steppers and the button remain for tap-only logging, so the
existing tap-don't-type flow [P3:pass3-comparison-matrix.md:24] is unchanged.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE [P1]**
- `src/components/SetEntry.js:9` — add an optional `onSubmitComplete` prop to the signature
  [P1:src/components/SetEntry.js:9].
- `src/components/SetEntry.js:126` — change the reps `onSubmitEditing` to call `onSubmitComplete`
  (falling back to `Keyboard.dismiss()` when the prop is absent so other call sites are unaffected)
  [P1:src/components/SetEntry.js:124-126].
- `src/screens/ActiveWorkoutScreen.js:1755-1763` — pass `onSubmitComplete` to the `<SetEntry>`
  instance, wired to the SAME guarded onPress the Complete-set button uses
  [P1:src/screens/ActiveWorkoutScreen.js:1868-1872] (so cluster set-types start a cluster and
  unilateral/normal sets call `handleCompleteSet()`), not directly to `handleCompleteSet`, to keep
  cluster/unilateral behaviour identical.

**DATA**
- None. No schema, table or column change. No NEW data.

**COMPONENT STRUCTURE**
- Parent: `ActiveWorkoutScreen` imports and renders `SetEntry`
  [P1:src/screens/ActiveWorkoutScreen.js:1755]. The new prop is a callback only; no new component.

**USER FLOW [sequence]**
1. User focuses reps (either by tapping it or via the weight field's `next` chain
   [P1:src/components/SetEntry.js:77-78]).
2. User types a rep count; `onChangeText` clamps to [1,200] and writes state
   [P1:src/components/SetEntry.js:119-123].
3. User presses the keyboard Done key.
4. `onSubmitEditing` fires `onSubmitComplete()`.
5. The parent runs the existing guarded completion: if the set-type is a cluster and not unilateral
   it starts a cluster, otherwise it calls `handleCompleteSet()`
   [P1:src/screens/ActiveWorkoutScreen.js:1868-1872].
6. `handleCompleteSet` validates reps/weight, writes the set via `createWorkoutSet`, fires the
   set-logged haptic and resets `currentSet`
   [P1:src/screens/ActiveWorkoutScreen.js:748-768,:770-797,:567].

**ENTITLEMENT GATING [FREE/PRO]**
- FREE. Workout logging is a Free feature per `CLAUDE.md` FREE list ("workout logging"). No gate
  function is involved; this is inside the always-available active-workout flow.
  NEEDS ANSWER [NA-wr-1]: confirm no Pro guard wraps the active-workout / SetEntry path (i.e. that
  set logging is reachable without a Pro entitlement check). | files-to-check:
  `src/navigation/RootNavigator.js` (ActiveWorkout route registration + any `withProGuard`),
  `src/screens/ActiveWorkoutScreen.js` (any tier/entitlement guard near mount).

**EMPTY STATE [British copy]**
- Not applicable: the SetEntry card is only shown inside an active workout that already has an
  exercise loaded. Blank reps is an error state, not an empty state (see ERROR STATE).

**LOADED STATE**
- Reps field populated; pressing Done logs the set and the card resets to the next set's prefilled
  values via the existing prefill path [P1:src/screens/ActiveWorkoutScreen.js:643-658].

**ERROR STATE**
- Blank or non-numeric reps: the existing guard alerts "Enter reps" / "Please enter the number of
  reps completed." and does not log [P1:src/screens/ActiveWorkoutScreen.js:751-754]. No new copy.
- Missing weight on a non-bodyweight movement: existing guard "Enter weight" alert blocks logging
  [P1:src/screens/ActiveWorkoutScreen.js:763-768]. No new copy.

**EDGE CASES**
- Cluster set-types (myo-reps / rest-pause): Done must NOT short-circuit the cluster. Wiring
  `onSubmitComplete` to the button's guarded onPress preserves "start cluster" behaviour
  [P1:src/screens/ActiveWorkoutScreen.js:1870, :1781-1825]. [INFERENCE from the button's own guard.]
- Warm-up set-type: completes as a warm-up exactly as the button does
  [P1:src/screens/ActiveWorkoutScreen.js:778-781]. No special handling.
- `saving` in-flight: the button is disabled while `saving`
  [P1:src/screens/ActiveWorkoutScreen.js:1867,:1873]; the Done path should respect the same
  `saving` guard so a double Done cannot double-log. [INFERENCE — re-use the button's disabled
  condition.]
- Other `SetEntry` consumers: the prop is optional and falls back to `Keyboard.dismiss()`, so any
  other render site keeps today's behaviour.
  NEEDS ANSWER [NA-wr-2]: enumerate all `<SetEntry>` render sites to confirm none breaks when the
  prop is absent. | files-to-check: repository-wide search for `<SetEntry` / `SetEntry(`.

**DUAL-AUDIENCE DESIGN**
- Beginners get a single consistent "I'm done with this set" gesture (Done key == Complete button);
  athletes get the keyboard-complete speed they expect. No register-specific copy; this is a
  behaviour change, not a copy change.

### VERIFICATION
- Reps onSubmitEditing dismisses only: CONFIRMED [P1:src/components/SetEntry.js:124-126].
- SetEntry has only `onChange` outward: CONFIRMED [P1:src/components/SetEntry.js:9,:31-33].
- `handleCompleteSet` is the completion handler: CONFIRMED
  [P1:src/screens/ActiveWorkoutScreen.js:738].
- Button uses a guarded onPress (cluster/unilateral): CONFIRMED
  [P1:src/screens/ActiveWorkoutScreen.js:1868-1872].
- SetEntry render site + props: CONFIRMED [P1:src/screens/ActiveWorkoutScreen.js:1755-1763].
- Founder ACCEPTED: CONFIRMED [P2:pass3-v2-founder-decisions.md:170].
- **OPEN NA-ids: NA-wr-1, NA-wr-2.** Not final until both answered.

---

## ULTIMATE-WR-2 — MID-SESSION EXERCISE SWAP (live session only, volume preserved)

**ID:** ULTIMATE-WR-2
**CLUSTER:** Builder (BD)
**TITLE:** Swap an occupied-machine exercise during an active workout without mutating the saved
routine, keeping volume tracking
**PRIORITY TIER:** Tier-2 (logging-flow UX; no safety/billing surface)
**IMPACT:** Medium-High — directly answers the "occupied machine" real-gym problem.
**EFFORT:** Medium — the swap mechanism EXISTS; the delta is volume-continuity + voice copy.
**PRIORITY SCORE:** Medium-High impact / Medium effort.

### CURRENT STATE [P1]
- A mid-session swap already exists. `handleOpenSwap` ranks alternatives with the existing
  deterministic `rankSwaps` engine and opens a swap modal
  [P1:src/screens/ActiveWorkoutScreen.js:319-325].
- `rankSwaps` is a pure, no-side-effect, no-DB scorer (same-muscle / same-subregion / pattern /
  equipment / fatigue / SFR) [P1:src/lib/swapEngine.js:1-7,:191-233]. (Note: a parallel
  `suggestSubstitutions` scorer also exists at [P1:src/lib/algorithms.js:780-816]; the active
  screen uses `swapEngine.rankSwaps` [P1:src/screens/ActiveWorkoutScreen.js:27,:322].)
- The swap operates on the in-memory `workoutExercises` store array via `setWorkoutExercises`, NOT
  on the routine/template: `handleConfirmSwap` replaces `workoutExercises[currentExerciseIndex]`
  [P1:src/screens/ActiveWorkoutScreen.js:327-342].
- `setWorkoutExercises` is a Zustand store setter; every call site in this screen writes the live
  array only [P1:src/screens/ActiveWorkoutScreen.js:285,:307,:335,:1005,:1040,:1104-1105], and the
  routine is only READ (`activeWorkout.routineId`)
  [P1:src/screens/ActiveWorkoutScreen.js:403,:1231]. The saved routine is not written on swap.
- Assisted-regression filtering is gated by experience: `excludeAssisted: !isBeginner`
  [P1:src/screens/ActiveWorkoutScreen.js:322], where `isBeginner` reads
  `userProfile.experience === 'beginner'` [P1:src/screens/ActiveWorkoutScreen.js:135].
- ON SWAP, the new exercise is given `sets: []` and the screen clears `prevSets`, `allTimeSets`,
  `loggedSets`, and `sessionSetsRef` [P1:src/screens/ActiveWorkoutScreen.js:330-341]. Any sets
  already logged against the swapped-OUT exercise stay written to the DB (they were committed by
  `createWorkoutSet`, [P1:src/screens/ActiveWorkoutScreen.js:783]) but the in-session continuity
  (e.g. carrying the in-progress target / showing the swapped-out work in the running session
  count) is dropped for the new exercise.

### THE GAP [P3]
BD lags on "mid-session substitution without breaking the template (all-3)"
[P3:pass3-comparison-matrix.md:472] and the elevate note asks for "live biomechanical-equivalent
substitution keeping volume tracking" [P3:pass3-comparison-matrix.md:473]. The "don't break the
template" half is ALREADY met (swap is store-only, routine untouched — see CURRENT STATE). The
unmet half is the **"keeping volume tracking"** clause: the current confirm path zeroes the new
slot's sets and clears the session set buffers, so the swap does not explicitly preserve the volume
already accrued on that slot for the running session view. Avoid Strong's documented
"replace-erases-notes" failure [P3:pass3-comparison-matrix.md:475].

### THE EVIDENCE [P2]
- Founder ACCEPTED for build: "BD — Mid-session exercise substitution (swap occupied-machine
  exercise without breaking the template; keeps volume tracking)"
  [P2:pass3-v2-founder-decisions.md:64-66, status ACCEPTED].
- Best reference: Hevy "easy superset/reorder/swap" loved builder
  [P2:pass3-comparison-matrix.md:456-457, status VERIFIED — Claude, live-browsed]; cautionary:
  Strong "replace-erases-notes" [P2:pass3-comparison-matrix.md:475, status VERIFIED — Claude dated
  quotes].

### NEWBIE EXPERIENCE AFTER CHANGE
The machine they planned to use is taken. They tap swap, pick a suggested alternative for the same
muscle with a plain "Why this?" line [P1:src/lib/swapEngine.js:98-170], and carry on. The plan
they installed is untouched for next time; only today's session changed.

### ATHLETE EXPERIENCE AFTER CHANGE
A lifter swaps a busy hack-squat for a same-pattern alternative and the work they already did this
session still counts toward the running session volume/sets; the swap does not silently reset their
session tracking, and their saved block stays as built.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE [P1]**
- `src/screens/ActiveWorkoutScreen.js:327-342` — in `handleConfirmSwap`, preserve volume tracking:
  do NOT clear `sessionSetsRef`/session running totals for sets already committed this session
  (they remain valid logged sets); only the per-slot UI buffers (`prevSets`, `allTimeSets`,
  `loggedSets` for the NEW exercise) should reset to the new exercise's own history.
  NEEDS ANSWER [NA-wr-3]: what exactly does "keeps volume tracking" require here — (a) the
  swapped-out exercise's already-logged sets continue to count to the session summary/tonnage, OR
  (b) the new exercise inherits the planned target set count of the slot it replaced, OR both? The
  founder line says only "keeps volume tracking". | files-to-check:
  `src/screens/ActiveWorkoutScreen.js` (session summary build, `sessionSetsRef` usage,
  `handleFinishWorkout` / `WorkoutSummaryScreen` tonnage source), `src/lib/database.js`
  (`getRecapData`/session aggregation reads `workout_sets` regardless of exercise — confirms
  committed sets persist [P1:src/lib/database.js:4775-4783]).
- `src/screens/ActiveWorkoutScreen.js:319-325` — confirm swap candidate copy and modal copy pass
  the voice lint (no jargon, plain "Why this?"). The reason strings come from `buildSwapReason`
  [P1:src/lib/swapEngine.js:98-170].

**DATA**
- None NEW. Swap is in-memory (`workoutExercises` store)
  [P1:src/screens/ActiveWorkoutScreen.js:335]; logged sets already persist via the existing
  `workout_sets` writes [P1:src/screens/ActiveWorkoutScreen.js:783]. No routine/template write.

**COMPONENT STRUCTURE**
- Swap modal is driven from `ActiveWorkoutScreen` (`showSwapModal`, `swapCandidates` state,
  `handleOpenSwap`/`handleConfirmSwap`) [P1:src/screens/ActiveWorkoutScreen.js:319-342].
  NEEDS ANSWER [NA-wr-4]: identify the swap modal's actual component/JSX block and its candidate
  row rendering, to specify exact copy + "Why this?" placement. | files-to-check:
  `src/screens/ActiveWorkoutScreen.js` (search `showSwapModal` / `swapCandidates` JSX).

**USER FLOW [sequence]**
1. User taps swap on the current exercise → `handleOpenSwap`
   [P1:src/screens/ActiveWorkoutScreen.js:319].
2. `getAllExercises()` loads the library; `rankSwaps` excludes exercises already in the workout and
   (for non-beginners) assisted regressions; returns up to 8 ranked candidates
   [P1:src/screens/ActiveWorkoutScreen.js:320-322].
3. Modal shows candidates with `buildSwapReason` "Why this?" lines
   [P1:src/lib/swapEngine.js:98-170].
4. User picks one → `handleConfirmSwap(newExercise)` replaces the live slot via
   `setWorkoutExercises` [P1:src/screens/ActiveWorkoutScreen.js:327-335]; the saved routine is not
   written.
5. Per-slot UI buffers reset to the new exercise's own history; already-committed session sets
   remain counted (the volume-tracking delta, NA-wr-3).
6. User logs sets against the new exercise via the normal `handleCompleteSet` path
   [P1:src/screens/ActiveWorkoutScreen.js:738].

**ENTITLEMENT GATING [FREE/PRO]**
- FREE. Swap sits inside workout logging (a Free feature, `CLAUDE.md` FREE list). The deterministic
  swap engine is not a Pro coaching adjustment; it is exercise selection inside the live log.
  NEEDS ANSWER [NA-wr-5]: confirm the swap action carries no Pro gate today (it is reached from the
  free active-workout screen). | files-to-check: `src/screens/ActiveWorkoutScreen.js` (any
  entitlement check around `handleOpenSwap`), `src/navigation/RootNavigator.js`.

**EMPTY STATE [British copy]**
- If `rankSwaps` returns no candidates (e.g. a custom exercise with no muscle tags and no library
  matches): show "No close match in your exercise list. Pick any exercise to swap in." (factual,
  no hype). [INFERENCE — copy proposed to the voice rules; exact string subject to NA-wr-4 modal
  layout.]

**LOADED STATE**
- Ranked candidate list with one "Why this?" line each [P1:src/lib/swapEngine.js:98-170].

**ERROR STATE**
- `getAllExercises()` failure: keep the modal closed and leave the current exercise in place; show
  a factual toast (e.g. "Couldn't load alternatives, try again"). [INFERENCE — pattern mirrors the
  existing ShareCard error toasts at P1:src/screens/ShareCardScreen.js:895.]
  NEEDS ANSWER [NA-wr-6]: does `handleOpenSwap` currently guard a `getAllExercises()` rejection?
  | files-to-check: `src/screens/ActiveWorkoutScreen.js:319-325`.

**EDGE CASES**
- Swapping an exercise that already has logged sets this session: those sets stay in the DB
  [P1:src/screens/ActiveWorkoutScreen.js:783]; the volume-tracking requirement (NA-wr-3) governs
  whether they keep counting in the live session view.
- Beginner vs non-beginner candidate set: assisted regressions are hidden for non-beginners only
  [P1:src/screens/ActiveWorkoutScreen.js:322; P1:src/lib/swapEngine.js:204-207].
- Custom user-added exercise with no name/muscle: `rankSwaps` degrades gracefully (null subregion
  neither rewarded nor penalised; name defaults to '' for the tie-break)
  [P1:src/lib/swapEngine.js:43-52,:219-222].
- MUST NOT mutate the saved routine: enforced by writing only to `workoutExercises`
  [P1:src/screens/ActiveWorkoutScreen.js:335] (store-only; no routine write call exists in this
  screen) [P1:src/screens/ActiveWorkoutScreen.js:285,:307,:335,:1005,:1040,:1104]. Tests should
  assert the routine row is unchanged after a swap (invariant test).

**DUAL-AUDIENCE DESIGN**
- Beginners keep assisted-machine options and a plain reason line; non-beginners get loaded-only
  alternatives. Same one mechanism, experience-scaled candidate set
  [P1:src/screens/ActiveWorkoutScreen.js:322].

### VERIFICATION
- Swap mechanism EXISTS (open/confirm): CONFIRMED
  [P1:src/screens/ActiveWorkoutScreen.js:319-342].
- `rankSwaps` deterministic/no-DB: CONFIRMED [P1:src/lib/swapEngine.js:1-7,:191-233].
- Swap is store-only, routine not mutated: CONFIRMED (only `setWorkoutExercises` writes; routine
  read-only) [P1:src/screens/ActiveWorkoutScreen.js:327-342,:403,:1231].
- Confirm path clears session buffers today: CONFIRMED
  [P1:src/screens/ActiveWorkoutScreen.js:336-341].
- Experience gate for assisted: CONFIRMED [P1:src/screens/ActiveWorkoutScreen.js:135,:322].
- Founder ACCEPTED: CONFIRMED [P2:pass3-v2-founder-decisions.md:64-66].
- **OPEN NA-ids: NA-wr-3, NA-wr-4, NA-wr-5, NA-wr-6.** Not final until answered (NA-wr-3 is
  load-bearing: it defines what "keeps volume tracking" actually means and must NOT be guessed).

---

## ULTIMATE-WR-3 — RECAP: WIRE SHARE/EXPORT TO THE RECAP CARDS

**ID:** ULTIMATE-WR-3
**CLUSTER:** Recap (RP)
**TITLE:** Wire the existing ShareCard export to the Year-of-Lifts / block / monthly recap cards
**PRIORITY TIER:** Tier-3 (polish/retention; already substantially built)
**IMPACT:** Medium (retention) — but see provenance finding.
**EFFORT:** Very low — the wiring already exists; residual is verification only.
**PRIORITY SCORE:** Low remaining effort.

### CURRENT STATE [P1] — ALREADY BUILT (COMP-005)
- `YearOfLiftsScreen` has a share button in the story header that builds a `milestoneData` payload
  and navigates to `ShareCard` for ALL THREE variants (year / month / block) — factual training
  stats only, never bodyweight/measurements/notes
  [P1:src/screens/YearOfLiftsScreen.js:425-471,:489-499].
- `ShareCardScreen` already supports a `milestone` card type end to end: route param `milestoneData`
  [P1:src/screens/ShareCardScreen.js:763], the off-screen canvas `drawMilestone`
  [P1:src/screens/ShareCardScreen.js:603-705], PNG export via FileSystem + Sharing
  [P1:src/screens/ShareCardScreen.js:11-18,:903-926], and a one-page PDF export
  [P1:src/screens/ShareCardScreen.js:995-1015].
- `BlockReflectionScreen` already has a "play block story" entry to `RecapStory`
  [P1:src/screens/BlockReflectionScreen.js:98-107], and `WorkoutSummaryScreen` opens the block
  story too [P1:src/screens/WorkoutSummaryScreen.js:969,:1006].
- The milestone export is privacy-scoped: "Name, bodyweight, measurements and private notes are
  never included." [P1:src/screens/ShareCardScreen.js:1106-1108].

### THE GAP [P3]
Pass-3 RP "WHERE WE LAG" item (2): "shareable-image export not yet **wired to** the
Year-of-Lifts/block recap cards (the export mechanism exists for ShareCard)"
[P3:pass3-comparison-matrix.md:447]. **This gap is now CLOSED in code** (see CURRENT STATE); the
Pass-3 row predates COMP-005's wiring. The residual is verification, not a build.

### THE EVIDENCE [P2]
- Founder ACCEPTED: "RP — Wire existing ShareCard export to Year-of-Lifts/block recap cards"
  [P2:pass3-v2-founder-decisions.md:46, status ACCEPTED].
- Best reference: Spotify Wrapped share pattern; Strava Year in Sport; Boostcamp lifting Wrapped
  [P2:pass3-comparison-matrix.md:437-439, status VERIFIED — Claude; share-uplift stat PARTIAL,
  industry estimate].

### NEWBIE EXPERIENCE AFTER CHANGE
A new user who opens their first recap can tap share and post a clean, factual stat card without
exposing any personal data.

### ATHLETE EXPERIENCE AFTER CHANGE
A lifter shares a block or year card with sessions/volume/PR stats to social, image or PDF.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE [P1]**
- **None for the core wiring** — it exists end to end (CURRENT STATE). Only the following
  verification/clean-up may be in scope:
  NEEDS ANSWER [NA-wr-7]: is there any residual recap surface that still lacks a share entry (e.g.
  the scroll-based `BlockReflectionScreen` body, or a year entry point), given that the story view
  already shares? | files-to-check: `src/screens/YearOfLiftsScreen.js:489-499` (share button),
  `src/screens/BlockReflectionScreen.js:98-107` (only a "play story" button, no direct share),
  `src/screens/WorkoutSummaryScreen.js:969,:1006`.

**DATA**
- None NEW. `milestoneData` is assembled at navigation time from already-loaded recap aggregates
  [P1:src/screens/YearOfLiftsScreen.js:429-469].

**COMPONENT STRUCTURE**
- `YearOfLiftsScreen` (parent) → `navigation.navigate('ShareCard', { milestoneData })`
  [P1:src/screens/YearOfLiftsScreen.js:470]; `ShareCard` route registered
  [P1:src/navigation/RootNavigator.js:352-353]. CONFIRMED present.

**USER FLOW [sequence]**
1. User opens a recap story (year/month/block).
2. Taps the share icon in the pips row [P1:src/screens/YearOfLiftsScreen.js:489-499].
3. `handleShareYear` builds the variant-specific `milestoneData`
   [P1:src/screens/YearOfLiftsScreen.js:425-471].
4. Navigates to `ShareCard`; user picks format/toggles and shares PNG or PDF
   [P1:src/screens/ShareCardScreen.js:876-926,:995-1015].

**ENTITLEMENT GATING [FREE/PRO]**
- FREE. `RecapStory`/`YearOfLifts` are registered without a Pro guard
  [P1:src/navigation/RootNavigator.js:352-353]; recap stats sit in the free Progress/Train flow.
  (Progress stats are a Free feature, `CLAUDE.md` FREE list.)
  NEEDS ANSWER [NA-wr-8]: confirm no upstream entry point gates recap behind Pro (e.g. the
  Analytics tile only appearing for Pro). | files-to-check: `src/screens/AnalyticsScreen.js:224,
  :379` (recap card entry), any `tier === 'pro'` guard around the recap tile.

**EMPTY STATE [British copy]**
- Recap story empty state already exists: "No sessions yet / Come back here once you've logged a
  few sessions." [P1:src/screens/YearOfLiftsScreen.js:520-523]. Share button is hidden until there
  are cards [P1:src/screens/YearOfLiftsScreen.js:489]. No new copy.

**LOADED STATE**
- Share icon visible; ShareCard milestone preview renders
  [P1:src/screens/ShareCardScreen.js:1057-1063].

**ERROR STATE**
- ShareCard already handles generation/export failures with factual toasts ("Couldn't generate
  card, try again", "Couldn't make the PDF, try again")
  [P1:src/screens/ShareCardScreen.js:895,:909,:1011]. No new copy.

**EDGE CASES**
- Privacy: milestone payloads carry only factual training stats; no bodyweight/measurements/notes
  [P1:src/screens/YearOfLiftsScreen.js:428,:443-444,:457; P1:src/screens/ShareCardScreen.js:1106].
- Sharing packages absent (Expo Go / missing native module): guarded with a rebuild message
  [P1:src/screens/ShareCardScreen.js:877-879].

**DUAL-AUDIENCE DESIGN**
- The card reports facts only ("no cheerleading, per the voice rules"
  [P1:src/screens/ShareCardScreen.js:599-601]); identical for both registers.

### VERIFICATION
- Share wired for year/month/block: CONFIRMED [P1:src/screens/YearOfLiftsScreen.js:425-471].
- ShareCard milestone path end to end: CONFIRMED
  [P1:src/screens/ShareCardScreen.js:603-705,:903-926].
- Privacy scoping: CONFIRMED [P1:src/screens/ShareCardScreen.js:1106-1108].
- Founder ACCEPTED: CONFIRMED [P2:pass3-v2-founder-decisions.md:46].
- **NET: NO new build required for the core item; it is already implemented (COMP-005).** OPEN
  NA-ids (verification only): NA-wr-7, NA-wr-8.

---

## ULTIMATE-WR-4 — RECAP: MONTHLY CADENCE

**ID:** ULTIMATE-WR-4
**CLUSTER:** Recap (RP)
**TITLE:** Monthly recap cadence (block + annual already existed)
**PRIORITY TIER:** Tier-3 (retention; already substantially built)
**IMPACT:** Medium (retention).
**EFFORT:** Very low — implemented; residual is verification.
**PRIORITY SCORE:** Low remaining effort.

### CURRENT STATE [P1] — ALREADY BUILT (COMP-005)
- A monthly recap variant exists: `YearOfLiftsScreen` accepts `variant === 'month'` and builds the
  deck via `buildMonthCards` from `getRecapData` over an explicit month window
  [P1:src/screens/YearOfLiftsScreen.js:349-395; P1:src/screens/YearOfLiftsScreen.js:167-249].
- `getRecapData(userId, { startMs, endMs, compare })` is a generic window aggregator (sessions,
  sets, tonnage, top exercises, top PRs, best session, optional previous-window compare)
  [P1:src/lib/database.js:4763-4846].
- Monthly recap has a reachable entry point: `AnalyticsScreen.recentMonthRecapParams` computes the
  last-completed-month (or "month so far") params and an in-screen card/tile navigates to
  `RecapStory` [P1:src/screens/AnalyticsScreen.js:41-65,:224,:379].
- A monthly recap push notification exists: `checkMonthlyRecapReady` (gated: ≥10 completed sessions,
  ≥1 month session, dedup per month key) [P1:src/lib/notifications/scheduler.js:893-908], wired in
  `App.js` [P1:App.js:590,:615-619], with tests
  [P1:src/lib/__tests__/notifications.scheduler.test.js:306-344].

### THE GAP [P3]
Pass-3 RP "HOW TO ELEVATE" item (1): "add **monthly** cadence (block already done)"
[P3:pass3-comparison-matrix.md:448]; "monthly/weekly cadence (Boostcamp Sunday)"
[P3:pass3-comparison-matrix.md:444]. **The monthly half is now BUILT** (see CURRENT STATE); the
Pass-3 row predates COMP-005. Weekly cadence was NOT in the founder-approved set
[P2:pass3-v2-founder-decisions.md:47-48] and is out of scope here.

### THE EVIDENCE [P2]
- Founder ACCEPTED: "RP — Monthly recap cadence (block + annual already exist)"
  [P2:pass3-v2-founder-decisions.md:47, status ACCEPTED].
- Best reference: Boostcamp Sunday reports / monthly cadence
  [P2:pass3-comparison-matrix.md:439,:444, status VERIFIED — Claude].

### NEWBIE EXPERIENCE AFTER CHANGE
After a month of training a new user is offered a short, factual monthly recap (or "month so far")
they can open in seconds — no waiting a whole year for a first recap.

### ATHLETE EXPERIENCE AFTER CHANGE
A regular trainee gets a month-over-month recap with factual deltas and can open it from the
Analytics screen or the monthly push.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE [P1]**
- **None for the core cadence** — implemented (CURRENT STATE). Residual verification only:
  NEEDS ANSWER [NA-wr-9]: is the monthly recap entry point's gating intentional and complete (the
  push requires ≥10 completed sessions + ≥1 month session
  [P1:src/lib/notifications/scheduler.js:895]; does the in-app Analytics tile use the same or a
  different threshold)? | files-to-check: `src/screens/AnalyticsScreen.js:46-65,:224,:379`,
  `src/lib/notifications/scheduler.js:893-908`.

**DATA**
- None NEW. Monthly window read via the existing `getRecapData` aggregate
  [P1:src/lib/database.js:4763].

**COMPONENT STRUCTURE**
- `AnalyticsScreen` → `navigation.navigate('RecapStory', recentMonthRecapParams(...))`
  [P1:src/screens/AnalyticsScreen.js:224,:379]; renderer is `YearOfLiftsScreen` with
  `variant: 'month'` [P1:src/navigation/RootNavigator.js:353; P1:src/screens/YearOfLiftsScreen.js:
  369-377].

**USER FLOW [sequence]**
1. App detects a completed month and (if gates pass) fires the monthly push
   [P1:src/lib/notifications/scheduler.js:893-908; P1:App.js:615-619].
2. The Analytics screen shows a recap card/tile for the relevant month
   [P1:src/screens/AnalyticsScreen.js:224,:230].
3. User opens it → `RecapStory` with month params → `getRecapData(compare: true)` → `buildMonthCards`
   [P1:src/screens/YearOfLiftsScreen.js:369-377,:392].
4. Deck renders with factual month-over-month captions (see ULTIMATE-WR-5).

**ENTITLEMENT GATING [FREE/PRO]**
- FREE (same as ULTIMATE-WR-3): recap stats are in the free Progress flow; `RecapStory` is
  un-guarded [P1:src/navigation/RootNavigator.js:352-353]. (Shared with NA-wr-8.)

**EMPTY STATE [British copy]**
- "month so far" path handles a just-unlocked first-month user
  [P1:src/screens/AnalyticsScreen.js:59-64]; the deck's own empty/minimum-content rule softens a
  thin month ("X sessions logged. They count.")
  [P1:src/screens/YearOfLiftsScreen.js:234-239]. No new copy.

**LOADED STATE**
- Monthly deck with intro + content cards + outro [P1:src/screens/YearOfLiftsScreen.js:167-249].

**ERROR STATE**
- `getRecapData` failure leaves `data` null → graceful empty deck
  [P1:src/screens/YearOfLiftsScreen.js:384,:517-523]. No new copy.

**EDGE CASES**
- Calm mode / open ED-pattern flag: monthly deltas go neutral/factual (`neutral` set from
  `getWellbeingMode`/`getOpenEdPatternFlag`) [P1:src/screens/YearOfLiftsScreen.js:369-377,:392;
  P1:src/screens/YearOfLiftsScreen.js:163-167]. A down month is never negative-framed.
- First-month user: "month so far" rather than an empty previous month
  [P1:src/screens/AnalyticsScreen.js:51-64].
- Push dedup per month key so a recap fires once per month
  [P1:src/lib/notifications/scheduler.js:895; P1:src/lib/__tests__/notifications.scheduler.test.js:
  337-344].

**DUAL-AUDIENCE DESIGN**
- Same factual deck for both registers; safety/calm carve-out forces neutral framing regardless of
  register [P1:src/screens/YearOfLiftsScreen.js:163-167].

### VERIFICATION
- Monthly variant + `buildMonthCards`: CONFIRMED [P1:src/screens/YearOfLiftsScreen.js:167-249,
  :369-392].
- Monthly entry point (Analytics): CONFIRMED [P1:src/screens/AnalyticsScreen.js:41-65,:224,:379].
- Monthly push gated + tested: CONFIRMED [P1:src/lib/notifications/scheduler.js:893-908;
  P1:src/lib/__tests__/notifications.scheduler.test.js:306-344].
- Founder ACCEPTED: CONFIRMED [P2:pass3-v2-founder-decisions.md:47].
- **NET: NO new build required; already implemented (COMP-005).** OPEN NA-id (verification only):
  NA-wr-9.

---

## ULTIMATE-WR-5 — RECAP: RELATIVE / LANDMARK FRAMING (factual, no hype)

**ID:** ULTIMATE-WR-5
**CLUSTER:** Recap (RP)
**TITLE:** Relative / landmark framing instead of raw absolute tonnage
**PRIORITY TIER:** Tier-3 (recap quality; partly built)
**IMPACT:** Medium (makes a hollow big number meaningful).
**EFFORT:** Low-Medium — relative (month/block deltas) is built; absolute-tonnage "landmark"
framing is the genuine open delta and needs a founder spec.
**PRIORITY SCORE:** Low-Medium.

### CURRENT STATE [P1] — PARTLY BUILT (COMP-005)
- **Relative framing already exists** in the monthly and block decks, all factual:
  - Monthly sessions: "X more than the month before."
    [P1:src/screens/YearOfLiftsScreen.js:181-184].
  - Monthly tonnage: "Up X% on the month before." [P1:src/screens/YearOfLiftsScreen.js:199-201].
  - Block tonnage delta ("the climb"): "+X% weekly volume … That climb is the block working." /
    down-week framed as the plan working, not a failure
    [P1:src/screens/YearOfLiftsScreen.js:265-272].
  - `getRecapData(compare: true)` supplies the previous-window numbers these captions use
    [P1:src/lib/database.js:4832-4840].
- All current captions are factual and pass the voice rules — no "crush"/hype; a down month/week is
  never negative-framed [P1:src/screens/YearOfLiftsScreen.js:163-167,:270].

### THE GAP [P3]
Pass-3 RP "WHERE WE LAG" item (3): "raw absolute tonnage hollow vs relative/milestone framing
(Gemini+CG)" [P3:pass3-comparison-matrix.md:447]; elevate (3): "relative/identity framing tied to a
PB/behaviour milestone (all-3)" with a SINGLE-SOURCE "UK-landmark comparisons (Gemini)"
[P3:pass3-comparison-matrix.md:450-451]. The month/block RELATIVE framing is built; the genuine
open delta is the **absolute-tonnage cards still showing a raw number** with only a generic caption
(Year of Lifts tonnage: "Every set you logged, stacked end to end."
[P1:src/screens/YearOfLiftsScreen.js:77-86]; ShareCard hero "TOTAL KG LIFTED"
[P1:src/screens/ShareCardScreen.js:433-435]) — i.e. no relative/landmark anchor on the raw-tonnage
hero.

### THE EVIDENCE [P2]
- Founder ACCEPTED: "RP — Relative/landmark framing instead of raw tonnage"
  [P2:pass3-v2-founder-decisions.md:48, status ACCEPTED].
- Per-item voice guard (founder): recap "relative framing" → factual ("the weight of N …"), never
  hype/"crush" [P2:pass3-v2-founder-decisions.md:92-93].
- Best reference: relative/milestone recap framing [P2:pass3-comparison-matrix.md:447,:450,
  status VERIFIED for the relative-framing principle; UK-landmark specifically SINGLE-SOURCE Gemini
  P2:pass3-comparison-matrix.md:451].

### NEWBIE EXPERIENCE AFTER CHANGE
Instead of a raw "48,210 kg" that means little to a beginner, the recap can anchor the number to
something concrete and factual (e.g. a relative comparison), with no hype language.

### ATHLETE EXPERIENCE AFTER CHANGE
The athlete still sees the precise tonnage (numbers-first), with an optional factual relative anchor
beneath it; month/block decks keep their month-over-month deltas.

### IMPLEMENTATION BLUEPRINT

**FILES TO CHANGE [P1]**
- `src/screens/YearOfLiftsScreen.js:77-86` — the Year-of-Lifts tonnage card caption is generic;
  this is the surface to add an optional factual relative/landmark anchor.
- `src/screens/ShareCardScreen.js:433-435,:644-657` — the milestone/session hero "TOTAL KG LIFTED"
  is a raw number with no relative caption; the `drawMilestone` caption field
  [P1:src/screens/ShareCardScreen.js:663-674] is the existing place for a factual one-liner.
- NEEDS ANSWER [NA-wr-10]: **what is the exact relative/landmark framing the founder wants?** The
  approved line is only "Relative/landmark framing instead of raw tonnage"
  [P2:pass3-v2-founder-decisions.md:48], with the voice guard "factual ('the weight of N …'), never
  hype" [P2:pass3-v2-founder-decisions.md:92-93], and the "UK-landmark comparisons" idea is
  explicitly SINGLE-SOURCE Gemini [P2:pass3-comparison-matrix.md:451]. Options the founder must
  choose between (do NOT guess): (a) deterministic UK-landmark comparison (e.g. "the weight of N
  double-decker buses") — requires a vetted, factual landmark table and risks reading as gimmicky;
  (b) personal relative anchor only (e.g. "X% more than last year", "N times your bodyweight" — but
  bodyweight is privacy-excluded from shares, so personal-multiple framing cannot go on a share
  card); (c) milestone-crossing framing ("first year past N kg"). | files-to-check:
  `pass3-v2-founder-decisions.md` (no further spec present), `pass3-comparison-matrix.md:447-454`
  (landmark is single-source). This is a founder DECISION, not a code lookup; surface as a
  structured multi-choice question per CLAUDE.md, do not pick a default.
- NEEDS ANSWER [NA-wr-11]: if a landmark table is chosen, where does the deterministic factual data
  live and what is its provenance (it must be sourced, not invented — CLAUDE.md "work from the
  source")? | files-to-check: repo for any existing landmark/comparison constant (none found in the
  read set); would be NEW data requiring a vetted source.

**DATA**
- Relative-delta data: already available (previous-window aggregates via `getRecapData(compare)`
  [P1:src/lib/database.js:4832-4840]). NO new data for option (b)/(c).
- Landmark-comparison data (option a): **NEW** — a deterministic, sourced landmark table would be
  required (mass per landmark unit). Marked NEW; provenance is NA-wr-11.

**COMPONENT STRUCTURE**
- In-app deck: `StoryCard` `stat` layout renders value/unit/caption
  [P1:src/screens/YearOfLiftsScreen.js:312-320]; the caption is where a factual relative line goes.
- Share card: `drawMilestone` caption [P1:src/screens/ShareCardScreen.js:663-674].

**USER FLOW [sequence]**
1. Recap deck builds tonnage card with the raw number (unchanged, numbers-first)
   [P1:src/screens/YearOfLiftsScreen.js:77-86].
2. A factual relative/landmark caption (per the NA-wr-10 decision) is added beneath the number.
3. The same caption flows to the share card's milestone caption field where applicable
   [P1:src/screens/YearOfLiftsScreen.js:457-468].

**ENTITLEMENT GATING [FREE/PRO]**
- FREE (recap is un-guarded, shared with NA-wr-8).

**EMPTY STATE [British copy]**
- Tonnage card is only built when `tonnage > 0` [P1:src/screens/YearOfLiftsScreen.js:77]; no
  zero-state copy needed.

**LOADED STATE**
- Raw tonnage number + factual relative/landmark caption (copy pending NA-wr-10).

**ERROR STATE**
- If the relative comparison cannot be computed (no previous window), fall back to the existing
  generic factual caption [P1:src/screens/YearOfLiftsScreen.js:84] — never fabricate a comparison.

**EDGE CASES**
- Calm mode / ED flag: any comparison must respect the existing neutral framing carve-out
  [P1:src/screens/YearOfLiftsScreen.js:163-167]; a relative line must never become competitive
  pressure.
- Share privacy: bodyweight-relative framing (e.g. "N times your bodyweight") is NOT permitted on a
  share card because bodyweight is privacy-excluded [P1:src/screens/ShareCardScreen.js:1106-1108];
  this constrains the NA-wr-10 options.
- No hype/banned phrases: caption must pass the failure-mode lint ("crush"/"shred"/"beast mode"
  banned) [P2:COACHING_VOICE_SYNTHESIS_LOCKED.md:568].

**DUAL-AUDIENCE DESIGN**
- Numbers-first for both; the relative anchor is a plain factual addendum, identical in both
  registers. No jargon (no "tonnage" on the surface; the in-app cards already say "kg moved"
  [P1:src/screens/YearOfLiftsScreen.js:84]).

### VERIFICATION
- Relative framing built for month/block: CONFIRMED [P1:src/screens/YearOfLiftsScreen.js:181-201,
  :265-272].
- Compare data available: CONFIRMED [P1:src/lib/database.js:4832-4840].
- Raw-tonnage hero has no relative anchor: CONFIRMED [P1:src/screens/YearOfLiftsScreen.js:77-86;
  P1:src/screens/ShareCardScreen.js:433-435].
- Founder ACCEPTED + voice guard: CONFIRMED [P2:pass3-v2-founder-decisions.md:48,:92-93].
- **OPEN NA-ids: NA-wr-10 (founder decision, load-bearing — defines the framing; must NOT be
  guessed), NA-wr-11 (landmark data provenance, only if option a chosen).** Not final until
  answered.

---

## NEEDS-ANSWER REGISTER (this file)

| NA-id | Item | Question (short) | Files to check |
| --- | --- | --- | --- |
| NA-wr-1 | WR-1 | Confirm no Pro guard on the active-workout/SetEntry path (set logging is Free). | `RootNavigator.js`, `ActiveWorkoutScreen.js` |
| NA-wr-2 | WR-1 | Enumerate all `<SetEntry>` render sites; confirm optional prop is non-breaking. | repo search `<SetEntry` |
| NA-wr-3 | WR-2 | What exactly does "keeps volume tracking" require on swap (count swapped-out sets / inherit slot target / both)? **Load-bearing.** | `ActiveWorkoutScreen.js` (session summary, `sessionSetsRef`, finish), `database.js:4775-4783` |
| NA-wr-4 | WR-2 | Locate the swap modal JSX + candidate-row rendering for exact copy/"Why this?" placement. | `ActiveWorkoutScreen.js` (`showSwapModal`/`swapCandidates`) |
| NA-wr-5 | WR-2 | Confirm swap carries no Pro gate today. | `ActiveWorkoutScreen.js`, `RootNavigator.js` |
| NA-wr-6 | WR-2 | Does `handleOpenSwap` guard a `getAllExercises()` rejection? | `ActiveWorkoutScreen.js:319-325` |
| NA-wr-7 | WR-3 | Any recap surface still lacking a direct share entry (e.g. `BlockReflectionScreen` body)? | `YearOfLiftsScreen.js:489-499`, `BlockReflectionScreen.js:98-107`, `WorkoutSummaryScreen.js:969,:1006` |
| NA-wr-8 | WR-3/4/5 | Confirm no upstream Pro gate on recap entry points. | `RootNavigator.js:352-353`, `AnalyticsScreen.js:224,:379` |
| NA-wr-9 | WR-4 | Is the monthly entry-point gating intentional/complete (in-app tile vs push thresholds)? | `AnalyticsScreen.js:46-65`, `scheduler.js:893-908` |
| NA-wr-10 | WR-5 | **Founder decision:** exact relative/landmark framing wanted (landmark table / personal relative / milestone-crossing). **Load-bearing.** | `pass3-v2-founder-decisions.md` (no further spec), `pass3-comparison-matrix.md:447-454` |
| NA-wr-11 | WR-5 | If a landmark table is chosen, where does the deterministic, SOURCED landmark data live? (NEW data; provenance required.) | repo (no existing constant found) |

All eleven NA-ids must be answered with file:line CONFIRMED answers (or, for NA-wr-3 / NA-wr-10,
a founder decision) before these blueprints are final per `_AUDIT-SPEC.md:281`.
