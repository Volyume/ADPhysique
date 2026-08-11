# Campaign 6 - Phases 9 + 44: plan switching over time, plan archive / history

Audit lane deliverable. Authority: the founder's Campaign 6 order, Phase 9
("PLAN SWITCHING OVER TIME", order lines 175-179) and Phase 44 ("PLAN
ARCHIVE / HISTORY", lines 442-446), read verbatim from the session
scratchpad copy `c6-CAMPAIGN6-ORDER.txt`. Binding constraints from
`CAMPAIGN-LOG.md`; rulings already made in `D97-RULINGS.md`.

Read-only trace against `claude/campaign6-long-term`. No code, test or
migration was touched. Existing suites were run read-only and are green
(`blockLifecycle.stage1`, `blockLedgerGather.stage6`,
`campaign5.firstUse`, `planAutoGen`: 4 suites, 224 tests, 0 failures).

**D97-9 is NOT re-reported here.** The activation paths that discard the
learned band (plan switch, phase-change rebuild, post-upgrade wizard all
create template ramps) are already a carried founder question. Findings
below reference it where the two interact, and finding **P9-06** is a
distinct copy-truth defect that survives whichever way D97-9 is ruled.

---

## 1. Ranked findings

| # | Class | Severity | Finding | Primary evidence |
|---|---|---|---|---|
| P9-01 | DEFECT | HIGH | A block's Block Ledger is permanently discarded when the user leaves the block by switching plans instead of by the decision card. During the recovery week this is unconditional. | `blockLedgerRunner.js:106-107`, `PlansScreen.js:239-296`, `planSwitch.js:38-39` |
| P44-02 | DEFECT | HIGH | Activating a plan from the Archived section leaves it `is_active = 1` **and** `is_archived = 1`; the same plan then renders as the active plan and as an archived plan simultaneously. | `PlanDetailScreen.js:280, 390-392`, `database.js:3691-3708, 3682-3689, 3878-3887` |
| P44-03 | DEFECT | MEDIUM-HIGH | `is_archived` never syncs in either direction although the column exists in both schemas; `archivePlan`/`unarchivePlan`/`archiveOtherUserPlans` also schedule no push. Reinstall or a new device resurrects every plan the user ever archived. | `sync.js:777-789`, `database.js:3862-3876, 3893-3904, 7094-7106`, `supabase/migrate_012_complete_sync.sql:115` |
| P9-04 | DEFECT | MEDIUM | `PlanDetailScreen` is the one plan-activation entry point with no RB-3 synchronous entry guard (no `useRef` in the file at all), on both its activation paths. The pinned RB-3 test enumerates the other three screens and misses it. | `PlanDetailScreen.js:157-168, 133-152`, `campaign5.firstUse.test.js:1788-1803` |
| P44-05 | DEFECT | MEDIUM | Block history is not truthful about when an abandoned block ended: `end_date` is written once at creation and never truncated on a switch, so "Past blocks" shows overlapping date ranges and an abandoned block reads as a full six weeks. | `database.js:3725-3726, 3742-3756`, `MesocycleBuilderScreen.js:287-312` |
| P9-06 | DEFECT | MEDIUM | After a plan switch or wizard rebuild the block-start explanation tells a mature user "Not enough personal history yet ... As blocks finish, each muscle's starting point comes from how it actually responded." Both clauses are false for a block-eight user. | `blockExplain.js:77-79, 188-197`, `HomeScreen.js:1192-1237`, `database.js:4201` |
| P9-07 | DEFECT | LOW-MEDIUM | `confirmPlanSwitchMidBlock` is silent in exactly the two states where a switch costs most (recovery week, `completed_awaiting_decision`), justified in its own docstring as "about to roll over anyway". Nothing rolls over; the pending decision and its ledger are simply dropped. | `planSwitch.js:12-19, 38-39` |
| P9-08 | LATENT | MEDIUM | `setActivePlan`'s deactivate-all + activate-one pair is not transactional, so two interleaved activations can leave two `is_active` programmes; `getActivePlan` then has no `ORDER BY` tiebreak (its mesocycle sibling was given one under Campaign 1 P0-8 D4). | `database.js:3691-3708, 3682-3689`, cf. `database.js:3984-3991` |
| P9-09 | LATENT | MEDIUM | `activatePlanWithBlock` runs `setActivePlan` **before**, and `generateMesocycleWeeks` / `generateInitialPlannedVolume` **after**, its transaction. A failure or kill in either gap leaves plan and block incoherent (new plan active with the old block still live, or a live block with no weeks and no planned volume). | `database.js:3715-3760` |
| P9-10 | LATENT | LOW-MEDIUM | A mid-block manual routine edit that ADDS sets raises `achievedPeak`, which can raise the learned ceiling on a RESPONSIVE block. Only manual *landmark* overrides are excluded from teaching. Exercise swaps are protected by the stability/discontinuity gates; pure set-count edits are not. | `learnedRange.js:138, 153-161`, `blockLedgerGather.js:282-324`, `blockMetrics.js:257-258, 312` |
| P44-11 | LATENT | LOW | `duplicatePlan` writes no `source_programme_id` and no `source_routine_id`, so a user-duplicated plan carries no provenance at all (`copyPlanFromLibrary` writes both). | `database.js:3906-3932` vs `database.js:3836-3857` |
| P44-12 | LATENT | LOW | FreeStarter's copy dedup reads `getAllPlansForUser`, which excludes archived plans, so an archived copy of the recommendation yields a second copy. | `FreeStarterScreen.js:156-171`, `database.js:3780-3789` |
| P44-13 | LATENT | LOW | `next_workout_index` is written locally but never pushed, so returning to a plan on a second device or after reinstall always restarts at day 1. | `database.js:3812-3823`, `sync.js:777-789` |
| P9-14 | LATENT | LOW | `planSwitch.js` has no test suite anywhere in the repo. The only pins near it are source-regex guards that assert the *call* exists, never its branch behaviour. | repo-wide grep: no `planSwitch` test file |
| P9-15 | CLEAN | - | No automatic block creation or transition. `activatePlanWithBlock` holds the only live `INSERT INTO mesocycles`, reached solely from explicit user activation; the dead `createMesocycle` was deleted at Stage 6. | `database.js:3748`, `database.js:4469-4475` |
| P44-16 | CLEAN | - | A renamed or copied plan cannot steal another plan's adaptive block identity. Ledger identity is the mesocycle UUID end to end (`mesocycleId`, `sourceMesocycleId`, `pmv_<weekUuid>_<muscle>`); plan name is a display snapshot with no keying role. | `blockLedgerRunner.js:263-272, 391-407`, `database.js:4213, 4228` |
| P9-17 | CLEAN | - | Muscle history reuse is muscle-scoped and plan-blind **by design**, and self-gates: a block only produces a ledger entry for muscles it planned or trained, so a split that never touched a muscle contributes nothing to it. | `blockLedgerGather.js:357-378`, `blockLedgerRunner.js:180-182` |
| P9-18 | CLEAN | - | Exercise history stays historically truthful across switches: `mesocycle_id`, `mesocycle_week_id` and `routine_id` are stamped at workout creation and never rewritten; PR/e1RM reads are exercise-scoped, not plan-scoped. | `database.js:2591-2623`, `blockMetrics.js:234-248` |
| P9-19 | CLEAN | - | One active block. RB-3's transaction still wraps the deactivate-all + insert pair, and `getActiveBlock` keeps its `ORDER BY created_at DESC` tiebreak. | `database.js:3742-3756, 3984-3991` |
| P9-20 | CLEAN | - | Editing an already-active plan never spins up a block or rewrites the block's planned volume. | `ManualBuilderScreen.js:838-860` |
| P9-21 | CLEAN | - | The adaptive seed stays Pro-gated across every switch path: `seedIntent` degrades to `'repeat'` without the entitlement, and every non-decision activation passes no ledger at all. | `PlansScreen.js:348-351, 397-403` |
| P9-22 | CLEAN | - | Mesocycle sync is last-write-wins hardened and cannot wipe a stored ledger (key omitted on push when absent, local value preserved on pull). | `sync.js:966-985`, `database.js:7497-7552` |

Counts: **7 DEFECT**, **7 LATENT**, **8 CLEAN**.

---

## 2. Per-scenario traces

### 2.1 Switch during week 1

`PlansScreen.handleSetActive` (`PlansScreen.js:468-511`) or
`PlanDetailScreen.handleSetActive` (`PlanDetailScreen.js:157-168`) calls
`confirmPlanSwitchMidBlock` (`planSwitch.js:20`). `getBlockStatus`
(`mesocycle.js:457-496`) returns `currentWeek = 1`, so
`planSwitch.js:38` returns `true` silently. `activatePlanWithBlock`
(`database.js:3715`) then:

1. `setActivePlan` deactivates every programme for the user and activates
   the new one (`database.js:3694-3706`), outside any transaction (P9-08,
   P9-09);
2. inside `runInTransaction`, deactivates every mesocycle and inserts the
   new six-week block (`database.js:3742-3756`);
3. lays out `mesocycle_weeks` and seeds `planned_muscle_volume` with
   `ledger = null`, so every row is written `source = 'template'`
   (`database.js:3758-3760, 4201`).

Old block: `is_active = 0`, `start_date` and `end_date` untouched. Up to
six days of training on it. No ledger is ever computed for it (see 2.2).
Loss is immaterial at week 1; the mechanism is the same one that matters
at week 5.

**Truthful.** No confirmation is needed and none is shown, which matches
the order's "no automatic transition" only in the sense that the user
asked for it.

### 2.2 Switch mid-block (weeks 2 .. plannedWeeks-1)

`planSwitch.js:38-39`: `currentWeek > 1` and `status === 'active'`, so the
dialogue fires (`planSwitch.js:41-58`): "You're in week 3 of 6 of your
current block ... Activating "X" starts a fresh block from week 1. Your
workout history and PRs are kept."

That last sentence is true. What it does not say is that the block's
**coaching evidence** is discarded, and it cannot be recovered later:

- `computeAndStoreBlockLedger` refuses any block that is not
  `awaitingDecision` (`blockLedgerRunner.js:106-107`), by design, so it
  cannot be computed now;
- once deactivated, the only two callers can never reach it again.
  `PlansScreen.loadData` computes for `getActiveBlock` only
  (`PlansScreen.js:220, 239, 276`), and
  `buildSeedRangesForNextBlock` selects `current` as the most recent
  mesocycle **by start date** (`blockLedgerRunner.js:328-330`), which
  after a switch is always the new block;
- `priorLedgerEntries` only reads rows that already carry
  `block_ledger` (`blockLedgerGather.js:365-368`), so the abandoned block
  contributes nothing to the learned band, for ever;
- `BlockReflectionScreen` reads the stored ledger and never computes one
  (`BlockReflectionScreen.js:148-157`), so its "Block summary" for that
  block shows no ledger rows permanently.

For a genuinely truncated block that is the conservative and correct
outcome (three weeks of data would classify INSUFFICIENT_DATA on the
adherence gate anyway, `interBlock.js:282-286`). It becomes a defect at
2.3 and 2.4, where the block was complete.

**Side effect (P44-05):** the old block keeps `end_date = start + 6w`
(`database.js:3725-3726`) and nothing truncates it. "Past blocks"
(`MesocycleBuilderScreen.js:303-310`) therefore prints a start/end range
that overlaps the block the user is now training, and describes a
three-week block as a six-week one.

### 2.3 Switch during the recovery week

`getBlockStatus` returns `status = 'recovery'` when
`currentWeek === plannedWeeks` (`mesocycle.js:482-484`).
`planSwitch.js:39` returns `true` **silently**: no dialogue, no mention
of the block at all.

This is the unconditional-loss case (P9-01). The block never reaches
`completed_awaiting_decision` while active, so:

- `blockAdvisor` returns `action: 'in_recovery'` (`blockAdvisor.js:409-421`),
  not `'post_recovery'`, so `PlansScreen.js:270` never calls
  `computeAndStoreBlockLedger`;
- `computeAndStoreBlockLedger` would itself refuse
  (`blockLedgerRunner.js:106-107`);
- after the switch the block is inactive and unreachable by both callers.

Result: five accumulation weeks of real training evidence -
per-muscle e1RM slope, PR density, recovery cost, achieved peak - are
permanently invisible to `computeLearnedRange`, because that function is
fed exclusively from persisted ledgers (`blockLedgerRunner.js:211, 356-365`).
This is strictly worse than D97-9. D97-9 is about a portable learned band
not being wired into an activation path; this destroys the evidence the
band is built from, so no future ruling on D97-9 can recover it.

The docstring's justification - "the block is in recovery or
completed_awaiting_decision (about to roll over anyway; anything not
'active' passes)" (`planSwitch.js:15-17`) - is factually wrong for this
product: nothing rolls over (P9-15 confirms there is no automatic
transition), and the recovery week is the last week whose completion turns
the block into judgeable evidence.

### 2.4 Switch after the block finished (`completed_awaiting_decision`)

`planSwitch.js:39` again returns `true` silently. Two sub-cases:

**(a) Reached through My Plans.** `PlansScreen.loadData` runs on focus,
`getBlockAdvice` returns `action: 'post_recovery'`
(`blockAdvisor.js:423-441`), and `PlansScreen.js:276` computes and
persists the ledger before the user can tap anything. The ledger
therefore survives on the mesocycle row and will feed
`priorLedgerEntries` at the next decision. Only the immediate seed is
lost, which is D97-9 territory.

**(b) Reached without loading My Plans.** The Coach-tab rebuild path
(`ProGoalSetupScreen.js:220-221` -> `generateAndSavePlan` ->
`activatePlanWithBlock`, `planAutoGen.js:223`) never touches
`PlansScreen`. Same for a `PlanLibrary`/`ManualBuilder` entry that did
not pass through it in this session. In that case the finished block's
ledger is never computed, and 2.3's permanent loss applies to a
**fully completed** block.

The user is also never told. The switch confirmation is suppressed, and
the wizard's own confirm (`mode: 'rebuild'`, `planSwitch.js:43-44`) is
suppressed with it, so the one screen that says "Re-running the wizard
creates a new plan and starts a fresh block from week 1" is silent
precisely when a decision was pending.

`archiveOtherUserPlans` (`planAutoGen.js:230`, `database.js:3893-3904`)
then archives every other plan the user owns, including hand-built ones,
with no confirmation and no sync (P44-03).

### 2.5 Archive the active plan

Blocked in both surfaces: `PlanDetailScreen.js:562` renders the archive
row only when `!isActive`, and `PlansScreen.handlePlanOptions` adds the
archive item only when `!isActiveForUser` (`PlansScreen.js:653-675`).

`archivePlan` itself has no guard (`database.js:3862-3868`) and would
happily set `is_active = 0, is_archived = 1` on the active plan, leaving
the active **block** running with no active plan - a true orphan. No live
caller reaches it, so this is a UI-only invariant, not a data-layer one.

`archivePlan` schedules no sync (P44-03) and archiving is committed
immediately with an undo toast rather than a confirm, by the R9 house
rule (`PlansScreen.js:658-673`).

### 2.6 Reactivate an old (archived) plan

Intended route: Train -> Archived -> "Restore" -> `unarchivePlan`
(`PlansScreen.js:1399-1406`, `database.js:3870-3876`) -> the plan
reappears in My Plans -> "Set active".

**Unintended route (P44-02):** Train -> Archived -> "View plan"
(`PlansScreen.js:1391-1398` or `handleArchivedPlanOptions`,
`PlansScreen.js:679-695`) -> `PlanDetailScreen`. That screen has no
`is_archived` awareness anywhere: it renders no Archived badge, and
`isActive` is computed purely as `activePlan?.id === planId`
(`PlanDetailScreen.js:280`), so the "Set active" primary button is shown
(`PlanDetailScreen.js:390-392`). `handleSetActive` ->
`activatePlanWithBlock` -> `setActivePlan` sets `is_active = 1` and never
clears `is_archived` (`database.js:3698-3702`).

Resulting state, all reachable in one screen refresh:

- `getActivePlan` has no archived filter (`database.js:3684-3687`), so
  Home and Train treat it as the active plan and it trains normally;
- `getAllPlansForUser` excludes archived rows (`database.js:3784`), so it
  is absent from My Plans;
- `getArchivedPlansForUser` includes it (`database.js:3881-3883`), so it
  renders in the Archived section, with a "Restore" button, while being
  the plan the user is training.

No data is lost and the block is coherent, but "active vs archived" - the
first thing Phase 44 asks the audit to verify - is not a partition.

### 2.7 Activate a newly built plan

`ManualBuilderScreen.handleSaveAndActivate`
(`ManualBuilderScreen.js:786-819`): synchronous `activatingRef` guard,
then `confirmPlanSwitchMidBlock`, then `updateProgrammeName`,
`persistDays`, `activatePlanWithBlock` with no ledger -> template ramp.
Correct and guarded.

`ManualBuilderScreen.handleSaveEdit` (`ManualBuilderScreen.js:844-860`)
deliberately does **not** activate, so editing the running plan never
restarts the block (P9-20). Note that it also does not touch
`planned_muscle_volume`, so the block's prescribed weekly sets keep
describing the plan as it was seeded - see P9-10 for the evidence-side
consequence.

`planAutoGen.generateAndSavePlan` (`planAutoGen.js:164-230`) writes the
programme, routines and exercises inside one transaction with an
in-transaction rollback on zero library matches
(`planAutoGen.js:199-206`), then activates, then archives every other
plan. Sound apart from P44-03 and D97-9.

### 2.8 Return to a previously used plan months later

Restore (if archived) -> Set active -> `activatePlanWithBlock` with no
ledger. Everything the user sees is a first block:

- every `planned_muscle_volume` row is `source = 'template'`
  (`database.js:4201`);
- `summariseSeededPlan` therefore reports no personalised source, and
  `buildBlockStartLines` emits `RESEARCH_START_LINE`
  (`blockExplain.js:188-197`), rendered in the Home block-shape sheet
  (`HomeScreen.js:1236`, `HomeBlockShapeSheet.js:63`):
  *"Not enough personal history yet, so this block starts from
  research-based guidance. As blocks finish, each muscle's starting point
  comes from how it actually responded."*

For a user with eight finished blocks both clauses are untrue (P9-06).
The line was written for the genuine first-block case (D93) and is
correct there; the template source is doing double duty as "no history"
and as "history exists but this path does not consult it". The source
label itself is honest; the sentence attached to it is not. This is a
copy-truth defect under the campaign's second long-term law and stands
whichever way D97-9 is ruled.

Correct on this path: exercise history and PRs are intact (P9-18); the
prior-set window is 180 days (`blockLedgerRunner.js:69`), so after a
longer absence `historyExists` is false and nothing is marked "new", the
first e1RM re-baselines rather than firing a PR (`blockMetrics.js:246, 325`).
`next_workout_index` resumes wherever the plan was left, which is
reasonable on the same device and always day 1 on another (P44-13).

### 2.9 Users with many plans

**Active vs archived.** See 2.6 (P44-02) and P44-03. On a clean install
`insertProgrammeFromCloud`'s INSERT path names no `is_archived` column
(`database.js:7109-7121`), so it defaults to 0 and every archived plan
returns to My Plans. For a Pro user who has re-run the wizard eight times
(`archiveOtherUserPlans` on each), that is eight plans on the restored
device where there was one. The cloud column has existed since
`migrate_012_complete_sync.sql:115`; this is a pure sync-layer omission,
not a schema gap. The LWW UPDATE path deliberately preserves the local
value (`database.js:7081-7083`), which is right, but that comment also
lists `folder_id` as local-only when `folder_id` is in fact pushed and
pulled (`sync.js:782-786`, `sync.js:2052-2056`), so the comment is stale
and should not be read as a design statement.

**Reactivation.** Covered in 2.6 and 2.8.

**Duplicate / copy.** `copyPlanFromLibrary` stamps `source_programme_id`
on the plan and `source_routine_id` on each routine
(`database.js:3836-3857`), pushed and pulled
(`sync.js:781`, `database.js:7097, 7111`). `duplicatePlan` stamps neither
(`database.js:3906-3932`) - P44-11. `PlanLibraryScreen` copies
unconditionally on every "Add" (`PlanLibraryScreen.js:389, 408`), so N
taps yield N identically named plans; `FreeStarterScreen` dedups by
provenance first, name second, but over the non-archived list only
(P44-12).

**Block history attribution.** `mesocycles` has no `programme_id` column,
locally (`database.js:273-287`, plus every `ALTER TABLE mesocycles`) or in
the cloud. The only plan link is `mesocycles.name`, a snapshot of the plan
name at activation, which `updateProgrammeName` never refreshes
(`database.js:3976-3980`). Consequences:

- a block is attributed to a plan by name only, so two plans sharing a
  name (two library copies, repeated "Copy of X") are indistinguishable
  in "Past blocks";
- renaming a plan does not rewrite history, which is the historically
  truthful behaviour and should stay;
- `PlanDetailScreen.handleAddToMyPlans` activates the copy under the
  **library** plan's name (`PlanDetailScreen.js:145`) while the programme
  row keeps `copyPlanFromLibrary`'s name, so block name and plan name are
  already allowed to differ.

None of this can misattribute *evidence*: every ledger read is keyed by
mesocycle UUID (P44-16), and `priorLedgerEntries` is muscle-scoped and
plan-blind on purpose (P9-17).

**Exercise history.** Plan-independent throughout (P9-18).

**Provenance.** `planned_muscle_volume.source` is written per row and
never inferred (`database.js:4201`), and `summariseSeededPlan` reads the
week-1 row's source explicitly rather than the first row seen
(`blockExplain.js:96-104`). The mechanism is sound; the copy attached to
the `template` value is not (P9-06).

### 2.10 Concurrency and idempotence at the switch (Campaign 5 laws)

- **`activatePlanWithBlock`'s `runInTransaction`**: present and unchanged
  (`database.js:3742-3756`), and pinned
  (`campaign5.firstUse.test.js:1801-1802`). But `setActivePlan` runs
  before it and `generateMesocycleWeeks` / `generateInitialPlannedVolume`
  after it (`database.js:3716, 3758-3760`), so the *user-visible* unit
  "this plan is active and this is its block" is not atomic (P9-09).
- **Synchronous entry guards**: `PlansScreen` (`restartingRef`,
  `PlansScreen.js:160, 366, 481`), `ManualBuilderScreen`
  (`activatingRef`, `:784, 788`), `PlanLibraryScreen` (`addingRef`,
  `:299`), `FreeStarterScreen` (`startingRef`, `:48, 139`) all hold one.
  `PlanDetailScreen` holds none - the file contains no `useRef` at all -
  on either `handleSetActive` (`:157-168`) or the "Add and start this
  plan" branch (`:133-152`). The RB-3 pin
  (`campaign5.firstUse.test.js:1788-1803`) checks the other three by name
  and does not reach this screen, so the gap is not a pinned-test
  conflict; the pin simply never covered it (P9-04).
- **Consequence chain of P9-04**: a double tap runs two activations. The
  RB-3 transaction keeps each atomic, so there is never a second
  `is_active` mesocycle - but there are two mesocycle rows with the
  **same** `start_date`. `getAllMesocyclesForUser` has no `ORDER BY`
  (`database.js:6834-6838`) and
  `buildSeedRangesForNextBlock` sorts by start date alone
  (`blockLedgerRunner.js:328-330`), so with equal keys the stable sort
  returns whichever row SQLite listed first. `createWorkout` attaches
  every session to the *active* row (`database.js:2597-2601`), so the
  loser has zero completed sets and would classify INSUFFICIENT_DATA on
  adherence for every muscle (`interBlock.js:282-286`). Six weeks later
  the decision card would be composed from the real block
  (`PlansScreen.js:276`, via `getActiveBlock`'s `created_at DESC`
  tiebreak) while the applied seed could be built from the empty one.
- **`setActivePlan` interleave (P9-08)**: the pair is
  `UPDATE ... SET is_active = 0 WHERE user_id = ?` then
  `UPDATE ... SET is_active = 1 WHERE id = ?`
  (`database.js:3694-3702`), not in a transaction. Order
  A.deactivate, B.deactivate, A.activate(P1), B.activate(P2) leaves two
  active programmes - the exact shape RB-3 closed on the mesocycle side.
  `getActivePlan` then picks arbitrarily (`LIMIT 1`, no `ORDER BY`,
  `database.js:3684-3687`), unlike `getActiveBlock`
  (`database.js:3986-3988`). The same two-row state is reachable from the
  cloud: `insertProgrammeFromCloud` applies `is_active` per row with no
  cross-row reconcile (`database.js:7094-7106`).
- **Provenance dedup via `source_programme_id`**: intact for
  `copyPlanFromLibrary` (write, push, pull, consume). Gaps at P44-11 and
  P44-12.

### 2.11 Manual plan edits as adaptive evidence (P9-10)

The invariant holds for the intended meaning and leaks on one edge.

Protected: manual **landmark** overrides never teach - `learnedRange`
skips any entry with `proposal.deferredToManual`
(`learnedRange.js:135-138`), and `isManualEdit` keeps untouched editor
defaults from counting as overrides (`blockLedgerRunner.js:227`).

Protected: an exercise **swap** mid-block cannot manufacture progress.
`stable` requires at least three sessions spanning both halves of the
block (`blockMetrics.js:257-258`), and once more than half the raw
sessions are unstable the muscle reports `discontinuity`
(`blockMetrics.js:312`), which is an INSUFFICIENT_DATA gate
(`interBlock.js:297-301`).

Leak: a pure **set-count** edit. `computeAchievedWeeklyPeak` measures what
the user actually completed (`blockLedgerGather.js:282-324`), so adding
sets to the routine mid-block raises `achievedPeak` above `plannedPeak`.
If that muscle also classifies RESPONSIVE, `computeLearnedRange` steps the
ceiling toward the higher achieved peak (`learnedRange.js:153-161`), and
the seed's deload week is sized from it (`blockSeed.js:124-146`).

Whether that is a defect is a genuine product question, not a bug: the
user did perform and tolerate that volume, and "highest handled peak" is
the ceiling's stated meaning. It is recorded here because the order's
invariant is worded about *plan edits*, and the code's exclusion is worded
about *landmark overrides*. Recommend it be ruled explicitly rather than
left implicit. Note the asymmetry: the `+1` start increase is separately
gated on the dose-response pair and composite confidence
(`interBlock.js:342-346`), so this leak moves the ceiling, not the start.

---

## 3. Verified invariants

| Order invariant (line) | Verdict | Evidence / caveat |
|---|---|---|
| One active plan (178) | **PARTIAL** | Enforced by `setActivePlan`'s deactivate-all (`database.js:3694-3697`), but the pair is not transactional and `getActivePlan` has no tiebreak (P9-08). A cloud pull applies `is_active` per row with no reconcile (`database.js:7094-7106`). |
| One coherent active block (178) | **PARTIAL** | The block itself is single and atomic (RB-3 transaction, `database.js:3742-3756`; `getActiveBlock` tiebreak `:3986-3988`). Coherence with the *plan* is not transactional (P9-09) and `PlanDetail`'s missing guard can leave a same-day twin (P9-04). |
| No orphan block (178) | **HOLDS in live paths** | No caller archives or deletes the active plan (`PlanDetailScreen.js:562`, `PlansScreen.js:653`); there is no user-facing plan deletion (`deleteProgrammeCascade` has only planAutoGen rollback callers). `archivePlan` itself would create one if ever called on the active plan (`database.js:3862-3868`). |
| No automatic transition (178) | **HOLDS** | Only one live `INSERT INTO mesocycles` (`database.js:3748`), reached solely from explicit activation; `createMesocycle` deleted at Stage 6 (`database.js:4469-4475`). `getBlockStatus` never advances anything (`mesocycle.js:457-496`). |
| Old ledger not attached to the wrong programme (178) | **HOLDS, with a bigger problem beside it** | Every ledger read and write is keyed by mesocycle UUID (`blockLedgerRunner.js:263-272, 391-407`). Nothing is misattributed. The real failure is that the ledger is often never created at all (P9-01). |
| Muscle history reused only where intended (178) | **HOLDS** | `priorLedgerEntries` is deliberately muscle-scoped across all prior mesocycles (`blockLedgerGather.js:357-378`); a block only carries an entry for muscles it planned or trained (`blockLedgerRunner.js:180-182`); suppression, manual-override and confidence gates all bind the replay (`learnedRange.js:133-146`). Cross-plan carry is by design, matching D97-9's "portable by design intent". |
| Exercise history remains historically truthful (178) | **HOLDS** | `mesocycle_id` / `mesocycle_week_id` / `routine_id` stamped at creation, never rewritten (`database.js:2591-2623`); PR and e1RM reads exercise-scoped (`blockMetrics.js:234-248`). Caveat outside evidence: block *date ranges* in Past blocks are untruthful after an abandonment (P44-05). |
| Manual plan edits do not become adaptive evidence (178) | **PARTIAL** | Landmark overrides and exercise swaps are protected (`learnedRange.js:138`, `blockMetrics.js:257-258, 312`). A mid-block set-count edit does reach the learned ceiling through `achievedPeak` (P9-10). |
| Campaign 5 transaction / idempotence laws green (179) | **PARTIAL** | `activatePlanWithBlock`'s transaction intact and pinned; guards intact on three of four activation screens; `PlanDetailScreen` uncovered by both the code and the pin (P9-04). Bracketing writes sit outside the transaction (P9-09). |
| Renamed / copied plan cannot steal adaptive block identity (446) | **HOLDS** | Identity is the mesocycle UUID; plan name is a display snapshot with no keying role (P44-16). `updateProgrammeName` does not rewrite history (`database.js:3976-3980`). |
| Active vs archived (445) | **FAILS** | Not a partition: a plan can be active and archived at once (P44-02), and archived state is device-local (P44-03). |
| Reactivation (445) | **PARTIAL** | Works and preserves history, but yields P44-02 on the View-plan route and block-one volumes with false "not enough history" copy on any route (P9-06, D97-9). |
| Duplicate / copy (445) | **PARTIAL** | Library copies carry provenance and dedup; user duplicates carry none (P44-11), the dedup list excludes archived plans (P44-12), and the library "Add" path never dedups at all. |
| Block history attribution (445) | **PARTIAL** | Evidence attribution is exact (UUID). Display attribution is name-only, with no `programme_id` on `mesocycles` in either schema, and abandoned blocks keep a full-length `end_date` (P44-05). |
| Provenance (445) | **PARTIAL** | The `source` column is written per row and read explicitly; the copy attached to `template` claims an absence of history that a mature user does not have (P9-06). |

---

## 4. Recommendations (for D97 ruling, not applied here)

1. **P9-01 / P9-07** - the highest-value fix in this lane, and it is not
   engine design: compute and persist the ledger for the block being left
   whenever a plan activation supersedes a block that has completed its
   accumulation weeks, or at minimum surface the mid-block dialogue in the
   recovery and awaiting-decision states so the loss is a user decision.
   Both are inside existing semantics (`awaitingDecision` already exists;
   no new age or freshness rule is involved, so D91-25 is untouched).
2. **P44-02** - `PlanDetailScreen` should read `is_archived`, badge it,
   and either unarchive on activation or route through Restore.
3. **P44-03** - add `is_archived` to `_pushProgrammes` and to
   `insertProgrammeFromCloud`'s INSERT column list, and schedule a sync
   from `archivePlan` / `unarchivePlan` / `archiveOtherUserPlans`. The
   cloud column already exists; no migration is required.
4. **P9-04** - one `useRef` guard on `PlanDetailScreen`'s two activation
   paths, and extend the RB-3 pin to enumerate all four screens.
5. **P9-06** - split the `template` copy: "not enough personal history
   yet" only when there is genuinely no prior ledger; otherwise a truthful
   line about this block starting from the standard ramp. Pairs naturally
   with whatever the founder rules on D97-9.
6. **P9-10** - rule explicitly whether a mid-block set-count edit should
   teach the learned ceiling.
7. **P9-08 / P9-09** - wrap `setActivePlan`'s pair, give `getActivePlan`
   the same `ORDER BY` tiebreak `getActiveBlock` already has, and consider
   pulling `setActivePlan` inside `activatePlanWithBlock`'s transaction.
