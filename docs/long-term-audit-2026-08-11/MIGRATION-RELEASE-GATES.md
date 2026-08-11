# Campaign 6 — Phase 60: migration release analysis

> **CORRECTION (2026-08-11, D97-23 — supersedes the order and the 135
> verdict below):** the Phases 32-38 audit proved, in an isolated
> scratch cluster, that **migrate_135 is DEFECTIVE AS WRITTEN and must
> NOT be run** (AUDIT-REINSTALL-SYNC-OFFLINE.md S-14/S-15): its
> newest-updated_at tie-break DELETES the applied receipt whenever the
> merely-viewed duplicate is newer (the exact Apply-resurrection it
> exists to close), and after its unique index a device still holding a
> legacy coach-output id permanently poisons its entire 200-row batch
> upsert (atomic) with 23505 - including the current week's output.
> Also corrected: legacy pairs do NOT "restore as duplicates" locally
> (S-16) - the local v71 index keeps an arbitrary one. Revised
> recommendation: **134 → 132 → 133 now; 135 HELD** pending a corrected
> tie-break (an applied row wins outright; newest among applied) PLUS a
> client-side re-id migration shipped in the same build. The founder
> must not be given "run against production" for 135 as written.
>
> **REPAIR COMPLETE (2026-08-11, D97-23, route A+C):** migrate_135 is
> corrected in place (never applied anywhere tracked): the APPLIED row
> now wins the dedup outright (recency splits only same-applied pairs),
> survivors are re-idded to the deterministic co_<week>_<user> form, and
> local migration v72 re-ids legacy device rows to match, so every
> device's upsert converges. Proven in an isolated scratch cluster:
> S-14's applied receipt survives, zero non-deterministic ids remain,
> and a re-run is a no-op. Release condition: 135 runs ONLY after the
> v72 build ships (a pre-v72 client's coach-output batch would 23505
> until it upgrades; self-heals on upgrade). 135 rejoins the batch
> under that condition: 134 → 132 → 133 now eligible; 135 after the
> Campaign 6 build is live.

NO migration was run in this campaign. Table derived from the migration
file headers and the live client code on this branch. Cloud migrations
are applied MANUALLY by the founder with the exact phrase
"run against production" per batch; nothing here changes that.
Applied history: through migrate_131 (mesocycles.block_ledger). 132-135
are written and UNAPPLIED; 049 is HELD.

## The release table

### migrate_132 — planned_muscle_volume provenance (mev/mav/mrv/source to cloud)

- PURPOSE: carry per-muscle landmark bounds and seed source/provenance
  to the cloud so a new device restores prescriptions WITH their
  explanation provenance (Campaign 1 P0-1).
- CURRENT CODE DEPENDENCY: the client already pushes these columns with
  column-tolerant retries (`sync.js:1240-1246` retries without them
  until the cloud accepts) and the local table has always carried them.
- WHAT BREAKS WITHOUT IT: nothing crashes; set counts keep syncing.
  What stays broken: cross-device/reinstall ADAPTIVE TRUTH - restored
  rows arrive without source, degrade honestly to research/'template',
  so a reinstalled device shows "research-based" explanations for a
  block that was genuinely ledger-seeded, and Campaign 6's provenance
  law is unmet across devices.
- HARD RELEASE GATE? Not for shipping the client (its header says the
  same). It IS the gate for calling cross-device adaptive provenance
  true - and Campaign 6's Phase 52 reinstall equivalence is only fully
  satisfiable once applied. Verdict: SHOULD run in the next production
  batch, before any marketing claim about cross-device coaching truth.
- SAFE ORDER: any time; independent of 133-135.
- DESTRUCTIVE? No. Additive, nullable, idempotent; rollback documented.
- FOUNDER ACTION: include in the next "run against production" batch.

### migrate_133 — delete leaked privacy-pref rows

- PURPOSE: remove '@volyume_privacy_prefs' rows older builds wrongly
  bulk-pushed into user_prefs (contract: the analytics opt-out never
  syncs).
- CURRENT CODE DEPENDENCY: none - the client excludes the key in both
  directions already; the rows are frozen and unread.
- WHAT BREAKS WITHOUT IT: nothing functionally; the privacy CONTRACT
  remains retroactively unhonoured in the cloud (data that should never
  have been transmitted stays stored).
- HARD RELEASE GATE? No for function; YES in spirit for the privacy
  posture (GDPR data-minimisation hygiene). Verdict: next batch.
- SAFE ORDER: any time. DESTRUCTIVE? Deletes only the leaked rows the
  client no longer reads; idempotent. FOUNDER ACTION: next batch.

### migrate_134 — refuse-stale-write triggers on nine coaching-state tables

- PURPOSE: server-side last-write-wins on mesocycles, mesocycle_weeks,
  coach_outputs, nutrition_targets, user_body_profile, programmes,
  routines, routine_exercises, planned_muscle_volume - the tables where
  a stale offline device's push-before-pull can today overwrite newer
  cloud state (proven cases: re-activating a COMPLETED block and
  nulling its ledger; stale targets landing over newer ones; stale
  scoff_score overwriting current ED-screening data).
- CURRENT CODE DEPENDENCY: the sync runner's push-before-pull order is
  unchanged; the client has no substitute guard for these nine tables.
- WHAT BREAKS WITHOUT IT: every Campaign 6 two-device scenario (Phase
  37) on those tables remains vulnerable to stale-device overwrite -
  including the safety-adjacent scoff_score case. The Campaign 1
  conflict laws are only PARTIALLY enforced until this lands.
- HARD RELEASE GATE? **YES for any multi-device user.** This is the
  strongest gate in the set: without it a stale device can resurrect a
  completed block, null a ledger, and clobber ED-screening state. A
  build shipping Campaigns 1-6 to users with two devices without 134
  ships known-vulnerable conflict semantics.
- SAFE ORDER: before or with 135 (135's header says "after 134").
- DESTRUCTIVE? No data change; adds triggers only. Idempotent.
- FOUNDER ACTION: next batch, ordered before 135.

### migrate_135 — coach_outputs one-row-per-user-week

- PURPOSE: de-duplicate legacy per-device coach-output rows and make
  (user_id, week_start) structurally unique - closing the double-apply
  path where the applied receipt lived on only one of two rows.
- CURRENT CODE DEPENDENCY: the client already writes deterministic ids
  and the LOCAL unique index exists (database.js v71,
  idx_coach_outputs_user_week) - so new rows cannot duplicate, but
  legacy cloud pairs persist and can restore as duplicates.
- WHAT BREAKS WITHOUT IT: a reinstall/second device pulling a legacy
  duplicated week can resurrect a live Apply button for an
  already-applied change (bounded by RB-10's applyingRef and the
  isApplied receipt on ONE row, but the other row's receipt is empty).
- HARD RELEASE GATE? Yes-leaning for long-term users with legacy rows:
  the double-apply path is real, though only for weeks generated by
  pre-fix builds. Verdict: same batch as 134, ordered after it.
- **SECOND RELEASE CONDITION (Review C RC6-2, D97-25):** the applied
  column had NO local writer until the RC6-2 client fix
  (saveCoachOutput now derives it from the JSON receipt). Every
  pre-fix production row therefore carries applied = false, and the
  repaired S-14 predicate would degenerate to pure recency - the very
  defect it was corrected to remove. 135 runs ONLY after the client
  build carrying BOTH v72 AND the RC6-2 applied writer is live, with
  a sync cycle for receipts to re-push.
- **PREFLIGHT REQUIRED (Review C RC6-6, D97-25):** setup_complete.sql
  declares UNIQUE(user_id, week_start) on coach_outputs at creation
  (line 371), and no migrate_*.sql creates the table - so whether that
  constraint is LIVE in production is unrecorded, and it decides the
  whole 135 storyline. If LIVE: 135's DELETE finds nothing, S-14/S-16
  are unreachable, and S-15's 23505 batch poisoning is happening TODAY
  - making the v72 client build an urgent standalone fix and the
  "hold 135" ordering irrelevant. If NOT live: production drifted from
  the only file that creates the table, which must be recorded. Run
  the read-only check (written into migrate_135's header) and record
  the answer HERE before the founder is asked for "run against
  production" on this batch:
  `SELECT conname, contype, pg_get_constraintdef(oid) FROM
  pg_constraint WHERE conrelid = 'public.coach_outputs'::regclass;`
- SAFE ORDER: after 134. DESTRUCTIVE? Deletes stale duplicate copies
  (content carried by the surviving row); idempotent; rollback = drop
  index. FOUNDER ACTION: next batch, after 134, subject to both
  conditions above.

### migrate_049 — drop peak_week_plans (HELD)

- PURPOSE (original): drop the peak-week table. The original rationale
  was wrong: the table is LIVE behind the B4 contest countdown, read by
  two shipped screens.
- CURRENT CODE DEPENDENCY: ProGoalSetupScreen and CoachOutputScreen
  read getActivePeakWeekPlan; sync pulls the table.
- WHAT BREAKS IF APPLIED: deletes data behind a shipped surface and
  breaks sync. HARD GATE: **must NOT run.** Stays HELD until the
  FR-PW-1 retirement design exists. DESTRUCTIVE? Yes (table drop).
- FOUNDER ACTION: none now; keep HELD.

## Recommended batch, with reasons (not "apply all")

Order: **134 → 132 → 133 now; 135 later.** 134 first because it is the
live conflict-safety gate (including ED-screening data); 132 next for
cross-device adaptive truth; 133 last as retroactive privacy hygiene
with no functional coupling. 135 joins a LATER batch only after (i) the
RC6-6 preflight answer is recorded above and (ii) the client build
carrying v72 + the RC6-2 applied writer is live (both conditions in the
135 section). All four are idempotent and additive-or-hygienic; none is
destructive to live product state. 049 excluded deliberately - it is
destructive and HELD.
