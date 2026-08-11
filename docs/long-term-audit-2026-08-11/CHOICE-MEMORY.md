# Choice memory — every explicit user choice with long-term significance

Campaign 6, founder addendum lane "CHOICE MEMORY AUDIT". Audit only. Nothing
in `src/`, no test, no migration and no other document was modified to
produce this file.

**Authority.** The founder's Campaign 6 addendum, verbatim
(`c6-ADDENDUM-PERSONALISATION-DIVIDEND.txt:104-108`):

> CHOICE MEMORY: CHOICE-MEMORY.md inventory of explicit choices (coaching
> mode, manual workload, plan choice, Repeat/Adjust, Apply/ignore, calm
> mode, notification prefs, dietary settings, units, durable dismissals):
> stored where / persists / syncs / respected / must-repeat / expiry
> defined?

Framed by PROMISE 4 (`:36-37`): "RESPECT MY CHOICES - autonomy is part of
the retention model; no silent preference learner; users never re-reject
the same stale proposal." And by the trust list (`:86-89`): "relationship
failures = ... settings reverting, forgotten manual decisions ...".

**Posture.** Classification only. This file proposes **no** preference
inference, no learner, no decay curve and no freshness algorithm (D91-25
stays unimplemented). Where a choice is genuinely forgotten, a minimal-fix
sketch is recorded as a candidate for the Phase 57 triage — not built, not
pre-decided.

**Method.** Every claim is traced from branch `claude/campaign6-long-term`
and cited `file:line`. Where this file contradicts an earlier campaign
document, the code is reported as the truth and the divergence is named
(see the correction notice below).

---

## CORRECTION NOTICE — the "AsyncStorage means lost on reinstall" claim

`PERSONALISATION-MATURITY.md` states in several entries that AsyncStorage
preferences are device-local and lost on reinstall — most explicitly at
entry 5 (manual landmarks): "NOT in `SYNC_REGISTRY` ... and not in the
legacy sync path, so it is device-local and LOST on reinstall or a new
device", and in the Day-180 close: "everything held only in AsyncStorage is
lost on reinstall or on a new device (manual landmarks, streak state,
wellbeing mode, win-back state, the habit schedule)".

**That is not how this app persists preferences.** There is a third route
the registry does not cover: a whole-namespace AsyncStorage → `user_prefs`
mirror.

- `shouldSyncPref` is **allow-by-prefix**: every key starting with
  `@volyume_` syncs unless it matches an explicit exclusion pattern
  (`src/lib/sync.js:1367-1370`, prefix at `:1301`, exclusions at
  `:1306-1365`).
- Push: `_pushAllUserPrefs` reads `AsyncStorage.getAllKeys()`, filters by
  that rule and upserts every survivor into `user_prefs`
  (`src/lib/sync.js:1460-1481`), called from `bulkUploadLocalData`
  (`:753`). Single-key pushes go through `syncUserPref` (`:1442-1457`),
  fired from the store on every pref write (`src/store/useAppStore.js:175-184`).
- Pull: `_pullUserPrefs` reads every row the user owns and `multiSet`s them
  straight back into AsyncStorage (`src/lib/sync.js:1991-2032`), applying
  the same exclusion filter (`:2007`).
- Two families are additionally **guarded** against a stale device
  overwriting them — manual landmarks and calm mode
  (`src/lib/sync.js:1388-1397`, `filterGuardedPulledPrefs` at `:1957-1990`,
  local write stamps via `notePrefWrite` at `:1409-1414`).

So manual landmarks (`@volyume_landmarks_<uid>`), calm mode
(`@volyume_wellbeing_mode`), streak state (`@volyume_streak_v1_<uid>`),
lifetime milestone "seen" state (`@volyume_milestones_v1_<uid>`), the habit
reminder schedule (`@volyume_schedule_v1`), win-back episode state
(`@volyume_winback_*`), quiet hours, every `@volyume_seen_*` walkthrough
flag and the whole notification-preferences blob **do** cross a reinstall,
by this route. The maturity model's list of reinstall losses is wrong for
those keys.

The keys that genuinely do **not** cross are the ones named in the
exclusion list, and the ones that never touch AsyncStorage at all. Both are
enumerated in Register B below. This correction does not change any
maturity-model conclusion about *learning*; it changes only the
*persistence* column, which is exactly this file's subject.

---

## PART 0 — the four persistence routes

Every row in the inventory resolves to one of these. Knowing which route a
choice takes answers "persists?", "syncs?" and "must repeat?" in one step.

| Route | Mechanism | Survives restart | Survives reinstall / second device |
|---|---|---|---|
| **R1 — SQLite table in the sync registry or a legacy push/pull pair** | `src/lib/sync/registry.js`, or a `_push*`/`_pull*` pair in `src/lib/sync.js` | Yes | Yes |
| **R2 — AsyncStorage `@volyume_` key, not excluded** | `user_prefs` mirror, `src/lib/sync.js:1367-1370,1460-1481,1991-2032` | Yes | Yes (next full sync cycle) |
| **R3 — AsyncStorage `@volyume_` key, explicitly excluded** | `PREF_EXCLUDE_PATTERNS`, `src/lib/sync.js:1306-1365` | Yes | **No** — deliberate, per-key rationale in that list |
| **R4 — SQLite table with no sync path** | local only | Yes | **No** — not deliberate anywhere it appears |

Two cross-cutting facts:

- **Sign-out does not wipe preferences.** Sign-out is session-only by
  policy; only *delete account* calls `AsyncStorage.clear()`
  (`src/hooks/useAccountActions.js:329-331`, with the rationale at
  `:321-328`). So a sign-out/sign-in cycle never costs the user a setting.
- **`userProfile` is a blob, not a set of columns.** The store persists the
  whole profile object to `@volyume_user_profile_<uid>`
  (`src/store/useAppStore.js:285-289`, key at `:15`) and *separately*
  pushes nine mapped columns to `users_profile`
  (`src/lib/sync/tables/profiles.js:30-45`). Any profile field with no
  mapped column (coaching tone, autonomy, show-science, body-weight units,
  every meal-plan preference) therefore travels **only** on the R2 blob
  route. This is the single most load-bearing fact in the inventory and it
  is where the one genuine at-risk case lives (Register B, F4).

---

## PART 1 — the inventory

Each entry: **stored where** (exact key/column + `file:line`) ·
**persists across restarts?** · **syncs across devices/reinstall?** · **do
later systems respect it?** · **must the user ever repeat it?** ·
**expiry, and does current product law define one?**

### 1. Coaching autonomy mode (Coached / Collaborative / Manual)

- **Stored.** `userProfile.coachAutonomy`, written by `saveLocalProfile`
  (`src/screens/SettingsCoachingScreen.js:57-63`), so it lands in the
  AsyncStorage profile blob `@volyume_user_profile_<uid>`
  (`src/store/useAppStore.js:285-289`). **No cloud column** — it is not in
  `FIELD_MAP` (`src/lib/sync/tables/profiles.js:30-45`). Route R2 via the
  blob. The screen's own comment states this precisely
  (`SettingsCoachingScreen.js:31-46`).
- **Restarts.** Yes — RootNavigator rehydrates the blob at boot
  (`src/navigation/RootNavigator.js:1022-1035`).
- **Reinstall / second device.** Only via the blob pref row, and **at risk**
  — see Register B, F4.
- **Respected?** Yes, and in both directions. `applyDisabled` blanks every
  Apply button under Manual (`src/screens/CoachOutputScreen.js:1016-1017`);
  the Coached auto-walk gates on the mode
  (`:2163`) and is now bounded to the current cycle (D97-10). A safety hold
  always forces confirm-first whatever the mode
  (`src/lib/weeklyCoach.js:1469-1480`) — so Coached is never a promise to
  bypass a hold, and the settings copy says so
  (`SettingsCoachingScreen.js:226`).
- **Must repeat?** Only after a reinstall, and only if F4 bites.
- **Expiry.** None, and none should exist. No product law defines one.

### 2. Coaching tone register (Automatic / Supportive / Precise)

- **Stored.** `userProfile.coachTone` (`SettingsCoachingScreen.js:38,49-55`);
  same blob, same absent cloud column. Route R2 via the blob.
- **Restarts.** Yes. **Reinstall.** Same F4 risk.
- **Respected?** Yes — `resolveRegister` reads it first and only falls back
  to experience/training-age when it is `'automatic'`
  (`src/lib/coachRegister.js:80-83`), and the register selects the prose
  builders for all five response parts (`:283-320`).
- **Must repeat?** As above. **Expiry.** None; none needed.

### 3. Show the science

- **Stored.** `userProfile.showScience` (`SettingsCoachingScreen.js:39,65-71`).
  Route R2 via the blob. **Restarts.** Yes. **Reinstall.** F4 risk.
- **Respected?** Yes, narrowly and honestly. `withScience` appends the
  technical term only when the flag is on
  (`src/lib/coachResponse.js:159-167`), and the live mapping is exactly one
  term (the weight-trend average, `:188`); the settings copy was corrected
  to promise only that (`SettingsCoachingScreen.js:265-267`).
- **Must repeat?** As above. **Expiry.** None.

### 4. Session readiness check (ask before each session, on/off)

- **Stored.** `@volyume_intent_prompt_off`, stored **inverted** because
  asking is the default (`src/screens/SettingsCoachingScreen.js:86-99`).
  Route R2 (not excluded).
- **Restarts.** Yes — re-read on every focus (`:105-106`) and by the Home
  start path.
- **Reinstall.** Yes, via `user_prefs`.
- **Respected?** Yes, including the consequence. Off means no readiness
  signal, so session adjustments never fire; the off-state copy names both
  consequences, including that next block's targets stay put because these
  answers are the ledger's main recovery evidence (`:164-166`).
- **Must repeat?** No. **Expiry.** None; correct.

### 5. Manual volume-target overrides (per-muscle MEV/MAV/MRV)

- **Stored.** `@volyume_landmarks_<uid>` (`src/lib/effectiveLandmarks.js:107`),
  written only for muscles genuinely edited away from research defaults
  (`src/screens/VolumeHeatmapScreen.js:250-267`). Route R2, **guarded**
  (`src/lib/sync.js:1390-1393`).
- **Restarts.** Yes. **Reinstall / second device.** Yes — and this is the
  best-protected preference in the app: the editor pushes the key
  immediately rather than waiting for a bulk sync
  (`VolumeHeatmapScreen.js:282-288`, and the reset path clears the cloud
  copy with an empty-string sentinel at `:300-310` so a reset cannot be
  undone by a later pull), stamps its own write time
  (`notePrefWrite`, `:274,284,304`), and the pull drops any cloud row older
  than that stamp, failing closed on any read error
  (`src/lib/sync.js:1957-1990`).
- **Respected?** Yes, at every layer. Top of the precedence merge
  (`src/lib/effectiveLandmarks.js:45-50`); rung 1 of the seed chain and
  suppression-proof there (`src/lib/blockSeed.js:69-79`); it suppresses
  ledger teaching for that muscle so the app cannot later launder the
  user's own numbers back as "learned from your history"
  (`src/lib/interBlock.js:140`, `src/lib/learnedRange.js:136-138`); an
  untouched editor default is correctly **not** treated as an override
  (`src/lib/effectiveLandmarks.js:85-96`). Only the absolute 30-set ceiling
  and the research MEV floor clamp it (`src/lib/blockSeed.js:63-65`).
- **Must repeat?** No. **Expiry.** None. No product law defines one, and the
  D91-25 posture keeps it that way.

### 6. Plan choice (which plan is active)

- **Stored.** `plans.is_active` in SQLite, set through `setActivePlan`,
  which now unarchives on activation and runs the deactivate/activate pair
  in one transaction (D97-12). Route R1.
- **Restarts / reinstall.** Yes.
- **Respected?** Yes for identity. **Partially** for position: `is_archived`
  now syncs both ways (D97-13), so a reinstall no longer resurrects every
  archived plan, but `next_workout_index` has no cloud column and is not
  synced (P44-13, carried to Phase 57) — so "which session comes next"
  resets on a new device.
- **Must repeat?** The plan choice itself, no. The position in the rotation,
  yes, after a reinstall.
- **Expiry.** None.

### 7. Repeat vs Continue-with-adjustments (per-block intent)

- **Stored.** Twice, both times as provenance rather than preference:
  `logInfo('PlansScreen.blockRestart', 'intent=...')`
  (`src/screens/PlansScreen.js:381`), and `seedOutcome = { intent,
  recordedAt, perMuscle }` written back onto the finished block's ledger
  (`src/lib/blockLedgerRunner.js:438`, called at
  `PlansScreen.js:406-410`). The consequence is durable and visible: the
  written `planned_muscle_volume.source` becomes `seed_ledger` /
  `seed_learned` / `seed_manual` (`src/lib/database.js:4202`).
- **Restarts / reinstall.** The consequence, yes (R1, mesocycles and planned
  rows sync). The recorded intent, yes.
- **Respected?** The intent is respected at the moment it is made
  (`seedIntent` at `PlansScreen.js:397`, consumed by `resolveSeedRange`).
  It is **never read again**: `seedOutcome` has no reader anywhere in `src/`
  outside a source-presence assertion in
  `src/lib/__tests__/adaptiveBlock.e2e.test.js:368`. Under the addendum's
  RESPOND-TO-ME taxonomy this field is class **D, collected-unused** — and
  correctly so, because a per-block decision is not a standing preference.
  It is recorded here so no future surface claims it is one.
- **Must repeat?** Yes, every block — by design. The decision is deliberately
  manual and nothing rolls over on its own
  (`src/lib/mesocycle.js:479-495`; stated to the user at
  `src/components/HomeBlockShapeSheet.js:72`).
- **Expiry.** N/A — it is a decision, not a setting.

### 8. Apply vs ignore (the coach receipt)

- **Stored.** `appliedAdjustments[key] = { appliedAt, ...details }` inside
  the coach output's `output_json` (`src/lib/coachApply.js:302-314`), plus
  whatever the apply wrote (`planned_muscle_volume`, `nutrition_targets`).
  Route R1 — `coach_outputs` push/pull at `src/lib/sync.js:1059,2167-2178`.
- **Restarts.** Yes, and specifically protected against the screen's own
  remount re-save: `preserveAppliedAdjustments` carries a stored receipt
  forward when a fresh `runWeeklyCoach` result (which never carries one)
  is written over the same user-week row
  (`src/lib/database.js:6741-6790`).
- **Reinstall / second device.** Yes, and the double-apply hole is closed:
  `insertCoachOutputFromCloud` is last-write-wins rather than
  `INSERT OR IGNORE`, so device B's Apply button no longer stays live after
  device A applied (`src/lib/database.js:7356-7375`). Cloud week-uniqueness
  awaits migration 135 (unapplied).
- **Respected?** Yes, and this is the strongest "I told you, you listened"
  chain in the product. Nothing auto-applies without a tap
  (`src/lib/coachApply.js:2-6`); an ordinary proposal only reaches the
  session engine once it is a **persisted applied** target for this week
  (`src/lib/sessionAdjustments.js:137-149`); and `pairAppliedWithOutcome`
  verdicts each applied decision against the calendar-consecutive next week
  only, never an array-adjacent week across a gap
  (`src/lib/coachOutcome.js:44-62`).
- **Ignore** is a real, respected state: an un-applied proposal changes
  nothing, and the held-decision copy explains why the coach is not moving
  (`src/lib/weeklyCoach.js:1452-1466`).
- **Must repeat?** No.
- **Expiry.** The receipt never expires. The *proposal* now does: the
  Coached auto-walk requires the displayed output's week to be the live or
  immediately previous week (D97-10), so a months-old reviewed-but-unapplied
  output can no longer execute itself into today's block. Older outputs keep
  their manual Apply buttons with every clamp intact. This is the one place
  in the app where proposal staleness **is** defined in product law.

### 9. Session-adjustment revert (the user overruling the engine)

- **Stored.** Every session-adjustment decision, including reverts and
  holds, is appended to `adaptation_events`
  (`src/lib/sessionAdjustments.js:171-184`, write at
  `src/lib/database.js:4375-4390`). Route R1 (push `src/lib/sync.js:1280`,
  pull `:1894-1909`).
- **Restarts / reinstall.** The rows, yes.
- **Respected?** Yes, strongly: two logged reverts for a muscle put it on a
  permanent hold for the rest of that block
  (`src/lib/algorithms.js:1136-1138`).
- **Must repeat?** Effectively yes after a long absence — see expiry.
- **Expiry.** **Undefined in product law, real in practice.** The revert
  memory is read through a trailing six-week window
  (`src/lib/sessionAdjustments.js:127`, cutoff at
  `src/lib/database.js:4407-4412`), so a user returning after more than six
  weeks has their revert decisions silently forgotten and can be offered the
  +1 they already rejected twice. No copy states this, and no rule defines
  it as intentional. Recorded in Register B (F9).

### 10. Next-time coaching notes ("tell me this next session")

- **Stored.** SQLite `workout_notes` (the *local* next-time table, created
  at `src/lib/database.js:595`), written by `saveNextTimeNote`
  (`:8388-8399`), consumed and retired by `markNoteShown`
  (`:8414-8424`). **Route R4.**
- **Restarts.** Yes. **Reinstall / second device.** **No.** The synced
  `workout_notes` push/pull pair reads the *different* local table
  `workout_notes_v2` (`src/lib/sync.js:1148-1166,1798-1812`;
  `getAllWorkoutNotesForUser` selects from `workout_notes_v2` at
  `src/lib/database.js:6940-6951`). The next-time table has no sync path at
  all, and the cloud shape carries no `routine_id`, `exercise_id`,
  `shown_count` or `expires_after_uses` columns to hold it.
- **Respected?** Yes, on the device: shown once by default and deleted at
  its use limit (`:8404-8424`).
- **Must repeat?** Yes, after a reinstall — a note the user wrote to their
  future self is gone. Register B (F3).
- **Expiry.** Use-count based, defined in code (`expiresAfterUses`,
  default 1) but stated in no product law document.

### 11. Manual weekly session goal, and streak pauses

- **Stored.** `@volyume_streak_v1_<uid>` (`src/lib/streakState.js:26`),
  holding the manual goal, pause spans, the per-week high-water map and
  which milestones have been celebrated (`:25,74-98`). Route R2.
- **Restarts / reinstall.** Yes (contra the module's own header at
  `streakState.js:4-8` and the maturity model, both of which predate or
  overlook the `user_prefs` mirror).
- **Respected?** Yes. The manual goal is never auto-raised by a plan — the
  lower of (routine count, manual goal) wins
  (`src/hooks/useWeeklyStreak.js:112-119`) — and pauses are renewable
  without limit (`src/lib/streakState.js:74-77`).
- **Must repeat?** No. **Expiry.** None for the goal. `highWater` and
  `longestRun` are monotone by design (`:80-91`).

### 12. Calm mode

- **Stored.** `@volyume_wellbeing_mode` (`src/lib/wellbeing.js:17`), set from
  Settings on both tiers (`SettingsCoachingScreen.js:73-78`). Route R2,
  **guarded**, with a local write stamp taken immediately after the write
  (`src/lib/wellbeing.js:40`).
- **Restarts / reinstall / second device.** Yes, with a deliberate
  asymmetry: the **calm ratchet** means a pulled `normal` can never replace
  a local `calm`, so turning calm off applies on the device where it was
  turned off and does not propagate to a device that is already calm
  (`src/lib/sync.js:1940-1951,1984-1987`). Erring toward the safer state is
  the intended behaviour and is documented at the code site.
- **Respected?** Everywhere, and fail-closed: an unreadable value counts as
  suppressed (`src/lib/blockLedgerRunner.js:78-83`,
  `src/hooks/useWeeklyStreak.js:107-109`,
  `src/screens/CoachOutputScreen.js:1534-1536`). It blocks upward carry in
  the ledger (`src/lib/interBlock.js:240-245`) and in the learned range
  (`src/lib/learnedRange.js:154-161`), skips the learned band in seeding
  (`src/lib/blockSeed.js:154`), and — importantly for long-term honesty —
  the suppressed marks written onto ledger entries during a calm period
  persist, so clearing calm mode later cannot retroactively teach the
  ceiling upward (`src/lib/interBlock.js:259-264`).
- **Must repeat?** No. **Expiry.** None, deliberately. It is a safety
  posture, not a session state.

### 13. Cycle tracking opt-in

- **Stored.** `@volyume_cycle_tracking` (`src/lib/cyclePrefs.js:18`).
  **Route R3** — explicitly excluded from pref sync as Article 9
  special-category data (`src/lib/sync.js:1354`), with the module stating
  the intent: "Not synced to the cloud: a privacy opt-in defaults off on
  every device, the user turns it on where they want it"
  (`cyclePrefs.js:12-14`).
- **Restarts.** Yes. **Reinstall / second device.** **No, deliberately.**
- **Respected?** Yes: the question and the Settings row appear only when
  opted in AND the recorded sex is female
  (`cyclePrefs.js:35-38`, `SettingsCoachingScreen.js:287`), and the row
  still renders for a lapsed non-Pro user whose flag is on so the
  revocation path never disappears (`:284-287`).
- **Must repeat?** **Yes**, on every new device — correct under Article 9,
  but nothing tells the user this. Register B (F1), recorded as a
  disclosure question, not a sync question.
- **Expiry.** None; correct.

### 14. Analytics opt-out

- **Stored.** `@volyume_privacy_prefs` (`src/lib/privacyPrefs.js:7`).
  **Route R3** — excluded (`src/lib/sync.js:1353`) under the module's own
  contract that a privacy opt-out must not itself be transmitted. Rows
  uploaded by older builds are frozen-stale and never re-imported; cloud
  cleanup is `supabase/migrate_133_delete_privacy_pref_rows.sql`
  (unapplied, founder-gated).
- **Must repeat?** **Yes**, per device — deliberate. Register B (F2).
- **Expiry.** None.

### 15. Article 9 health-data consent

- **Stored.** `users_profile.health_data_consent` (cloud), cached at
  `@volyume_health_consent_<uid>` (`src/navigation/RootNavigator.js:1380`).
- **Restarts / reinstall.** Yes — the cache is checked first, the cloud
  column second (`:1379-1410`).
- **Respected?** Yes, and it fails **closed**: a transient read error
  resolves consent to `null` (unresolved), never `false`, so the
  un-skippable gate stays closed and re-checks next session rather than
  re-prompting a user who already consented (`:1392-1420`).
- **Must repeat?** No. **Expiry.** None.

### 16. Diet preference (omnivore / vegetarian / vegan)

- **Stored.** `userProfile.dietPreference` → cloud column
  `users_profile.diet_preference` (`src/lib/sync/tables/profiles.js:37`,
  migration 055 applied), plus the blob. Route R1 **and** R2.
- **Restarts / reinstall.** Yes, on both routes. **Respected?** Yes — the
  curated meal library filters on it
  (`src/store/useAppStore.js:1806-1820`).
- **Must repeat?** No. **Expiry.** None.

### 17. Allergen excludes (FSA tag exclusion list)

- **Stored.** `userProfile.mealPlanExcludeTags` → cloud
  `users_profile.allergen_excludes` (`profiles.js:42`), migration 112.
- **Reinstall.** Yes, **and the pull can never unset it**: only a real cloud
  array can change the local list, because "an allergy silently wiped by a
  pull would be the worst failure this field has"
  (`profiles.js:248-253`). The push is column-tolerant so the field keeps
  syncing whether or not 112 is applied (`:161-172`).
- **Must repeat?** No. **Expiry.** None. This is the correct pattern and
  the one other safety-adjacent fields (`sex`, `:244-247`) also follow.

### 18. Meal-plan preferences (excluded foods, meals per day, variety, fat convention, peri-workout)

- **Stored.** `userProfile.mealPlan*` — local-only profile fields with **no
  mapped cloud column**. Route R2 via the blob only, and explicitly
  protected inside the profiles pull: the merge spreads the local profile
  first so these survive, because rebuilding from the mapped columns alone
  "would silently wipe them on the next sync — a real data-loss bug"
  (`src/lib/sync/tables/profiles.js:229-235`).
- **Respected?** Yes (`src/lib/food/mealPlanService.js:107-111`).
- **Must repeat?** Same F4 exposure as rows 1-3.
- **Expiry.** None.

### 19. Per-day calorie offsets

- **Stored.** `@volyume_perday_target_offsets` plus a separate write clock
  `@volyume_perday_target_offsets_updated_at`
  (`src/lib/food/perDayTargets.js:37,40`). Route R2 today; a dedicated
  registry table `perday_target_offsets` exists but its cloud migration 110
  is written and **not applied** (`src/lib/sync/registry.js:235-249`).
- **Restarts / reinstall.** Yes via R2 (the module header's "device-local
  only and lost on reinstall/device change" describes the pre-`user_prefs`
  understanding and is out of date on the same ground as the maturity model).
- **Respected?** Yes, display-only: never a coaching write, never a floor
  (`registry.js:236-241`).
- **Must repeat?** No. **Expiry.** None.

### 20. Applied nutrition targets (and manual target edits)

- **Stored.** SQLite `nutrition_targets` (`src/lib/database.js:4478-4520`),
  registry-synced bidirectionally (`src/lib/sync/registry.js:169-175`).
  Route R1.
- **Respected?** Yes, and safety is re-enforced at the write, not only at
  the proposal: the sex-aware floor clamps the applied value and returns
  null when the floor makes the apply a no-op
  (`src/lib/coachApply.js:68-89`), and the macro-cycle path refuses to serve
  any sub-floor day (`:153-161`).
- **Must repeat?** No.
- **Expiry.** **None** — the stored target persists indefinitely and is the
  starting point for the next adjustment however long the gap. That is
  recorded as fact in `PERSONALISATION-MATURITY.md` entry 14 and is
  restated here because it is a *choice* the user applied, not only a
  derived value.

### 21. Gym weight units

- **Stored.** `userProfile.units` → cloud `users_profile.units`
  (`profiles.js:32`). Route R1 + R2.
- **Respected?** It is coerced: `setUnits` writes `'kg'` whatever is passed,
  and any legacy cloud/profile value is forced to `'kg'` on load
  (`src/store/useAppStore.js:1768-1787`, and `:945` on the cloud-hydration
  path). kg-only is the product decision, not a stale preference.
- **Must repeat?** No. **Expiry.** N/A.

### 22. Body-weight units (st / kg / lbs)

- **Stored.** `userProfile.bodyWeightUnits` (`src/store/useAppStore.js:1789-1804`).
  **No cloud column** — not in `FIELD_MAP`. Route R2 via the blob, with a
  per-field write stamp (`:65,1800`).
- **Respected?** Yes (`src/components/WeightTrendCard.js:44`,
  `src/components/BeforeAfterShareSheet.js:148`).
- **Must repeat?** Same F4 exposure. **Expiry.** None.

### 23. Energy display unit (kcal / kJ)

- **Stored.** `accessibility.energyUnit` inside `@volyume_a11y_prefs`
  (`src/lib/accessibilityPrefs.js:3`, default at
  `src/store/useAppStore.js:1938`, writer at `:1973-1986`). Route R2, pushed
  immediately on change (`:1985`).
- **Respected?** Yes, and reactively — every food surface reads it through a
  selector rather than a snapshot (e.g.
  `src/components/food/MacroRings.js:243`,
  `src/components/food/EntryRow.js:38`).
- **Must repeat?** No. **Expiry.** None.

### 24. Accessibility preferences (including reduce-motion)

- **Stored.** `@volyume_a11y_prefs`. Route R2. The user's explicit
  reduce-motion choice is kept separate from the OS value
  (`reduceMotionUserPref` vs the effective `reduceMotion`), with a one-time
  migration seeding the user pref from the legacy field so upgrading users
  keep their choice (`src/store/useAppStore.js:1955-1968`). The OS mirror is
  runtime-only and never persisted (`:1987-1998`).
- **Must repeat?** No. **Expiry.** None.

### 25. Notification category toggles and check-in day/hour

- **Stored.** **Two families at once**, which is the open founder item.
  (a) A single JSON blob `@volyume_notification_prefs`
  (`src/lib/notifications/scheduler.js:55,1233`;
  `src/navigation/RootNavigator.js:1072,1109`), route R2.
  (b) One row per category in SQLite `notification_preferences` with its own
  `updated_at`, registry-synced last-write-wins
  (`src/lib/notifications/preferences.js:1-24,28-48`).
  `checkinDay` / `checkinHour` are read from the blob by the scheduler
  (`scheduler.js:831-832,1271-1272,645-655`) and mapped into the row family
  from the legacy blob at `preferences.js:232-233`.
- **Restarts.** Yes. **Reinstall.** Both families cross (blob on R2, rows on
  R1) — but *which one a given screen reads*, and in what order, is exactly
  the dual-storage design the founder has already gated.
- **Must repeat?** **Carried, not re-solved here.** FR-C4-2 (notification-pref
  dual-family) owns this; the first-use evidence is at
  `docs/first-use-audit-2026-08-10/INTERRUPTION-MATRIX.md:330-348`, whose
  scenario has a Pro user's Wednesday-07:00 check-in choice rendering as the
  Sunday defaults on a second device because the screen falls through both
  sources. One nuance this lane can add for the founder's eventual ruling,
  without changing it: the blob **does** ride `user_prefs` (route R2), so
  the second-device gap is a read-order and write-timing question inside
  the dual family, not an absence of persistence. Referenced only.
- **Expiry.** None.

### 26. Quiet hours

- **Stored.** `@volyume_quiet_hours_v1` (`src/lib/notifications/quietHours.js:18`),
  default 22:00-07:00 (`:20-26`). Route R2.
- **Restarts / reinstall.** Yes.
- **Respected?** Yes — every scheduled push consults the window and shifts
  to the first minute after it (`quietHours.js:1-14` and the scheduler call
  sites). A corrupt blob falls back to the locked default rather than
  disabling the window (`:34-46`).
- **Must repeat?** No. **Expiry.** None.

### 27. Training reminder on/off and time

- **Stored.** `@volyume_reminder_enabled_v1`, `@volyume_reminder_time_v1`
  (`src/lib/notifications/trainingReminders.js:14-15`), with the derived
  weekday set in `@volyume_schedule_v1` (`:13`). Route R2 for all three.
- **Respected?** Yes, and the habit writer explicitly does not touch the
  user's toggle or quiet hours
  (`src/lib/notifications/trainingHabitSchedule.js:21-24`). Where the user
  has no consistent pattern, an empty result is written as-is so the
  reminder falls silent honestly rather than firing on stale weekdays
  (`:63-70`).
- **Must repeat?** No.
- **Expiry.** The *derived weekdays* age out on a rolling six weeks
  excluding the in-progress week (`:46,89-96`) — a defined, documented
  window. The user's own on/off and time choices never expire. This is the
  cleanest separation of "learned" from "chosen" in the app.

### 28. Meal reminders

- **Stored.** `@volyume_meal_reminders` (`src/lib/notifications/scheduler.js:286`),
  and meal labels at `@volyume_meal_labels`
  (`src/lib/food/mealSlots.js:38`). Route R2 for both.
- **Must repeat?** No. **Expiry.** None.

### 29. Off-app write-back consent (Open Food Facts)

- **Stored.** `@volyume_off_writeback_consent_v1`
  (`src/lib/food/writeback.js:26`), with its own dismissal key
  `@volyume_off_consent_card_dismissed_v1` (`:31`). Route R2.
- **Must repeat?** No. **Expiry.** None.

### 30. Push-token registration

- **Stored.** `@volyume_expo_push_token` (`src/lib/notifications/pushToken.js:39`).
  **Route R3** — excluded because the token is device-bound and syncing the
  subscription mapping would resubscribe the wrong token; the user's stated
  reminder *preferences* sync, only the token does not
  (`src/lib/sync.js:1310-1315`).
- **Must repeat?** No user action involved. Correct as designed.

### 31-40. Durable dismissals

The addendum names dismissals specifically, so each is given its own row.
All `@volyume_seen_*` and dismissal keys are route R2 unless stated.

| # | Dismissal | Key / storage | Scope | Expiry — and is it defined in product law? |
|---|---|---|---|---|
| 31 | Pro teaser card | `@volyume_pro_teaser_dismissed_<uid>_<weekMs>` (`src/components/HomeProTeaserCard.js:23,41-46`) | Per user, **per local week** | **Yes, defined.** Returns quietly next week; the rationale is written at the code site (`:15-22`) — it previously rendered for ever, and every sibling card carries a close control. Defaults to *dismissed* until the read resolves so a closed card can never flash (`:27-30`). |
| 32 | Block-decision snooze | `@volyume_block_snooze` (`src/screens/PlansScreen.js:46,439-443`) | **Device-global — not keyed by user id** | **Yes, defined:** 7 days (`:440`), and cleared the moment the decision is actually taken (`:422`). The missing uid scoping is recorded in Register B (F8). |
| 33 | Next-time note shown | `workout_notes.shown_count` vs `expires_after_uses` (`src/lib/database.js:8414-8424`) | Per note | Use-count, default one showing. Defined in code, in no doc. Route R4 — see row 10. |
| 34 | Unilateral walkthrough | `@volyume_seen_unilateral_walkthrough` (`src/screens/ActiveWorkoutScreen.js:118`) | Per account | Once ever. Defined by the D9 convention comment at `:113-117`. |
| 35 | Superset walkthrough | `@volyume_seen_superset_walkthrough` (`ActiveWorkoutScreen.js:126`) | Per account | Once ever. This is the new key: it was previously gated on a per-mount ref only, so a four-step lesson fired up to twice per session for ever, to an audience of experienced lifters only (`:120-125`). Afterwards the StatusStrip chip carries the announcement. |
| 36 | Workout info tip, diary food/water/mark-eaten/plan-added hints, meal-plan dietary chip, diary food hint | `@volyume_seen_workout_info`, `@volyume_seen_diary_*`, `@volyume_seen_mealplan_dietary_chip` (`ActiveWorkoutScreen.js:1098,2743`; `src/screens/DiaryScreen.js:2094-2104`; `src/screens/MealPlanScreen.js:168`) | Per account | Once ever, by an explicit shared convention. |
| 37 | Coach adherence-why line | `@volyume_seen_coach_adherence_why` (`src/screens/CoachOutputScreen.js:149`) | Per account | Once ever (`:2566`). |
| 38 | Consistency explainer | `@volyume_consistency_explainer_seen` (`src/components/ConsistencyEcho.js:26,67`) | Per account | Once ever, and **fails closed**: a flag-read error keeps it hidden rather than flashing it (`:11-14,40-42`). |
| 39 | Insight dismissal | `user_insights.dismissed_at` (`src/lib/database.js:4814-4820`), route R1 | Per insight key | **Yes, defined: 14 days.** `persistInsights` refuses to resurrect a key dismissed within that window (`:4765-4773`) while pruning non-dismissed rows that no longer generate (`:4744-4761`). This is the only dismissal in the app with a real, stated expiry rule. Its cross-device durability is at risk — Register B (F5). |
| 40 | Progress-scan recalibration / meaning moment, partner moments, What's New, progress-photo prompt | `@volyume_progress_scan_*` (`src/lib/progressScanPreferences.js:10-11`), `@volyume_partner_moments_seen_v1` (`src/lib/partners/moments.js:49`), `@volyume_whats_new_last_seen` (`src/components/WhatsNewSheet.js:23`), `@volyume_photo_prompt_shown_v1` (`src/components/ProgressPhotoPrompt.js:54`) | Per account | Once ever / per version. None defined as expiring; none should. |

---

## PART 2 — REGISTER A: choices that are REMEMBERED AND RESPECTED

Twenty-nine of the thirty-nine inventoried choices. "Respected" means a
later system reads the choice and changes what it does, and no path
silently overrides it.

| # | Choice | Route | Why it qualifies |
|---|---|---|---|
| A1 | Session readiness check on/off | R2 | Consequence honoured *and* stated on the control that causes it (`SettingsCoachingScreen.js:164-166`) |
| A2 | Manual volume landmarks | R2 guarded | Top of every chain; immediate cloud push; stamp guard; cannot be laundered into "learned" |
| A3 | Calm mode | R2 guarded | Fail-closed everywhere; calm ratchet; suppressed marks persist onto ledger entries |
| A4 | Applied nutrition targets | R1 | Floor re-enforced at the write, not only the proposal |
| A5 | Apply/ignore receipts | R1 | LWW pull closes the double-apply hole; outcome pairing is calendar-adjacent only |
| A6 | Session-adjustment reverts (within a block) | R1 | Two reverts = permanent hold for that block |
| A7 | Plan choice (identity) | R1 | Archive partition restored to a real partition (D97-12/13) |
| A8 | Diet preference | R1+R2 | Cloud column; filters the curated library |
| A9 | Allergen excludes | R1+R2 | A pull can never unset it |
| A10 | Biological sex | R1+R2 | Never unset by a pull; onboarding-enforced |
| A11 | Article 9 consent | R1 | Fails closed on read error; never re-prompts a consenting user |
| A12 | Meal-plan preferences | R2 blob | Explicitly preserved through the profiles merge |
| A13 | Per-day calorie offsets | R2 | Display-only by contract; never a floor |
| A14 | Gym units | R1+R2 | Coerced to the product decision |
| A15 | Body-weight units | R2 blob | Read by every weight surface |
| A16 | Energy unit | R2 | Read reactively by every food surface |
| A17 | Accessibility prefs | R2 | User choice kept distinct from the OS value |
| A18 | Quiet hours | R2 | Consulted by every push; corrupt blob falls back to the locked default |
| A19 | Training reminder on/off + time | R2 | Habit writer never touches the user's toggle |
| A20 | Meal reminders + meal labels | R2 | — |
| A21 | Manual weekly session goal + streak pauses | R2 | Never auto-raised by a plan; pauses unlimited |
| A22 | Off write-back consent | R2 | — |
| A23 | Push-token non-sync | R3 | Correctly device-bound |
| A24 | Pro teaser dismissal | R2 | Weekly, with the frequency rationale recorded |
| A25 | Block-decision snooze | R2 | 7 days, cleared on the real decision |
| A26 | Walkthrough seen-keys (incl. the new superset key) | R2 | Once-ever by shared convention; the superset key closes a real repeat-lesson defect |
| A27 | Hint seen-keys (workout info, diary, meal plan, coach adherence-why) | R2 | Once-ever; consistency explainer fails closed |
| A28 | Insight dismissal, on one device | R1 | The only dismissal with a defined 14-day expiry |
| A29 | Progress-scan / partner / What's New / photo-prompt seen state | R2 | — |

---

## PART 3 — REGISTER B: choices FORGOTTEN, or STRUCTURALLY UNABLE TO PERSIST

Ten entries. Three are deliberate and correct (F1, F2, and the FR-C4-2
referral); the rest are genuine defects or open exposures. Minimal-fix
sketches are candidates for the Phase 57 triage — **not** decisions, and
none of them proposes inference.

### F1 — Cycle tracking opt-in does not cross devices (DELIBERATE; disclosure gap only)

Route R3 by design (`src/lib/sync.js:1354`, `src/lib/cyclePrefs.js:12-14`).
Correct under Article 9. The only finding is that **nothing tells the user**
their opt-in is per-device, so on a new phone the weekly check-in question
simply disappears with no explanation, which reads as the app forgetting.
*Minimal-fix sketch:* one sentence on the Settings row for a user whose
recorded sex is female and whose flag is off — stating that this choice is
kept on this device only, because it is period data. Copy only; no sync
change; no inference. Not built.

### F2 — Analytics opt-out does not cross devices (DELIBERATE; disclosure gap only)

Route R3 by design (`src/lib/sync.js:1344-1353`). Same shape as F1: correct
behaviour, silent to the user. *Minimal-fix sketch:* the same one-sentence
disclosure on the privacy row. Copy only. Not built.

### F3 — Next-time coaching notes are lost on reinstall (DEFECT)

The local `workout_notes` table (`src/lib/database.js:595,8388-8424`) has no
sync path; the similarly named synced pair operates on `workout_notes_v2`
(`src/lib/sync.js:1148-1166,1798-1812`,
`src/lib/database.js:6940-6951,7955-7970`). A note the user deliberately
wrote to their future self — the most literal "I told you" input in the
app — does not survive a reinstall or reach a second device, and the cloud
shape has no columns for `routine_id`, `exercise_id`, `shown_count` or
`expires_after_uses`.
*Minimal-fix sketch:* a new cloud table (or four additive columns on the
existing one) plus a registry entry, following the `exercise_user_notes`
pattern exactly. **Needs a migration, so it needs a founder decision** under
the campaign's no-production-migration constraint. Carried, not built.

### F4 — Coaching tone, autonomy, show-science, body-weight units and meal-plan prefs ride a blob that a reinstall can overwrite (EXPOSURE, order-dependent)

These five families have no cloud column and travel only inside
`@volyume_user_profile_<uid>` (Part 0). On a reinstall the sequence is:

1. `restoreSessionFromCloud` finds no local profile and rebuilds one from
   the nine `users_profile` columns, then **writes that rebuilt blob to
   AsyncStorage** (`src/store/useAppStore.js:938-968`, write at `:958`).
   The rebuilt profile necessarily contains no `coachTone`,
   `coachAutonomy`, `showScience`, `bodyWeightUnits` or `mealPlan*`.
2. `syncAll` runs its **push track before its pull track** on sign-in
   (`src/navigation/RootNavigator.js:1463-1480`;
   `src/lib/sync/runner.js:228-229`), and the push includes
   `_pushAllUserPrefs`, which ships every current AsyncStorage key
   (`src/lib/sync.js:753,1460-1481`).
3. `_pullUserPrefs` then writes the cloud blob back over AsyncStorage
   (`:1991-2032`), but the **in-memory** store profile is not re-read from
   AsyncStorage until the next launch
   (`src/navigation/RootNavigator.js:1022-1035`).

Two consequences, one certain and one racy:

- **Certain:** even in the good ordering, the user's tone/autonomy/units
  choices are absent for the whole first session after a reinstall and
  reappear only at the next launch. During that session any
  `saveLocalProfile` call writes the defaults blob again.
- **Racy:** if step 1's write lands before step 2's push (both are
  fire-and-forget and both wait on a cloud read, so neither order is
  guaranteed), the defaults blob is upserted over the good cloud row and
  the choices are lost permanently, not just for a session.

Nothing here is proven to fire in production; it is an ordering exposure
identified by reading the two paths, and it is exactly the failure the
addendum names as a relationship failure ("settings reverting").
*Minimal-fix sketches, in ascending cost:* (a) exclude
`@volyume_user_profile_` from `_pushAllUserPrefs` when the local blob was
machine-rebuilt this session rather than user-written; (b) give the profile
blob the same guarded treatment manual landmarks already have
(`notePrefWrite` on `saveLocalProfile`, stamp comparison on pull) — this
reuses an existing, tested mechanism and adds no new semantics; (c) map the
five families to real `users_profile` columns, which needs a migration.
Carried to the founder, with (b) noted as the smallest change that closes
both consequences.

### F5 — An insight dismissal can be un-dismissed by another device (DEFECT, Promise-4 relevant)

`dismissInsight` sets `dismissed_at` but does not bump any `updated_at`
(`src/lib/database.js:4814-4820`); the push ships
`updated_at: r.updatedAt ?? r.generatedAt` (`src/lib/sync.js:1136`), and the
pull applies rows with an unconditional `INSERT OR REPLACE`
(`src/lib/database.js:7955-7970` pattern; insights at
`insertOrUpdateUserInsightFromCloud`). So a second device that still holds
the same row id with `dismissed_at = null` can upsert that null over the
cloud copy, after which the first device pulls the null back and the card
returns. That is precisely "users never re-reject the same stale proposal"
(`addendum:36-37`) failing.
Related and smaller: `persistInsights` prunes resolved rows with a **local
`DELETE`** and no soft-delete stamp (`src/lib/database.js:4744-4761`), while
`_pullUserInsights` filters on `deleted_at IS NULL`
(`src/lib/sync.js:1760-1775`), so a pruned insight can be re-pulled and then
re-pruned — churn, not user-visible harm.
*Minimal-fix sketch:* a dismissal ratchet on the pull, mirroring the calm
ratchet that already exists for wellbeing mode
(`src/lib/sync.js:1940-1951,1984-1987`): a pulled row whose `dismissed_at`
is null may never clear a local non-null `dismissed_at`. One-way, no
timestamps needed, no new dependency, no migration. Carried.

### F6 — The notification-preference dual family (CARRIED, founder-gated)

Referenced, not re-solved: FR-C4-2 owns the dual-storage design, and the
first-use evidence is recorded at
`docs/first-use-audit-2026-08-10/INTERRUPTION-MATRIX.md:330-348` (a Pro
user's Wednesday-07:00 check-in choice rendering as the Sunday defaults on a
second device). This lane adds one fact for that ruling and stops: the blob
family **is** on route R2, so the second-device gap is a read-order and
write-timing question inside the dual family rather than an absence of
persistence. No fix proposed.

### F7 — Position in the plan rotation is not remembered across devices (DEFECT, carried)

`next_workout_index` has no cloud column and is not synced (P44-13, recorded
in `D97-RULINGS.md` under the D97-11..17 accepted/no-action block and
carried to Phase 57 because the fix needs a migration). The user's plan
choice survives a reinstall; where they were in it does not, so the app
offers session 1 to someone who was on session 4. Carried, not built.

### F8 — The block-decision snooze is not scoped to a user (DEFECT, small)

`BLOCK_SNOOZE_KEY = '@volyume_block_snooze'`
(`src/screens/PlansScreen.js:46`) has no uid suffix, unlike every sibling
dismissal (compare `HomeProTeaserCard.js:23`,
`src/lib/streakState.js:26`, `src/lib/milestones.js:43`). Two consequences:
a second account signing in on the same device inherits the first account's
snooze; and because the key is on route R2 it also crosses devices for the
same account, which is probably intended but is not stated anywhere.
*Minimal-fix sketch:* suffix the key with the user id, matching the
surrounding convention. One line, no migration, no behaviour change for a
single-account device. Carried.

### F9 — Session-adjustment reverts expire silently after six weeks (UNDEFINED EXPIRY)

The user's clearest "no, I do not want that" signal — a revert — is held in
`adaptation_events` for ever at the write but read through a six-week
trailing window (`src/lib/sessionAdjustments.js:127`,
`src/lib/database.js:4407-4412`). After a longer absence the caps and the
revert memory reset to neutral (`PERSONALISATION-MATURITY.md` entry 24) and
the engine may re-offer the +1 the user rejected twice. **No product law
defines this expiry**, no copy states it, and the six weeks is a query
parameter rather than a decision.
This is recorded as a *characterisation*, per the D91-25 posture: widening
or dating the window would be freshness semantics. It belongs beside D97-3
in the Phase 57 founder triage as "how long does a user's refusal stand?" —
a product question, not an engineering one. Nothing proposed.

### F10 — Repeat vs Adjust intent is recorded and never read (COLLECTED-UNUSED)

`seedOutcome` (`src/lib/blockLedgerRunner.js:438`) has no reader in `src/`.
This is **not** a defect — a per-block decision is not a standing
preference, and the addendum forbids inventing behaviour to justify a class-D
input (`:32`). It is registered so that no future surface says or implies
that the app remembers "you usually choose to adjust". If the founder ever
wants the block-decision card to state how the user's last transition was
resolved, the data is already stored; that is a product decision, not a
gap. Nothing proposed.

---

## PART 4 — expiry law register

The addendum asks whether expiry is *defined by current product law*, not
merely whether something happens to age. Consolidated answer:

**Choices with a defined, stated expiry (4).**

| Choice | Rule | Where the rule is stated |
|---|---|---|
| Pro teaser dismissal | one local week | `src/components/HomeProTeaserCard.js:15-23` |
| Block-decision snooze | 7 days, cleared on decision | `src/screens/PlansScreen.js:439-443,422` |
| Insight dismissal | 14 days, no resurrection inside it | `src/lib/database.js:4765-4773` |
| Coach proposal auto-apply eligibility | live week or immediately previous only | D97-10; `src/screens/CoachOutputScreen.js` auto-walk gate |
| Next-time note | use-count (`expiresAfterUses`, default 1) | `src/lib/database.js:8388-8424` — code only, no doc |

**Choices that expire in practice with no defining law (2).**

| Choice | What ages it | Note |
|---|---|---|
| Session-adjustment revert memory | six-week read window (`src/lib/sessionAdjustments.js:127`) | F9; carried to triage as a product question |
| Habit-derived reminder weekdays | rolling six weeks (`src/lib/notifications/trainingHabitSchedule.js:46,89-96`) | Not a user choice — a derived value beside one. Included only to keep the boundary visible: the user's on/off and time choices sitting next to it never expire. |

**Choices that must never expire, and do not (the rest).** Every setting in
Register A other than the dismissals. Notably calm mode
(`src/lib/wellbeing.js:17-29`), manual landmarks
(`src/lib/effectiveLandmarks.js:104-110`), the allergen list
(`src/lib/sync/tables/profiles.js:248-253`) and Article 9 consent — the four
where an expiry would be a safety, privacy or trust failure rather than a
tidy-up.

---

## Counts

- **Choices inventoried:** 39 (rows 1-30 plus the ten dismissal rows 31-40,
  which the table groups as 31-40 with row 36 covering one hint family).
- **Remembered and respected:** 29 (Register A).
- **Forgotten or structurally unable to persist:** 10 (Register B) — of
  which 2 are deliberate privacy exclusions with a disclosure gap only
  (F1, F2), 1 is referred to an open founder ruling (F6), 1 is a
  characterise-only expiry question (F9), 1 is correctly collected-unused
  (F10), and 5 are genuine defects or exposures (F3, F4, F5, F7, F8).
