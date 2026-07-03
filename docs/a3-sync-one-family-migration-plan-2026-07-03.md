# A3 — Sync one-family migration plan (read-only, memo only)

Date: 2026-07-03. No code changed by this memo. Builds on, and re-verifies
against current `HEAD`, two prior documents — read those for the full
per-table evidence trail, this memo does not repeat it:

- `docs/e12-sync-consolidation-memo-2026-07-03.md` — Options A/B/C decision
  memo. Founder chose **Option C** (staged, one family per release) and
  approved steps 0–1, both now shipped: `2e054c` (delete the orphan
  registry `sync_queue`) and `78f58af` (retire the three legacy dual
  writers — `sex` now mirrors via the `profiles` handler).
- `docs/f5-legacy-sync-plan-2026-07-02.md` — the exhaustive 22-table
  per-table map (evidence, risk, target shape, work items) that Option C's
  steps are drawn from. Its four CONFIRMED blocking constraints (C1–C4)
  and mitigations are the safety contract every step below inherits.

This memo is the **execution-ready build plan for Option C step 2**: the
next family in the founder-approved order. It is scoped narrower and more
concrete than F5 (one family, not 22 tables) and it re-verifies F5's claims
against the code as it stands today, because F5 Phase A landed three
commits afterwards that changed some of the "Current" state F5 described
(`eaee7c8`, `702eca6`, `a3e0d57` — honest push timestamps, tombstone-aware
legacy pulls, per-call Article 9/sign-out guards). Section 2 flags exactly
what changed and what F5's analysis still gets right.

Mandate reminder (CLAUDE.md): this is plan-only, never built concurrently
with the E1 programme, and cloud migrations are founder-run, additive,
idempotent, and headered.

---

## 1. Migrated vs legacy, as of `HEAD`

**Registry path** (`src/lib/sync/registry.js` + `transport.js`) owns 21
tables via `MIGRATED_TABLES` (`transport.js:78-96`), each with a per-table
handler under `src/lib/sync/tables/`:

```
notification_preferences, weekly_checkins_v2, body_composition_log,
weight_log (alias, no-op), nutrition_targets, profiles, ed_pattern_flags,
tier_history, daily_steps, cardio_log, partner_signals, meal_plans,
plan_folders, food_entries, custom_foods, saved_meals, recipes,
food_favourites, daily_water, daily_intake_rollups, recipe_ingredients
```

**Legacy path** (`src/lib/sync.js`, 1,800 lines) still owns everything
else, driven by `bulkUploadLocalData` (push) + `pullFromCloud` (pull),
called once per cycle from `runner.js:159,199-263` alongside the per-table
loop. Remaining legacy tables, grouped by shape:

| Group | Tables | Local schema state |
|---|---|---|
| Training core (heaviest, highest risk) | `workouts`, `workout_sets`, `programmes`, `routines`, `routine_exercises`, `mesocycles`, `mesocycle_weeks` | all have `updated_at`+`deleted_at` already (v19 block) |
| Exercise identity | `exercises`/`custom_exercises` | dual-table dedupe-by-name FK rewrite |
| **Family 2 (this memo)** | `morning_weights`, `coach_outputs`, `user_insights`, `exercise_user_notes`, `exercise_goals`, `adaptation_events`, `planned_muscle_volume`, `workout_notes` | mixed — see §3 |
| Decision-gated | `peak_week_plans` | standing draft-DROP migration (049) unresolved |
| Singleton/Article-9-adjacent | `user_body_profile` | needs per-column merge design (P1), not LWW |
| Cross-cutting | `user_prefs` | needs a bespoke handler + per-key metadata (SD-8), last in Option C order |

Two offline-queue implementations still coexist: the registry path has no
queue at all now that step 0 deleted the dead `sync_queue` (status reads
`pending_sync_ops` directly); the legacy path still uses
`pending_sync_ops`/`src/lib/syncQueue.js` for on-save retries (`workout`,
`morning_weight` queue ops — the only two legacy queue ops left after
`78f58af` retired `check_in`/`body_metric`).

`src/lib/sync/watermark.js` — despite living under the "new" `sync/`
directory — is imported **only** by legacy `sync.js` (`grep` confirms the
sole non-test importer). Every registry handler built so far
(`cardioLog.js`, `bodyComposition.js`, `recipeIngredients.js`,
`weeklyCheckins.js`, `planFolders.js`, `mealPlans.js`) uses a different,
simpler contract: **full `select` scoped to `user_id`, then a per-row LWW
gate via a `getXUpdatedAt` lookup before applying** — no cursor, no
watermark file. This is a load-bearing fact for §5 below.

---

## 2. What F5 Phase A already fixed (re-verified against `HEAD`)

Three commits landed after F5 was written, each a documented, narrow
mitigation. All three touch tables in Family 2, so their "Current" state
in F5 is now partially stale:

- **`eaee7c8`** — bulk pushes for `morning_weights`, `coach_outputs`,
  `user_insights` (plus training tables) now carry the row's real
  `updatedAt ?? createdAt ?? Date.now()` instead of re-stamping `now()`
  every cycle (`sync.js:952,972,1041` today). **Caveat found this session
  (not in F5 or E12): for `coach_outputs` this fix is currently a no-op.**
  `saveCoachOutput`'s `UPDATE` branch (`database.js:5618-5629`) — the only
  local write path, called from every "apply an adjustment" action in
  `CoachOutputScreen.js` (9 call sites) — never sets `updated_at`, even
  though the column exists (`ALTER TABLE coach_outputs ADD COLUMN
  updated_at` at `database.js:689`). So `getAllCoachOutputsForUser`'s
  `updatedAt` is always `null` for an edited row, and the push falls back
  to `Date.now()` exactly as before the fix. **This is a required
  companion code change for Family 2, not optional**: stamp `updated_at =
  now` in that `UPDATE` (and ideally in the `INSERT` branch too, which
  already omits it).
- **`702eca6`** — legacy pulls for `morning_weights`, `coach_outputs`,
  `user_insights`, `exercise_user_notes`, `exercise_goals`,
  `planned_muscle_volume`, `adaptation_events` (and others) now filter
  `.is('deleted_at', null)`. No tombstone has a writer yet so this is a
  no-op today; it exists purely so a mixed-fleet build can never
  resurrect a Family-2 tombstone once one is written. **Confirms C1's
  mitigation is already in place for every Family-2 table** except
  `peak_week_plans` (deliberately excluded — see §4) and `workout_notes`
  (deliberately excluded — see §4).
- **`a3e0d57`** — per-call Article 9 + sign-out-wipe guards now live in
  `transport.pushTable`/`pullTable` (`transport.js:161-175,185-188,210-213`),
  not just `runner.syncAll`. Confirms P4's mitigation is in place, so any
  new Family-2 handler inherits the guard for free by being called through
  `pushTable`/`pullTable`.

The apply-side (pull) code F5 described — unconditional `INSERT OR
REPLACE` with no LWW gate, orphan mirror tables, missing columns — is
**untouched** by these three commits (verified: `git diff a791996..HEAD --
src/lib/database.js` touches only schema migrations, `wipeAllUserData`,
partner-cheer code, and weekly-checkin saves — none of the Family-2 apply
helpers). F5's per-table pull analysis for Family 2 is current.

---

## 3. Family 2, table by table (verified against `HEAD`)

Selection: this is Option C step 2 from the E12 memo — "immutable/append-
ish families with watermarks" — re-scoped after re-verification to what is
actually buildable now. `peak_week_plans` and `workout_notes` are pulled
OUT of the family (rationale in §4); the other seven stay.

| Table | Local schema gap | Delete semantics today | Registry-readiness |
|---|---|---|---|
| `morning_weights` | none — `updated_at`/`deleted_at` present, write path stamps `updated_at` correctly (`database.js:4343-4346`) | hard delete (migrate_060 explicitly declares this a no-soft-delete table) | **Ready now.** Cleanest table in the family; cloud touch trigger already live (migrate_060). |
| `coach_outputs` | `updated_at`/`deleted_at`/`applied` columns exist (ALTER block) but `updated_at` is never written locally (§2) | none (weekly rows, not user-deletable) | Needs the `saveCoachOutput` stamp fix first, then a registry handler + cloud touch trigger. |
| `user_insights` | `updated_at`/`deleted_at` exist (ALTER block) but write paths are `INSERT`-then-hard-`DELETE` (`database.js:3785,3792`), never an `UPDATE` that stamps `updated_at` | hard delete (dismissal deletes the row outright) | Needs the dismissal path to become a soft-delete write (set `deleted_at`+`updated_at`) instead of `DELETE FROM user_insights`, or the registry contract stays `softDelete:false` and dismissal remains a genuine local delete that never propagates (founder-visible product question: should a dismissed insight un-dismiss on a second device today? Currently: yes, silently, once user_insights joins the registry with no tombstone). |
| `exercise_user_notes` | already has `updated_at`, write path stamps it correctly (`database.js:6738-6759`); `deleted_at` added by ALTER | **hard delete** (`database.js:6774`, no soft-delete write path exists) | Needs one small code change: `deleteExerciseUserNote` becomes a soft-delete (`UPDATE ... SET deleted_at=?, updated_at=?`) instead of `DELETE`. Otherwise ready. |
| `exercise_goals` | **no `updated_at`, no `deleted_at`, no `target_reps`, no `notes` column at all** — original v15 `CREATE TABLE` (`database.js:555-564`) was never extended | hard delete (`database.js:6940`) | **Blocked on a local migration** (additive `ALTER TABLE exercise_goals ADD COLUMN ...` ×4, backfill `updated_at` from `created_at`). Confirms F5's finding is still exactly accurate — this is the one genuinely broken pull in the family (`insertOrUpdateExerciseGoalFromCloud` inserts into columns the local table doesn't have; every cloud pull for this table has been silently failing per-row since the pull column list was written). |
| `planned_muscle_volume` | split-brain: primary table (`database.js:418-429`) has no `user_id`, no `deleted_at`; a parallel `planned_muscle_volume_sync` mirror (`database.js:707-716`) has the full contract but is written only by the cloud pull and read by nobody except `wipeAllUserData`'s table list (`database.js:3979`) | hard delete via mesocycle-week cascade (`database.js:4044`) | **Blocked on a local migration**: add `user_id`+`deleted_at` to the primary (backfill `user_id` via `mesocycle_weeks → mesocycles` JOIN), retire the orphan mirror. Restore-from-cloud is a confirmed dead end today (verified: mirror has zero non-write, non-wipe-list readers). |
| `adaptation_events` | same split-brain shape: primary (`database.js:430-441`) has no `user_id`/`updated_at`/`deleted_at`; orphan mirror `adaptation_events_sync` (`database.js:717-727`) has the full contract, same zero-reader status | hard delete via cascade (`database.js:4030`) | **Blocked on a local migration**, same JOIN-backfill pattern as `planned_muscle_volume`. Append-mostly (auto-regulation history) — `softDelete:false` is a defensible registry choice here. |

Every local migration above is additive (`ALTER TABLE ... ADD COLUMN`,
backfilled from existing columns) and touches an encrypted, live,
on-device SQLite DB — CLAUDE.md's schema rule applies: header the purpose,
applied-locally status, safe-to-re-run, rollback, exactly like the
existing `PRAGMA user_version` blocks in `database.js`.

---

## 4. Explicitly excluded from Family 2

- **`peak_week_plans`** — F5 already flagged this correctly and nothing
  has changed: `supabase/migrate_049_drop_peak_week_plans.sql` is a DRAFT
  "do not apply yet" DROP per a standing founder direction
  (2026-05-25) that was never executed in client code either. Building a
  registry handler, watermark, and tombstone contract for a table with an
  unresolved DROP order pending against it is wasted, riskier work.
  **This needs its own founder decision before it can join any family**:
  either (a) execute 049 — strip the ~6 call sites in `sync.js`/
  `database.js`, ship, founder applies the DROP — or (b) formally retire
  049's draft and let `peak_week_plans` join a future family. Not this
  memo's call to make.
- **`workout_notes`** — F5's finding still holds and is arguably worse
  than "legacy": the cloud `workout_notes` table was composite-PK'd by
  migration 018 assuming a table name (`workout_notes_v2`) that does not
  exist in Postgres, so every push has likely been silently 42P10-ing into
  `logPgErr` since 018 shipped — this is an **active, ongoing data-loss
  bug**, independent of which sync architecture owns the table. It
  deserves its own small, hands-on fix (the founder-run composite-PK
  correction migration F5 proposed, `migrate_098_workout_notes_composite_pk`)
  landed as soon as a maintenance window allows, verified against
  production schema first via `audit_cloud_schema_drift.sql` (F5's own
  caution: the fix must not be re-applying a PK that may have already been
  hand-corrected). Once fixed, `workout_notes` is otherwise the most
  registry-shaped table in F5's whole legacy set (already ships honest
  timestamps + tombstones on push) and would slot into Family 2's
  successor cheaply.

Both exclusions keep Family 2 to seven tables, all buildable without a
founder decision blocking the start of work (three need an additive local
migration; the `peak_week_plans`/`workout_notes` decisions run in
parallel, not on the critical path).

---

## 5. Conflict / watermark strategy — recommendation

**Do not port `sync/watermark.js`'s cursor pattern to Family 2.** Adopt
the pattern every registry handler already uses instead: a full `select
().eq('user_id', userId)` on pull, gated per-row by comparing cloud
`updated_at` against a `getXUpdatedAt(userId, id)` lookup before applying
(the `cardioLog.js` / `bodyComposition.js` / `recipeIngredients.js`
template, `tables/cardioLog.js:109-152` is the clearest example).

Reasoning, concrete not aesthetic:

1. **It structurally closes F5's C3** ("inherited pull watermarks skip
   pre-cutover edits"). C3 exists only because a cursor can be advanced
   past a row the old applier mishandled. A handler with no cursor at all
   cannot inherit a stale one — every cycle re-examines every row and the
   per-row LWW gate is the only thing deciding whether to write. No reset-
   to-zero dance, no "new watermark namespace" needed.
2. **The row counts are small.** Family 2 tables are per-user singleton-
   ish or weekly/append logs (a coach output per week, one morning weight
   per day, one goal per exercise, one note per exercise). Even a heavy
   user's `adaptation_events` or `planned_muscle_volume` history is
   dozens to low hundreds of rows — nowhere near `workouts`/`food_entries`
   volumes, where a watermark earns its complexity. Full-table pull cost
   is negligible.
3. **It matches the established convention**, so a reviewer checking any
   Family-2 handler against `cardioLog.js` sees the same shape, and the
   regression-matrix test file (`sync.regressionMatrix.test.js`) already
   has a T1–T6 harness built for exactly this contract.
4. **Push stays a full-table upsert** (the existing pattern in every
   handler above), batched at 200 rows. No push watermark either — per
   `watermark.js`'s own doc comment, push watermarks are "safe only for
   tables whose rows are immutable once pushed"; Family 2 rows are
   mutable (a coach output's `applied` flips, a goal's `achieved_at`
   sets, a note's text edits), so a push watermark would be actively
   wrong here, not merely unnecessary. Today only `workouts` uses one
   (`sync.js:554,598`) — confirmed via `grep`, nothing else does.

**Touch triggers**: per F5's C2 mitigation, new triggers must be
auto-bump-only, never refuse-stale. `morning_weights`' existing trigger
(migrate_060) *does* refuse stale writes, but carries no risk under this
plan because Family 2 never uses a push watermark — there is no
"permanently refused row stalls a cursor forever" scenario to trigger C2.
Leave migrate_060 as-is; write the six *new* Family-2 triggers auto-bump-
only for consistency with C2's stated direction, not because leaving them
refuse-stale would reintroduce C2's specific deadlock (it would not, in
the absence of push watermarks).

**Conflict strategy per table**: `last_write_wins` for all seven, matching
every other bidirectional registry entry. No table in this family carries
Article-9 or ED-safety-adjacent fields (that is `user_body_profile`,
explicitly excluded from every family until its own per-column-merge
design, per F5's P1). `softDelete` per the table above: `true` for
`morning_weights`? — **no**, migrate_060 explicitly declares it hard-
delete and there is no product need to change that; keep `softDelete:
false` and match. `true` for `exercise_user_notes`, `exercise_goals`,
`planned_muscle_volume`, `adaptation_events`, `coach_outputs`'s "delete"
concept does not really exist (weekly rows are never user-deleted) so
`softDelete:false`. `user_insights` is the one genuinely open product
question (see table above) — flagged for founder confirmation, not
decided by this memo.

---

## 6. Build order within Family 2

Ordered by (a) whether a local migration blocks starting and (b) risk,
lowest first, so the machinery proves itself before the two migration-
gated tables:

1. **`morning_weights`** — zero local migration, zero code fix needed
   beyond a registry handler + retiring the `syncMorningWeight` on-save
   shim (same pattern `78f58af` already executed for
   `weekly_checkins_v2`/`body_metrics`: on-save calls become a
   `pushTable('morning_weights')` delegate via `syncAll({triggeredBy:
   'write'})`, the `'morning_weight'` queue op retires, residual queued
   ops drain via the existing bulk-fallback). Weight data is ED-safety-
   *adjacent* (feeds rapid-loss gates) even though this table's sync
   mechanics don't touch the gates themselves — the handler must not
   change *which rows exist*, only *how they move*; this is a "mention it
   to the founder before landing" table per CLAUDE.md's ED-safety
   caution, even though the change itself is mechanical.
2. **`exercise_user_notes`** — zero local migration; one code change
   (hard delete → soft delete in `deleteExerciseUserNote`) before the
   handler.
3. **`coach_outputs`** — zero local migration; one required code change
   (stamp `updated_at` in `saveCoachOutput`, §2) before the handler.
4. **`user_insights`** — zero local migration; needs the founder call on
   dismiss-semantics (§3) before deciding whether the handler ships
   `softDelete:true` (dismissal → tombstone) or `softDelete:false`
   (dismissal stays a genuine delete, cross-device un-dismiss keeps
   happening as it silently does today).
5. **`exercise_goals`** — local migration required (4 columns) ships
   first, in its own commit, tested against the existing broken-pull
   symptom before any registry work starts.
6. **`planned_muscle_volume`** — local migration required (unify
   primary + mirror, backfill `user_id` via JOIN). Engine-adjacent
   (volume-planning inputs) — device-walk the mesocycle/plan screens
   after this one, not just unit tests.
7. **`adaptation_events`** — same migration shape as #6, do it in the
   same commit/window since both use the identical JOIN-backfill-and-
   retire-mirror pattern; keep them as two separate registry entries and
   two separate handler files, but one shared local migration reduces the
   number of live-DB `ALTER`/backfill windows from two to one.

Each step ships as its own commit (CLAUDE.md convention: small, per-
feature). Steps 5–7's local migrations are the only ones that touch the
on-device encrypted DB; 1–4 are pure code + a registry-entry addition.

---

## 7. Cloud migrations needed (founder-run, additive, one grouped file
   or several — founder's call on batching)

- `morning_weights` — none, migrate_060's trigger is already live
  (confirmed by CLAUDE.md's status line: outstanding founder actions are
  `092`..`099`; nothing before 092 is still pending).
- `coach_outputs`, `user_insights`, `exercise_user_notes`,
  `exercise_goals` — each needs an auto-bump-only touch trigger (the
  047/060 pattern, C2-compliant). None of the four currently has one.
- `planned_muscle_volume`, `adaptation_events` — same trigger, applied
  once the local migration has established `user_id` on the primary
  table so RLS can be tightened to `auth.uid() = user_id` if desired (or
  left on its current shape — a separate, non-blocking decision).
- No table in Family 2 needs a *schema* change on the cloud side beyond
  the trigger — every cloud table already has `updated_at`+`deleted_at`
  from migration 012's universal pass (confirmed in F5's evidence and
  unchanged since).

---

## 8. Test strategy — replay-first

This codebase already has an established "replay" convention for
behaviour-changing work on deterministic modules (`adaptiveTdee.b1.replay.
test.js`, `phaseVocab.en4.replay.test.js`): **Phase 1** pins the CURRENT
behaviour byte-for-byte against realistic, clock-pinned fixtures, before
any implementation change; **Phase 2** — the actual migration commit —
touches only the scenarios that are meant to change, and the diff of that
commit becomes the delta report. Applied to a sync-table migration, the
same shape maps onto two complementary layers:

**Layer A — the existing regression-matrix contract (T1–T6, mocked).**
Extend `sync.regressionMatrix.test.js`'s per-table fixture object with an
entry for each of the seven tables the moment its handler exists,
following the T1 (local insert → push), T2 (local update → push
reflects), T3 (soft-delete → push ships `deleted_at`, tables 2–4/6/7
only), T4 (remote insert → pull invokes the local insert helper), T5
(conflict → LWW resolves by `updated_at`), T6 (push error → returns
`errors>0`, never throws) shape already proven for the 21 migrated
tables. This is pure-Jest, mocked-Supabase-client, no device — the
existing template most of `tables/__tests__/` already follows.

**Layer B — a replay corpus per table, BEFORE its handler is written.**
For each table, before touching `sync.js`'s legacy push/pull for it,
write a fixture-driven test that runs the CURRENT legacy code path
(`_pushX`/`_pullX` + the current `insertOrUpdateXFromCloud`) against 3–4
realistic scenarios per table (a clean insert, a same-device edit, a
cross-device edit where cloud is newer, a cross-device edit where local
is newer, a delete where applicable) and snapshots the resulting local-DB
row shape byte-for-byte. This is the "before" baseline. The migration
commit then rewrites the SAME scenarios against the new registry handler
and asserts **identical final row state** for every scenario where
behaviour is not meant to change, and an explicit, called-out diff for
the ones that are (e.g. `exercise_user_notes`'s hard-delete → tombstone
is a DELIBERATE behaviour change; the replay test documents the before
state — row gone — and the after state — row present with `deleted_at`
set — side by side, so the diff of that one assertion IS the founder-
visible delta, exactly as `EN-4`'s replay commits worked).

This matters specifically because `exercise_goals`'s current pull is
**already broken** (§3) — a naive "before/after must match" replay test
would be wrong there; the correct replay baseline for that table is
"today, a cloud-pulled goal never lands locally; this migration fixes
that," stated as the Phase-1 pin (assert the row does NOT exist after the
legacy pull) so the Phase-2 diff (row now exists, correct columns) is the
explicit, reviewed fix rather than an assumed side effect.

**What is out of scope for Family 2's test net** (matching the existing
`sync.regressionMatrix.test.js` header, T7/T8): two-physical-device
propagation and true offline-collision tests. This is Android-only,
single-device-primarily product with no staging Supabase project
(BUDGET_POSTURE_LOCKED.md); those two scenarios stay documented-deferred,
consistent with every other registry table today.

**Manual device checklist** (CLAUDE.md's device-testing rule — the
founder walks from an EAS build, no simulator): for the two engine-
adjacent tables specifically —
1. `planned_muscle_volume`: open an active mesocycle's volume-planning
   screen before and after the migration lands; per-muscle set targets
   must read identically (the migration must not silently change what
   the coaching engine reads, only how the row moves).
2. `adaptation_events`: trigger an auto-regulation adjustment (e.g. a
   deload signal), confirm the event still appears in whatever surface
   reads adaptation history, before and after.
3. `morning_weights`: log a weigh-in, background/foreground the app,
   confirm the value round-trips through a forced "Force full pull" (the
   existing sync-status-sheet button) without duplicating or losing the
   day's entry — the ED-safety-adjacent case CLAUDE.md flags for any
   weight-adjacent change.

---

## 9. Founder decisions requested

1. **Confirm Family 2 as the next Option-C step** (the seven tables in
   §3, in the §6 order), or redirect to a different grouping.
2. **`user_insights` dismiss-semantics** (§3/§6.4): should a dismissed
   insight tombstone (never resurface on another device) or stay a hard
   delete (current, silent, cross-device un-dismiss)?
3. **`peak_week_plans`**: execute 049 (drop) now, or formally retire the
   draft and defer the table to a later family? (Independent of Family 2,
   does not block it.)
4. **`workout_notes` composite-PK fix**: greenlight the founder-run
   migration to unblock its currently-silent push failures, independent
   of which family eventually adopts the table into the registry.
5. **Cloud migration batching**: one grouped migration file for the four
   new touch triggers (mirroring how 047 grouped two tables), or four
   separate headered files — founder's call on the review/apply
   granularity he prefers.

---

## 10. Non-goals of this memo

- No code changes. No new migration files written (they are described,
  not drafted, per the read-only mandate).
- Does not re-litigate Option A vs B vs C — that decision is made (E12,
  Option C, founder GO on steps 0–1).
- Does not scope `user_prefs`, `user_body_profile`, the exercise-identity
  dedupe table, or the training core (`workouts`/`workout_sets`/plan
  tables) — those remain later Option-C steps per E12 §"Suggested order",
  steps 3–6, untouched by this memo.
