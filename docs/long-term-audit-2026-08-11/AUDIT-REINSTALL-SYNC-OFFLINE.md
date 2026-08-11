# AUDIT — REINSTALL, MIGRATION CONTRACTS, SYNC AND OFFLINE (Campaign 6, Phases 32-38)

Reinstall same account (32), migration 132 restore contract (33), migrations
134/135 long-term contract (34), adaptation_events restore (35), notification
pref multi-device (36), two-device training (37), offline for weeks (38).

**Authority.** The founder's Campaign 6 order, phase texts 32-38 as relayed
verbatim in this lane's brief, plus the campaign's binding laws
(`docs/long-term-audit-2026-08-11/CAMPAIGN-LOG.md:38-67`): MEMORY MUST HELP
NEVER TRAP, NO PERSONALISATION WITHOUT PROVENANCE, LAPSE != FAILURE; and
CLAUDE.md Section 2 inviolables (ED-safety tier-blind, Article 9 fail-closed,
deterministic engine, EU residency, no photo cloud sync, additive idempotent
migrations, identity locked, NO wholesale sync consolidation).

**Method — read-only, plus isolated local simulation.** No file outside this
one was created or modified. No test was written, changed or skipped. Nothing
was committed, pushed or stashed. **No migration was run against anything
remote and no Supabase/cloud command was issued.** Every claim is traced from
code on branch `claude/campaign6-long-term` and cited `file:line`.

Three kinds of live evidence were produced:

1. **Existing suites run read-only as evidence** —
   `campaign1.syncConflict`, `cloudRestoreLWW`, `prefSync.landmarks`,
   `syncPrefExclusions` (82 tests, all pass) and
   `sync/__tests__/progressPhotoMetaNoSync.guard` (2 tests, pass).
2. **A throwaway local PostgreSQL 16 cluster** initialised inside the session
   scratchpad (`initdb -D <scratch>/pg/data`, started on `127.0.0.1:5433`,
   destroyed after the run) carrying hand-built copies of the production table
   shapes taken from `supabase/migrate_012_complete_sync.sql:205-214`,
   `supabase/setup_complete.sql:364-372` and `supabase/migrate_018_composite_pks.sql`.
   The **verbatim SQL text of migrations 132, 134 and 135** was executed against
   that scratch cluster only. Scripts: `<scratch>/sim132.sql`, `sim134.sql`,
   `sim135.sql`.
3. **The real engine module under Jest**, driven from a scratch test file kept
   OUTSIDE the repository
   (`npx jest --rootDir /home/user/ADPhysique --roots /home/user/ADPhysique/src
   <scratch>/jest --testMatch '**/p33.test.js'`), so the Phase 33 explanation
   claim is proven against `src/lib/blockExplain.js` itself rather than
   paraphrased.

**Already ruled, deliberately NOT re-litigated.** D97-19 F4 (the guarded
per-uid profile blob and the rebuilt-blob push suppression) and F3
(`workout_notes` sync needs a cloud migration) are treated as settled and were
verified live in the traces below. D97-19's dated correction to
PERSONALISATION-MATURITY.md (pref sync is allow-by-prefix; manual landmarks and
calm mode are stamp-guarded and DO cross a reinstall) is confirmed correct and
is the baseline for finding S-8, which is about a *different* half of the same
mechanism. D97-13 (`is_archived` now syncs), D97-5/8/10 and D97-11 are assumed
landed and were spot-verified. FR-C4-3 (adaptation_events restore path) and
FR-C4-2 (notification-pref dual family) are the two open founder items this
lane was asked to characterise; both are carried forward with new,
product-level consequence evidence rather than re-raised as discoveries.

**Reconciliation with `MIGRATION-RELEASE-GATES.md` (Phase 60).** That record's
ordering verdict (134 -> 135 -> 132 -> 133; 049 stays HELD) is **upheld**. Two
of its per-migration verdicts are **strengthened or corrected** by evidence
here: 132 is a gate for more than provenance copy (S-11), and 135 as written
carries two defects of its own (S-14, S-15) plus one factual correction to the
gates record (S-16). Section 4 states the release impact head-on.

---

## 1. FINDINGS

| # | Class | Sev | Phase | One line | Primary evidence |
|---|---|---|---|---|---|
| S-1 | DEFECT | **HIGH** | 32/38 | An open ED-pattern flag is device-local and cannot be restored: no client push path exists and nothing anywhere writes the cloud table, so a reinstall or a second device silently loses the flag and every ED-gated suppression with it | `sync/registry.js:134-141`; `sync/transport.js:116-119`; `sync/tables/edPatternFlags.js:1-15`; writers `database.js:8565-8595`; no cloud writer in any `supabase/*.sql` |
| S-2 | DEFECT | MED-HIGH | 36 | The AsyncStorage pref sync is LAST-SYNCER-WINS, not last-writer-wins: push-before-pull, push stamps `now()`, pull applies the cloud value unconditionally — so a stale device reverts another device's reminder/quiet-hours change on **both** devices | `sync.js:1488-1498`, `1434-1442`, `2026-2034`; order `sync/runner.js:228-292` |
| S-3 | DEFECT | MED-HIGH | 36/32 | Pref sync has no tombstone: removing a synced key locally never deletes the cloud row, and the pull in the **same cycle** re-writes it — the readiness-ask re-enable and the phase-banner reset are silently undone | remover `SettingsCoachingScreen.js:96`; consumer `HomeScreen.js:1361-1364`; second remover `HomeScreen.js:764-766`; push reads live keys only `sync.js:1469-1470` |
| S-4 | DEFECT | MED-HIGH | 35/32 | `adaptation_events` restore lands in the zero-reader `adaptation_events_sync` mirror, so a reinstalled device loses the revert memory (the twice-declined hold), the same-week add-frequency cap and the whole user-visible Engine Log (FR-C4-3, now with product consequence proven) | applier `database.js:8287-8305`; readers `database.js:4478-4495`, `sessionAdjustments.js:127,135,161`; engine use `algorithms.js:1113-1126,1160-1162`; surface `components/EngineLog.js:60-85`, `screens/CoachHeldHistoryScreen.js:192` |
| S-5 | DEFECT | MED-HIGH | 38/32 | A workout/set delete queued while offline exhausts its six-attempt budget within about eleven hours of foreground activity and is then parked for 365 days: sign-out is refused as "unsynced" for ever unless forced, and after a forced sign-out or a reinstall the deleted session resurrects | `syncQueue.js:26-27,96-101,133-141`; sign-out gate `useAppStore.js:450-462`; hard local delete `database.js:2696-2706`, `3181-3190` |
| S-6 | LATENT | MED | 34/37 | Migration 134's IS-NULL branch accepts any write and stamps `now()`; every one of the nine push mappers falls back to `?? Date.now()`, so a local row with a null `updated_at` still launders a stale write straight past the new trigger | `migrate_134` IS NULL branch; fallbacks `sync.js:839,904,998,1015,1061,1120,1235` |
| S-7 | LATENT | LOW | 34 | Migration 134's equal-timestamp branch **accepts** the write and overwrites the row (it stamps `now()` and returns NEW), so the trigger is strictly-older-refuses, not newer-wins | proven in `<scratch>/sim134.sql`; no local writer reaches it (`database.js:3780-3787,4438-4441` all bump `updated_at`) |
| S-8 | LATENT | MED | 36/38 | The two notification pref families disagree by design: the per-category SQLite rows are true LWW with a cloud trigger, the blob and the reminder/quiet-hours keys ride the unguarded pref path — the guarded-pref mechanism that already protects landmarks and calm mode is simply not applied to them (FR-C4-2) | rows `sync/tables/notificationPreferences.js:106-133`; blob `notifications/scheduler.js:55`; guard list `sync.js:1390-1400` |
| S-9 | CLEAN | — | 32 | No false new-user onboarding on reinstall: an established account routes optimistically to MainTabs and the cloud read can only correct a *heuristic* guess, never a cache hit | `useAppStore.js:822-862,920-1001` |
| S-10 | CLEAN | — | 33 | Before 132 the provenance push is genuinely column-tolerant: the whole batch is rejected, then the stripped retry lands, so nothing regresses pre-migration | `sync.js:1238-1253`; proven in `<scratch>/sim132.sql` |
| S-11 | DEFECT | **HIGH** | 33 | Without 132 a restored device loses **both** the seed provenance and the row's `[mev, mrv]` clamp band, so it (a) tells a ledger-seeded athlete the block is "research-based guidance" and (b) clamps the next coach volume apply to the research MRV instead of the seeded band — two devices, identical inputs, different prescriptions | writer + rationale `database.js:4256-4269`; clamp `coachApply.js:344-348`; copy `blockExplain.js:68-87,102-135,189-206`; degrade `database.js:8072-8092`; proven with the real module in `<scratch>/jest/p33.test.js` |
| S-12 | CLEAN | — | 34/37 | Migration 134 does what it claims: a stale push through `upsert ... ON CONFLICT DO UPDATE` is refused, the completed block stays completed and the ledger survives, while a genuinely newer push still lands | proven verbatim in `<scratch>/sim134.sql` |
| S-13 | CLEAN | — | 34 | 134's stated precondition holds: all nine tables' push paths ship the row's own edit time, and all nine already carry `updated_at` from migrate_012, so the ALTER is a no-op and the trigger is meaningful from the first row | `sync.js:839,904,998,1015,1061,1120,1235`; `sync/tables/nutritionTargets.js`; `migrate_012_complete_sync.sql:37-52` |
| S-14 | DEFECT | **HIGH** | 34 | Migration 135's tiebreak keeps the row with the newest `updated_at`, so it **deletes the applied receipt** whenever the duplicate that was merely viewed is newer — the exact Apply-button resurrection it exists to close | `migrate_135` DELETE predicate; receipt-bumping re-save `database.js:6826-6846`; proven in `<scratch>/sim135.sql` |
| S-15 | DEFECT | **HIGH** | 34 | After 135, a device still holding a legacy `coach_outputs` id for a week whose surviving cloud row has a different id poisons its entire 200-row upsert with 23505 for ever — including the current week's output in the same batch — with no per-row retry and no local re-id migration | push `sync.js:1050-1070`; legacy ids preserved `database.js:6822-6847` and local dedup `database.js:2091-2099`; proven in `<scratch>/sim135.sql` |
| S-16 | CORRECTION | MED | 34 | `MIGRATION-RELEASE-GATES.md` says legacy cloud pairs "can restore as duplicates". They cannot: local index v71 makes the second row's `INSERT OR IGNORE` a silent no-op, so restore keeps **an arbitrary one** of the pair. The pre-135 risk is arbitrary receipt loss, not duplication | `database.js:2091-2099`, applier `database.js:7399-7451`; gates record `MIGRATION-RELEASE-GATES.md:80-89` |
| S-17 | LATENT | MED-HIGH | 32 | `migrate_123`'s retention-email contract requires the sending job to read cloud `ed_pattern_flags` for an open flag before sending. No client ever writes that table (S-1), so `suppressed_wellbeing` can never fire. No sender job ships today, so the exposure is latent | `migrate_123_retention_email_loop.sql:51-65`; `supabase/functions/` contains no sender |
| S-18 | CLEAN | — | 37 | Every pull-side applier on the conflict-critical tables refuses an older cloud row, preserves real timestamps, and preserves a local ledger when the cloud carries none — a stale device cannot corrupt the good device's LOCAL truth | `database.js:7571-7634,7636-7703,7382-7451,7078-7203,8052-8105`; `sync.js:979-991` (ledger key omitted when absent) |
| S-19 | LATENT | MED | 37 | The exposure 134 closes is **cloud-side only**: a stale push corrupts the cloud while both devices keep correct local state, and the cloud self-heals only if the good device syncs again. A user who stops using the good device is restored, on reinstall, from the corrupted copy | composition of S-18 with `sync/runner.js:203-251` (push precedes pull) |
| S-20 | CLEAN | — | 37/32 | Manual landmark overrides and calm mode survive every conflict path: the stamp rule plus the one-way calm ratchet, both failing closed on any unreadable input | `sync.js:1976-2009`, `2038-2048`; pinned green in `campaign1.syncConflict` + `prefSync.landmarks` |
| S-21 | CLEAN | — | 38 | Watermarks are device state, excluded from pref sync, advance only on a clean pass and never move backwards, so weeks offline simply produce a bigger delta rather than a gap | `sync/watermark.js:20-23,66-71`; exclusions `sync.js:1316-1326`; clean-pass gates `sync.js:1622-1624,2086,2129-2131,2160-2162,2202` |
| S-22 | CLEAN | — | 38 | No duplicate learning and no duplicate coach apply after a long offline stretch: the ledger is idempotent by version behind a block-end precondition, the week's coach output is structurally unique locally, and applied receipts are preserved across re-saves | `blockLedgerRunner.js:104-114`; `database.js:2091-2099,6822-6846` |
| S-23 | CLEAN | — | 32 | Photos and scans never sync, as promised: the registry has no photo table at all, guard-tested | `sync/__tests__/progressPhotoMetaNoSync.guard.test.js` (2 tests, pass) |
| S-24 | CLEAN | — | 32 | Article 9 fails closed on every restore path, including the legacy bulk pull that Home's pull-to-refresh calls directly | `sync/runner.js:97-114`; `sync/transport.js:168-182`; `sync.js:1513-1530` |

Counts, 24 findings: **8 DEFECT** (4 HIGH — S-1, S-11, S-14, S-15; 4 MED-HIGH —
S-2, S-3, S-4, S-5), **5 LATENT** (1 MED-HIGH, 3 MED, 1 LOW), **10 CLEAN**,
**1 CORRECTION** to an existing record. Nothing was classed UNCERTAIN: no
pinned test contradicted the order anywhere in this lane.

---

## 2. FINDINGS IN DETAIL

### S-1 (DEFECT, HIGH, Phases 32 + 38) — the ED-pattern flag cannot be restored, because it is never uploaded

**Law.** Phase 32 requires restoration of the user's state on a fresh local
database. Phase 38 requires that "safety state cannot weaken". CLAUDE.md
Section 2: the ED-safety system is tier-blind and its suppressions must never
be weakened.

**Trace.**

1. The registry declares `ed_pattern_flags` as `pull_only` +
   `server_wins` + `serverAuthoritative` (`src/lib/sync/registry.js:134-141`).
2. `transport.js` therefore has a pull handler and, deliberately, **no push
   handler** (`src/lib/sync/transport.js:116-119`, "Pull-only tables
   intentionally absent").
3. The handler's own docstring states the premise:
   `src/lib/sync/tables/edPatternFlags.js:5-7` — "The server-side
   ed_pattern_flags table is written by the engine (and the upgrade_tier RPC)
   when a flag is raised or cleared."
4. That premise is false. The only writers are LOCAL SQLite writers:

```js
// src/lib/database.js:8565-8584
export async function raiseEdPatternFlag(userId, { reason, signals }) {
  ...
  const id = uid();
  await d.runAsync(
    `INSERT INTO ed_pattern_flags
       (id, user_id, flag_state, reason, signals_json, raised_at, updated_at)
     VALUES (?, ?, 'raised', ?, ?, ?, ?)`, ...);
}
```

   and their only caller is `src/screens/CoachOutputScreen.js:1913-1932`.
   A repository-wide search finds **no** cloud write of `ed_pattern_flags`
   anywhere: not in `src/` (the only Supabase reference is the pull at
   `edPatternFlags.js:23`), not in any `supabase/migrate_*.sql` (no
   `INSERT`/`UPDATE` against the table), and not in `supabase/functions/`.
   The cloud table (created by `migrate_017_ed_pattern_and_telemetry.sql`)
   is write-only-by-nobody.

**Concrete user consequence.** A Pro user with an open ED flag reinstalls, or
signs in on a second device. The flag row does not exist locally and the pull
brings nothing back. On that device, until the user next opens the Coach tab
*and* the weekly run re-detects the pattern:

- the weigh-in / evening-weight prompts are re-laid and fire
  (`src/lib/notifications/scheduler.js:197-198,326-327,630,720` all gate on
  `getOpenEdPatternFlag`, which now returns null);
- the progress before/after photo card is no longer withheld on the flag arm
  (`src/hooks/usePhotoSuppression.js:37-40,72` — `calm || edFlagOpen`; calm
  still holds if the user set it, because calm is a guarded pref, but the flag
  arm is gone);
- the weight-trend takeaway and the streak copy lose their ED-gated wording
  (`src/lib/chartWindows.js:118-122`, `src/hooks/useWeightTrend.js:40,71`,
  `src/hooks/useWeeklyStreak.js:104`);
- the block ledger's `edFlagOpen` input reads false
  (`src/lib/blockLedgerRunner.js:79`).

The re-raise path is not self-healing in the way the pull-only registry entry
implies: it fires only inside `runWeeklyCoach`'s detection, surfaced only from
the Pro-guarded Coach screen, and only when the user opens it. A user who has
lapsed to Free never re-raises at all, which sits uncomfortably beside the
tier-blind guardrail mandate (the *guardrails* are tier-blind; the *detector
that arms them* is not).

**Relationship to existing records.** Not covered by FR-C4-2 or FR-C4-3.
`PERSONALISATION-MATURITY.md`'s corrected persistence column is about
AsyncStorage prefs and is unaffected. This is a new finding.

**Direction sketch (not applied).** Three options, in increasing scope:
(a) give `ed_pattern_flags` a push handler and flip the registry entry to
bidirectional with a **raise-wins ratchet** on the pull (the same asymmetry
calm mode already has: a cloud row may raise or extend a flag, never clear a
local open one) — this is a per-table change inside the existing registry
architecture, not consolidation; (b) leave the table pull-only and have the
server derive the flag, which needs a server-side detector and is a much bigger
change to a deterministic-engine boundary; (c) accept device-local flags and
correct the handler docstring, the registry comment and any claim that the flag
restores — the honest do-nothing option. Option (a) is the only one that makes
the restore promise true. Whichever is chosen, the `migrate_123` contract
(S-17) has to be reconciled with it.

---

### S-2 (DEFECT, MED-HIGH, Phase 36) — pref sync is last-syncer-wins, so a stale device reverts a live choice on both devices

**Law.** Phase 36: "device A changes reminder; device B stale; restore;
sign-in; sync — audit actual user consequence." Addendum: RESPECT MY CHOICES.

**Trace.** Three facts compose into the defect.

1. **Push precedes pull, every cycle.** `src/lib/sync/runner.js:203-251` runs
   the migrated-table pushes and `bulkUploadLocalData` before any pull;
   `bulkUploadLocalData` ends with `_pushAllUserPrefs` (`sync.js:753`), and the
   legacy `pullFromCloud` calls `_pullUserPrefs` last (`sync.js:1660`).
2. **The push stamps push time for every unguarded key.**

```js
// src/lib/sync.js:1488-1492
const rows = await Promise.all(pairs.map(async ([k, v]) => ({
  user_id: supabaseUserId, key: k,
  value: v == null ? '' : String(v),
  updated_at: await _guardedPrefUpdatedAt(k),
})));
// src/lib/sync.js:1434-1442 — non-guarded keys return new Date() (push time)
async function _guardedPrefUpdatedAt(key) {
  if (!isGuardedPref(key)) return new Date().toISOString();
  ...
}
```

3. **The pull applies the cloud value unconditionally for unguarded keys.**
   `sync.js:2026-2034` filters only by `shouldSyncPref` and
   `filterGuardedPulledPrefs`, then `multiSet`s the rest. The guarded families
   are exactly three patterns (`sync.js:1390-1400`): manual landmarks, the
   wellbeing mode, and the per-uid profile blob (D97-19 F4). Nothing in the
   notification family is guarded.

**Concrete user consequence.** The user moves their weekly check-in reminder to
Wednesday 07:00 on their phone at 09:00 Monday; the phone pushes the blob
`@volyume_notification_prefs` stamped 09:00. Their tablet, last synced a week
ago, is opened at 18:00. The tablet's push runs first and uploads its **week-old**
blob stamped 18:00, which is now the freshest row in the account. The tablet
then pulls its own stale value back. The phone's next sync pulls it too. The
change the user made is gone from both devices, with no error and no prompt,
and the reminder fires on the old day. The same mechanism applies to
`@volyume_quiet_hours_v1` (`notifications/quietHours.js:18`),
`@volyume_schedule_v1` / `@volyume_reminder_enabled_v1` /
`@volyume_reminder_time_v1` (`notifications/trainingReminders.js:13-15`) and to
every other unguarded `@volyume_` key.

**Relationship to existing records.** This is the mechanical core of FR-C4-2,
stated as a correctness defect rather than an architecture preference. It also
qualifies D97-19's correction to `PERSONALISATION-MATURITY.md`: the corrected
claim ("all five named values cross a reinstall") is right — reinstall is a
one-way restore onto an empty device — but *crossing a reinstall* and
*surviving a second device* are different properties, and the unguarded keys
have only the first.

**Direction sketch (not applied).** The narrow fix is to reuse the mechanism
that already exists and is already pinned green: add the notification family to
`GUARDED_PREF_PATTERNS` (`sync.js:1390-1400`) and call `notePrefWrite` at the
write sites, so the blob and the reminder keys carry their own honest edit time
through `_guardedPrefUpdatedAt` and are dropped on pull when this device's own
write is newer (`sync.js:1996-2008`). That is per-key, additive, uses only
shipped code paths, and is explicitly **not** the wholesale consolidation the
order forbids. Its cost is the same asymmetry calm mode has (documented at
`sync.js:1959-1971`): a key edited on two devices resolves to the later real
edit rather than the later sync. The lead implements after ruling; this lane
does not modify `src/`. The alternative (move the blob's contents into the
per-category `notification_preferences` rows, which already have true LWW and a
cloud trigger) is the dual-family consolidation FR-C4-2 owns and is out of
scope here.

---

### S-3 (DEFECT, MED-HIGH, Phases 36 + 32) — pref sync has no tombstone, so a removed key is resurrected in the same sync cycle

**Trace.** `_pushAllUserPrefs` enumerates the keys that currently exist
(`sync.js:1469-1470`, `AsyncStorage.getAllKeys().filter(shouldSyncPref)`) and
upserts them. A key that has been **removed** is simply absent from the push;
the cloud row is never deleted and is never marked. `_pullUserPrefs` then runs
later in the same cycle and writes it straight back (`sync.js:2032-2034`).

Two live removers exist for keys that pass `shouldSyncPref`:

```js
// src/screens/SettingsCoachingScreen.js:95-98  (readiness ask, stored inverted)
if (value) await AsyncStorage.removeItem('@volyume_intent_prompt_off');
else await AsyncStorage.setItem('@volyume_intent_prompt_off', 'true');
```

```js
// src/screens/HomeScreen.js:764-766  (phase banner, cleared when the phase changes)
if (dismissedPhase && dismissedPhase !== currentPhase) {
  await AsyncStorage.removeItem('@volyume_phase_banner_dismissed_v1');
}
```

**Concrete user consequence.** The user turns the pre-session readiness ask back
ON in Settings. Within one sync cycle the cloud row re-writes
`@volyume_intent_prompt_off = 'true'`, and the next session start reads it and
skips the prompt (`HomeScreen.js:1361-1364`, which then starts with all-null
readiness so the downward-only session tweaks never fire at all). The toggle
looks like it worked, and reverts silently — repeatedly, on every device. The
second case is milder: the phase-change banner stays suppressed after a genuine
phase change, so the user is not told their targets no longer match their phase.

**Relationship to existing records.** New. It is a second, independent failure
mode of the same pref-sync surface as S-2, and it is not fixed by the guarded
mechanism (a guarded key's *removal* is equally untombstoned).

**Direction sketch (not applied).** Options: (a) write an explicit empty
sentinel instead of removing (change the two call sites to `setItem(key, '')`
and make the readers treat `''` as absent — smallest, but pushes the semantics
into every future reader); (b) give `user_prefs` a soft-delete column and push
tombstones for keys that disappear, which needs a cloud migration and a
"what counts as deleted" contract; (c) keep a local list of deliberately-removed
keys and exclude them on pull until the cloud row is gone. All three are
founder-visible design choices, not a mechanical fix; recorded for the Phase 57
triage next to FR-C4-2.

---

### S-4 (DEFECT, MED-HIGH, Phases 35 + 32) — adaptation_events restore into a table nothing reads: FR-C4-3, and the answer to Phase 35's question

**Phase 35 asks whether adaptation_events matter to current coaching, history,
explanation, receipts and replay, and says: "If it is merely historical/debug:
say so. If product behaviour changes: surface severity."**

**Answer: product behaviour changes. It is not merely historical.**

**Trace.**

1. The push reads the PRIMARY local table and maps it onto the cloud shape
   (`sync.js:1258-1291`, reading `getAllAdaptationEventsForUser`,
   `database.js:7053-7071`). So events do reach the cloud.
2. The pull writes them into the **mirror**:

```js
// src/lib/database.js:8287-8294
export async function insertOrUpdateAdaptationEventFromCloud(userId, row) {
  ...
  `INSERT OR REPLACE INTO adaptation_events_sync
    (id, user_id, mesocycle_week_id, event_type, payload, recorded_at, ...)
```

3. Every reader reads the PRIMARY table:
   `getRecentAdaptationEvents` joins `adaptation_events` -> `mesocycle_weeks` ->
   `mesocycles` (`database.js:4478-4495`). There is no reader of
   `adaptation_events_sync` anywhere.

This is precisely the shape P0-1 fixed for `planned_muscle_volume` and left
unfixed here, which is why it was recorded as FR-C4-3
(`docs/coherence-cleanup-2026-08-10/D95-RULINGS.md:84-88`).

**What is actually lost.** `getRecentAdaptationEvents(userId, 6)` is one of the
six parallel reads feeding the session-adjustment engine
(`src/lib/sessionAdjustments.js:127`), filtered to `session_*` decisions
(`:135`) and passed in as `recentSessionEvents` (`:161`). Inside the pure
engine:

```js
// src/lib/algorithms.js:1113-1126
// Add-frequency cap (this week) and revert memory (this meso), both derived
// from adaptation_events - no new state.
for (const ev of recentSessionEvents) { ...
  if (code && code.startsWith('session_add') && (ev.createdAt ?? 0) >= weekStartMs) addedThisWeek.add(ev.muscle);
  if (code === 'session_adjustment_reverted') revertCounts[ev.muscle] = (revertCounts[ev.muscle] ?? 0) + 1; }
// :1160-1162
if (revertCounts[muscle] >= 2) {
  // Revert memory: the user has won this argument twice this meso. Hold.
  reasonCode = SESSION_REASON_CODES.HOLD_USER_PREF;
```

So on a reinstalled or second device:

- **A user choice is forgotten.** The user has twice reverted the engine's
  suggested set change for a muscle this block. On the new device that memory is
  zero, and the engine proposes the same change again. That is a direct
  RESPECT MY CHOICES failure, and it is the only "the user has won this
  argument" memory the session layer has.
- **The same-week add cap is lost**, so a muscle can be given a second `+1` in
  the same week across two devices.
- **The receipts surface goes blank.** `EngineLog` renders "N recent coaching
  decisions" from `getRecentAdaptationEvents(userId, 4)`
  (`src/components/EngineLog.js:71-72`) on the Coach tab's strategic journal
  (`src/screens/CoachHeldHistoryScreen.js:192`), and returns null when empty
  (`EngineLog.js:85`). Four weeks of "why the app did what it did" disappear —
  a SHOW ME WHY loss, not a debug loss.

**Severity rationale.** MED-HIGH rather than HIGH: nothing unsafe happens (the
engine's downward-only and safety branches do not depend on these events), the
loss is bounded to the current block's session layer, and the events are still
in the cloud — the restore target is wrong, not the data.

**Direction sketch (not applied).** The P0-1 shape applies directly: point the
applier at the primary `adaptation_events` table, mapping the cloud's
`event_type` + `payload` back onto the local `decision` / `reason_code` /
`signals_json` columns the readers expect (the push already carries all of them
inside `payload`, `sync.js:1270-1278`), skipping rows whose
`mesocycle_week_id` does not resolve locally (the local column is NOT NULL and
the readers join through it). That is one applier plus a mapping contract, and
it is exactly the "careful campaign slot" FR-C4-3 was reserved for. Do not
change the push; it is already correct.

---

### S-5 (DEFECT, MED-HIGH, Phases 38 + 32) — weeks offline permanently strands cloud deletes

**Law.** Phase 38: "Do not assume network continuity ... historical rows
preserved". Phase 32: no resurrection of what the user removed.

**Trace.**

1. `workout_delete` / `workout_set_delete` are the only path that can express a
   deletion to the cloud; a bulk upsert cannot
   (`useAppStore.js:441-449` states this explicitly).
2. The retry budget is six attempts on the schedule
   `[0, 1min, 5min, 30min, 2h, 8h]` (`syncQueue.js:26-27`). Every foreground
   drain with no network counts a failure (`syncQueue.js:105-122`,
   `_scheduleRetry` at `:133-148`). `hasLiveSession()` still answers true
   offline (the session is cached), so the dead-session deferral at
   `syncQueue.js:83-91` does not protect the budget.
3. On the sixth failure the op is parked:
   `next_attempt_at = Date.now() + 365 * 24 * 60 * 60_000` (`syncQueue.js:136-141`).
4. The drain only selects `retries < MAX_RETRIES` (`syncQueue.js:96-101`), so
   reconnecting **never** retries it.
5. `getPendingDeleteOpCount` counts every retry state, including given-up ops
   (`syncQueue.js:264-277`), and sign-out refuses while any remain
   (`useAppStore.js:455-462`).
6. The local delete is a hard delete with no tombstone
   (`database.js:2696-2706`, `3181-3190`), and the cloud row keeps
   `deleted_at IS NULL`, so a full pull re-inserts it
   (`sync.js:1578-1597`).

**Concrete user consequence.** A user deletes a mis-logged session on a plane,
uses the app across the next day still offline; roughly eleven hours of
foreground activity exhausts the budget. Weeks later they reconnect. The delete
is never retried. Settings then refuses sign-out with "Sync incomplete" for
ever, and if they take the "sign out anyway" escape hatch (or reinstall) the
deleted session comes back with its sets, re-entering volume and PR history.

**Direction sketch (not applied).** Options: (a) never give up on delete ops —
cap the backoff at 8h and keep retrying, since a delete tombstone has no
expiry and cannot conflict; (b) distinguish network-shaped failures from
definitive ones and only count the latter against the budget (the same
distinction FQ-6.1 already draws for the trial-grant queue,
`payments/pendingCascade.js:18-20`); (c) soft-delete workouts locally and let
the ordinary upsert path carry `deleted_at`, which removes the special delete
path entirely but is a schema and reader change across every history surface.
(b) is the smallest change that matches an existing, already-ruled pattern.

---

### S-6 / S-7 (LATENT, Phase 34) — the two branches of 134 that are not refusals

Both are proven in `<scratch>/sim134.sql` against the migration's verbatim
trigger body.

**S-6, the IS-NULL branch (MED).** A push carrying no `updated_at` is accepted
and stamped `now()`. The migration header names this deliberately for old AABs.
The residual risk is not old clients but current ones: every push mapper for the
nine tables ends in `?? Date.now()` — e.g.
`updated_at: new Date(r.updatedAt ?? r.createdAt ?? Date.now()).toISOString()`
(`sync.js:1235` for planned volume; the same shape at `:839` routines, `:904`
routine_exercises, `:998` mesocycles, `:1015` mesocycle_weeks, `:1061`
coach_outputs, `:1120` user_body_profile). A local row whose `updated_at` and
`created_at` are both null — a legacy row from before a column was added, or a
row written by a path that forgot the stamp — is uploaded stamped **now**, which
beats the trigger by construction. The proof run shows the accepted-write
outcome exactly: `name = 'Old client wrote this'`, `is_active = t`,
`block_ledger = NULL`, `updated_at = now()`.

**S-7, the equal-timestamp branch (LOW).** `NEW.updated_at = OLD.updated_at`
falls into the stamp branch and returns NEW, so the row **content** is
overwritten and the timestamp advanced. In the proof run a push carrying the
cloud row's own timestamp replaced the name with `EQUAL-STAMP CLOBBER` and
nulled the ledger. This is not reachable through any local writer today — every
`UPDATE mesocycles` bumps `updated_at` (`database.js:838-840`, `3780-3787`,
`4438-4441`) — so it needs two devices writing in the same millisecond. Recorded
for completeness because the registry contract says "newer wins", and this
branch is "not older loses", which is a different rule.

Neither finding argues against applying 134. Both are the shape of its
remaining edges.

---

### S-11 (DEFECT, HIGH, Phase 33) — migration 132 is a gate for prescription equivalence, not only for explanation copy

**Phase 33 asks to prove the intended after-migration state: device A ->
adaptive next block -> source/provenance persisted -> cloud -> clean device B ->
planned rows restored -> live explanation matches. And to report whether 132
remains a hard release gate for cross-device adaptive truth.**

**Before 132 — proven.** The cloud table has no `mev/mav/mrv/source`
(`migrate_012_complete_sync.sql:205-214`). Running the client's push shape
against that table in the scratch cluster rejects the whole statement
(`ERROR: column "mev" of relation "planned_muscle_volume" does not exist`), and
the stripped retry (`sync.js:1242,1249-1251`) then lands the row. Device B's
`select('*')` returns eight columns, none of them provenance. So the pre-132
behaviour is exactly as the migration header claims and **nothing regresses**
(finding S-10, CLEAN).

The applier then degrades honestly (`database.js:8078-8087`): missing bounds are
replaced with `VOLUME_LANDMARKS[muscle]` and `source` becomes `'template'`.

**The first consequence — the explanation.** `'template'` is a member of
`RESEARCH_SOURCES` (`blockExplain.js:77`), and no research source has a
`SOURCE_CLAUSE` (`:68-72`), so `buildBlockStartLines` takes the
`personalised.length === 0` path (`:189-206`) and emits the research line.
Proven against the real module:

```
BEFORE-132 device B lines:
["This block starts from research-based guidance for this plan. Your block
  history picks up again as its blocks finish."]

AFTER-132 device B lines:
["Chest: 12 sets in week 1, building to 16 by week 5, then a recovery week
  (set by how your last block went)."]
```

(`<scratch>/jest/p33.test.js`, both assertions pass; the after-migration lines
are asserted byte-identical to device A's.) Note the interaction with the just-
landed D97-20 P-5: because `hadPriorBlocks` is now true for a mature user, the
false line is the *mature* variant — a slightly better lie, still a lie about a
ledger-seeded block.

**The second consequence, and the reason this is more than copy.** The row's
`mrv` is not decoration. It is the clamp band the coach's next volume apply
uses:

```js
// src/lib/database.js:4256-4263 (the writer's own rationale)
// Stage 6 review #7: the row's [mev, mrv] is computeVolumeApply's clamp band.
// A seed can legitimately sit above the research MRV (its ceiling is the
// learned/adapted band, capped at 30), so the row's mrv must accommodate the
// seeded peak or the coach's next "add sets" apply would CLAMP the muscle
// back down.
const rowMrv = seeded ? Math.max(mrv, seed.peakSets) : mrv;
```

```js
// src/lib/coachApply.js:344-348
const mrv = row.mrv ?? row.mav ?? ABSOLUTE_WEEKLY_SET_CEILING;
...
if (next > mrv) next = mrv;
```

Pre-132, device B restores `mrv = VOLUME_LANDMARKS[muscle].mrv` instead of
`max(research mrv, seeded peak)`. Applying the same coach output on device A and
device B therefore produces **different planned sets** for any muscle whose seed
peak exceeded the research MRV. The direction is conservative (the ceiling is
lower, so the clamp is tighter), which is why this is a truth defect rather than
a safety defect — but a deterministic engine that yields two answers for the same
inputs because a persisted input silently differs by device is exactly what
"deterministic" is supposed to exclude.

**Verdict on the order's question.** **132 remains a hard release gate for
cross-device adaptive truth**, and the gate is wider than
`MIGRATION-RELEASE-GATES.md:19-30` records: it covers the block-start
explanation (provenance), the mixed-block remainder line
(`blockExplain.js:233-236`), and the per-row apply ceiling. It is still not a
gate for *shipping the client* — the column-tolerant retry holds, proven — so
the gates record's headline verdict stands; its scope needs widening.

---

### S-14 (DEFECT, HIGH, Phase 34) — migration 135 can delete the applied receipt it exists to protect

**The migration's claim.** `migrate_135_coach_outputs_week_unique.sql` header:
"de-duplicate the legacy pairs, keeping the row with the newest honest
`updated_at` (an applied row wins a tie)".

**What the SQL does.** The tie-break clause only fires on an exact timestamp
equality:

```sql
COALESCE(newer.updated_at, newer.created_at) > COALESCE(co.updated_at, co.created_at)
OR (
  COALESCE(newer.updated_at, newer.created_at) = COALESCE(co.updated_at, co.created_at)
  AND (newer.applied::int, newer.id) > (co.applied::int, co.id)
)
```

So whenever the two rows have different timestamps, `applied` is irrelevant.

**Proven.** With `legacyA` applied at 10:00 and `legacyB` unapplied at 11:00,
running the migration verbatim deletes `legacyA` and keeps `legacyB`
(`<scratch>/sim135.sql`; `DELETE 1`, survivor `legacyB | f`).

**Why the unapplied row is routinely the newer one.** `saveCoachOutput`'s
UPDATE branch rewrites `output_json` and stamps `updated_at = now()` every time
the week's output is generated (`database.js:6826-6846`), and the Coach screen
generates on view. So a user who applies the week's change on their phone on
Monday and merely **opens** the Coach tab on their tablet on Tuesday has an
unapplied tablet row that is strictly newer than the applied phone row. The
migration then deletes the receipt.

**Concrete user consequence.** After the migration, the surviving cloud row for
that week has `applied = false` and an `output_json` with no
`appliedAdjustments`. A reinstall or a third device restores it and shows a
live Apply button for a change that has already been applied to the block. If
the user taps it, the volume/calorie change is applied a second time. That is
the double-apply path the migration is meant to close, delivered by the
migration itself. `preserveAppliedAdjustments` cannot help — it merges into the
row being saved, and the applied copy has been deleted.

**Direction sketch (not applied).** The predicate should rank `applied` above
recency, not below it — e.g. order by `(applied::int DESC, COALESCE(updated_at,
created_at) DESC, id DESC)` and keep the first — or, better, merge:
keep the newest row but carry the applied flag and `appliedAdjustments` forward
from any deleted sibling before deleting it. Both are single-statement changes
to an unapplied migration and cost nothing to make now. Either way the header's
claim and the SQL must be brought into agreement before the founder is asked
for "run against production".

---

### S-15 (DEFECT, HIGH, Phase 34) — after 135, a legacy local id poisons the coach_outputs push for ever

**Trace.**

1. Local migration v71 dedups by `rowid` and **keeps the surviving row's
   original id** (`database.js:2091-2099`); it does not rewrite legacy `uid()`
   ids to the deterministic `co_<weekStart>_<userId>` form.
2. `saveCoachOutput` re-uses whatever id it finds for the week
   (`database.js:6822-6846`), so a legacy id survives every later save.
3. The push upserts on `(user_id, id)` (`sync.js:1064-1068`).
4. 135's cloud dedup can legitimately keep a **different** id than the device's
   local dedup kept: the two dedups run over different row sets (a device only
   ever had its own row) and different orderings (`rowid DESC` locally vs
   `id DESC` in the cloud).
5. The device then pushes a row whose `(user_id, id)` does not exist but whose
   `(user_id, week_start)` does. The new unique index rejects it, and the
   rejection aborts the **whole statement**.

**Proven.** After the dedup, pushing the deleted legacy id together with the
current week's fresh output in one two-row batch fails with
`ERROR: duplicate key value violates unique constraint
"idx_coach_outputs_user_week"`, and the follow-up select shows the current
week's row **did not land** (`<scratch>/sim135.sql`).

**Why it is permanent.** There is no per-row retry on `_pushCoachOutputs` —
compare `notification_preferences`, which learned this lesson and retries row by
row on 23514 (`sync/tables/notificationPreferences.js:111-126`). There is no
push watermark on coach outputs, so every cycle re-sends the whole set,
including the poison row. And the pull cannot heal the local id: with the local
unique index in place, `insertCoachOutputFromCloud`'s not-found branch is an
`INSERT OR IGNORE` (`database.js:7431-7450`) whose `(user_id, week_start)`
collision is silently ignored, so the device keeps its legacy id for ever.

**Concrete user consequence.** For an affected long-tenured user, coach outputs
stop reaching the cloud entirely from the moment 135 is applied. Their current
week's coaching, its applied receipt, and every later week never sync. A later
reinstall restores the coaching history as it was on the day the migration ran.
Silent: the failure is a `logPgErr` (`sync.js:1067`) and the cycle reports a
push error, not a user-visible message.

**Direction sketch (not applied).** In rough order of how well each matches the
existing architecture: (a) add a local migration that re-ids `coach_outputs`
rows to `co_<week_start>_<user_id>` before v71's index — the client and cloud
identities then converge by construction, and it must ship in the same build as
the migration; (b) push with `onConflict: 'user_id,week_start'` once the index
exists, which makes the week the identity on both sides; (c) mirror the
`notification_preferences` per-row retry so one poison row cannot take the batch
down. (a) and (c) are complementary; (b) alone changes the conflict target while
legacy ids remain, which leaves two rows' worth of id drift in the local table.
**This is the finding that most changes the release calculus for 135** and is
answered directly in Section 4.

---

### S-16 (CORRECTION, MED, Phase 34) — the pre-135 failure is arbitrary receipt loss, not duplication

`MIGRATION-RELEASE-GATES.md:80-89` states: "the client already writes
deterministic ids and the LOCAL unique index exists (database.js v71,
idx_coach_outputs_user_week) - so new rows cannot duplicate, but legacy cloud
pairs persist and **can restore as duplicates**."

They cannot. On a clean device, `_pullCoachOutputs` iterates the rows in
whatever order PostgREST returns (`sync.js:2192-2201`, no `order`), and
`insertCoachOutputFromCloud` looks up the existing row **by id**
(`database.js:7399-7402`). For the second row of a legacy pair the id lookup
misses, so it falls to `INSERT OR IGNORE` (`:7431-7436`), which the local unique
index turns into a silent no-op. The restored device therefore holds exactly one
row per week — an arbitrary one of the pair, with no ordering guarantee and no
preference for the applied copy.

The user-visible risk is the same in kind (a live Apply button for an already
applied week) but the mechanism matters for the fix: the exposure is not "two
rows on the device", it is "the device kept the wrong one", which is also why
S-14's tie-break matters so much. Recorded so the gates record can be corrected
rather than re-derived.

---

### S-17 (LATENT, MED-HIGH, Phase 32) — a wellbeing suppression contract that cannot fire

`supabase/migrate_123_retention_email_loop.sql:51-65` records the sending job's
data contract: "before sending any of the three email kinds, the job MUST check
(a) `ed_pattern_flags` for an open flag on the user (`cleared_at IS NULL`) -- if
found, do not send, log status `'suppressed_wellbeing'`". The migration is
applied remotely (`:69-71`).

Per S-1, no client and no server function ever writes a row into cloud
`ed_pattern_flags`. The table is empty for every user, so check (a) can never
match and `suppressed_wellbeing` can never be logged. A retention email would go
to a user with an open ED flag.

Latent today because `supabase/functions/` contains no sender
(`app-store-notifications`, `app-store-verify`, `delete-account`,
`partner-cheer`, `play-billing-rtdn`, `send-push` only). It stops being latent
the day the job is written, and whoever writes it will read the contract, not
this audit. Flagged here so S-1's resolution and the marketing loop are decided
together.

---

### S-19 (LATENT, MED, Phase 37) — the two-device simulation, step by step

Phase 37's sequence traced against the code, with the Campaign 1 conflict laws
checked at each step. Device A is current; device B has been offline since the
block started.

| Step | What happens | Law | Verdict |
|---|---|---|---|
| A starts a block | `activatePlanWithBlock` (`database.js:3746`) writes the block and its weeks; `generateInitialPlannedVolume` (`database.js:4212-4286`) writes the seeded planned rows with their source and clamp band | — | — |
| B syncs | B pulls A's block; appliers preserve real timestamps (`database.js:7595-7600`) so B's copy cannot masquerade as freshly edited | ordering | CLEAN |
| A completes a workout | pushed on save; B is offline and unaware | — | — |
| B stale, A applies weekly coaching | A's applied receipt is written into `output_json` and `applied` (`database.js:6826-6846`) | one output per week | CLEAN locally (unique index v71); cloud needs 135, see S-14/S-15 |
| B opens the old plan | B reads its own stale local rows; nothing is written unless the user acts | — | — |
| A finishes the block; ledger computed | `storeBlockLedger` (`database.js:4435-4442`) bumps `updated_at`; push omits the ledger key entirely when this device has none (`sync.js:979-991`) so a stale device cannot erase it by column | ledger cannot be nulled | CLEAN |
| B still believes the block active, syncs | **B pushes before it pulls** (`sync/runner.js:203-251`). Today the cloud row is overwritten with `is_active = 1`. With 134 the write is refused (proven, S-12) | completed block cannot resurrect | **cloud-exposed until 134** |
| A chooses adjustments | applied receipt + planned rows rewritten with `source = 'coach'` | applied changes cannot double | CLEAN (`RB-10` applyingRef + the receipt) |
| B reconnects | B's pull refuses every cloud row older than its own and accepts every newer one (`database.js:7591-7594,7654-7657,7402,8092`); A's newer rows win, B converges | deterministic convergence | CLEAN |

The one live hole is the middle row, and it is exactly the hole 134 fills. The
important nuance the gates record does not state: **both devices keep correct
LOCAL state throughout** — B's stale push corrupts only the cloud, and A's next
sync re-pushes its newer rows and heals it. The damage is therefore latent until
someone reads the cloud without A having synced since: a reinstall, or a third
device. A user who has stopped using device A is restored from the corrupted
copy. That is why 134 is the strongest gate, and it is also why the absence of
134 has not produced visible support traffic.

Two additional Phase 37 laws checked and CLEAN:
`consecutiveOffTargetWeeks`-style counters cannot double-count across devices
because they read stored rows, not device state (D97-5); and stale B cannot
undo calm or safety state, because calm is a one-way ratchet on pull
(`sync.js:1959-1971,2003-2006`) that additionally fails closed on any unreadable
input (`:1998-2000,2004`) — verified green in `campaign1.syncConflict`.

---

### S-22 / S-21 (CLEAN, Phase 38) — the weeks-offline sequence

Traced: device offline, logs workouts across several weeks, completes what
check-ins it can, the plan progresses locally, then reconnects.

- **No duplicate learning.** A block ledger is computed once and frozen by
  version behind a hard block-end precondition
  (`blockLedgerRunner.js:104-114`), so replaying a reconnect cannot recompute or
  re-teach from the same block.
- **No duplicate coach apply.** One row per user-week locally
  (`database.js:2091-2099`), the applied receipt is preserved through every
  re-save (`preserveAppliedAdjustments`, `database.js:6827`), and the pull-side
  applier only advances on a strictly newer cloud row
  (`database.js:7399-7402`).
- **Chronological ordering preserved.** Appliers keep the cloud row's real
  `created_at` rather than stamping restore time
  (`database.js:7595-7600,7658-7659`) — the fix that keeps `getActiveBlock` and
  `getAchievedWeeklyPeaks` ordering intact after a restore.
- **Old cloud cannot overwrite newer local truth.** Every applier on the
  conflict-critical tables gates on `local >= cloud -> return`
  (S-18's citations).
- **Watermarks behave.** They are excluded from pref sync as device state
  (`sync.js:1316-1326`), never move backwards (`watermark.js:66-71`), and only
  advance after a zero-failure pass, so a long offline stretch produces a larger
  delta rather than a gap.
- **Safety state cannot weaken** — with the exception of S-1 (the ED flag is not
  a synced entity at all) and subject to S-2/S-3 for anything stored as an
  unguarded pref.

The one defect in this phase is S-5.

---

## 3. PHASE 32 RESTORATION LEDGER

Each item the order names, with its restore path and verdict.

| Item | Path | Verdict |
|---|---|---|
| Profile | `users_profile` read in `restoreSessionFromCloud` (`useAppStore.js:891-979`) + the per-uid blob rebuild flagged and suppressed from push (D97-19 F4, `useAppStore.js:965-968`, `sync.js:1471-1482`) | RESTORES (choices absent for the first post-reinstall session, as recorded in D97-19) |
| Tier / trial | `refreshTierFromCloud` (`useAppStore.js:1011-1030`) + `tier_history` pull-only | RESTORES |
| Programmes / plans | `_pullProgrammes` with folder filing and `is_archived` (D97-13) | RESTORES |
| Routines + exercises | `_pullRoutinesAndExercises`, LWW appliers | RESTORES |
| Active block | `_pullMesocycles`, `is_active` carried, LWW | RESTORES |
| Block Ledger | `mesocycles.block_ledger`, cloud column live since migrate_131 (applied); the applier preserves a local ledger when the cloud carries none (`database.js:7578-7581,7628-7630`) | RESTORES |
| Planned muscle volume | `_pullPlannedMuscleVolume` into the PRIMARY table, paginated (`sync.js:1895-1916`) | RESTORES; **provenance and clamp band only after 132** (S-11) |
| Manual overrides | `@volyume_landmarks_<uid>`, guarded pref with the stamp rule | RESTORES (pinned `prefSync.landmarks`) |
| Nutrition targets | registry transport, LWW | RESTORES |
| Weights | `_pullMorningWeights` + `body_composition_log` (`weight_log` is an alias no-op, `sync/tables/weightLog.js:18-24`) | RESTORES |
| Food history | food-domain bulk RPC coordinator | RESTORES per sync law |
| Notification preferences | per-category rows restore with true LWW; the blob and reminder keys restore via pref sync | RESTORES, but see S-2/S-3/S-8 for the multi-device half |
| Partner state | `pullPartners` restores partnerships, week signals, cheers, win cards, and prunes ended pairs (`sync/tables/partners.js:91-136`) | RESTORES |
| Progress entities | `user_insights` with the dismissal ratchet (D97-19 F5, `database.js:7949-7974`), exercise goals, notes, PRs derived from restored sets | RESTORES |
| Historical cardio | pull-only legacy retained (`registry.js:118-133`) | RESTORES as legacy, no product surface |
| Photos | never synced; registry has no photo table (guard test green) | LOCAL-ONLY as promised |
| No false new-user onboarding | optimistic routing; only a heuristic guess can be corrected to the wizard | CLEAN (S-9) |
| **ED-pattern flag** | none — no push path exists | **LOST (S-1)** |
| **adaptation_events** | restores into a zero-reader mirror | **EFFECTIVELY LOST (S-4)** |
| **Deleted workouts** | a stranded delete op leaves the cloud row alive | **RESURRECT (S-5)** |

---

## 4. RELEASE IMPACT — the order's question, answered head-on

**"Determine exact release impact if a build containing Campaigns 1-6 ships
before 134 and 135 are applied. Do not wave this away."**

### If the build ships with NONE of 132/134/135 applied

Nothing crashes and nothing stops syncing. The client is designed for this
state: the planned-volume push retries without provenance (proven, S-10), the
`coach_outputs` push is unaffected by the absence of the unique index, and no
code path requires a trigger to exist. **There is no client-breaking impact.**

What ships broken is the *truth*, and it is not cosmetic:

1. **Multi-device conflict semantics are known-vulnerable (no 134).** A stale
   device's push can, in the cloud, re-activate a completed block, null its
   ledger, land stale calorie targets and overwrite `scoff_score` — ED-screening
   data. Both devices keep correct local state, so the damage surfaces on
   reinstall or a third device, or permanently if the good device is retired
   (S-19). This is the strongest gate and the Phase 60 verdict is upheld
   without qualification.
2. **Cross-device adaptive truth is false (no 132).** A restored device tells a
   ledger-seeded athlete their block is research-based, and clamps their next
   coach apply to a different ceiling than the device that made the decision
   (S-11, proven). Any marketing or in-app claim about coaching that follows you
   across devices is not currently true.
3. **Legacy duplicate weeks stay live (no 135).** A reinstall keeps an arbitrary
   one of a legacy pair and can therefore show a live Apply button for an
   already-applied week (S-16 corrects the mechanism). Bounded to users with
   pre-fix rows.

**Verdict: shipping without them is safe for availability and unsafe for
correctness.** The order's phrasing — "ships known-vulnerable conflict
semantics" — is accurate for 134 and should be treated as a release-note-level
statement, not a nice-to-have.

### If the founder applies the batch

**134: apply. Unreserved.** Its trigger does exactly what it claims (proven,
S-12), its precondition that every client push ships an honest timestamp holds
across all nine tables (verified line by line, S-13), all nine already carry
`updated_at` so the ALTER is a no-op, and it is additive, idempotent and
non-destructive. Its two edges (S-6 IS-NULL, S-7 equal-stamp) are narrower than
the hole it closes.

**132: apply, and treat it as a wider gate than recorded.** Additive, nullable,
idempotent, re-run clean (proven). It should now be understood as the gate for
cross-device *prescription equivalence*, not only for explanation provenance.

**135: DO NOT APPLY AS WRITTEN.** This is the one place this lane departs from
the Phase 60 record. Two defects in the migration itself:

- it can **delete the applied receipt** and keep the merely-viewed duplicate,
  resurrecting the Apply button it exists to remove (S-14, proven); and
- once the unique index exists, any device still holding a legacy id for a
  deduplicated week **permanently poisons its whole coach-output push batch**
  with 23505, including the current week's output, with no per-row retry and no
  local re-id migration to prevent it (S-15, proven).

Both are fixable before it is ever run — a corrected tie-break (or a
carry-the-receipt merge) and a client-side re-id migration shipped in the same
build. Neither is fixable afterwards without support-visible loss. The correct
next action is a founder decision on the fix, not a "run against production" for
the file as it stands.

**133: unchanged** from the Phase 60 record (retroactive privacy hygiene, no
functional coupling). **049: stays HELD**, unchanged.

**Recommended batch, revised: 134 -> 132 -> 133, with 135 held pending its own
fix.** The Phase 60 ordering rationale is otherwise intact; 135 was ordered after
134 for its ordering dependency, and holding it does not affect the other three
(135's `DELETE` needs `coach_outputs.updated_at`, which migrate_012 already
supplied, so the dependency was never load-bearing).

---

## 5. WHAT THIS LANE DID NOT DO

- Modified nothing in `src/`, no tests, no other document. The Phase 36 narrow
  fix is **described with evidence and left for the lead to rule and
  implement**, per the brief.
- Ran no migration against anything remote. The scratch PostgreSQL cluster was
  created inside the session scratchpad, used only for the verbatim SQL of
  132/134/135 against hand-built table copies, and is not connected to any
  Supabase project.
- Proposed no wholesale sync consolidation. Every direction sketch is per-table
  or per-key and reuses a shipped, tested mechanism.
- Did not re-litigate D97-19 (F3, F4, F5), D97-13, D97-5/8/10/11, FR-C4-2 or
  FR-C4-3 as new discoveries; where they appear, they are cited and extended
  with the consequence evidence Phases 35 and 36 asked for.
- Proposed no freshness or decay semantics anywhere (D91-25 untouched).
