# RT1 — TECHNICAL RED TEAM vs CC25 ARCHITECTURE

Scope: learning contamination, provenance, sync/history, baseline/effective
divergence, precedence, migration/state-machine. No fixes proposed.

---

### 1. Erasure destroys the ONLY record recompute-consumers depend on — CAP-12 broken BY the erasure feature
SCENARIO: user runs a shoulder episode for 8 weeks, trains through it, then exercises Art-9 erasure on the capability lane (§26/CC-D18) six months later, well after the episode ended.
WHY IT BREAKS: §6.1's recompute consumers (C20 resolver, plateau, preference, session adjustments, live-prescription — the LARGEST consumer category) have "no set-level tags" by design; eligibility is decided solely by joining `workouts.started_at` against the live `capability_constraints` rows AT READ TIME. §5.1 says erasure "hard-deletes all rows." Once the constraint row is gone, every future recompute over those 8 weeks can no longer see the interval and treats the sessions as ordinary baseline evidence — the exact durable-teaching outcome CAP-12 forbids, now triggered retroactively by the privacy mechanism itself.
EVIDENCE: ARCHITECTURE §6.1 ("No set-level tags exist... resolved AT READ TIME"); §5.1 ("hard-deletes all rows"); §6.4 lists only ledger `eligibility`, `session_constraint_effects`, and `exercise_swaps.cause` as reachable derivatives — it never names the recompute mechanism's dependency on the row itself.
CORRUPTS: every recompute-based row in the §7 matrix (rows 1, 3, 4, 8, 9, 14 preference/defaults, learning-adjacent live prescription) for the erased period, permanently and silently, the moment a user exercises the one right the architecture is built to honour.

### 2. CAP-17's fail-closed mandate is contradicted by a pinned, founder-adopted fail-open test at the exact same seam
SCENARIO: `loadCapabilityState` fails inside `filterLibraryForGeneration` (network hiccup, corrupt row) during generation.
WHY IT BREAKS: §9.2.1 says the capability check "gains... the same drop-report contract" as C31 intent at this seam. `campaign9.generation.test.js:188-222` pins, under "D110-2... founder-adopted 2026-08-17" (three days before this campaign), that a read failure at this exact seam is a **no-op**: writes are byte-identical to a clean slate, the only difference being an informational `constraintsUnavailable` flag — not a block, not a held generation. CAP-17/CC-D10 require the opposite posture (fail CLOSED, explicit user choice, "hold" offered). The architecture never specifies how one function forks two opposite failure postures for two reads sharing "the same... contract," nor that this very-recently-repinned test must change.
EVIDENCE: `src/lib/exercise/__tests__/campaign9.generation.test.js:188-222`; ARCHITECTURE §9.2.1, CAP-17, CC-D10.
CORRUPTS: generation's safety posture under read failure — silently reverts to fail-open unless the pinned test is deliberately broken, which nothing in §30/§31 schedules.

### 3. Coach outcome memory: the CONFOUNDED-reuse claim cites the wrong audit finding, and §20 never touches the real classifier
SCENARIO: coach applies a volume increase to a muscle; a capability episode starts affecting that same muscle before the outcome window closes.
WHY IT BREAKS: §7's "Coach intervention/outcome memory" row claims episode outcomes get "marked CONFOUNDED (existing state, F reusable #6)." AUDIT-F's reusable-infrastructure item **#6** is `coachDecline.js`'s decline-memory signature — unrelated. The actual confound classifier is item **#8**, `classifyOutcome` (`coachIntervention.js:256-340`), whose closed trigger set (`:260,265,272,280,289,304,314`) is `user_changed_it_themselves` / `goal_phase_changed_or_unknown` / `training_stopped` / `*_became_unknown` / `diary_coverage_lost` — none of which fires for "a capability episode is active." §20's actual described touch points (`buildCoachContext`, `classifyTrainingLimiter`, `coachApply`, `neverClaim`) never list `coachIntervention.js`. A user who keeps training and logging normally around a restriction trips none of the five existing triggers, so the outcome is scored as a normal WORSENED/UNCHANGED/IMPROVED verdict and — per "CONFOUNDED NEVER TEACHES... only the two decisive outcomes are acted on" — DOES feed the coach's durable intervention-effectiveness memory.
EVIDENCE: `src/lib/coachIntervention.js:256-340` (esp. 260-314); AUDIT-F §9 items #6 vs #8; ARCHITECTURE §7 coach-outcome row, §20.
CORRUPTS: coach intervention-effectiveness memory (a durable, cross-episode learning store) with episode-confounded verdicts, unaddressed by any named implementation seam.

### 4. C31's exercise-vocabulary coverage gap is inherited wholesale by capability `family` rules — clinician restrictions can silently no-op
SCENARIO: user enters a clinician-reported restriction as `rule_kind: family` on an axial/neck-loading pattern (a highly plausible clinical restriction).
WHY IT BREAKS: §8.1 says the four existing movement vocabularies "are NOT extended or renamed"; §5.2 defines `family` as "capability-lane sibling of C31's PATTERN_AVOID." AUDIT-C §13.6 documents that `movementFamilyOf` returns `null` for 143/551 exercises, and that `traps`, `forearms`, `neck`, `adductors`, `tibialis` carry **zero** subregion tags — none of their exercises can ever resolve to any family key. A family-rule restriction targeting one of these muscles therefore matches nothing, ever, with no error and no reported reason.
EVIDENCE: AUDIT-C §13.6 (coverage-gap table, "five muscles... no subregion tags at all"); ARCHITECTURE §5.2, §8.1; CAP-5 ("never silently drops"), CAP-7 ("cannot be silently overridden").
CORRUPTS: eligibility for exactly the highest-stakes rule (`clinician_reported` + `family`) on exactly the muscles where coverage is worst — a silent CAP-5/CAP-7 breach baked in by inheriting, not fixing, the cited defect.

### 5. CC-D9's 25% threshold: sub-threshold session leakage plus a frequency-sensitive cliff
SCENARIO A (leakage): a muscle trained 6x in a block, 1 session affected by an episode (16.7% < 25%) — entry marked `normal`.
SCENARIO B (cliff): the same muscle trained 4x, exactly 1 affected (25.0%, not `> 0.25`) — still `normal`; trained 3x with 1 affected (33% `> 0.25`) — now `constrained`, and the entry's other 2 genuinely clean sessions are discarded with it.
WHY IT BREAKS: §6.2 defines only an entry-level binary flag from `constrainedShare`; it never describes stripping the individual affected session's numbers from the aggregate (`observed` peak/slope) that a `normal`-flagged entry still carries into learnedRange/seeding untouched. Whether an injury teaches nothing or teaches in full is thus a function of the muscle's session frequency that week, not of what happened — and at the boundary itself, the strict `>` costs nothing.
EVIDENCE: ARCHITECTURE §6.2 ("constrainedShare > 0.25... writes per-entry eligibility"; explicitly flagged for red-team attack, CC-D9).
CORRUPTS: learnedRange ceiling/floor, establishedStart, next-block seed — with contaminated inputs whenever real usage happens to sit just under threshold, and with legitimate clean sessions discarded whenever it sits just over.

### 6. CC-D17's backfill mechanism is the wrong function — its own guard clause skips exactly the blocks it needs to patch
SCENARIO: a backdated episode row arrives on Device A after Device B already computed and stored that block's ledger.
WHY IT BREAKS: §28/CC-D17 names `backfillMissingBlockLedgers` as the mechanism that "recomputes eligibility-only for entries whose watermark predates the row." The live function's very first check is `if (m.blockLedger) continue;` — it only ever acts on mesocycles with **no** ledger at all. A block needing an eligibility restamp necessarily already HAS a ledger (that's the entire premise of the scenario), so this function will always skip it, unconditionally, before ever inspecting a watermark.
EVIDENCE: `src/lib/blockLedgerRunner.js:571-585`, specifically line 575 `if (m.blockLedger) continue;`; ARCHITECTURE §28 CC-D17.
CORRUPTS: the one mechanism CC-D17 relies on to keep eligibility correct under late-arriving sync data is non-functional as named, for every case it is supposed to cover.

### 7. `starts_at` has no backdating path — a universal gather-time protection gap between injury and logging
SCENARIO: user's shoulder is injured Monday; they train through Tue/Wed on the old (unrestricted) plan; they finally log the episode in-app Thursday.
WHY IT BREAKS: §5.1's `starts_at` is `epoch ms`, not user-editable per any described flow — §11.2's episode-creation step 4 asks only "is this temporary?" with an *optional end date*; §21's flare re-entry likewise never asks for a start date. Absent a backdating UI, `starts_at` defaults to creation time, so Mon-Wed's sessions (genuinely under restriction) read as baseline-normal forever under §6.1's interval join. This is not an edge case — no real user logs an injury the instant it happens, so every episode carries this gap by construction.
EVIDENCE: ARCHITECTURE §5.1 schema; §11.2 flow (no start-date question anywhere); §21.
CORRUPTS: the leading days of every episode, systematically, across the entire feature — teaching full-strength lessons from exactly the sessions where the user was pushing through the onset of the problem.

### 8. Adapted-landmark self-heal depends on a GLOBAL 200-row cap, not a per-muscle one — breaks for long or chronic-flare episodes
SCENARIO: a chronic-flare user (§21's own target case) training 6-8 muscle groups has a flare recur every few months, each lasting 6+ weeks.
WHY IT BREAKS: `getAdaptiveLandmarkHistory` fetches `ORDER BY started_at DESC LIMIT 200` **across all muscles combined**, not 200 per muscle — AUDIT-E already notes one ordinary 6-week/2x-week episode "completely fills the [8-row] window." §7's row promises self-heal by excluding affected rows "at compute time," but exclusion only works if 8 clean rows exist inside that same fixed, already-fetched 200-row set; for a heavier training split or a longer/recurring flare, the clean pre-episode rows for that muscle fall outside the 200-row cutoff entirely, even though they exist in the database.
EVIDENCE: `src/lib/database.js:6543-6570` (`LIMIT 200`, no muscle partition); AUDIT-E lines ~1065-1079 ("last 8 per muscle... the constrained period completely fills the window").
CORRUPTS: adapted MEV/MRV/MAV display for exactly the population §21 is designed around — the promised self-heal silently fails to fire, with no fallback described.

### 9. HomeScreen's direct block-ledger read narrates constrained numbers as ordinary block-start decisions, unfiltered
SCENARIO: a block ends with delts `constrained` (episode-affected). The next block's Home screen renders "retention"/"reduction" narrative lines sourced from that block.
WHY IT BREAKS: `loadBlockProgress` parses `prior.blockLedger` directly and reads `e.observed.startSets`/`e.observed.plannedPeak` raw, feeding `buildBlockStartLines`'s "what moved" copy — with no `eligibility` check anywhere in the path. §7's "Block ledger classification" row is `I` (ineligible-to-teach) for exactly this case, but that gating is specified only for learnedRange/seeding/structure-memory (§6.2) — this display consumer is not named in §9.2's insertion points, §20, or anywhere else.
EVIDENCE: `src/screens/HomeScreen.js:1230` (`JSON.parse(prior.blockLedger)`), `:1237-1238` (raw `e.observed.*` use), `:1266` (`buildBlockStartLines` call); AUDIT-L Family 11 ("Direct read of `m.blockLedger`... bypassing any accessor function").
CORRUPTS: the block-start narrative the user reads as an honest coaching decision — actually a suppressed number presented with no constraint context, undermining CAP-18 explainability without touching any "teaching" mechanism the spec gates.

### 10. `exercise_swaps.cause` is keyed to UI entry point, not actual eligibility — silently undercounts constraint-forced swaps as preference
SCENARIO: an exercise is capability-blocked; the user swaps it via the routine's ordinary "swap exercise" action rather than tapping through the constraint notice specifically.
WHY IT BREAKS: §5.5 stamps `cause='constraint'` "ONLY when the swap flow was entered from a constraint notice/blocked state" — a UI-path flag, not a derived "was this exercise actually capability-ineligible" check. `recordExerciseSwap` is called identically from the generic swap-confirm handlers regardless of why the user opened the sheet.
EVIDENCE: ARCHITECTURE §5.5; AUDIT-L Family 6 (`RoutineDetailScreen.js:543`, `ActiveWorkoutScreen.js:1090` — both generic, not blocked-state-gated); CAP-13.
CORRUPTS: swap-preference evidence (§7 row "Exercise preference") whenever a user reaches the same swap through the ordinary path — a forced substitution counted as a liked one.

### 11. AWAITING_CONFIRMATION has no forcing function — an ignored prompt freezes learning (and filtering) indefinitely
SCENARIO: a date-bound episode's end date passes; the user never opens the confirm prompt (they keep training fine, just don't visit Settings or dismiss the Today card).
WHY IT BREAKS: §22 states transitions are "user-visible actions only," "No lazy write-backs" — the row stays `state: 'active'` forever. §7's EA/CF columns (mostly `I`) therefore never lift for that muscle, and automatic-suggestion filtering (§9.6) never lifts either, for as long as the user simply doesn't confirm — which the architecture never bounds or defaults.
EVIDENCE: ARCHITECTURE §22 ("No lazy write-backs"); §5.1 ("No read-time sweeps that write").
CORRUPTS: baseline/effective convergence — the effective view can diverge from the user's actual (recovered) capability indefinitely, with the only exit being a UI prompt the user is free to never see.

### 12. Laterality-qualified constraints have no defined eligibility interaction with bilateral/unilateral demand axes
SCENARIO: user has a `demand: grip_demand` constraint with `laterality: left`. Two exercises exist with `grip_demand: bar` — one `bilateral_upper: true` (barbell row), one effectively single-arm-loadable (a DB row that could be done right-arm-only).
WHY IT BREAKS: §9.1's `demandConflicts` is described as "field comparisons"; §9.3 confirms no cross-axis logic. `grip_demand`'s own value (none/supportive/bar) carries no side information, and the ontology's `unilateral_loadable`/`bilateral_upper`/`bilateral_lower` axes are never connected to a constraint's `laterality` field anywhere in §9. §16 addresses laterality only for RANKING ("selection prefers... variants"), not eligibility. Nothing states whether a left-grip-only constraint correctly excludes only the bilateral case or also over-excludes a right-side-safe unilateral one.
EVIDENCE: ARCHITECTURE §8.2 (axis table), §9.1, §9.3, §16 (ranking-only laterality); §5.1 (constraint `laterality` column, independent of exercise's own laterality signal, which AUDIT-B calls "name-regex").
CORRUPTS: eligibility for the exact population the ontology's `unilateral_loadable` axis was justified by (§8.2's own "selection for limb difference") — either false-excluded (lost volume, CAP-9) or false-included (silent CAP-7-adjacent miss) with no resolver rule to decide which.

### 13. Promotion and extension can race across devices, leaving both a permanent restriction and a live episode active for the same rule
SCENARIO: Device A promotes an episode ("this is how I train now") — ends the episode row, inserts new baseline rows. Offline Device B, still showing the episode as active, taps "extend" moments later — which per §5.1 ends the SAME original row again (`superseded`) and inserts a fresh active episode row.
WHY IT BREAKS: §28's device-race analysis only covers a same-row LWW race on ending fields. Here, LWW resolves the ORIGINAL row's terminal state (promoted vs superseded) one way or the other, but the two **inserts** — A's new baseline rows and B's new episode row — are unaffected by that resolution; both survive. §22/§24 assume promotion is the only pending mutation; neither addresses a concurrent terminal action on the same episode_group_id.
EVIDENCE: ARCHITECTURE §5.1 (append-only-in-meaning: end+insert), §22 (extend = "supersede end date"), §24 (promotion inserts baseline rows), §28 (only the same-row race is analysed).
CORRUPTS: capability state coherence — a rule can end up simultaneously "how I train now" (baseline, permanent) and "a temporary thing" (episode, still counting down), with no reconciliation logic anywhere in the state machine.

---

Checked and could NOT construct a failing case for: (1) the same-row LWW race on a single constraint's ending fields, per §5.1's own reasoning — confirmed against `sync/conflict.js`'s whole-row-per-`updated_at` resolution, holds for the single-row case; (2) repeated manual "decline the diff, keep training the exercise anyway" — §6.1's interval join is independent of the §14 diff-acceptance decision, so preference contamination via this path did not materialise; (3) rank-2/3/4 stacking order under baseline+episode+allowance combined on one exercise — the precedence table's ordering held under every combination tried.
