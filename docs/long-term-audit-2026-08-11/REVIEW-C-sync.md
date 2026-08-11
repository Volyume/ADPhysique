# ADVERSARIAL REVIEW C — REINSTALL AND TWO-DEVICE BEHAVIOUR

Campaign 6, fresh-eyes hostile review. The job was to BREAK the
restore/conflict story, not to confirm it.

**Authority.** The Campaign 6 order, Phase 55 (Review C), as relayed
verbatim in this lane's brief: *"Try to break: restore; provenance;
active block; ledger; manual override; coach Apply; tier; notification
prefs; nutrition targets; conflict resolution. Look for: stale
overwrite; duplicate learning; duplicate apply; missing explanations;
locally restored state with no live reader; row-cap truncation. Action
genuine findings."* Lead note carried: this lane REPORTS, the lead
actions. Binding law throughout: CLAUDE.md Section 2 inviolables
(ED-safety tier-blind, deterministic engine, Article 9 fail-closed, EU
residency, additive idempotent migrations, identity locked, no photo
cloud sync) and Section 4 (no silent corner-cutting).

**Claims under attack.** `REINSTALL-MATRIX.md`,
`MULTI-DEVICE-MATRIX.md`, `src/__tests__/campaign6.reinstall.test.js`,
`campaign1.syncConflict` + `cloudRestoreLWW`,
`AUDIT-REINSTALL-SYNC-OFFLINE.md` (S-n),
`AUDIT-CLOCK-SCALE-LOCAL-PARTNER.md`'s row-cap table plus the
just-landed T-12/T-13 pagination fixes (commit `fa35314d`), the
repaired `migrate_135` + local v72 (`database.coachOutputReid.test.js`),
S-2 guarded prefs (`ca6a6c4b`), the S-5 delete-queue fix (`0ab7af38`),
R-8 tombstones (`3ad52a20`).

**Already ruled, cited not re-litigated.** D92-11 (ED flag does not
propagate), FR-C4-2 (notification architecture), FR-C4-3
(`adaptation_events` mirror), S-19 (pre-134 cloud exposure), S-6/S-7
(134's non-refusal branches), T-17 (backup restores scan rows with dead
URIs). D97-RULINGS.md read end to end; every ruling that touches this
lane is cited where an attack lands on it rather than re-argued.

## Adversarial method

Read-only against the repository. **Nothing in `src/` was modified, no
test was written, changed or skipped, nothing was committed, pushed or
stashed, and no Supabase or cloud command of any kind was issued.** The
one file this lane created is this document.

Three kinds of evidence:

1. **Scratch probes driving the REAL appliers.** Three probe files kept
   OUTSIDE the repository
   (`<scratch>/jest/rc6a.test.js`, `rc6b.test.js`, `rc6c.test.js`), run
   with the same harness pattern the permanent E2E uses: a genuinely
   fresh local database built by the REAL init path (full schema + all
   `SCHEMA_MIGRATIONS` through v72 on real SQLite via `node:sqlite`,
   `PRAGMA user_version` verified = 72), restored through the REAL cloud
   appliers and driven through the REAL `markApplied` / `saveCoachOutput`
   engine path. Command:
   `npx jest --rootDir /home/user/ADPhysique --roots
   /home/user/ADPhysique/src <scratch>/jest --testMatch '**/rc6X.test.js'
   --moduleDirectories node_modules /home/user/ADPhysique/node_modules
   --runInBand`.
2. **The claimed suites run read-only as evidence.**
   `campaign1.syncConflict`, `cloudRestoreLWW`, `campaign6.reinstall`,
   `database.coachOutputReid` = **4 suites, 66 tests, all pass**. That
   matters: the pins are green *and* the defects below are real, because
   each pin exercises one side of a guard only.
3. **Source and migration reading**, cited `file:line` throughout.

**Posture.** Every named target got an attack designed to make it fail,
not a trace designed to confirm it. Where an attack failed, the negative
is recorded as FALSE-ALARM-CHECKED rather than dropped, because a
checked negative is what stops the next review re-running it.

---

# PART 1 — THE TEN TARGETS

## 1. Restore

**Attack.** Build a genuinely fresh database through the real init path,
restore an established account through the real appliers, then ask what
a user actually *has* at the end of the first post-reinstall session
rather than what rows exist.

**Result.** The row-level restore is broadly sound and the E2E executes
it. Three gaps in what the *user* gets:

- **Notifications are silent for the whole first session (RC6-8).** The
  launch-time re-lay reads `@volyume_notification_prefs` from
  AsyncStorage at `RootNavigator.js:1072,1109`, but on a fresh install
  that key does not exist yet: it arrives later in the same launch, from
  `_pullUserPrefs`, which runs LAST in `pullFromCloud` (`sync.js:1660`).
  `if (raw)` is false, so nothing is laid. The only other re-lay,
  `rescheduleForTimezoneIfChanged` (`scheduler.js:1235-1247`), returns
  early on first run (`if (stored === null) return`). Nothing re-lays
  after the pull. The user's reminders return on the NEXT cold launch,
  or when they open Notification Settings
  (`NotificationSettingsScreen.js:461`).
- **A deleted weigh-in can come back (RC6-3).**
- **The row-cap fix converts truncation into a multi-cycle restore
  (RC6-7)**, so a large account's first post-reinstall sync is
  incomplete by design rather than by accident.

The four "reinstall truths" hold except truth 3 ("nothing resurrects",
qualified by RC6-3) and truth 4 ("nothing double-fires", broken by
RC6-1/RC6-2).

**Verdict: HOLDS WITH CAVEAT.**

## 2. Provenance

**Attack.** S-11 frames the pre-132 provenance loss as a *fresh device*
problem. Attack the *established* device: give it a real ledger-seeded
row (`source = 'ledger'`, `mrv = 26`, i.e. a seeded peak above the
research MRV, exactly what `database.js:4289-4296` writes) and deliver a
NEWER pre-132 cloud copy of the same row.

**Result.** Proven downgrade (`<scratch>/jest/rc6b.test.js`, ATTACK 3):

```
ATTACK3 after newer pre-132 cloud row: mrv = 22 | source = template
```

22 is `VOLUME_LANDMARKS.chest.mrv` (`algorithms.js:21`). So the row's
provenance became `'template'` and its clamp band fell from the seeded
26 to the research 22 **on a device that already held the truth**. The
next coach volume apply on that device clamps at 22
(`coachApply.js:344-348`), and `buildBlockStartLines` emits the
research line, because `'template'` is a member of `RESEARCH_SOURCES`.

This directly falsifies the applier's own load-bearing comment:

```js
// src/lib/database.js:8152-8154
// - Last-write-wins by updated_at: a cloud row only replaces a local one
//   it is strictly newer than, so a stale device's push (which the next
//   pull would echo back) can never overwrite richer local provenance.
```

It can. The gate is on `updated_at` alone; it knows nothing about
whether the incoming row is *poorer*. Reachable whenever the other
device writes the row for any reason (applying a volume change, a block
rebuild) while the cloud table still cannot carry `mev/mav/mrv/source`,
i.e. until 132 runs.

**Verdict: HOLDS WITH CAVEAT** (S-11's severity is right; its scope in
the record is too narrow, and the applier's stated guarantee is false).
See RC6-5.

## 3. Active block

**Attack.** Restore two mesocycles that both carry `is_active = true`
(the two-devices-each-started-a-block case), and try to make the app
disagree with itself about which block is live.

**Result.** Both rows do land with `is_active = 1`
(`<scratch>/jest/rc6a.test.js`, ATTACK 5):

```
ATTACK5 active mesocycles after restore = [ {meso-A, is_active:1}, {meso-B, is_active:1} ]
```

But every reader resolves the same row: `getActiveBlock`
(`database.js:4075`) and the workout-attribution read
(`database.js:2631-2633`) both use
`ORDER BY created_at DESC LIMIT 1`, and the comment at
`database.js:2627-2630` names this exact cross-device case. Real
`created_at` is preserved by the applier (`database.js:7683-7688`), so
the tiebreak is stable. Completed blocks stay completed because status
is date-derived, confirmed by R-21/R-22 and E2E test 3.

**Verdict: HOLDS.** Recorded as RC6-11 (FALSE-ALARM-CHECKED) so it is
not re-run.

## 4. Ledger

**Attack.** The matrix and E2E test 3 both prove the *ledgerless* case:
a newer cloud row carrying no ledger cannot null a local one. Attack the
case nobody tested: a newer cloud row carrying a **stale, poorer**
ledger.

**Result.** The fresher local ledger is replaced wholesale
(`<scratch>/jest/rc6b.test.js`, ATTACK 9):

```
ATTACK9 ledger after newer cloud row with a stale ledger =
  {"v":1,"version":3,"entries":{"chest":{"classification":"INSUFFICIENT_DATA"}}}
```

The local ledger classified chest RESPONSIVE with `peakSets: 22`; the
incoming one classified it INSUFFICIENT_DATA. `insertMesocycleFromCloud`
preserves a local ledger only when `m.block_ledger == null`
(`database.js:7716-7718`); when the cloud carries any ledger at all and
the row is newer, the local value is overwritten by the whole-row
`INSERT OR REPLACE`.

Reachable because `computeAndStoreBlockLedger` is idempotent *per
device*, not across devices (`blockLedgerRunner.js:104-114` checks
`meso.blockLedger` and `LEDGER_VERSION` on the local row only). Two
devices that both reach the block end compute independently from their
own local evidence; whichever writes last wins, even when it learned
from strictly less. That is the "duplicates learning" risk the
MULTI-DEVICE-MATRIX marks CLEAN on the strength of "ledger key omitted
from push when absent" — which only covers the *absent* case.

**Verdict: HOLDS WITH CAVEAT.** The null-protection claim is true; the
"no duplicate learning" claim is true only for the same-evidence case.
See RC6-4.

## 5. Manual override

**Attack.** Try to make a stale device drop a manual landmark override:
via the stamp rule, via an unparseable cloud timestamp, via a failed
stamp read, and via the reinstall path where the device has no stamps at
all.

**Result.** No break found. `filterGuardedPulledPrefs`
(`sync.js:2013-2046`) fails CLOSED on every one of those: a failed stamp
read drops all guarded rows, an unparseable `updated_at` drops the row,
and the stamp rule keeps the local value whenever this device's own real
write is at least as new. On a reinstall there are no stamps, so
`Number.isFinite(localStamp)` is false and the cloud row is correctly
applied, which is what makes D97-19's correction to
PERSONALISATION-MATURITY.md right. Pinned green in
`campaign1.syncConflict` and `prefSync.landmarks` (run this session).

The S-2 extension (`ca6a6c4b`) adds
`/^@volyume_notification_prefs$/` and `/^@volyume_quiet_hours_v1$/` to
`GUARDED_PREF_PATTERNS` (`sync.js:1421-1422`) and every writer stamps
(`quietHours.js:52-56`, `ProOnboardingScreen.js:904`,
`NotificationSettingsScreen.js`, `CoachingRemindersScreen.js`,
`WeeklyCheckInScreen.js`). No machine-only writer of either key stamps,
so the reinstall restore is not self-blocked.

**Verdict: HOLDS.**

## 6. Coach Apply

**Attack.** The MULTI-DEVICE-MATRIX claims *"Receipt propagates: one
deterministic output id per week (v71/v72), LWW receipt preservation on
pull; B's Apply goes dead on its next pull"*, and REINSTALL-MATRIX truth
4 claims *"Nothing double-fires: applied receipts survive restore, so
Apply cannot be offered twice for the same week."* Attack both.

**Result. BROKEN, two independent ways.**

**(a) There is no receipt preservation on pull.**
`insertCoachOutputFromCloud`'s UPDATE branch replaces `output_json`
wholesale and writes `applied = co.applied ? 1 : 0` with no ratchet
(`database.js:7494-7517`). Device B merely viewing a checked-in week
re-saves it (`CoachOutputScreen.js:2031-2033` via `saveCoachOutput`'s
UPDATE branch, `database.js:6911-6931`, which stamps `updated_at = now`
and leaves `applied` alone), and push precedes pull every cycle
(`sync/runner.js:203-251`). Device A then pulls B's newer, unapplied
copy. Proven (`<scratch>/jest/rc6a.test.js`, ATTACK 1 and 1b):

```
ATTACK1 applied after pull = 0 | appliedAdjustments = undefined
ATTACK1b applied = 0 | json = {"weekStart":...,"whyThisWeek":"x","adjustments":{}}
```

Both halves of the receipt are gone, and a later local re-save cannot
recover them (`preserveAppliedAdjustments` merges from the row being
saved, which no longer has them). The user is shown a live Apply button
for a change already applied to their block, with no explanation that it
was applied. The reverse is also unprotected: an OLDER cloud row that
carries the receipt cannot deliver it (ATTACK 8, `applied` stays 0).
Migration 134 does not close this: B's write is genuinely NEWER, so 134
accepts it.

**(b) The `coach_outputs.applied` column is never written by any local
path.** The real apply flow is
`CoachOutputScreen` → `markApplied` (`coachApply.js:302-312`, which
writes into the output OBJECT) → `saveCoachOutput`, whose UPDATE branch
does not touch the column. Proven end to end against the real modules
(`<scratch>/jest/rc6c.test.js`):

```
PROBE-C applied COLUMN after a REAL apply = 0
PROBE-C output_json.appliedAdjustments = {"calories":{"appliedAt":...,"newKcal":2400}}
PROBE-C cloud row would carry applied = false
```

An exhaustive search finds no `SET applied` / `applied = 1` writer
anywhere in `src/`. `isApplied` (`coachApply.js:318-323`) reads
`output.appliedAdjustments`, never the column. The push maps
`applied: !!o.applied` (`sync.js:1067`), so **every production cloud row
carries `applied = false`.**

**Verdict: BROKEN.** See RC6-1 and RC6-2. RC6-2 also invalidates the
E2E's receipt assertion and, critically, migration 135's S-14
correction.

## 7. Tier

**Attack.** Try to land a reinstalling Pro user on Free, or to lose the
trial cascade fields.

**Result.** No new break. `refreshTierFromCloud`
(`useAppStore.js:1013-1088`) is server-authoritative, persists to
AsyncStorage before setting in-memory state, and refuses to downgrade
pro→free inside the optimistic paid window. Routing cannot false-flag a
returning user as new: only a `created_at` heuristic guess can be
corrected, never a per-uid cache hit (`useAppStore.js:838-862, 920-932`)
— S-9 confirmed.

Two recorded residuals reconfirmed rather than re-raised: the 5s cloud
read timeout leaves a reinstalling user on the locally derived tier
until a successful read (**P-10**, already in triage and named in the
REINSTALL-MATRIX row), and `set((s) => ({... userProfile: s.userProfile
? {...} : s.userProfile}))` at `useAppStore.js:1078-1086` silently drops
`trialState`/`proTrialEndsAt` when the profile has not hydrated yet;
harmless today because `restoreSessionFromCloud` writes the same two
fields on its own path (`useAppStore.js:953-955`), but it is an
unguarded race between two calls dispatched in parallel and unordered at
`RootNavigator.js:1310` and `:1316`. Recorded as an observation, not a
finding: no reachable user consequence was demonstrated.

**Verdict: HOLDS WITH CAVEAT** (P-10, already recorded).

## 8. Notification preferences

**Attack.** The matrix says PARTIAL BY ARCHITECTURE, *"restore YES, but
the dual family remains FR-C4-2"*. Accept FR-C4-2 as founder-gated and
attack the half that is not architecture: does the restored data reach a
live reader?

**Result.** The data restores (per-category SQLite rows with true LWW;
the blob and quiet hours now guarded by S-2). What does not happen is
the *effect*: nothing re-lays the schedule after the pull delivers the
blob, so the first post-reinstall session runs with no reminders at all
(mechanism in Target 1 above). This is not FR-C4-2 — it is an ordering
gap between `_pullUserPrefs` (last in the pull) and the launch-time
`restoreNotifications` (early in the launch), and it survives D97-6's
fix, which corrected *whether* the call runs, not *when* relative to the
data arriving.

**Verdict: HOLDS WITH CAVEAT.** See RC6-8.

## 9. Nutrition targets

**Attack.** Feed the real applier a cloud row with NO `updated_at` and
an OLDER `created_at`, and see whether it can overwrite live calorie
targets.

**Result.** It can (`<scratch>/jest/rc6a.test.js`, ATTACK 4):

```
ATTACK4 kcal before = 2600 | after timestamp-less cloud row = 1200
```

`insertNutritionTargetsFromCloud` computes
`updatedAt = ... ?? Date.now()` (`database.js:7546-7548`), so a row that
cannot prove its freshness is treated as maximally fresh and always wins
the `existing.updated_at >= updatedAt` gate. Every sibling applier does
the OPPOSITE and says so explicitly:

- `insertMesocycleFromCloud`: `if (cloudUpdated == null) return;`
  (`database.js:7679`) — *"Without a cloud timestamp the row cannot prove
  freshness over an existing local row, so it does not replace one."*
- `insertMorningWeightFromCloud`: *"we cannot prove it's newer, so we
  keep the local row"* (`database.js:7583-7586`).
- `insertMesocycleWeekFromCloud`: same refusal (`database.js:7743`).

No shipped push mapper omits `updated_at` (`_toIso` falls back to now,
`sync/tables/nutritionTargets.js:34-39`), so this is LATENT, not live.
It is recorded because the surface is a calorie target and the
inconsistency sits one line from three explicit refusals.

The pre-134 stale-push exposure on this table (a stale device landing old
calorie targets in the cloud) is **S-19**, already recorded; not
re-raised.

**Verdict: HOLDS WITH CAVEAT.** See RC6-9.

## 10. Conflict resolution

**Attack.** Walk the commissioned two-device scenario looking for a step
where the matrix's verdict is stronger than the code.

**Result.** The matrix is accurate on: appliers refusing older cloud rows
(S-18), calm as a one-way ratchet, the insight-dismissal ratchet
(D97-19 F5), the deterministic active-block tiebreak, real timestamps
preserved. It is **overstated** on three rows:

| Matrix row | Claim | Reality |
|---|---|---|
| "A applies weekly coaching" | "LWW receipt preservation on pull" | No such mechanism exists (RC6-1); the applier has no `preserveAppliedAdjustments` and no ratchet, proven |
| "A chooses adjustments (seeds next block)" | "no duplicate learning" | True for absent ledgers only; a poorer newer ledger wins outright (RC6-4) |
| "B reconnects" | "A's newer rows win, B converges" | Only after 134. Before it, B's own push overwrites the cloud copy with B's stale `updated_at` first, so B's subsequent pull then refuses its own echo and B does NOT converge that cycle. This is the composition of S-19 with the applier gate; the matrix's convergence statement does carry the "with 134 applied" precondition, so this is a caveat on the row, not a new finding |

The structural pattern across all three: **every conflict guard in this
codebase is a timestamp comparison, and the campaign has repeatedly
found that timestamps alone are the wrong rule for user-affecting
state.** Calm mode got a ratchet. Insight dismissals got a ratchet
(D97-19 F5). Manual landmarks got a stamp rule. The applied receipt, the
block ledger and row provenance did not, and all three break in exactly
the way the ratchets exist to prevent.

**Verdict: HOLDS WITH CAVEAT.**

---

# PART 2 — FINDINGS

Only genuinely NEW findings are listed. Everything traceable to D92-11,
FR-C4-2, FR-C4-3, S-19, S-6/S-7 or T-17 is cited in Part 1 and omitted
here.

| # | Class | Sev | Target | One line | Evidence |
|---|---|---|---|---|---|
| RC6-1 | DEFECT | **HIGH** | coach Apply | The coach-output pull applier has no receipt ratchet: a newer merely-viewed cloud row destroys `appliedAdjustments` AND the `applied` flag on the device that applied, re-arming Apply for an already-applied week; an older applied row cannot deliver its receipt either | `database.js:7494-7517`; `sync/runner.js:203-251`; proven `<scratch>/rc6a` ATTACK 1, 1b, 8 |
| RC6-2 | DEFECT | **HIGH** | coach Apply | `coach_outputs.applied` has NO local writer, so every production cloud row carries `applied = false`. This makes E2E test 7's receipt assertion a false positive, v71's `applied DESC` tiebreak inert, and **migration 135's corrected S-14 tie-break inert, so S-14 reproduces through its own fix** | `coachApply.js:302-323`; `database.js:6911-6931`; `sync.js:1067`; `migrate_135:53-71`; proven `<scratch>/rc6c` |
| RC6-3 | DEFECT | MED-HIGH | restore | `insertMorningWeightFromCloud` does not carry `deleted_at` through its `INSERT OR REPLACE`, so any newer cloud row resurrects a locally tombstoned weigh-in. The sibling appliers fixed this exact shape under D95 | `database.js:7588-7597`; proven `<scratch>/rc6a` ATTACK 2 |
| RC6-4 | DEFECT | MED | ledger | A newer cloud mesocycle row carrying a STALE or poorer ledger replaces a fresher local one wholesale; the ledger runner is idempotent per device, not across devices | `database.js:7716-7718`; `blockLedgerRunner.js:104-114`; proven `<scratch>/rc6b` ATTACK 9 |
| RC6-5 | DEFECT | MED | provenance | `insertOrUpdatePlannedMuscleVolumeFromCloud`'s own comment claims a stale push "can never overwrite richer local provenance". Proven false: an established device is downgraded from `source='ledger'`, `mrv=26` to `source='template'`, `mrv=22`. Widens S-11 from fresh-device to any-device | `database.js:8152-8154, 8166-8192`; `coachApply.js:344-348`; proven `<scratch>/rc6b` ATTACK 3 |
| RC6-6 | DEFECT | MED-HIGH | conflict resolution | The only file that CREATES cloud `coach_outputs` already declares `UNIQUE(user_id, week_start)` — at the very lines the S-audit cited as its scratch-table source. If that constraint is live in production, S-15's 23505 poison is a LIVE condition today rather than a post-135 risk, and the "hold 135 until v72 ships" ordering is inverted | `setup_complete.sql:364-372` (UNIQUE at :371); no `CREATE TABLE coach_outputs` in any `migrate_*.sql`; `migrate_018` alters PK only; `AUDIT-REINSTALL-SYNC-OFFLINE.md:30-33` |
| RC6-7 | DEFECT | MED | row-cap truncation | T-13's ascending+cap fix does not close the truncation skip when more than 1,000 rows share one `updated_at`: 500 of 1,500 are permanently skipped. The fix's own comment ("every undelivered row sits ABOVE it") is false at the boundary, and the implementation took a weaker route than the audit's own recommended `fetchAllRows` without recording the departure | `sync.js:2088-2094, 2171-2178, 2230-2237, 1819-1828`; `watermark.js:69-71`; `sync.js:127-148`; proven `<scratch>/rc6b` ATTACK 10 |
| RC6-8 | DEFECT | MED | notification prefs / restore | After a reinstall, nothing re-lays the notification schedule once the pref pull delivers the blob, so the first session runs with no reminders at all; they return on the next cold launch | `RootNavigator.js:1072-1074, 1109-1112`; `sync.js:1660`; `scheduler.js:1235-1247`; `NotificationSettingsScreen.js:461` |
| RC6-9 | LATENT | MED | nutrition targets | `insertNutritionTargetsFromCloud` treats a cloud row with no `updated_at` as `Date.now()`, so an unprovable row always wins and can overwrite live calorie targets. Three sibling appliers explicitly refuse in that case | `database.js:7546-7548, 7560-7561`; contrast `:7679, 7583-7586, 7743`; proven `<scratch>/rc6a` ATTACK 4 |
| RC6-10 | LATENT | LOW | coach Apply | The applier's not-found branch is `INSERT OR IGNORE`; a unique-index collision discards a cloud row (including its receipt) with no log, no warning and no telemetry, so the failure mode is unobservable | `database.js:7519-7538`; proven `<scratch>/rc6b` ATTACK 7 |
| RC6-11 | FALSE-ALARM-CHECKED | — | active block | Two `is_active = 1` mesocycles DO restore, but every reader shares `ORDER BY created_at DESC LIMIT 1` and real `created_at` is preserved, so the active block is deterministic | `database.js:4075, 2631-2633, 7683-7688`; `<scratch>/rc6a` ATTACK 5 |
| RC6-12 | FALSE-ALARM-CHECKED | — | coach Apply | 135's re-id `'co_' \|\| week_start::text \|\| '_' \|\| user_id::text` matches the client's mint: `week_start` is `BIGINT` ms and `localUserId === supabaseUserId` under the identity lock, so no new id drift is introduced | `setup_complete.sql:367`; `database.js:6940`; `RootNavigator.js:1477`; `IDENTITY_AND_OWNERSHIP_LOCKED.md` |
| RC6-13 | FALSE-ALARM-CHECKED | — | restore | The workouts PUSH watermark's premise ("a completed workout is immutable, no edit path re-opens it") holds: set editing is confined to the in-session `ActiveWorkoutScreen` (`is_completed = 0`, not yet in the pushed set), and the post-completion summary edits go through `updateWorkout`, which bumps the parent's `updated_at` | `sync.js:663-675`; `ActiveWorkoutScreen.js:1955, 2031`; `WorkoutSummaryScreen.js:580, 767` |

**Counts: 8 DEFECT (2 HIGH, 2 MED-HIGH, 4 MED), 2 LATENT, 3
FALSE-ALARM-CHECKED.** Nothing was classed UNCERTAIN. No pinned test
contradicted the order anywhere in this lane; the pins are green because
they test one side of each guard, which is the review's central point.

**Coverage of the six named failure classes.**

| Class | Where it landed |
|---|---|
| Stale overwrite | RC6-1 (receipt), RC6-4 (ledger), RC6-5 (provenance), RC6-9 (calorie targets); S-19 cited for the cloud-side half |
| Duplicate learning | RC6-4 |
| Duplicate apply | RC6-1, RC6-2 |
| Missing explanations | RC6-5 (a false "research-based guidance" line on a device that held the truth); RC6-1 (an Apply button with no statement that it was already applied); S-4/FR-C4-3 cited for the Engine Log |
| Locally restored state with no live reader | RC6-8 (blob restored, nothing re-lays it that session); RC6-2 (the inverse shape: a restored column no writer ever populates); S-4/FR-C4-3 cited |
| Row-cap truncation | RC6-7 |

---

# PART 3 — FINDINGS IN DETAIL

## RC6-1 (DEFECT, HIGH) — the applied receipt has no ratchet on pull

**Claim attacked.** MULTI-DEVICE-MATRIX: *"Receipt propagates ... LWW
receipt preservation on pull; B's Apply goes dead on its next pull."*
REINSTALL-MATRIX truth 4: *"applied receipts survive restore, so Apply
cannot be offered twice for the same week."*

**Mechanism.** Three shipped facts compose.

1. Push precedes pull every cycle (`sync/runner.js:203-251`).
2. Viewing a checked-in week on the other device re-saves it. The
   on-view save is gated on `weekWasCheckedIn`
   (`CoachOutputScreen.js:2031-2033`), which is satisfied for any week
   the user actually checked in for, and the check-in itself syncs.
   `saveCoachOutput`'s UPDATE branch stamps `updated_at = now` and
   leaves the receipt alone (`database.js:6911-6931`). Device B's row is
   therefore newer and carries no `appliedAdjustments`, because B never
   applied and never pulled A's copy.
3. `insertCoachOutputFromCloud`'s UPDATE branch replaces `output_json`
   wholesale and writes `applied = co.applied ? 1 : 0`
   (`database.js:7494-7517`). There is no ratchet and no merge.

**Proven** (`<scratch>/jest/rc6c.test.js` establishes that the applier
contains no `preserveAppliedAdjustments`; `rc6a.test.js` ATTACK 1 drives
it):

```
ATTACK1 applied after pull = 0 | appliedAdjustments = undefined
ATTACK1b applied = 0 | json = {"weekStart":...,"adjustments":{}}
```

ATTACK 8 proves the symmetric hole: an OLDER cloud row carrying the
receipt is refused by the `existing.updated_at >= cloudUpdated` gate, so
the receipt cannot travel backwards either.

**Concrete user consequence.** The user applies Monday's calorie change
on their phone. On Tuesday they open the Coach tab on their tablet to
re-read the week. The tablet pushes first. Their phone's next sync
erases the receipt. Both devices now show a live Apply button for a
change already in the block. Tapping it applies the calorie and volume
change a second time. Nothing in the UI says it was already applied.

**Migration 134 does not close this.** B's write is genuinely newer, so
the stale-write trigger accepts it. This is a distinct exposure from
S-19 (which is about *stale* writes corrupting the cloud) and from S-14
(which is about migration 135's DELETE).

**Direction sketch (NOT applied).** The codebase already has the right
pattern twice, and this is the third instance of the same shape:

- (a) **An applied ratchet on the pull**, mirroring the calm ratchet
  (`sync.js:1993-2000, 2037-2040`) and the insight-dismissal ratchet (D97-19 F5,
  `database.js:8040-8060`): a pulled row whose `output_json` carries no
  `appliedAdjustments` may never clear a local non-null
  `appliedAdjustments`, whatever its timestamp. Reuse
  `preserveAppliedAdjustments` (`database.js:6896-6902`), which already
  implements exactly this merge and is already tested, by calling it in
  the applier's UPDATE branch against the existing local `output_json`.
  Smallest change, uses only shipped and pinned code, and it is the same
  asymmetry the founder has already accepted twice.
- (b) Make the receipt an append-only per-adjustment map rather than a
  whole-JSON field, so no single write can clear it. Larger, and it
  changes the stored shape.
- (c) Never re-save on view. Removes the trigger but not the class, and
  it loses the persisted `consecutiveOffTargetWeeks` that the on-view
  save exists to write (`CoachOutputScreen.js:2015-2024`).

(a) is the option that matches the architecture. Whichever is chosen,
the pinned E2E assertion must move off the dead column (RC6-2).

## RC6-2 (DEFECT, HIGH) — `coach_outputs.applied` has no local writer

**What was proven** (`<scratch>/jest/rc6c.test.js`, driving the REAL
`markApplied` and `saveCoachOutput`):

```
PROBE-C applied COLUMN after a REAL apply = 0
PROBE-C output_json.appliedAdjustments = {"calories":{"appliedAt":...,"newKcal":2400}}
PROBE-C cloud row would carry applied = false
```

`markApplied` (`coachApply.js:302-312`) writes into the output OBJECT
(`adjustments[key].applied = true` plus the `appliedAdjustments` map);
`isApplied` (`:318-323`) reads that object. `saveCoachOutput`'s UPDATE
branch (`database.js:6913-6929`) never lists the `applied` column, and
its INSERT branch (`:6941-6954`) never sets it either. An exhaustive
search finds no `SET applied` / `applied = 1` writer anywhere in
`src/`. The only writer in the codebase is
`insertCoachOutputFromCloud`, and the only source it can read from is
`sync.js:1067`'s `applied: !!o.applied` — a value that originates from
the same column. The column is a closed loop with no entry point.

**Four consequences, in ascending order of severity.**

1. **E2E test 7 is a false positive.** It feeds `applied: true` into the
   applier and asserts `row.applied === 1`
   (`campaign6.reinstall.test.js:159-176`). A production cloud row can
   never carry `applied: true`, so the test proves a mechanism that
   cannot fire. It is green, and it certifies nothing about the real
   receipt.
2. **Local migration v71's tiebreak is inert.** Its dedup orders by
   `COALESCE(updated_at, created_at, 0) DESC, applied DESC, rowid DESC`
   (`database.js:2108-2113`); with `applied` always 0, the `applied
   DESC` term never breaks a tie.
3. **Migration 135's S-14 correction is inert.** The repaired predicate
   ranks `(w.applied::int, COALESCE(w.updated_at, w.created_at), w.id)`
   (`migrate_135:58-70`) and its header states *"The applied row now
   wins OUTRIGHT; recency only splits same-applied pairs."* With every
   production row at `applied = false`, the leading term is constant and
   the predicate degenerates to pure recency — **exactly the S-14 defect
   the correction exists to remove.** Reproduced over production values:

   ```
   PROBE-C 135 survivor with production applied values = b
     (a = the applied row, b = the merely-viewed newer row)
   ```

   D97-23 records S-14 as *"FIXED, UNAPPLIED (route A+C) ... Proven in a
   scratch cluster (S-14 receipt survives)"*. That proof holds only
   because the scratch fixture set `applied` true. It does not hold for
   production data.
4. **Both matrices' receipt rows rest on it.** The REINSTALL-MATRIX
   "Coach outputs + APPLIED receipts | YES, converged" cell and the
   MULTI-DEVICE-MATRIX receipt row both describe convergence on a value
   that is constant.

**Direction sketch (NOT applied).** Two halves, and the first is
required before 135 is ever run:

- (a) **Decide what the receipt IS, then make one thing true.** Either
  make `saveCoachOutput` write `applied = 1` whenever the output it is
  storing carries `appliedAdjustments` (one line in the UPDATE branch
  and one in the INSERT branch, derived from the JSON so the two can
  never disagree), which makes 135's tie-break, v71's tie-break and the
  E2E assertion all meaningful at once; or drop the column and re-express
  135's tie-break over `output_json`, which needs a JSON predicate in
  SQL and is the larger change. The first is strictly smaller and makes
  three existing mechanisms correct instead of inert.
- (b) **135 must not be run until (a) ships**, on the same
  "only after the client build is live" logic already recorded for v72
  in the migration header. Running it as written re-opens S-14 on real
  data.

This is a founder-visible release fact, not only a code fix: the
recorded release condition for 135 is currently incomplete.

## RC6-3 (DEFECT, MED-HIGH) — a newer cloud weigh-in resurrects a tombstone

**Claim attacked.** REINSTALL-MATRIX: *"Morning weights | YES;
tombstones respected ... A deleted weigh-in stays deleted."* E2E test 6
proves one direction only: an OLDER cloud copy cannot resurrect a newer
tombstone.

**Mechanism.** `insertMorningWeightFromCloud`'s `INSERT OR REPLACE`
column list is `(id, user_id, weight_kg, logged_at, notes, created_at,
updated_at)` (`database.js:7588-7597`). `deleted_at` is not in it, and
`INSERT OR REPLACE` deletes the old row before inserting, so the column
returns to NULL. The applier's correctness therefore depends entirely on
its caller's `.is('deleted_at', null)` filter (`sync.js:2219`), which
means it depends on the CLOUD tombstone being intact.

**Proven** (`<scratch>/jest/rc6a.test.js`, ATTACK 2), using the real
`deleteMorningWeightById` soft-delete (`database.js:5642-5652`):

```
ATTACK2 deleted_at after newer cloud row = null | visible = [ 'mw-x' ]
```

**Reachable.** R-8 gave Body Metrics an edit path for Home weigh-ins. A
second device that holds the row un-deleted and edits it after the
deletion pushes `deleted_at: null` with a newer `updated_at`
(`sync.js:1048-1049`), 134 accepts it as genuinely newer, the pull delivers
it, and the deletion is undone. Pre-134 the cheaper route is S-19: any
stale device's routine bulk push overwrites the cloud tombstone with
`deleted_at: null`, after which the next full pull on a reinstall
restores the weigh-in.

**Why this matters beyond tidiness.** Morning weights are the exclusive
input to the rapid-loss and max-safe-loss gates (D97-23's R-3 record).
A resurrected weigh-in re-enters that series.

**Direction sketch (NOT applied).** Carry `deleted_at` through the
applier exactly as the two siblings already do, with the same rationale
already written in the code:

```js
// database.js:8118-8121 (peak_week_plans), under D95:
// carry deleted_at through the applier like the sibling appliers do -
// INSERT OR REPLACE without it resurrected a locally soft-deleted row
// on every pull.
```

`insertOrUpdateWorkoutNoteFromCloud` (`database.js:8076-8093`) does the
same. Two appliers are missing it: `morning_weights` and
`exercise_user_notes` (`database.js:8064-8075`, whose local table does
carry a `deleted_at` column, verified by `PRAGMA table_info` in
`<scratch>/rc6a` ATTACK 6). Adding the column to both is additive, uses
the established pattern, and makes the applier correct independently of
its caller's filter.

## RC6-4 (DEFECT, MED) — a poorer ledger wins on recency alone

**Mechanism and proof** are in Target 4 above. The gap is that
`insertMesocycleFromCloud` protects the ledger against being *nulled*
(`database.js:7716-7718`) but not against being *replaced by a worse
one*, and `computeAndStoreBlockLedger`'s idempotency
(`blockLedgerRunner.js:104-114`) is scoped to the local row.

**Concrete user consequence.** Two devices both reach the block end. The
one that pulled less of the block's evidence classifies muscles
INSUFFICIENT_DATA where the other classified them RESPONSIVE. Whichever
writes last is the ledger that seeds the next block, so the next block's
volumes are built from the poorer judgement. Since the ledger is
idempotent by version, the better one is never recomputed.

**Direction sketch (NOT applied).** In rough order of fit:
(a) refuse to replace a local ledger of the same `LEDGER_VERSION` from a
cloud row, mirroring the local idempotency rule and the ratchet posture
elsewhere (smallest, and the deterministic engine makes same-evidence
ledgers identical anyway, so it costs nothing when the devices agree);
(b) prefer the ledger carrying the greater evidence coverage, which
means putting a comparable evidence count inside the ledger JSON, a
content change; (c) recompute the ledger on pull with `force: true` when
the incoming and local ledgers disagree, which is the most correct and
the most expensive. (a) is the one that reuses a shipped, already-ruled
rule.

## RC6-5 (DEFECT, MED) — the provenance applier's guarantee is false

Mechanism, proof and the falsified comment are in Target 2 above.

**Relationship to S-11.** S-11 is correct and this does not contradict
it; it widens it. S-11's evidence is a *clean device* restoring
provenance-less rows. This is an *established* device losing provenance
it already held, which means the pre-132 exposure is not bounded to new
installs and the release argument for 132 is stronger than recorded. The
recorded direction for 132 is unchanged.

**Direction sketch (NOT applied).** Independent of 132, and worth doing
either way because it makes the applier's own stated contract true:
(a) when the incoming row carries no `mev`/`mav`/`mrv`/`source` and the
local row does, MERGE rather than replace — keep the local band and
label, take the incoming `planned_sets` and timestamp. That is a
three-line change inside the existing degrade branch
(`database.js:8166-8175`), it preserves the honest-degrade behaviour for
rows that have no local provenance (which is what E2E test 4 pins), and
it removes the "richer loses to newer" hole the comment already
promises does not exist. (b) Do nothing and correct the comment to state
the real rule. (a) is the option that keeps the promise.

## RC6-6 (DEFECT, MED-HIGH) — the 135 storyline rests on an unchecked constraint

**The fact.** Cloud `coach_outputs` is created in exactly one file:

```sql
-- supabase/setup_complete.sql:364-372
CREATE TABLE IF NOT EXISTS coach_outputs (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  week_start BIGINT NOT NULL,
  output_json TEXT NOT NULL,
  applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)          -- line 371
);
```

No `migrate_*.sql` creates the table (`schema.sql` does not either).
`migrate_018_composite_pks.sql` rewrites the PRIMARY KEY only and never
touches other constraints (`:164-227`). `migrate_012` adds `updated_at`
and `deleted_at` (`:39-51`). So the unique constraint that migration 135
exists to add has been part of the table's only definition since
creation.

**Why this is a finding and not a footnote.** The S-audit's method
section states its scratch cluster carried *"hand-built copies of the
production table shapes taken from ... `setup_complete.sql:364-372`"*
(`AUDIT-REINSTALL-SYNC-OFFLINE.md:30-33`) — the exact range containing
line 371. S-14, S-15 and S-16 all require two rows to coexist for one
`(user_id, week_start)`, which that constraint forbids. The scratch
table must therefore have differed from its cited source at the one line
that decides the answer.

**Both branches matter.**

- **If the constraint IS live in production:** 135's DELETE finds
  nothing and its index duplicates an existing constraint, so 135 is
  near-redundant. More importantly, **S-15's 23505 poison is happening
  today**, not after 135: any device holding a legacy `uid()` id for a
  week whose cloud row has a different id is already having its whole
  200-row `coach_outputs` batch rejected (`sync.js:1064-1068`, no
  per-row retry), silently, with only a `logPgErr`. That inverts the
  recorded release order: **v72 stops being a precondition for 135 and
  becomes an urgent standalone fix**, and holding 135 provides no
  protection at all. S-14 and S-16, conversely, become unreachable.
- **If it is NOT live:** production's `coach_outputs` differs from the
  only file in the repository that creates it, in a way nothing records.
  That discrepancy is itself worth knowing before any migration in this
  batch is run.

**Direction sketch (NOT applied).** This needs one read-only fact, not a
code change. A single query answers it definitively and touches nothing:

```sql
SELECT conname, contype, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conrelid = 'public.coach_outputs'::regclass;
```

Whichever way it comes back, `MIGRATION-RELEASE-GATES.md` and the
D97-23 record need the answer written into them before the founder is
asked for "run against production" on this batch. **This lane issued no
cloud command and did not run it.**

## RC6-7 (DEFECT, MED) — T-13's fix does not close the equal-timestamp skip

**What the fix claims.** The comment landed at four sites
(`sync.js:2089-2094` and siblings) states: *"with ascending order every
undelivered row sits ABOVE it, so the next cycle collects it instead of
skipping it for ever."*

**Attack.** Simulate the shipped rule (`.gte(wm)` + ascending +
`.limit(1000)` + `nextWatermark`) against two deltas, using the REAL
`nextWatermark` (`<scratch>/jest/rc6b.test.js`, ATTACK 10):

```
ATTACK10 [distinct]         cycles=4 delivered=2500/2500
ATTACK10 [identical-stamp]  cycles=2 delivered=1000/1500
```

For distinct timestamps the fix works exactly as claimed. For rows
sharing one `updated_at`, the undelivered rows sit AT the watermark, not
above it: `.gte` returns them, the 1,000-row cap truncates the same page
again, `nextWatermark` cannot advance, and 500 rows are skipped for
good. The claim in the comment is false at precisely the boundary the
fix is about.

**Reachability.** A shared timestamp across many rows is not exotic:
Postgres `now()` is transaction-constant, so `migrate_012`'s
`ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()` stamped every
pre-existing row of all four tables with one value, and any future
backfill or bulk `UPDATE` does the same. The four tables' natural growth
makes 1,000 rows remote (T-13's own reachability analysis stands), so
this is severity MED on the same "the rule is wrong now" basis T-13 used
for itself.

**Second observation, on process.** T-13's own direction sketch said:
*"Wrap each of the four in `fetchAllRows` exactly as
`_pullMorningWeights` already does — same watermark closure shape, same
clean-pass gate — so a truncation becomes a second page rather than a
lost row."* `fetchAllRows` (`sync.js:127-148`) paginates with `.range()`
**within one cycle** and throws on a mid-pagination error so the caller
holds its cursor. The landed fix instead used order + cap, which
resolves over N cycles, leaves a partial restore visible to the user in
between, and has the equal-timestamp hole above. Choosing the lighter of
two options is a founder or lead decision under CLAUDE.md Section 4, and
the departure is not recorded in D97-24, the commit message or the code
comment.

**Direction sketch (NOT applied).** Take the audit's original direction:
route all four through `fetchAllRows`, keeping the existing watermark
closure and clean-pass gate. It removes the multi-cycle restore, removes
the equal-timestamp hole (pagination is by offset, not by timestamp),
and matches five existing call sites. If the lead prefers to keep
order + cap, the comment must be corrected to state the real rule, and
the equal-timestamp case needs a secondary cursor (for example
`(updated_at, id)` keyset pagination) to remain skip-free.

## RC6-8 (DEFECT, MED) — reinstall leaves the first session with no reminders

Mechanism and citations are in Target 1 and Target 8 above.

**Concrete user consequence.** A user reinstalls on a Saturday, signs
in, grants notification permission and uses the app. Their weekly
check-in reminder, training reminders, meal reminders and coach-ready
re-lay are all absent for that session, because the blob that drives
them arrived after the only thing that reads it had already run. If the
reminder was due before their next cold launch, it does not fire at all.
D97-6 fixed the case where the launch-time call never ran; this is the
ordering residual it did not cover.

**Direction sketch (NOT applied).**
(a) Re-lay after the pref pull completes: call `restoreNotifications`
once at the end of a successful `pullFromCloud` (or from the sync
runner's clean-pass path) when the blob is present and the launch-time
attempt found nothing. Small, uses the existing entry point, and every
scheduler inside already self-gates on permission, tier, toggles, push
budget and the ED flag, so it changes no policy — the same argument
D97-6 used.
(b) Have `rescheduleForTimezoneIfChanged` not return early on first run
when a blob exists. Narrower but it conflates two concerns.
(c) Re-lay when notification permission is granted, which covers the
common reinstall ordering but not a user who granted permission before
the pull landed.
(a) is the one that fixes the class rather than an instance.

## RC6-9 (LATENT, MED) — the timestamp-less nutrition-target row wins

Mechanism, proof and the three contrasting siblings are in Target 9
above. Latent because no shipped push mapper omits `updated_at`.

**Direction sketch (NOT applied).** Mirror the siblings verbatim: when
an existing local row is present and the cloud row carries no
`updated_at`, return without writing, with the same one-line rationale
the mesocycle applier already carries. One line, strictly conservative
(it can only ever refuse a write), and it removes an inconsistency on a
calorie surface.

## RC6-10 (LATENT, LOW) — the silent receipt drop

`insertCoachOutputFromCloud`'s not-found branch is `INSERT OR IGNORE`
(`database.js:7519-7538`). When a device holds a legacy id for a week
whose cloud row has the deterministic id, the id lookup misses, the
insert collides with v71's unique index, and the row is discarded with
no log line. Proven (`<scratch>/jest/rc6b.test.js`, ATTACK 7):

```
ATTACK7 rows for the week = [{"id":"legacy-uid-1","applied":0}]
```

The cloud row's receipt never landed and nothing recorded that it
happened. v72 (`database.js:2117-2133`) closes the known population by
re-idding legacy rows at upgrade, and this lane confirms v72 runs
(`user_version = 72` on the fresh init path). The residual is
observability: if a row ever escapes v72, the loss is invisible.

**Direction sketch (NOT applied).** Check `changes === 0` after the
`INSERT OR IGNORE` and emit `logWarn` with the id and week, so the
condition is diagnosable from the Debug logs surface. Purely additive,
no behaviour change.

---

# PART 4 — WHAT THIS LANE DID NOT DO

- Modified nothing in `src/`, no test, no other document. Every
  direction sketch is described and left for the lead to rule and
  implement.
- Ran no migration and issued no Supabase or cloud command of any kind.
  RC6-6's verification query is written out for the founder and was
  **not run**.
- Committed, pushed and stashed nothing; touched no branch.
- Did not re-raise D92-11, FR-C4-2, FR-C4-3, S-19, S-6/S-7 or T-17 as
  discoveries. Each is cited where an attack landed on it.
- Proposed no wholesale sync consolidation, no freshness or decay
  semantics (D91-25 untouched), and no change to any ED-safety floor,
  gate or suppression.
