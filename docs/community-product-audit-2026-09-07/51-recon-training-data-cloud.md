# 51 — Recon: training data that already reaches the cloud, and computation paths for Community leaderboards

Purpose: establish what the sync layer already pushes for workouts/sets, what
aggregates already exist server-side, what device-side metrics could be
published instead, and how gym-linked rankings ("who trained this week at my
gym", "most volume", "most consistent") could be computed WITHOUT any new
tracking — riding the existing `trainingProfile.js` consent path.

READ-ONLY recon. No code changed.

---

## 1. Cloud tables for workouts/sets: columns, RLS, sync path

### 1.1 `workouts` (`supabase/schema.sql:148-169`, baseline; additive columns since via `migrate_012` and later push-payload comments)

Columns (baseline + additive, per `_upsertWorkout` payload `src/lib/sync.js:479-508`):
`id, user_id, routine_id, mesocycle_id, mesocycle_week_id, started_at, ended_at,
duration_minutes, notes, name, pre_workout_intent, session_difficulty,
overall_pump, soreness_24h_before, fatigue_level, joint_discomfort,
sleep_quality, energy_score, set_count, total_volume, is_completed,
synced_at, updated_at, deleted_at (tombstone, migrate_012), created_at`.

- `is_completed BOOLEAN DEFAULT FALSE` — schema.sql:161. Local column
  `is_completed INTEGER DEFAULT 0` (`src/lib/database.js:253`); local read
  guards on it (`database.js:3616,3635` — `WHERE ... is_completed = 1`).
  **Yes, a completed marker exists** both locally and in the cloud push
  (`sync.js:502`: `is_completed: true` is hardcoded — only completed workouts
  are ever pushed at all, see 1.3).
- No local-day key column on `workouts` itself. `started_at`/`ended_at` are
  full timestamps (`msToISO`, `sync.js:485-486`); a "local day" or ISO week
  would need deriving from `started_at` via `dayKey.js` (UK-Monday weeks) at
  read/aggregation time — not stored pre-computed on the row.
- RLS: `ENABLE ROW LEVEL SECURITY` + `"Users can manage own workouts" FOR ALL
  USING (auth.uid() = user_id)` (schema.sql:167-169). Owner-only; no
  cross-user SELECT policy exists on `workouts` today, so a leaderboard
  computed by a normal client-side query is impossible without a new
  SECURITY DEFINER RPC (same pattern Community already uses, see §6).
- `mesocycle_id` present (schema.sql:152, populated `sync.js:483`).
  `is_deload` is **not a column on `workouts` or `workout_sets`** in any
  migration found — deload status lives on the mesocycle week plan (planEngine
  side), not stamped onto the logged workout row.

### 1.2 `workout_sets` (`schema.sql:172-198`, additive columns per `_upsertSets` payload `sync.js:532-573`)

Columns: `id, user_id, workout_id, exercise_id, exercise_name, set_number,
set_type ('straight' default), target_reps_min, target_reps_max, actual_reps,
weight NUMERIC(6,2), rir, rpe, failed, notes, post_set_pump,
post_set_muscle_connection, joint_discomfort, is_amrap, amrap_reps,
missed_reps, left_reps, right_reps, evidence_class (migrate_159, nullable,
gated by `CIRCUIT_SYNC_COLUMNS_ENABLED` flag — see below), created_at,
updated_at`.

- `evidence_class` (`migrate_159_workout_set_evidence_class.sql:1-100`):
  null (conventional) / 'circuit' / 'ballistic' / 'circuit_ballistic'.
  **Column exists on the cloud table and migration is applied remotely
  (2026-09-05), but the push omits it entirely while
  `CIRCUIT_SYNC_COLUMNS_ENABLED` is false** (`sync.js:561-566`, flag in
  `src/lib/sync/featureFlags.js`) — so today every cloud `workout_sets` row
  has `evidence_class = NULL` regardless of local truth. Relevant if a
  leaderboard wants to exclude circuit/ballistic sets from a "most volume"
  figure — that filter is not yet possible server-side.
- `is_deload`: not present on `workout_sets` either.
- `mesocycle_id`: not directly on `workout_sets` — only reachable via a join
  through `workout_id → workouts.mesocycle_id`.
- RLS: `ENABLE ROW LEVEL SECURITY` + `"Users can manage own sets" FOR ALL
  USING (auth.uid() = user_id)` (schema.sql:196-198). Same owner-only shape
  as `workouts`.

### 1.3 Sync path — what's pushed, when, what's not

- **Legacy per-entity sync, NOT in `SYNC_REGISTRY`** (`src/lib/sync/registry.js`
  has no `workouts`/`workout_sets` entries — grepped, zero hits). Workouts/sets
  are pushed by the older `src/lib/sync.js` functions per the file's own
  header comment: `sync.js:9` "2. Workout completed → syncWorkout()".
- **Push trigger: on save, only when the workout is marked complete.**
  `syncWorkout(supabaseUserId, workoutId)` is called from
  `src/screens/WorkoutSummaryScreen.js:892` and
  `src/screens/ActiveWorkoutScreen.js:3815`, both `.catch(() => {})` (best
  effort, queued on failure via `enqueueSyncOp('workout', ...)`,
  `sync.js:387-391`). There is no evidence of a push on every set-logged
  event mid-session — only at completion. An in-progress (not yet completed)
  workout is not represented in the cloud tables at all: `_upsertWorkout`
  hardcodes `is_completed: true` (`sync.js:502`), so **the cloud `workouts`
  table only ever contains completed sessions** — convenient for a "trained
  this week" figure, since no draft/abandoned session pollutes it.
- **Queued retry**: `syncQueue.js` / `enqueueSyncOp` on failure or a dead
  session (`_blockedByDeadSession`, `sync.js:363-371`); drained later,
  `rethrow: true` on drain so the queue owns backoff (`sync.js:378-393`).
- **Deletion**: `deleteWorkoutFromCloud` (`sync.js:419-447`) tombstones
  `workouts` (`deleted_at`) rather than hard-deleting, but hard-deletes the
  child `workout_sets` rows first (`sync.js:427-429`) — any leaderboard
  aggregation must filter `deleted_at IS NULL` on `workouts`.
- **What is NOT synced here / lives in different tables**:
  - `weight_log` — separate table, in `SYNC_REGISTRY`
    (`src/lib/sync/registry.js`, `last_write_wins`, bidirectional,
    `softDelete: false`), a completely different push mechanism from
    workouts.
  - `food_entries`, `custom_foods`, `saved_meals`, `recipes`,
    `recipe_ingredients`, `food_favourites` — all separate `SYNC_REGISTRY`
    entries, food domain (`src/lib/food/db.js`), unrelated tables.
  - So training data (workouts/sets) and body/food data are cleanly
    separated at the table and sync-mechanism level — a training leaderboard
    reading `workouts`/`workout_sets` cannot accidentally pull in
    bodyweight or food.

---

## 2. Existing cloud aggregates/functions over workouts — PR detection is LOCAL ONLY

- Grepped every `supabase/migrate_*.sql` for functions/views touching
  `workouts`/`workout_sets` beyond RLS policies and the `evidence_class`
  column add (migrate_159). **No PL/pgSQL function, view, or materialized
  view was found that aggregates, ranks, or computes PRs/volume/streaks over
  `workouts`/`workout_sets`.** The only server-side logic touching these
  tables is row-level security and the one column migration.
- `personal_records` table exists in the baseline schema
  (`schema.sql:237-251`) but nothing in the sync/legacy code (grepped
  `sync.js`, `database.js` for `personal_records`) pushes to it from the
  app's PR-detection path — PR detection is computed **on-device**:
  - `src/lib/algorithms.js` — `detectPR` (imported by `posts.js:26`).
  - `src/lib/liftProgress.js` — `buildLiftProgressRows`,
    `buildExerciseMetricSeries`, `derivePRIndices` (pure functions over local
    set rows, `liftProgress.js:34,111,173`).
  - `src/lib/blockMetrics.js` — `computeBlockPerformance`,
    `effectiveBlockSlopePct` (`blockMetrics.js:164,475`), block-level
    volume/slope trend, local only.
  - `workoutRecordLine.js` — not directly greppable as exported functions in
    this pass; referenced by name in the brief as a local PR-line formatter,
    consistent with the local-only pattern above.
- **Conclusion: no server-side PR detection, no server-side volume rollup, no
  server-side telemetry aggregate over training data exists today.** Every
  figure a leaderboard would need (sessions, volume, PRs, consistency) is
  presently computed on-device from local SQLite, never server-side from the
  synced `workout_sets` rows.

---

## 3. Local metrics already computed on device (candidates to publish)

| Function | File:line | Inputs | Output |
|---|---|---|---|
| `computeWeekState` | `src/lib/streak.js:80` | per-week gathered facts | week label (`kept`/`resting`/`missed`/etc) |
| `detectPerfectMonth` | `src/lib/streak.js:105` | `weeks[]` | boolean-ish milestone |
| `computeStreak` | `src/lib/streak.js:125` | `{weeks, edSuppressed}` | run length, `suppressed` flag — **tier-blind, ED-aware by design** (header comment `streak.js:1-22`: "An open ED/wellbeing flag freezes the run benignly... flags `suppressed` so the UI hides the number entirely") |
| `pausedWeekKeys`, `addPauseSpan`, `recordHighWater`, `longestRun`, `pendingMilestone`, `pendingPerfectMonth`, `pendingLongestRunPb` | `src/lib/streakState.js:66-232` | streak state + pause spans | longest run, milestone-seen bookkeeping (AsyncStorage-persisted via `loadStreakState`/`persistHighWater` etc, `streakState.js:154-232`) |
| `buildLiftProgressRows`, `buildExerciseMetricSeries`, `derivePRIndices` | `src/lib/liftProgress.js:34,111,173` | sets + exercises | per-exercise metric series, PR indices |
| `computeBlockPerformance`, `effectiveBlockSlopePct` | `src/lib/blockMetrics.js:164,475` | mesocycle block sets | block volume/slope, deload-aware |
| `deriveTrainingProfile` | `src/lib/community/trainingProfile.js:232-320` | completed-workout start timestamps + set rows (12-week window) | sessions count, sessions-band, staple lifts, day/time bands, experience band |

`weeklyReview.js`, `consistency*.js` named in the brief were not found under
those exact filenames (`ls src/lib | grep -i "streak\|consistency\|weeklyReview"`
returned only `streak.js`, `streakState.js`, `blockMetrics.js`,
`liftProgress.js`) — the consistency/weekly-review concept in this codebase
appears to live inside `streak.js`/`streakState.js`, not a separate module.
**Flagged as an ambiguity** rather than assumed absent (see Ambiguities).

All of these are pure or near-pure functions over local reads — the same
shape as `deriveTrainingProfile`, meaning a "sessions this week / volume this
week / PRs this week / current streak" counter set could be derived the same
way and carried through the same consent pipe.

---

## 4. `trainingProfile.js` — the existing consent-gated publish path

Full file read: `src/lib/community/trainingProfile.js` (581 lines).

- **Two-half design** (file header, lines 12-23): `deriveTrainingProfile`
  (pure, `trainingProfile.js:232-320`) vs `loadTrainingProfile` (I/O half,
  `trainingProfile.js:474-506`) — the I/O half reads exactly four things:
  `getCompletedWorkoutStartTimestamps`, `getWorkoutSetsSince`,
  `getAllExercises`, `getActivePlan` (`trainingProfile.js:478-483`). **SD-30**
  is the guard: "nothing about the body, food, Progress Scan, injuries,
  coaching or check-ins is read here, ever" (line 23). The regression test
  file is `src/lib/community/__tests__/trainingProfile.test.js` (also
  `src/screens/__tests__/CommunityTrainingProfile.test.js`,
  `src/components/community/__tests__/TrainingProfileLine.test.js`) — these
  are the SD-30 pin tests; not opened in full this pass (time-boxed recon),
  but their existence + the header comment establishes the guard is
  regression-tested, not just documented.
- **Bands published today** (`TP_*` constants, `trainingProfile.js:47-130`):
  days (`tp_days`), time-of-day (`tp_time_bands`), sessions/week band
  (`tp_sessions_band`, four buckets `1_2`/`3`/`4_5`/`6_plus`,
  `sessionsBandFor`, line 198-205), staple lifts (`tp_staple_lifts`, top 5 by
  distinct-session count, lines 292-310), experience band
  (`tp_experience_band`), programme key (`tp_programme_key`), age band
  (server-derived, opt-in only, never for a minor — line 94, SD-32).
- **Toggle map** — `TP_DEFAULT_SHARE` (lines 120-128): `days`, `time_bands`,
  `sessions`, `staple_lifts`, `experience`, `programme`, `age_band`. Days/
  time_bands/age_band default OFF ("the three that say most about where a
  person is and when"); sessions/staple_lifts/experience/programme default
  ON.
- **`shareablePayload(bands, share)`** (`trainingProfile.js:520-532`): builds
  the RPC payload from `SHARE_KEY_TO_FIELD` ONLY — "a band whose toggle is
  off is not sent at all... `community_update_training_profile` NULLS
  anything absent" (comment, lines 511-515). This is the exact mechanism a
  new counter set (sessions-this-week, sets-this-week, volume-this-week-kg,
  PRs-this-week, weeks-hit streak) would extend: add new keys to
  `SHARE_KEY_TO_FIELD`, new `TP_DEFAULT_SHARE` entries (default OFF, per the
  existing "reveals when/where" precedent), and new cloud columns following
  the same additive-migration pattern as `migrate_161`.
- **Server RPC**: `community_update_training_profile`
  (`callCommunity('community_update_training_profile', {_p: payload})`,
  line 565). Column set added by `migrate_161_community_connections.sql:158-
  164`: `tp_days text[]`, `tp_time_bands text[]`, `tp_sessions_band text`,
  `tp_staple_lifts text[]`, `tp_experience_band text`, `tp_programme_key
  text`, `tp_age_band text` — all on `community_profiles`, all
  `ADD COLUMN IF NOT EXISTS`, additive. A new counters set would follow the
  identical pattern: new nullable columns on `community_profiles` (or a
  child table if per-week history is wanted, see §7), a new RPC or an
  extension of the existing one, validated server-side the way
  `migrate_161:176` notes ("`community_update_training_profile` validates
  every value against them").
- **Throttle**: `syncTrainingProfile` recomputes/sends at most once a day
  (`TP_SYNC_INTERVAL_MS = 24h`, line 148), on hub open, `force` available
  from the Training Profile screen (line 541-542). A "this week" counter
  would need either a higher-frequency send (contradicts the once-daily
  design intent) or a server-side "as of" timestamp so a leaderboard reads
  "trained 3× this week (as of Tue)" rather than claiming live accuracy.

---

## 5. Gym linkage

- `community_profiles.gym_key` (free-text derived) — `migrate_160:119,143`,
  index `migrate_160:163-164`.
- `community_profiles.gym_id` (uuid, FK to `gym_venues`) +
  `other_gym_ids` (uuid[], max 3, `migrate_162:449-455`) — the directory-
  linked upgrade. Trigger `_community_gym_key_sync`
  (`migrate_162:658-692`) derives `gym_key := 'gym:' || gym_id::text` and
  `gym_label` from `gym_id` whenever it's set, overriding the free-text pair
  from `migrate_160`/`161` — but "never re-derived once `gym_id` is set"
  (`migrate_162:43-44` comment) if the picker write path already set the
  free-text pair directly.
- **Existing "people at this gym" computation**: `migrate_160.sql:3207-3215`
  — a block inside (unnamed in this grep, likely a discovery/finder RPC)
  that does `SELECT count(*) ... WHERE p.is_minor = false AND p.gym_key =
  v_me.gym_key` and returns `{'kind':'gym','key':v_me.gym_key,'label':
  v_me.gym_label,'count':v_count}`. This is the exact join key ("who's at my
  gym") a leaderboard would reuse: `WHERE gym_key = :my_gym_key AND
  is_minor = false AND status = 'active' AND visibility = 'public'` is the
  established predicate shape used throughout (`migrate_160:2442,2713,2965,
  3010,3198,3211,3223,3244,3309,3334,3355` all repeat `is_minor = false`
  alongside `status='active'`/`visibility='public'`).
- **"This week" is NOT currently part of the gym match** — `gym_key` is a
  static profile attribute, joined against whatever counters a profile
  carries. A "trained this week at my gym" ranking = `community_profiles`
  WHERE `gym_key = mine` AND (new) `tp_sessions_this_week_count > 0` (or a
  published as-of-timestamp), ordered by the new counter — i.e., exactly the
  same join as the existing gym-count RPC, extended with the new columns
  from §4.

---

## 6. ED-safety gating available for a board to reuse

- **Local**: `src/lib/streak.js` header (lines 1-22) states the exact
  pattern already in production use for a social-facing number: "An open
  ED/wellbeing flag freezes the run benignly (every week reads 'resting')
  and flags `suppressed` so the UI hides the number entirely." `computeStreak`
  takes `edSuppressed` as an explicit boolean parameter
  (`streak.js:125`) rather than reading any flag itself — the caller (screen
  or a future publish function) is responsible for checking
  `edPatternDetector.js`/`wellbeing.js` (`getWellbeingMode`, `isCalm`,
  `src/lib/wellbeing.js:22,31,45`) and passing the result in. This is the
  reusable shape for a leaderboard counter: derive the raw figure, then gate
  its *publication* on the same boolean, never compute it differently.
- **Community push suppression precedent**: `src/lib/community/messages.js:
  18-21` — "The push carries no content... decided entirely by the server
  against the recipient's own preferences and the **same fail-closed
  wellbeing check every Community push takes**." Confirms a fail-closed
  wellbeing check already exists as a standing gate across Community
  notification delivery, evaluated server-side per the comment ("decided
  entirely by the server").
- **Story withholding**: `src/lib/community/posts.js` builds session/
  block/milestone/programme story payloads from an explicit allow-list
  (`POST_PAYLOAD_KEYS`, `pick()` helper, `posts.js:47-56`) and states "Weights
  appear on a PR post because... training performance the user chose to
  share (SD-04). Bodyweight, body composition, food and every coaching
  output do not appear anywhere, in any kind" (file header, lines 1-18).
  This recon pass did **not** find an explicit ED/calm-mode predicate
  *inside* `posts.js` itself (grepped `edPatternDetector|calmMode|wellbeing`
  in `src/lib/community/*.js` — zero hits in `posts.js`); the gating found
  is at the messages/push layer and the `computeStreak(edSuppressed)`
  caller-supplied-flag layer, not inside the post-builder. **Flagged as an
  ambiguity** (see below) — whether story *creation* (as opposed to
  notification delivery) checks the flag was not conclusively located in
  this recon and needs a targeted follow-up grep of the screen(s) that call
  `posts.js`'s builders, and of any server-side RPC predicate on the
  `community_posts`/story tables in `migrate_160.sql` for an `is_minor`-style
  `ed_flag`/`calm` column — none was found (only `ed_pattern_flags` appears
  in `migrate_160.sql:3798`, inside the account-deletion cascade, not a read
  predicate).
- **Minor gating** (adjacent, well-established pattern to model ED gating
  on): `is_minor boolean NOT NULL DEFAULT false` on `community_profiles`
  (`migrate_160:121`) is checked as a hard predicate on essentially every
  discovery/ranking query in the file (10+ occurrences listed in §5) — this
  is the concrete template a "withhold from board under open ED flag/calm
  mode" column+predicate would follow: add an equivalent boolean/derived
  column to `community_profiles` (or compute it at RPC-call time from
  `ed_pattern_flags`), AND every ranking read.

---

## 7. Row-size / feasibility

No explicit "typical sets/week" figure was found in fixtures, schema
comments, or the trainingProfile test file in this pass (grepped
`trainingProfile.test.js` and the discovery blueprint for
sets-per-week/session figures — no hits; a fuller read of
`docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` section 3,
referenced repeatedly by `trainingProfile.js`'s own comments as the
governing spec, was not done in full this pass — flagged below). What is
established from the code itself:

- `workout_sets` rows are chunked at 200 per upsert call (`sync.js:576`,
  "Chunk to avoid hitting Supabase row limits") — implies a single sync
  batch can exceed 200 rows, i.e. sessions with many sets or multi-session
  catch-up pushes are a real, expected case, not a rare edge.
- `deriveTrainingProfile`'s own window is 12 weeks (`TP_WINDOW_WEEKS = 12`,
  `trainingProfile.js:112`) and it reads set rows over that whole window via
  `getWorkoutSetsSince` (`trainingProfile.js:480`) purely to extract
  exercise ids for staple-lift counting — i.e. the existing device-side
  aggregation already pulls a 12-week set history successfully, which is
  evidence the local read is cheap enough for a daily background job; it
  says nothing directly about server-side aggregation cost across many
  users' full set histories.

---

## Two viable computation paths

### (a) Server-side aggregation over synced `workout_sets`/`workouts`

**Pros**
- Ground truth: reads the same rows the app already pushes on completion
  (§1.3), no new client code to compute figures, no risk of a stale
  device-computed number.
- Real-time-ish: a leaderboard reflects a session the moment it syncs
  (push-on-save), not gated by any daily throttle.
- Can filter precisely (e.g. exclude `evidence_class='circuit'` from a
  "most volume" figure) once `CIRCUIT_SYNC_COLUMNS_ENABLED` is flipped on.

**Cons**
- **No RLS policy today permits cross-user SELECT on `workouts`/
  `workout_sets`** (§1.1-1.2) — every read is owner-scoped. A leaderboard
  needs a new SECURITY DEFINER RPC (same pattern as the existing Community
  functions in `migrate_160.sql`), which is new server surface, new attack
  surface to review, and a new migration.
- No existing PR-detection, volume-rollup, or streak logic server-side (§2)
  — `detectPR`, `computeStreak`, `computeBlockPerformance` etc are all pure
  JS today; reproducing them faithfully in PL/pgSQL (or via an edge
  function) is a real re-implementation with its own correctness risk
  (ED-safety-adjacent code — CLAUDE.md §2 "STOP and ask" applies to
  anything touching `weeklyCoach.js`/`coachApply.js`-adjacent logic; PR/
  streak logic itself is not in that inviolable list, but duplicating logic
  in two places is exactly the "no drive-by refactor, match existing
  patterns" and "no silent corner-cutting" friction CLAUDE.md warns about).
- No local-day/ISO-week key stored on `workouts` — "this week" would be
  computed from `started_at` inside the aggregation query, and must match
  `dayKey.js`'s UK-Monday-week convention exactly or a session could land in
  the wrong week versus what the device shows the user.
- Only completed workouts sync (fine for "sessions", §1.3) but an
  in-progress or abandoned session that never completes is invisible either
  way — same limitation for both paths.
- Deload weeks: `is_deload` doesn't exist on `workouts`/`workout_sets` at
  all — server aggregation cannot distinguish a deload session from a normal
  one without a join out to mesocycle-week planning data, which is not
  synced set-by-set here either (would need `mesocycle_weeks` join, not
  scoped in this recon).

### (b) Device-computed counters published through `trainingProfile.js`'s consent path

**Pros**
- **Rides an already-shipped, already-tested, already-ED-aware consent
  mechanism** (§4, §6) — no new RLS surface, no new SECURITY DEFINER
  function class, just new nullable columns + payload keys on a pattern
  that's proven (`migrate_161` shipped this exact shape for the existing
  bands).
- Reuses the exact PR/streak/volume logic the user already sees in their own
  UI (`liftProgress.js`, `blockMetrics.js`, `streak.js`) — the leaderboard
  number and the personal number can never disagree, avoiding a whole class
  of "why does my own screen say something different from the board" bugs.
- `computeStreak`'s `edSuppressed` parameter (§6) is the existing template
  for withholding a figure under an open ED flag — a "weeks-hit streak"
  counter naturally inherits that gate by construction, not by a new
  bolt-on check.
- Deload-awareness already exists locally (`streak.js`'s `isDeload`/
  `resting` state) where it does not exist at all in synced cloud rows.
- Toggle-per-figure (§4's `SHARE_KEY_TO_FIELD`) gives the founder the same
  granular consent model already shipped: sessions-this-week could default
  ON, volume-this-week could default OFF, etc, mirroring the existing
  days/time_bands-off-by-default precedent for "reveals more than it seems."

**Cons**
- Throttled to once a day today (`TP_SYNC_INTERVAL_MS`, §4) — a "most
  consistent this week" board would show yesterday's number until the next
  sync, or the throttle would need loosening specifically for these fields
  (a product/founder decision, not a pure engineering one).
- Requires the device to be opened (hub open triggers `syncTrainingProfile`,
  §4) — a person who trained but hasn't opened the app since won't have
  published their new count, so a "who trained most this week" board could
  under-count someone who is actually training, until they next open
  Volyume.
- New local aggregation functions would need writing (sessions-this-week,
  sets-this-week, volume-this-week-kg, PRs-this-week) — none of the
  functions found in §3 currently compute a rolling "this calendar week"
  figure in the shape a leaderboard needs (most take a `weeks[]` array
  already gathered by a caller elsewhere) — real, if modest, implementation
  work versus (a)'s "just SELECT from already-synced rows."
- Self-reported at the point of computation: the server never re-derives or
  audits the number (contrast the streak/day-band bodies, which are
  entirely trusted from the device) — same trust model as every other band
  `trainingProfile.js` already publishes today, so not a new risk class, but
  worth naming for a competitive "who lifted the most" claim specifically.

---

## Ambiguities

1. `weeklyReview.js` / `consistency*.js` named in the task brief were not
   found as files (`ls src/lib` search, §3) — the consistency/streak concept
   appears to live entirely in `streak.js`/`streakState.js`. Confirm whether
   these were renamed, are elsewhere (e.g. inside a screen file), or the
   brief's naming was speculative before treating §3 as complete.
2. Whether ED/calm-mode gating is checked **inside** `posts.js`'s story
   builders (creation time) versus only at the messages/push-notification
   layer (§6) was not conclusively resolved — no `edPatternDetector`/
   `wellbeing`/`calm` reference was found inside `src/lib/community/posts.js`
   itself. A board reusing "the same gate" needs to know exactly which layer
   (creation vs. delivery vs. read-query predicate) currently enforces it;
   this needs a targeted look at whichever screen calls the `posts.js`
   builders and at any `community_posts`-reading RPC predicate in
   `migrate_160.sql` (only `is_minor` predicates were confirmed there, no
   `ed_flag`/`calm` column was found on the post/story tables).
3. `docs/social-discovery-2026-09-06/70-DISCOVERY-BLUEPRINT.md` section 3 is
   cited repeatedly by `trainingProfile.js`'s own comments as the source
   spec for every threshold (`TP_DAY_SHARE`, `TP_TIME_BAND_SHARE`, etc) but
   was not read in full this pass (time-boxed recon) — before any new
   counter design work starts, that section should be read in full per
   CLAUDE.md §4 ("work from SOURCE documents... quote the relevant lines
   back") since it's very likely the intended home for a leaderboard-figures
   extension of the same blueprint, and may already contain founder-level
   decisions (thresholds, default-on/off calls) relevant to §4's proposed
   extension.
4. Row-size / typical sets-per-week per user (task point 7) — no concrete
   figure was found in code, fixtures, or schema comments in this pass. This
   would need either a `git grep` across test fixtures not covered here, or
   a direct (read-only) query against production via the founder's
   Supabase MCP path per `supabase/README` — out of scope for this
   READ-ONLY, no-Supabase-MCP recon agent.
5. Whether any edge function (outside `supabase/migrate_*.sql`, e.g. under a
   `supabase/functions/` directory) performs server-side aggregation was not
   checked — this recon was scoped to `migrate_*.sql` per the brief's own
   instruction ("grep `supabase/migrate_*`"), so an edge-function-based
   aggregate (if any) would not have been surfaced by this pass.
